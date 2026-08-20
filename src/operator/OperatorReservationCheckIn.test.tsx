import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
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

function authResponse(url: string) {
  if (url.endsWith("/api/v1/auth/refresh")) {
    return success({ accessToken: "operator-test-token" })
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

const reservation = {
  reservationId: "101",
  reservationNo: "R-CHECK-IN-101",
  status: "CONFIRMED",
  content: { contentId: "104", title: "김해 공예 체험" },
  session: {
    sessionId: "204",
    status: "SCHEDULED",
    startsAt: "2099-08-25T10:00:00+09:00",
    endsAt: "2099-08-25T12:00:00+09:00",
    checkinOpenAt: "2099-08-25T09:30:00+09:00",
    checkinCloseAt: "2099-08-25T10:30:00+09:00",
  },
  participant: { name: "김*자", phone: "010-****-5678" },
  checkIn: { checkedIn: false, canCheckIn: true, checkedAt: null },
}

describe("운영자 결제 조회·체크인 프론트 흐름", () => {
  beforeEach(() => {
    clearAuthentication()
    window.localStorage.clear()
    saveAuthentication("stale-test-token", "44")
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    clearAuthentication()
  })

  it("현재 회차가 비어 있어도 예약번호로 과거 환불 상태를 조회한다", async () => {
    window.history.replaceState({}, "", "/operator/reservations")
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      const auth = authResponse(url)
      if (auth) return auth
      if (url.endsWith("/api/v1/operator/contents")) {
        return success({
          contents: [
            {
              contentId: "104",
              contentType: "EVENT_EXPERIENCE",
              title: "김해 공예 체험",
              status: "PUBLISHED",
              createdAt: "2026-08-01T00:00:00Z",
            },
          ],
        })
      }
      if (url.endsWith("/api/v1/contents/104/sessions")) {
        return success({
          contentId: "104",
          sessions: [
            {
              sessionId: "204",
              startsAt: "2099-08-25T10:00:00+09:00",
              endsAt: "2099-08-25T12:00:00+09:00",
            },
          ],
        })
      }
      if (
        url.endsWith("/api/v1/operator/contents/104/reservations?sessionId=204")
      ) {
        return success({
          contentId: "104",
          session: { ...reservation.session },
          reservations: [],
        })
      }
      if (
        url.endsWith(
          "/api/v1/operator/reservations/search?reservationNo=R-REFUND-100",
        )
      ) {
        return success({ ...reservation, reservationNo: "R-REFUND-100" })
      }
      if (url.endsWith("/api/v1/operator/reservations/101/payment")) {
        return success({
          reservationId: "101",
          reservationNo: "R-REFUND-100",
          contentId: "104",
          sessionId: "200",
          payment: {
            paymentId: "501",
            status: "APPROVED",
            finalAmount: 7000,
            currency: "KRW",
            discrepancy: null,
          },
          refund: {
            refundId: "601",
            status: "SUCCEEDED",
            amount: 7000,
            requestedAt: "2026-08-10T00:00:00Z",
            completedAt: "2026-08-11T00:00:00Z",
          },
          updatedAt: "2026-08-11T00:00:00Z",
        })
      }
      throw new Error(`예상하지 못한 요청: ${url}`)
    })
    vi.stubGlobal("fetch", fetchMock)

    render(<App />)
    const input = await screen.findByLabelText("예약 번호로 결제·환불 조회")
    fireEvent.change(input, { target: { value: "R-REFUND-100" } })
    fireEvent.click(await screen.findByRole("button", { name: "결제 조회" }))

    const panel = await screen.findByRole("heading", {
      name: "예약 결제·환불 상태",
    })
    const paymentCard = panel.closest("aside")!
    expect(within(paymentCard).getAllByText("₩7,000")).toHaveLength(2)
    expect(within(paymentCard).getByText("완료")).toBeInTheDocument()
  })

  it("수동 체크인은 계약된 사유를 보내고 연속 클릭을 한 요청으로 제한한다", async () => {
    window.history.replaceState(
      {},
      "",
      "/operator/check-in?reservationNo=R-CHECK-IN-101",
    )
    let resolveCheckIn: (response: Response) => void
    const checkInResponse = new Promise<Response>((resolve) => {
      resolveCheckIn = resolve
    })
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const auth = authResponse(url)
      if (auth) return auth
      if (
        url.endsWith(
          "/api/v1/operator/reservations/search?reservationNo=R-CHECK-IN-101",
        )
      ) {
        return success(reservation)
      }
      if (
        url.endsWith("/api/v1/operator/check-ins/manual") &&
        init?.method === "POST"
      ) {
        return checkInResponse
      }
      throw new Error(`예상하지 못한 요청: ${url}`)
    })
    vi.stubGlobal("fetch", fetchMock)

    render(<App />)
    fireEvent.click(await screen.findByRole("button", { name: "예약 조회" }))
    const checkInButton = await screen.findByRole("button", {
      name: "예약번호로 체크인",
    })
    fireEvent.change(screen.getByLabelText("보조 처리 사유"), {
      target: { value: "QR_NOT_AVAILABLE" },
    })
    fireEvent.click(checkInButton)
    fireEvent.click(checkInButton)

    const manualRequests = fetchMock.mock.calls.filter(
      ([input, init]) =>
        String(input).endsWith("/api/v1/operator/check-ins/manual") &&
        init?.method === "POST",
    )
    expect(manualRequests).toHaveLength(1)
    expect(JSON.parse(String(manualRequests[0]?.[1]?.body))).toEqual({
      reservationNo: "R-CHECK-IN-101",
      reason: "QR_NOT_AVAILABLE",
    })
    expect(
      new Headers(manualRequests[0]?.[1]?.headers).get("Idempotency-Key"),
    ).toBeTruthy()

    resolveCheckIn(
      await success({
        visitId: "301",
        reservationId: "101",
        sessionId: "204",
        reservationStatus: "CHECKED_IN",
        checkInMethod: "RESERVATION_NUMBER",
        checkedAt: "2026-08-20T12:00:00Z",
      }),
    )

    expect(
      await screen.findByRole("heading", { name: "체크인이 완료되었습니다." }),
    ).toBeInTheDocument()
    expect(screen.getAllByText("김*자 · 010-****-5678").length).toBeGreaterThan(
      0,
    )
    expect(
      screen.getByRole("button", { name: "예약번호로 체크인" }),
    ).toBeDisabled()
  })

  it("QR 성공 후 예약번호를 보강 조회해 예약자 정보를 표시한다", async () => {
    window.history.replaceState({}, "", "/operator/check-in")
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const auth = authResponse(url)
      if (auth) return auth
      if (
        url.endsWith("/api/v1/operator/check-ins") &&
        init?.method === "POST"
      ) {
        return success({
          visitId: "301",
          reservationId: "101",
          sessionId: "204",
          reservationStatus: "CHECKED_IN",
          checkInMethod: "QR",
          checkedAt: "2026-08-20T12:00:00Z",
        })
      }
      if (url.endsWith("/api/v1/operator/reservations/101/payment")) {
        return success({
          reservationId: "101",
          reservationNo: "R-CHECK-IN-101",
          contentId: "104",
          sessionId: "204",
          payment: null,
          refund: null,
          updatedAt: "2026-08-20T12:00:00Z",
        })
      }
      if (
        url.endsWith(
          "/api/v1/operator/reservations/search?reservationNo=R-CHECK-IN-101",
        )
      ) {
        return success({
          ...reservation,
          status: "CHECKED_IN",
          checkIn: {
            checkedIn: true,
            canCheckIn: false,
            checkedAt: "2026-08-20T12:00:00Z",
          },
        })
      }
      throw new Error(`예상하지 못한 요청: ${url}`)
    })
    vi.stubGlobal("fetch", fetchMock)

    render(<App />)
    fireEvent.change(
      await screen.findByPlaceholderText("스캐너가 전달한 QR 토큰"),
      { target: { value: "valid-qr-token" } },
    )
    fireEvent.click(screen.getByRole("button", { name: "QR 토큰 확인" }))

    expect(
      await screen.findByRole("heading", { name: "체크인이 완료되었습니다." }),
    ).toBeInTheDocument()
    expect(await screen.findByText("김*자 · 010-****-5678")).toBeInTheDocument()
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/operator/reservations/101/payment"),
        expect.anything(),
      ),
    )
  })
})
