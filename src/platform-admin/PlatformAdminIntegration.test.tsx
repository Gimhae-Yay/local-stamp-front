import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import App from "../App"
import { clearLogin } from "../admin/api"

function apiResponse(data: unknown, status = 200) {
  return Promise.resolve(
    new Response(
      JSON.stringify({
        statusCode: status,
        code: "SUCCESS",
        message: "성공",
        data,
      }),
      { status, headers: { "Content-Type": "application/json" } },
    ),
  )
}

function loginResponse(userId = "910001") {
  return apiResponse({
    userId,
    roles: [],
    accessToken: "platform-admin-test-token",
  })
}

const adminAccounts = [
  {
    userId: "910002",
    loginIdentifier: "platformadmin@test.local",
    name: "테스트 플랫폼관리자",
    grade: "PLATFORM_ADMIN",
    status: "ACTIVE",
    createdAt: "2026-08-01T00:00:00Z",
    inactivatedAt: null,
  },
  {
    userId: "910001",
    loginIdentifier: "superadmin@test.local",
    name: "테스트 최고관리자",
    grade: "SUPER_ADMIN",
    status: "ACTIVE",
    createdAt: "2026-08-01T00:00:00Z",
    inactivatedAt: null,
  },
  {
    userId: "910005",
    loginIdentifier: "inactiveadmin@test.local",
    name: "비활성 관리자",
    grade: "PLATFORM_ADMIN",
    status: "INACTIVE",
    createdAt: "2026-08-01T00:00:00Z",
    inactivatedAt: "2026-08-02T00:00:00Z",
  },
]

describe("전체 관리자 콘솔 통합", () => {
  beforeEach(() => {
    clearLogin()
    window.localStorage.clear()
    window.history.replaceState({}, "", "/admin/login")
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    clearLogin()
  })

  it("PLATFORM_ADMIN에게 최고 관리자 전용 메뉴를 숨긴다", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith("/api/v1/auth/login")) return loginResponse("910002")
      if (url.endsWith("/api/v1/platform-admin/regions"))
        return apiResponse({ regions: [] })
      if (url.endsWith("/api/v1/platform-admin/admin-accounts"))
        return apiResponse({ adminAccounts })
      throw new Error(`예상하지 못한 요청: ${url}`)
    })
    vi.stubGlobal("fetch", fetchMock)

    render(<App />)
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText("이메일"), "platform@test.local")
    await user.type(screen.getByLabelText("비밀번호"), "LocalTest1!")
    await user.click(screen.getByRole("button", { name: "로그인" }))

    expect(
      await screen.findByRole("heading", { name: "플랫폼 운영" }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /사용자 910002/ }))
    expect(screen.getAllByText("플랫폼 관리자")).not.toHaveLength(0)
    expect(
      screen.queryByRole("link", { name: /전체 관리자 계정/ }),
    ).not.toBeInTheDocument()
  })

  it("관리자 계정 목록과 검증을 최신 API 응답으로 처리한다", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith("/api/v1/auth/login")) return loginResponse()
      if (url.endsWith("/api/v1/platform-admin/regions"))
        return apiResponse({ regions: [] })
      if (url.endsWith("/api/v1/platform-admin/admin-accounts"))
        return apiResponse({ adminAccounts })
      throw new Error(`예상하지 못한 요청: ${url}`)
    })
    vi.stubGlobal("fetch", fetchMock)

    render(<App />)
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText("이메일"), "super@test.local")
    await user.type(screen.getByLabelText("비밀번호"), "LocalTest1!")
    await user.click(screen.getByRole("button", { name: "로그인" }))
    await user.click(
      await screen.findByRole("button", { name: /사용자 910001/ }),
    )
    await user.click(
      screen.getByRole("link", { name: /^▣전체 관리자 계정/ }),
    )

    expect(await screen.findByText(/superadmin@test.local/)).toBeInTheDocument()
    expect(screen.getByText(/inactiveadmin@test.local/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "비활성화됨" })).toBeDisabled()

    await user.click(screen.getByRole("button", { name: /계정 생성/ }))
    const dialog = screen.getByRole("dialog")
    await user.type(within(dialog).getByLabelText("이메일 *"), "new@test.local")
    await user.type(within(dialog).getByLabelText("이름 *"), "새 관리자")
    await user.type(within(dialog).getByLabelText("전화번호 *"), "01012345678")
    await user.type(
      within(dialog).getByLabelText(/임시 비밀번호/),
      "Password1",
    )
    await user.type(within(dialog).getByLabelText("증빙 참조 *"), "local-test")
    await user.click(within(dialog).getByRole("button", { name: "계정 생성" }))

    expect(
      within(dialog).getByText(
        "비밀번호에는 영문자·숫자·특수문자가 모두 포함되어야 합니다.",
      ),
    ).toBeInTheDocument()
  })

  it("수동 전액 환불은 확인 모달에서 확정한 뒤 한 번만 요청한다", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith("/api/v1/auth/login")) return loginResponse()
      if (url.endsWith("/api/v1/platform-admin/regions"))
        return apiResponse({ regions: [] })
      if (url.endsWith("/api/v1/platform-admin/admin-accounts"))
        return apiResponse({ adminAccounts })
      if (
        url.endsWith("/api/v1/platform-admin/payments/910201/refund") &&
        init?.method === "POST"
      )
        return apiResponse(
          {
            refundId: "910308",
            status: "SUCCEEDED",
            amount: 10000,
            requestedAt: "2026-08-21T00:00:00Z",
          },
          201,
        )
      throw new Error(`예상하지 못한 요청: ${url}`)
    })
    vi.stubGlobal("fetch", fetchMock)

    render(<App />)
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText("이메일"), "super@test.local")
    await user.type(screen.getByLabelText("비밀번호"), "LocalTest1!")
    await user.click(screen.getByRole("button", { name: "로그인" }))
    await user.click(
      await screen.findByRole("button", { name: /사용자 910001/ }),
    )
    await user.click(screen.getByRole("link", { name: /수동 전액 환불/ }))

    await user.type(await screen.findByLabelText("결제 ID *"), "910201")
    await user.type(screen.getByLabelText(/증빙 참조/), "local-e2e://refund")
    await user.type(screen.getByLabelText("환불 사유 *"), "고객 요청")
    await user.click(screen.getByRole("button", { name: "전액 환불 요청" }))

    expect(
      screen.getByRole("heading", { name: "전액 환불 요청 확인" }),
    ).toBeInTheDocument()
    expect(
      fetchMock.mock.calls.filter(([input, init]) =>
        String(input).includes("/payments/910201/refund") &&
        (init as RequestInit | undefined)?.method === "POST",
      ),
    ).toHaveLength(0)

    await user.click(screen.getByRole("button", { name: "전액 환불 확정" }))
    expect(
      await screen.findByText(
        (_, element) =>
          element?.tagName === "SPAN" &&
          element.textContent?.includes("환불 ID 910308") === true,
      ),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.filter(([input, init]) =>
          String(input).includes("/payments/910201/refund") &&
          (init as RequestInit | undefined)?.method === "POST",
        ),
      ).toHaveLength(1),
    )
  })
})
