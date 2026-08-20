import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import App from "../App"
import { clearAuthentication, saveAuthentication } from "../api/client"

function success(data: unknown) {
  return Promise.resolve(
    new Response(
      JSON.stringify({
        statusCode: 200,
        code: "SUCCESS",
        message: "성공",
        data,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ),
  )
}

const content = {
  contentId: "104",
  contentType: "EVENT_EXPERIENCE",
  status: "PUBLISHED",
  title: "김해 가야문화 체험",
  description: "가야 문화를 체험합니다.",
  representativeImageUrl: null,
  representativeImageUrlExpiresAt: null,
  locationText: "김해시 가야의길 190",
  operatingHoursText: "매주 토요일",
  contactText: "055-000-0000",
  precautions: "편한 복장",
  ageRequirement: "초등학생 이상",
  materials: "필기도구",
  cancellationPolicyText: "시작 전까지 취소 가능",
  publishAt: "2026-08-21T00:00:00Z",
  rejectionReason: null,
  createdAt: "2026-08-12T01:20:00Z",
  updatedAt: "2026-08-12T01:20:00Z",
}

function authResponses(url: string) {
  if (url.endsWith("/api/v1/auth/refresh")) {
    return success({ accessToken: "test-token" })
  }
  if (url.endsWith("/api/v1/me")) {
    return success({
      userId: "44",
      roleAssignments: [
        { role: "OPERATOR", regionId: "11", regionName: "김해시" },
      ],
    })
  }
  return null
}

function fillSessionForm() {
  fireEvent.change(screen.getByLabelText("시작 시각"), {
    target: { value: "2099-08-25T10:00" },
  })
  fireEvent.change(screen.getByLabelText("종료 시각"), {
    target: { value: "2099-08-25T12:00" },
  })
  fireEvent.change(screen.getByLabelText("체크인 시작"), {
    target: { value: "2099-08-25T09:30" },
  })
  fireEvent.change(screen.getByLabelText("체크인 종료"), {
    target: { value: "2099-08-25T10:30" },
  })
  fireEvent.change(screen.getByLabelText("정원"), {
    target: { value: "20" },
  })
}

describe("운영자 회차 생성·변경·취소 흐름", () => {
  beforeEach(() => {
    clearAuthentication()
    window.localStorage.clear()
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    clearAuthentication()
  })

  it("생성 성공 후 새 PENDING 회차를 상세 화면에 표시한다", async () => {
    window.history.replaceState(
      {},
      "",
      "/operator/contents/104/sessions/new",
    )
    saveAuthentication("stale-test-token", "44")
    const fetchMock = vi.fn(
      (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        const auth = authResponses(url)
        if (auth) return auth
        if (url.endsWith("/api/v1/operator/contents/104")) {
          return success(content)
        }
        if (
          url.endsWith("/api/v1/operator/contents/104/sessions") &&
          !init?.method
        ) {
          return success({ contentId: "104", sessions: [] })
        }
        if (
          url.endsWith("/api/v1/operator/contents/104/sessions") &&
          init?.method === "POST"
        ) {
          return success({
            sessionId: "205",
            contentId: "104",
            status: "PENDING",
            startsAt: "2099-08-25T10:00:00+09:00",
            endsAt: "2099-08-25T12:00:00+09:00",
            checkinOpenAt: "2099-08-25T09:30:00+09:00",
            checkinCloseAt: "2099-08-25T10:30:00+09:00",
            capacity: 20,
          })
        }
        throw new Error(`예상하지 못한 요청: ${url}`)
      },
    )
    vi.stubGlobal("fetch", fetchMock)

    render(<App />)
    expect(
      await screen.findByRole("heading", { name: "추가 회차 등록" }),
    ).toBeInTheDocument()
    fillSessionForm()
    fireEvent.click(
      screen.getByRole("button", { name: "회차 생성 및 심사 요청" }),
    )

    expect(
      await screen.findByText("새 회차가 심사 대기 상태로 등록되었습니다."),
    ).toBeInTheDocument()
    expect(screen.getByText("회차 ID 205")).toBeInTheDocument()
    expect(screen.getAllByText("심사 대기").length).toBeGreaterThan(0)
  })

  it("변경 요청 성공 후 중복 요청 버튼을 막고 심사 상태를 표시한다", async () => {
    window.history.replaceState({}, "", "/operator/contents/104")
    saveAuthentication("stale-test-token", "44")
    const fetchMock = vi.fn(
      (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        const auth = authResponses(url)
        if (auth) return auth
        if (url.endsWith("/api/v1/operator/contents/104")) {
          return success(content)
        }
        if (
          url.endsWith("/api/v1/operator/contents/104/sessions") &&
          !init?.method
        ) {
          return success({
            contentId: "104",
            sessions: [
              {
                sessionId: "204",
                status: "SCHEDULED",
                startsAt: "2099-08-25T01:00:00Z",
                endsAt: "2099-08-25T03:00:00Z",
              },
            ],
          })
        }
        if (
          url.endsWith("/api/v1/operator/sessions/204/change-requests") &&
          init?.method === "POST"
        ) {
          return success({ revisionId: "305", status: "PENDING" })
        }
        throw new Error(`예상하지 못한 요청: ${url}`)
      },
    )
    vi.stubGlobal("fetch", fetchMock)

    render(<App />)
    fireEvent.click(
      await screen.findByRole("button", { name: "변경 요청" }),
    )
    fireEvent.change(screen.getByLabelText("체크인 시작"), {
      target: { value: "2099-08-25T09:30" },
    })
    fireEvent.change(screen.getByLabelText("체크인 종료"), {
      target: { value: "2099-08-25T10:30" },
    })
    fireEvent.change(screen.getByLabelText("정원"), {
      target: { value: "20" },
    })
    fireEvent.click(screen.getByRole("button", { name: "변경 심사 요청" }))

    expect(
      await screen.findByText("변경 요청 305 · 심사 대기"),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "변경 심사 중" }),
    ).toBeDisabled()
    expect(
      screen.queryByRole("button", { name: "회차 취소" }),
    ).not.toBeInTheDocument()
  })

  it("취소 성공 후 회차를 제거하지 않고 CANCELLED 상태로 표시한다", async () => {
    window.history.replaceState({}, "", "/operator/contents/104")
    saveAuthentication("stale-test-token", "44")
    const fetchMock = vi.fn(
      (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        const auth = authResponses(url)
        if (auth) return auth
        if (url.endsWith("/api/v1/operator/contents/104")) {
          return success(content)
        }
        if (
          url.endsWith("/api/v1/operator/contents/104/sessions") &&
          !init?.method
        ) {
          return success({
            contentId: "104",
            sessions: [
              {
                sessionId: "204",
                status: "SCHEDULED",
                startsAt: "2099-08-25T01:00:00Z",
                endsAt: "2099-08-25T03:00:00Z",
              },
            ],
          })
        }
        if (
          url.endsWith("/api/v1/operator/sessions/204/cancel") &&
          init?.method === "POST"
        ) {
          return success({ sessionId: "204", status: "CANCELLED" })
        }
        throw new Error(`예상하지 못한 요청: ${url}`)
      },
    )
    vi.stubGlobal("fetch", fetchMock)

    render(<App />)
    fireEvent.click(
      await screen.findByRole("button", { name: "회차 취소" }),
    )
    const dialog = screen.getByRole("dialog")
    fireEvent.change(within(dialog).getByRole("textbox"), {
      target: { value: "행사장 사정" },
    })
    fireEvent.click(
      within(dialog).getByRole("button", { name: "회차 취소" }),
    )

    expect(
      await screen.findByText("회차가 취소 상태로 변경되었습니다."),
    ).toBeInTheDocument()
    expect(screen.getByText("회차 ID 204")).toBeInTheDocument()
    expect(screen.getByText("취소")).toBeInTheDocument()
    expect(screen.getByText("변경·취소 불가")).toBeInTheDocument()
  })
})
