import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import OperatorReservationSearchPage from "./OperatorReservationPages";

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

function errorResponse(code: string, message: string, status: number) {
  return new Response(JSON.stringify({ statusCode: status, code, message, data: null }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("operator reservation search integration", () => {
  it("validates an empty number and displays success, not found, and forbidden results", async () => {
    const fetchMock = vi.fn().mockImplementation((input: string) => {
      if (input === "/api/v1/operator/reservations/search?reservationNo=R-OK") {
        return Promise.resolve(
          response({
            reservationId: "301",
            reservationNo: "R-OK",
            status: "CONFIRMED",
            content: { contentId: "10", title: "가야 체험" },
            session: {
              sessionId: "21",
              status: "SCHEDULED",
              startsAt: "2027-09-01T10:00:00+09:00",
              endsAt: "2027-09-01T12:00:00+09:00",
              checkinOpenAt: "2027-09-01T09:30:00+09:00",
              checkinCloseAt: "2027-09-01T10:30:00+09:00",
            },
            participant: { name: "김*수", phone: "010-****-1234" },
            checkIn: {
              checkedIn: false,
              canCheckIn: true,
              checkedAt: null,
            },
          }),
        );
      }
      if (input === "/api/v1/operator/reservations/search?reservationNo=MISSING") {
        return Promise.resolve(errorResponse("NOT_FOUND", "예약을 찾을 수 없습니다.", 404));
      }
      if (input === "/api/v1/operator/reservations/search?reservationNo=FOREIGN") {
        return Promise.resolve(errorResponse("FORBIDDEN", "접근 권한이 없습니다.", 403));
      }
      return Promise.reject(new Error(`unexpected request: ${input}`));
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <OperatorReservationSearchPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "검색" }));
    expect(screen.getByText("예약번호를 입력해 주세요.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    const input = screen.getByLabelText("예약번호");
    await user.type(input, "  R-OK  ");
    await user.click(screen.getByRole("button", { name: "검색" }));
    expect(await screen.findByText("가야 체험")).toBeInTheDocument();
    expect(screen.getByText("예약 확정")).toBeInTheDocument();
    expect(screen.getByText("체크인 가능")).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, "MISSING");
    await user.click(screen.getByRole("button", { name: "검색" }));
    expect(await screen.findByText(/일치하는 예약번호를 찾을 수 없습니다/)).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, "FOREIGN");
    await user.click(screen.getByRole("button", { name: "검색" }));
    expect(
      await screen.findByText("담당 콘텐츠의 예약이 아니어서 조회할 수 없습니다."),
    ).toBeInTheDocument();
  });
});
