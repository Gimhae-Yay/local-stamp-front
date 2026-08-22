import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { getMyPayment } from "../api/reservations";
import { PaymentCompletePage } from "./ReservationPages";

vi.mock("../api/reservations", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/reservations")>()),
  getMyPayment: vi.fn(),
}));

const getMyPaymentMock = vi.mocked(getMyPayment);

describe("PaymentCompletePage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("PortOne 결제 ID가 아닌 내부 결제 ID로 상태를 조회한다", async () => {
    getMyPaymentMock.mockResolvedValue({
      paymentId: "6",
      holdId: "33",
      orderId: "ORD-20260823-ABC123",
      status: "PENDING",
      amount: {
        baseAmount: 12_000,
        discountAmount: 0,
        finalAmount: 12_000,
        currency: "KRW",
      },
      reservationId: null,
      createdAt: "2026-08-23T00:31:00Z",
      finalizedAt: null,
    });

    render(
      <MemoryRouter
        initialEntries={["/payment/complete?backendPaymentId=6&paymentId=ORD-20260823-ABC123"]}
      >
        <Routes>
          <Route path="/payment/complete" element={<PaymentCompletePage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(getMyPaymentMock).toHaveBeenCalledWith("6", expect.any(AbortSignal));
    });
    expect(await screen.findByText("결제 ID")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
  });

  it("PortOne 리다이렉트 오류에서는 내부 결제 상태를 조회하지 않는다", async () => {
    render(
      <MemoryRouter
        initialEntries={[
          "/payment/complete?backendPaymentId=6&code=FAILURE_TYPE_PG&message=결제가%20취소되었습니다.",
        ]}
      >
        <Routes>
          <Route path="/payment/complete" element={<PaymentCompletePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText(
        "결제가 완료되지 않았습니다. (FAILURE_TYPE_PG: 결제가 취소되었습니다.)",
      ),
    ).toBeInTheDocument();
    expect(getMyPaymentMock).not.toHaveBeenCalled();
  });
});
