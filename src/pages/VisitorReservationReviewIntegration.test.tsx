import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { clearAuthentication } from "../api/client";

function response(data: unknown, status = 200) {
  return new Response(
    JSON.stringify({
      statusCode: status,
      code: "SUCCESS",
      message: "success",
      data,
    }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

const publishedReview = {
  reviewId: "202",
  status: "PUBLISHED" as const,
  rating: 4,
  reviewText: "기존 후기 내용",
  createdAt: "2026-08-01T01:00:00Z",
  updatedAt: "2026-08-02T01:00:00Z",
};

function reservation(
  reservationId: string,
  contentId: string,
  title: string,
  review: typeof publishedReview | { status: "DELETED" } | null,
) {
  return {
    reservationId,
    reservationNo: `R-${reservationId}`,
    status: "CHECKED_IN",
    quantity: 1,
    confirmedAt: "2026-07-01T01:00:00Z",
    content: { contentId, title, locationText: "김해시" },
    session: {
      sessionId: reservationId,
      status: "COMPLETED",
      startsAt: "2026-07-10T01:00:00Z",
      endsAt: "2026-07-10T03:00:00Z",
    },
    checkIn: {
      checkedIn: true,
      checkedAt: "2026-07-10T01:10:00Z",
      visitId: `visit-${reservationId}`,
    },
    review:
      review?.status === "DELETED"
        ? {
            reviewId: "303",
            status: "DELETED",
            rating: null,
            reviewText: null,
            createdAt: "2026-07-10T02:00:00Z",
            updatedAt: "2026-07-11T02:00:00Z",
          }
        : review,
  };
}

afterEach(() => {
  clearAuthentication();
  window.localStorage.clear();
  vi.unstubAllGlobals();
  window.history.replaceState({}, "", "/");
});

describe("visitor reservation review integration", () => {
  it("links content titles and separates review creation, editing, and deleted history", async () => {
    window.history.replaceState({}, "", "/reservations?tab=past");
    const reservations = [
      reservation("1", "101", "후기 미작성 콘텐츠", null),
      reservation("2", "102", "후기 작성 콘텐츠", publishedReview),
      reservation("3", "103", "후기 삭제 콘텐츠", { status: "DELETED" }),
    ];
    const detail = {
      reservation: {
        reservationId: "2",
        reservationNo: "R-2",
        status: "CHECKED_IN",
        quantity: 1,
        confirmedAt: "2026-07-01T01:00:00Z",
        cancelledAt: null,
        cancellationReason: null,
        expiredAt: null,
      },
      session: {
        sessionId: "2",
        contentId: "102",
        status: "COMPLETED",
        startsAt: "2026-07-10T01:00:00Z",
        endsAt: "2026-07-10T03:00:00Z",
        checkinOpenAt: "2026-07-10T00:30:00Z",
        checkinCloseAt: "2026-07-10T01:30:00Z",
      },
      content: {
        contentId: "102",
        title: "후기 작성 콘텐츠",
        locationText: "김해시",
      },
      checkIn: {
        checkedIn: true,
        checkedAt: "2026-07-10T01:10:00Z",
        visitId: "visit-2",
      },
      review: publishedReview,
    };
    const fetchMock = vi.fn().mockImplementation((input: string, init?: RequestInit) => {
      if (input === "/api/v1/auth/refresh") {
        return Promise.resolve(response({ accessToken: "token-1" }));
      }
      if (input === "/api/v1/me") {
        return Promise.resolve(
          response({
            roleAssignments: [{ role: "VISITOR", regionId: null, regionName: null }],
          }),
        );
      }
      if (input === "/api/v1/regions") {
        return Promise.resolve(
          response({
            regions: [{ regionId: "1", regionCode: "GIMHAE", name: "김해시" }],
          }),
        );
      }
      if (input === "/api/v1/me/reservations") {
        return Promise.resolve(response({ reservations }));
      }
      if (input === "/api/v1/me/refunds") {
        return Promise.resolve(response({ refunds: [] }));
      }
      if (input === "/api/v1/me/reservations/2") {
        return Promise.resolve(response(detail));
      }
      if (input === "/api/v1/reviews/202" && init?.method === "PATCH") {
        return Promise.resolve(
          response({
            reviewId: "202",
            rating: 4,
            reviewText: "수정한 후기 내용",
            createdAt: publishedReview.createdAt,
            updatedAt: "2026-08-03T01:00:00Z",
          }),
        );
      }
      return Promise.reject(new Error(`unexpected request: ${input}`));
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<App />);

    expect(await screen.findByRole("link", { name: "후기 미작성 콘텐츠" })).toHaveAttribute(
      "href",
      "/events/101",
    );
    expect(screen.getByRole("link", { name: "후기 작성 콘텐츠" })).toHaveAttribute(
      "href",
      "/events/102",
    );
    expect(screen.getByRole("link", { name: "후기 삭제 콘텐츠" })).toHaveAttribute(
      "href",
      "/events/103",
    );
    expect(screen.getAllByRole("link", { name: "후기 작성" })).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: "후기 수정" })).toHaveLength(1);

    await user.click(screen.getByRole("link", { name: "후기 수정" }));

    expect(await screen.findByRole("textbox")).toHaveValue("기존 후기 내용");
    expect(screen.getByRole("button", { name: "후기 수정하기" })).toBeInTheDocument();

    const reviewInput = screen.getByRole("textbox");
    await user.clear(reviewInput);
    await user.type(reviewInput, "수정한 후기 내용");
    await user.click(screen.getByRole("button", { name: "후기 수정하기" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/reviews/202",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ rating: 4, reviewText: "수정한 후기 내용" }),
      }),
    );
    await waitFor(() => {
      expect(window.location.pathname).toBe("/reservations");
      expect(window.location.search).toBe("?tab=past");
    });
  });
});
