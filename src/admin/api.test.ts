import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

function success<T>(data: T) {
  return new Response(
    JSON.stringify({
      statusCode: 200,
      code: "SUCCESS",
      message: "성공",
      data,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  )
}

function unauthenticated() {
  return new Response(
    JSON.stringify({
      statusCode: 401,
      code: "UNAUTHENTICATED",
      message: "인증 정보가 없거나 유효하지 않습니다.",
      data: null,
    }),
    { status: 401, headers: { "Content-Type": "application/json" } },
  )
}

describe("regional admin authentication transitions", () => {
  beforeEach(() => {
    vi.resetModules()
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("shares one refresh request between concurrent unauthorized requests", async () => {
    let protectedCalls = 0
    let refreshCalls = 0
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith("/api/v1/auth/refresh")) {
        refreshCalls += 1
        expect(new Headers(init?.headers).get("Accept")).toBe(
          "application/json",
        )
        return success({ accessToken: "refreshed-token" })
      }
      protectedCalls += 1
      if (protectedCalls <= 2) return unauthenticated()
      expect(new Headers(init?.headers).get("Authorization")).toBe(
        "Bearer refreshed-token",
      )
      return success({ value: protectedCalls })
    })
    vi.stubGlobal("fetch", fetchMock)

    const { apiRequest } = await import("./api")
    await Promise.all([
      apiRequest("/api/v1/protected/one"),
      apiRequest("/api/v1/protected/two"),
    ])

    expect(refreshCalls).toBe(1)
    expect(protectedCalls).toBe(4)
  })

  it("sends JSON as the default accepted response type", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        expect(new Headers(init?.headers).get("Accept")).toBe(
          "application/json",
        )
        return success({ ok: true })
      },
    )
    vi.stubGlobal("fetch", fetchMock)

    const { apiRequest } = await import("./api")
    await apiRequest("/api/v1/example")
  })

  it("preserves an explicitly requested response type", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        expect(new Headers(init?.headers).get("Accept")).toBe("text/csv")
        return success({ ok: true })
      },
    )
    vi.stubGlobal("fetch", fetchMock)

    const { apiRequest } = await import("./api")
    await apiRequest("/api/v1/example", {
      headers: { Accept: "text/csv" },
    })
  })

  it("waits for an in-flight refresh before logout", async () => {
    let resolveRefresh!: (response: Response) => void
    const refreshResponse = new Promise<Response>((resolve) => {
      resolveRefresh = resolve
    })
    const calls: string[] = []
    let protectedCalls = 0
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith("/api/v1/auth/refresh")) {
        calls.push("refresh")
        return refreshResponse
      }
      if (url.endsWith("/api/v1/auth/logout")) {
        calls.push("logout")
        return success(null)
      }
      protectedCalls += 1
      return protectedCalls === 1 ? unauthenticated() : success({ ok: true })
    })
    vi.stubGlobal("fetch", fetchMock)

    const { apiRequest, logout } = await import("./api")
    const protectedRequest = apiRequest("/api/v1/protected")
    await vi.waitFor(() => expect(calls).toEqual(["refresh"]))

    const logoutRequest = logout()
    await Promise.resolve()
    expect(calls).toEqual(["refresh"])

    resolveRefresh(success({ accessToken: "refreshed-token" }))
    await Promise.all([protectedRequest, logoutRequest])
    expect(calls).toEqual(["refresh", "logout"])
  })

  it("clears the stored session when refresh fails", async () => {
    let protectedCalls = 0
    let refreshCalls = 0
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith("/api/v1/auth/login")) {
        return success({ userId: "41", roles: [], accessToken: "expired-token" })
      }
      if (url.endsWith("/api/v1/auth/refresh")) {
        refreshCalls += 1
        return unauthenticated()
      }
      protectedCalls += 1
      return unauthenticated()
    })
    vi.stubGlobal("fetch", fetchMock)

    const { apiRequest, login, storedUserId } = await import("./api")
    await login("admin@example.com", "Password1!")
    expect(storedUserId()).toBe("41")

    await expect(apiRequest("/api/v1/protected")).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
    })

    expect(refreshCalls).toBe(1)
    expect(protectedCalls).toBe(1)
    expect(storedUserId()).toBeNull()
  })

  it("retries the original request only once after refresh", async () => {
    let protectedCalls = 0
    let refreshCalls = 0
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith("/api/v1/auth/refresh")) {
        refreshCalls += 1
        return success({ accessToken: "refreshed-token" })
      }
      protectedCalls += 1
      return unauthenticated()
    })
    vi.stubGlobal("fetch", fetchMock)

    const { apiRequest } = await import("./api")
    await expect(apiRequest("/api/v1/protected")).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
    })

    expect(refreshCalls).toBe(1)
    expect(protectedCalls).toBe(2)
  })
})
