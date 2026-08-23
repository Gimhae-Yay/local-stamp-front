import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { clearAuthentication } from "../api/client";
import { BookingConfirmPage } from "./ReservationPages";

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
    title: "유료 도자기 체험",
    description: "결제 금액 테스트",
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
    price: 10_000,
    remainingCapacity: 10,
    reservable: true,
    startsAt: "2030-08-24T01:00:00Z",
    endsAt: "2030-08-24T03:00:00Z",
  },
  hold: {
    holdId: "9930022",
    sessionId: "9930006",
    quantity: 3,
    status: "ACTIVE" as const,
    expiresAt: "2030-08-23T02:00:00Z",
    createdAt: "2030-08-23T01:50:00Z",
  },
  quantity: 3,
};

afterEach(() => {
  clearAuthentication();
  vi.unstubAllGlobals();
});

describe("방문자 결제 전 금액", () => {
  it("1인 가격에 예약 인원수를 곱해 예약 금액과 최종 금액을 표시한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      response({
        holdId: booking.hold.holdId,
        evaluatedAt: "2030-08-23T01:50:00Z",
        availableCoupons: [],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

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
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("예약 인원").parentElement).toHaveTextContent("3명");
    expect(screen.getByText("예약 금액").parentElement).toHaveTextContent("30,000원");
    expect(screen.getByText("최종 금액").parentElement).toHaveTextContent("30,000원");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });
});
