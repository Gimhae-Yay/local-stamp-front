import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReservationDetailPage } from "./ReservationPages";

const { toCanvasMock } = vi.hoisted(() => ({
  toCanvasMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("qrcode", () => ({
  default: { toCanvas: toCanvasMock },
}));

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
  );
}

const detail = {
  reservation: {
    reservationId: "101",
    reservationNo: "R-QR-101",
    status: "CONFIRMED",
    quantity: 1,
    confirmedAt: "2099-08-23T01:00:00Z",
    cancelledAt: null,
    cancellationReason: null,
    expiredAt: null,
  },
  session: {
    sessionId: "201",
    contentId: "301",
    status: "SCHEDULED",
    startsAt: "2099-08-23T02:00:00Z",
    endsAt: "2099-08-23T03:00:00Z",
    checkinOpenAt: "2099-08-23T01:30:00Z",
    checkinCloseAt: "2099-08-23T02:30:00Z",
  },
  content: { contentId: "301", title: "QR 체험", locationText: "김해" },
  checkIn: { checkedIn: false, checkedAt: null, visitId: null },
  review: null,
};

describe("예약 QR 표시", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("캔버스에 QR을 그리고 만료되면 숨긴 뒤 재발급 버튼을 표시한다", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/v1/me/reservations/101")) return success(detail);
      if (url.endsWith("/api/v1/me/refunds")) return success({ refunds: [] });
      if (url.endsWith("/api/v1/me/reservations/101/qr")) {
        return success({
          reservationId: 101,
          sessionId: 201,
          qrToken: "short-lived-qr-token",
          issuedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 100).toISOString(),
          checkinClosesAt: "2099-08-23T02:30:00Z",
        });
      }
      throw new Error(`예상하지 못한 요청: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter initialEntries={["/reservations/101"]}>
        <Routes>
          <Route path="/reservations/:reservationId" element={<ReservationDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "체크인 QR 불러오기" }));

    const qr = await screen.findByRole("img", { name: "체크인 QR 코드" });
    expect(toCanvasMock).toHaveBeenCalledWith(qr, "short-lived-qr-token", {
      width: 220,
      margin: 1,
    });
    expect(qr).not.toHaveAttribute("hidden");

    expect(
      await screen.findByText("QR 유효시간이 끝났습니다. 새 QR을 불러와 주세요."),
    ).toBeInTheDocument();
    expect(qr).toHaveAttribute("hidden");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "체크인 QR 불러오기" })).toBeEnabled(),
    );
  });
});
