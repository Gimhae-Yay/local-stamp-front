import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { getMyAvailableCoupons } from "../api/activities";
import { createPayment } from "../api/reservations";
import { requestPortOneCheckout, validatePortOneCheckoutConfiguration } from "../payments/portone";
import { BookingConfirmPage } from "./ReservationPages";

vi.mock("../api/activities", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/activities")>()),
  getMyAvailableCoupons: vi.fn(),
}));

vi.mock("../api/reservations", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/reservations")>()),
  createPayment: vi.fn(),
}));

vi.mock("../payments/portone", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../payments/portone")>()),
  requestPortOneCheckout: vi.fn(),
  validatePortOneCheckoutConfiguration: vi.fn(),
}));

const getMyAvailableCouponsMock = vi.mocked(getMyAvailableCoupons);
const createPaymentMock = vi.mocked(createPayment);
const requestPortOneCheckoutMock = vi.mocked(requestPortOneCheckout);
const validatePortOneCheckoutConfigurationMock = vi.mocked(validatePortOneCheckoutConfiguration);

const booking = {
  content: {
    contentId: "10",
    contentType: "EVENT_EXPERIENCE" as const,
    title: "김해 지역 축제",
    description: "설명",
    locationText: "김해시",
    operatingHoursText: "10:00~18:00",
    contactText: "055-000-0000",
    precautions: "주의사항",
    ageRequirement: "전체 이용가",
    materials: "없음",
    cancellationPolicyText: "취소 정책",
    representativeImageUrl: null,
    representativeImageUrlExpiresAt: null,
  },
  session: {
    sessionId: "20",
    contentId: "10",
    startsAt: "2026-08-23T01:00:00Z",
    endsAt: "2026-08-23T02:00:00Z",
    price: 12_000,
    remainingCapacity: 9,
    reservable: true,
  },
  hold: {
    holdId: "33",
    sessionId: "20",
    quantity: 1,
    status: "ACTIVE" as const,
    expiresAt: "2026-08-23T02:30:00Z",
    createdAt: "2026-08-23T00:30:00Z",
  },
  quantity: 1,
};

describe("BookingConfirmPage", () => {
  beforeEach(() => {
    getMyAvailableCouponsMock.mockResolvedValue({ availableCoupons: [] });
    validatePortOneCheckoutConfigurationMock.mockReturnValue({
      storeId: "store-test",
      channelKey: "channel-key-test",
    });
    createPaymentMock.mockResolvedValue({
      requiresPayment: true,
      payment: {
        paymentId: "6",
        holdId: "33",
        orderId: "ORD-20260823-ABC123",
        status: "PENDING",
        amount: {
          baseAmount: 12_000,
          discountAmount: 2_000,
          finalAmount: 10_000,
          currency: "KRW",
        },
        createdAt: "2026-08-23T00:31:00Z",
      },
      reservation: null,
    });
    requestPortOneCheckoutMock.mockResolvedValue({
      transactionType: "PAYMENT",
      txId: "tx-1",
      paymentId: "ORD-20260823-ABC123",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("결제 생성 후 PortOne 결제창을 요청하고 결제 완료 페이지로 이동한다", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter
        initialEntries={[{ pathname: "/events/10/reserve/confirm", state: booking }]}
      >
        <Routes>
          <Route path="/events/:eventId/reserve/confirm" element={<BookingConfirmPage />} />
          <Route path="/payment/complete" element={<p>결제 완료 페이지</p>} />
        </Routes>
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText("이름"), "홍길동");
    await user.type(screen.getByLabelText("연락처"), "010-1234-5678");
    await user.type(screen.getByLabelText("이메일"), "visitor@example.com");
    await user.click(screen.getByRole("button", { name: "결제 진행하기" }));

    await waitFor(() => {
      expect(validatePortOneCheckoutConfigurationMock).toHaveBeenCalledTimes(1);
      expect(requestPortOneCheckoutMock).toHaveBeenCalledWith({
        paymentId: "6",
        orderId: "ORD-20260823-ABC123",
        orderName: "김해 지역 축제",
        totalAmount: 10_000,
        currency: "KRW",
        customer: {
          fullName: "홍길동",
          phoneNumber: "010-1234-5678",
          email: "visitor@example.com",
        },
      });
    });

    expect(await screen.findByText("결제 완료 페이지")).toBeInTheDocument();
  });

  it("쿠폰으로 최종 금액이 0원이면 결제자 정보 없이 예약 완료 화면으로 이동한다", async () => {
    getMyAvailableCouponsMock.mockResolvedValue({
      availableCoupons: [
        {
          couponId: "40",
          policyName: "전액 할인 쿠폰",
          discountPreview: {
            baseAmount: 12_000,
            discountAmount: 12_000,
            payableAmount: 0,
            currency: "KRW",
          },
        },
      ],
    });
    createPaymentMock.mockResolvedValue({
      requiresPayment: false,
      payment: null,
      reservation: {
        reservationId: "70",
        reservationNo: "R20260823ABC123",
        holdId: "33",
        status: "CONFIRMED",
        confirmedAt: "2026-08-23T00:31:00Z",
      },
    });
    const user = userEvent.setup();

    render(
      <MemoryRouter
        initialEntries={[{ pathname: "/events/10/reserve/confirm", state: booking }]}
      >
        <Routes>
          <Route path="/events/:eventId/reserve/confirm" element={<BookingConfirmPage />} />
          <Route path="/events/:eventId/reserve/complete" element={<p>예약 완료 페이지</p>} />
        </Routes>
      </MemoryRouter>,
    );

    await user.selectOptions(await screen.findByLabelText("적용 쿠폰"), "40");
    expect(screen.queryByRole("group", { name: "결제자 정보" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "예약 확정하기" }));

    expect(await screen.findByText("예약 완료 페이지")).toBeInTheDocument();
    expect(requestPortOneCheckoutMock).not.toHaveBeenCalled();
  });
});
