import { afterEach, describe, expect, it, vi } from "vitest";
import { clearAuthentication } from "./client";
import {
  cancelOperatorSession,
  createContentRevision,
  createOperatorSession,
  getOperatorContentSessions,
  getOperatorSessionReservations,
  requestContentWithdrawal,
  requestSessionChange,
  searchOperatorReservation,
  updateContentRevision,
  withdrawContentRevision,
  type ContentRevisionFields,
  type SessionFields,
} from "./operator";

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

afterEach(() => {
  clearAuthentication();
  vi.unstubAllGlobals();
});

describe("operator content commands", () => {
  it("uses the content revision command contracts", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        response(
          {
            revisionId: "51",
            contentId: "10",
            status: "EDIT_REQUESTED",
            baseContentVersion: 1,
            submittedAt: "2026-08-20T01:00:00Z",
          },
          201,
        ),
      )
      .mockResolvedValueOnce(
        response({
          revisionId: "51",
          contentId: "10",
          status: "EDIT_REJECTED",
        }),
      )
      .mockResolvedValueOnce(
        response({
          revisionId: "51",
          contentId: "10",
          status: "EDIT_WITHDRAWN",
          withdrawalReason: "일정 재검토",
          withdrawnAt: "2026-08-20T02:00:00Z",
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const fields: ContentRevisionFields = {
      title: "수정 제목",
      description: "설명",
      locationText: "장소",
      operatingHoursText: "10:00-18:00",
      contactText: "055-000-0000",
      precautions: "유의사항",
      ageRequirement: "전체",
      materials: "없음",
      cancellationPolicyText: "회차 시작 전 취소 가능",
      reservationPrice: 10000,
    };

    await createContentRevision("10", fields);
    await updateContentRevision("51", fields);
    await withdrawContentRevision("51", "일정 재검토");

    expect(fetchMock.mock.calls.map(([input]) => input)).toEqual([
      "/api/v1/operator/contents/10/revisions",
      "/api/v1/operator/content-revisions/51",
      "/api/v1/operator/content-revisions/51/withdraw",
    ]);
    expect(fetchMock.mock.calls.map(([, init]) => init?.method)).toEqual(["POST", "PUT", "POST"]);
    expect(fetchMock.mock.calls[2]?.[1]?.body).toBe(JSON.stringify({ reason: "일정 재검토" }));
  });

  it("uses the session create, change, and cancel command contracts", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ sessionId: "21" }, 201))
      .mockResolvedValueOnce(response({ revisionId: "31" }, 201))
      .mockResolvedValueOnce(response({ sessionId: "21", status: "CANCELLED" }));
    vi.stubGlobal("fetch", fetchMock);
    const fields: SessionFields = {
      startsAt: "2026-09-01T10:00:00+09:00",
      endsAt: "2026-09-01T12:00:00+09:00",
      checkinOpenAt: "2026-09-01T09:30:00+09:00",
      checkinCloseAt: "2026-09-01T11:30:00+09:00",
      capacity: 30,
    };

    await createOperatorSession("10", fields);
    await requestSessionChange("21", fields);
    await cancelOperatorSession("21", "기상 악화");

    expect(fetchMock.mock.calls.map(([input]) => input)).toEqual([
      "/api/v1/operator/contents/10/sessions",
      "/api/v1/operator/sessions/21/change-requests",
      "/api/v1/operator/sessions/21/cancel",
    ]);
    expect(fetchMock.mock.calls.every(([, init]) => init?.method === "POST")).toBe(true);
    expect(fetchMock.mock.calls[2]?.[1]?.body).toBe(
      JSON.stringify({ cancellationReason: "기상 악화" }),
    );
  });

  it("loads every operator-owned session from the content session endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      response({
        contentId: "10",
        sessions: [
          {
            sessionId: "21",
            status: "REJECTED",
            version: 2,
            startsAt: "2026-09-01T10:00:00+09:00",
            endsAt: "2026-09-01T12:00:00+09:00",
            checkinOpenAt: "2026-09-01T09:30:00+09:00",
            checkinCloseAt: "2026-09-01T11:30:00+09:00",
            capacity: 30,
            remainingCapacity: 30,
            rejectReason: "운영 시간 확인 필요",
            cancelledAt: null,
            cancellationReason: null,
            completedAt: null,
            createdAt: "2026-08-20T01:00:00Z",
            pendingChangeRequest: null,
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await getOperatorContentSessions("10");

    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/v1/operator/contents/10/sessions");
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBeUndefined();
    expect(result.sessions[0]?.status).toBe("REJECTED");
  });

  it("uses the withdrawal idempotency and operator reservation read contracts", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(response({})));
    vi.stubGlobal("fetch", fetchMock);

    await requestContentWithdrawal("10", "운영 계획 변경", "same-key");
    await requestContentWithdrawal("10", "운영 계획 변경", "same-key");
    await requestContentWithdrawal("10", "운영 계획 변경", "different-key");
    await getOperatorSessionReservations("10", "21");
    await searchOperatorReservation("R-2026");

    expect(fetchMock.mock.calls.map(([input]) => input)).toEqual([
      "/api/v1/operator/contents/10/withdrawal-requests",
      "/api/v1/operator/contents/10/withdrawal-requests",
      "/api/v1/operator/contents/10/withdrawal-requests",
      "/api/v1/operator/contents/10/reservations?sessionId=21",
      "/api/v1/operator/reservations/search?reservationNo=R-2026",
    ]);
    expect(
      fetchMock.mock.calls
        .slice(0, 3)
        .map(([, init]) => new Headers(init?.headers).get("Idempotency-Key")),
    ).toEqual(["same-key", "same-key", "different-key"]);
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(JSON.stringify({ reason: "운영 계획 변경" }));
  });
});
