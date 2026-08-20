import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import AdminAccountPage from "./pages/AdminAccountPage"
import {
  ManualRefundPage,
  RefundFailureDetailPage,
} from "./pages/TransactionPages"

function response(data: unknown, status = 200) {
  return new Response(
    JSON.stringify({
      statusCode: status,
      code: "SUCCESS",
      message: "success",
      data,
    }),
    { status, headers: { "Content-Type": "application/json" } },
  )
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

describe("platform admin integration", () => {
  it("renders platform administrators from the dedicated account API", async () => {
    window.localStorage.setItem("local-stamp:user-id", "900013")
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe("/api/v1/platform-admin/admin-accounts")
      return response({
        adminAccounts: [
          {
            userId: "900013",
            loginIdentifier: "superadmin@test.local",
            name: "최고 관리자",
            grade: "SUPER_ADMIN",
            status: "ACTIVE",
            createdAt: "2026-08-20T10:00:00Z",
            inactivatedAt: null,
          },
          {
            userId: "900016",
            loginIdentifier: "inactive@test.local",
            name: "비활성 관리자",
            grade: "PLATFORM_ADMIN",
            status: "INACTIVE",
            createdAt: "2026-08-20T11:00:00Z",
            inactivatedAt: "2026-08-20T12:00:00Z",
          },
        ],
      })
    })
    vi.stubGlobal("fetch", fetchMock)

    render(
      <MemoryRouter>
        <AdminAccountPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText("superadmin@test.local · 사용자 ID 900013")).toBeInTheDocument()
    expect(screen.getByText("inactive@test.local · 사용자 ID 900016")).toBeInTheDocument()
    expect(screen.getByText("최고 관리자", { selector: ".pa-badge" })).toBeInTheDocument()
    expect(screen.getByText("플랫폼 관리자", { selector: ".pa-badge" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "현재 계정" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "비활성화됨" })).toBeDisabled()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("keeps admin account mutations read-only for a platform administrator", async () => {
    window.localStorage.setItem("local-stamp:user-id", "900018")
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        response({
          adminAccounts: [
            {
              userId: "900018",
              loginIdentifier: "platform@test.local",
              name: "플랫폼 관리자",
              grade: "PLATFORM_ADMIN",
              status: "ACTIVE",
              createdAt: "2026-08-20T10:00:00Z",
              inactivatedAt: null,
            },
            {
              userId: "900013",
              loginIdentifier: "super@test.local",
              name: "최고 관리자",
              grade: "SUPER_ADMIN",
              status: "ACTIVE",
              createdAt: "2026-08-20T09:00:00Z",
              inactivatedAt: null,
            },
          ],
        }),
      ),
    )

    render(
      <MemoryRouter>
        <AdminAccountPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText("조회 전용", { selector: "strong" })).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /전체 관리자 계정 생성/ }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "비활성화" })).not.toBeInTheDocument()
    expect(screen.getAllByText("조회 전용", { selector: ".pa-readonly-action" })).toHaveLength(2)
  })

  it("opens a confirmation modal before sending a manual refund", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe("/api/v1/platform-admin/payments/900022/refund")
      return response(
        {
          refundId: "900020",
          status: "REQUESTED",
          amount: 10000,
          requestedAt: "2026-08-20T10:00:00Z",
        },
        201,
      )
    })
    vi.stubGlobal("fetch", fetchMock)
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={["/admin/manual-refund?paymentId=900022"]}>
        <ManualRefundPage />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText(/증빙 참조/), "LOCAL-E2E-REFUND")
    await user.type(screen.getByLabelText("환불 사유 *"), "승인 결제 전액 환불")
    await user.click(screen.getByRole("button", { name: "전액 환불 요청" }))

    const firstDialog = screen.getByRole("dialog")
    expect(within(firstDialog).getByText("결제 ID 900022 전액 환불")).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()

    await user.click(within(firstDialog).getByRole("button", { name: "취소" }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "전액 환불 요청" }))
    const secondDialog = screen.getByRole("dialog")
    await user.click(within(secondDialog).getByRole("button", { name: "최종 환불 요청" }))

    expect(await screen.findByText("환불 ID 900020", { exact: false })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          evidenceReference: "LOCAL-E2E-REFUND",
          reason: "승인 결제 전액 환불",
        }),
      }),
    )
  })

  it.each([
    ["SUCCEEDED", "환불 상세 #900023"],
    ["FAILED", "환불 실패 #900023"],
    ["DISCREPANT", "환불 결과 불일치 #900023"],
  ])("renders the refund detail title for %s", async (status, title) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        response({
          refund: {
            refundId: "900023",
            paymentId: "900010",
            reservationId: "900010",
            amount: 10000,
            currency: "KRW",
            status,
            requestedAt: "2026-08-20T10:00:00Z",
            completedAt:
              status === "SUCCEEDED" ? "2026-08-20T10:01:00Z" : null,
          },
          payment: {
            paymentId: "900010",
            orderId: "order-900010",
            portonePaymentId: "portone-900010",
            finalAmount: 10000,
            currency: "KRW",
          },
          attempts: [],
        }),
      ),
    )

    render(
      <MemoryRouter initialEntries={["/admin/refund-failures/900023"]}>
        <Routes>
          <Route
            path="/admin/refund-failures/:refundId"
            element={<RefundFailureDetailPage />}
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole("heading", { name: title }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "← 이전 화면으로" }),
    ).toBeInTheDocument()
  })
})
