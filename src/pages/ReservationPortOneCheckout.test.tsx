import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { clearAuthentication } from "../api/client";
import { BookingConfirmPage } from "./ReservationPages";

const portOneMocks = vi.hoisted(() => ({
  requestPortOneCheckout: vi.fn(),
  validatePortOneCustomer: vi.fn((customer) => customer),
}));

vi.mock("../payments/portone", () => portOneMocks);

function response(data: unknown) {
  return new Response(
    JSON.stringify({
      statusCode: 200,
      code: "SUCCESS",
      message: "success",
      data,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

const booking = {
  content: {
    contentId: "9930003",
    contentType: "EVENT_EXPERIENCE" as const,
    title: "김해 분청도자기 원데이 클래스",
    description: "PortOne 결제창 테스트",
    locationText: "김해시 도자기 공방",
    operatingHoursText: "매일 11:00-19:00",
    contactText: "055-000-0000",
    precautions: "",
    ageRequirement: "",
    materials: "",
    cancellationPolicyText: "",
    representativeImageUrl: null,
    representativeImageUrlExpiresAt: null,
  },
  session: {
    sessionId: "9930006",
    contentId: "9930003",
    price: 5_000,
    remainingCapacity: 10,
    reservable: true,
    startsAt: "2030-08-24T01:00:00Z",
    endsAt: "2030-08-24T03:00:00Z",
  },
  hold: {
    holdId: "9930022",
    sessionId: "9930006",
    quantity: 2,
    status: "ACTIVE" as const,
    expiresAt: "2030-08-23T02:00:00Z",
    createdAt: "2030-08-23T01:50:00Z",
  },
  quantity: 2,
};

const payment = {
  paymentId: "9930040",
  holdId: booking.hold.holdId,
  orderId: "order-9930040",
  status: "PENDING",
  amount: {
    baseAmount: 10_000,
    discountAmount: 0,
    finalAmount: 10_000,
    currency: "KRW",
  },
  createdAt: "2030-08-23T01:51:00Z",
};

afterEach(() => {
  clearAuthentication();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("방문자 PortOne 결제", () => {
  it("백엔드 최종 금액으로 PortOne을 호출한 뒤 결제 결과 화면으로 이동한다", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        response({
          holdId: booking.hold.holdId,
          evaluatedAt: "2030-08-23T01:50:00Z",
          availableCoupons: [],
        }),
      )
      .mockResolvedValueOnce(
        response({
          requiresPayment: true,
          payment,
          reservation: null,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    portOneMocks.requestPortOneCheckout.mockResolvedValue({ paymentId: payment.orderId });

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/events/9930003/reserve/confirm",
            state: booking,
          },
        ]}
      >
        <Routes>
          <Route path="/events/:eventId/reserve/confirm" element={<BookingConfirmPage />} />
          <Route path="/payment/complete" element={<p>결제 결과 화면</p>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await user.type(screen.getByLabelText("이름"), "김해시민");
    await user.type(screen.getByLabelText("연락처"), "010-1234-5678");
    await user.type(screen.getByLabelText("이메일"), "gimhae@example.com");
    await user.click(screen.getByRole("button", { name: "결제 진행하기" }));

    await waitFor(() =>
      expect(portOneMocks.requestPortOneCheckout).toHaveBeenCalledWith({
        backendPaymentId: payment.paymentId,
        orderId: payment.orderId,
        orderName: booking.content.title,
        totalAmount: payment.amount.finalAmount,
        currency: payment.amount.currency,
        customer: {
          fullName: "김해시민",
          phoneNumber: "010-1234-5678",
          email: "gimhae@example.com",
        },
      }),
    );
    expect(await screen.findByText("결제 결과 화면")).toBeInTheDocument();
  });
});
