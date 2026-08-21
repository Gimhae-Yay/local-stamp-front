import { afterEach, describe, expect, it, vi } from "vitest";

import {
  checkInByQr,
  checkInManually,
  isLocalFakeImageStorageUrl,
  resolveImageUploadUrl,
  getStampbook,
  getLatestContentRevision,
  listStampbooks,
  listOperatorContentSessions,
  requestContentWithdrawal,
  resubmitContentRevision,
  updateContentRevision,
  withdrawContentRevision,
} from "./api";

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

afterEach(() => vi.unstubAllGlobals());

describe("운영자 대표 이미지 업로드 환경 판별", () => {
  it("로컬 Backend fake 저장소 URL만 실제 PUT 생략 대상으로 판별한다", () => {
    expect(
      isLocalFakeImageStorageUrl("http://localhost:8080/local-image-storage/contents%2Fdemo.webp"),
    ).toBe(true);

    expect(
      isLocalFakeImageStorageUrl("http://127.0.0.1:8080/local-image-storage/contents%2Fdemo.webp"),
    ).toBe(true);
  });

  it("운영 S3와 외부 유사 경로는 실제 업로드 대상으로 유지한다", () => {
    expect(
      isLocalFakeImageStorageUrl(
        "https://bucket.s3.ap-northeast-2.amazonaws.com/contents/demo.webp?signature=test",
      ),
    ).toBe(false);

    expect(
      isLocalFakeImageStorageUrl("https://example.com/local-image-storage/contents/demo.webp"),
    ).toBe(false);
  });

  it("로컬 개발에서는 지정한 S3 presigned URL을 같은 Origin 프록시 경로로 바꾼다", () => {
    const uploadUrl =
      "https://images.example.com/contents/demo.png?X-Amz-Signature=test&X-Amz-Expires=600";

    expect(resolveImageUploadUrl(uploadUrl, "https://images.example.com", true)).toBe(
      "/image-upload/contents/demo.png?X-Amz-Signature=test&X-Amz-Expires=600",
    );
  });

  it("운영 환경과 다른 저장소 Origin은 presigned URL을 그대로 사용한다", () => {
    const uploadUrl = "https://images.example.com/contents/demo.png?signature=test";

    expect(resolveImageUploadUrl(uploadUrl, "https://images.example.com", false)).toBe(uploadUrl);
    expect(resolveImageUploadUrl(uploadUrl, "https://other.example.com", true)).toBe(uploadUrl);
  });
});

describe("운영자 체크인 멱등 요청", () => {
  it("같은 QR 재시도에 호출자가 지정한 동일 키를 유지한다", async () => {
    const fetchMock = vi.fn((_: RequestInfo | URL, _init?: RequestInit) =>
      success({
        visitId: "301",

        reservationId: "101",

        sessionId: "201",

        reservationStatus: "CHECKED_IN",

        checkInMethod: "QR",

        checkedAt: "2026-08-20T12:00:00Z",
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    await checkInByQr("same-qr-token", "same-check-in-key");

    await checkInByQr("same-qr-token", "same-check-in-key");

    expect(fetchMock).toHaveBeenCalledTimes(2);

    for (const [, init] of fetchMock.mock.calls) {
      expect(new Headers(init?.headers).get("Idempotency-Key")).toBe("same-check-in-key");
    }
  });

  it("수동 체크인에 계약된 사유와 지정한 멱등 키를 전송한다", async () => {
    const fetchMock = vi.fn((_: RequestInfo | URL, _init?: RequestInit) =>
      success({
        visitId: "302",

        reservationId: "102",

        sessionId: "202",

        reservationStatus: "CHECKED_IN",

        checkInMethod: "RESERVATION_NUMBER",

        checkedAt: "2026-08-20T12:00:00Z",
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    await checkInManually("R-102", "QR_NOT_AVAILABLE", "manual-check-in-key");

    const [, init] = fetchMock.mock.calls[0]!;

    expect(new Headers(init?.headers).get("Idempotency-Key")).toBe("manual-check-in-key");

    expect(JSON.parse(String(init?.body))).toEqual({
      reservationNo: "R-102",

      reason: "QR_NOT_AVAILABLE",
    });
  });
});

describe("운영자 콘텐츠 수정본 명령", () => {
  it("수정본 편집과 철회를 계약된 URL과 본문으로 전송한다", async () => {
    const fetchMock = vi.fn((_: RequestInfo | URL, _init?: RequestInit) =>
      success({ revisionId: "501" }),
    );

    vi.stubGlobal("fetch", fetchMock);

    const input = {
      title: "수정 제목",

      description: "수정 소개",

      locationText: "김해",

      operatingHoursText: "주말",

      contactText: "055-000-0000",

      precautions: "주의",

      ageRequirement: "전체",

      materials: "없음",

      cancellationPolicyText: "취소 가능",

      reservationPrice: 10000,

      publishAt: null,
    };

    await updateContentRevision("501", input);

    await withdrawContentRevision("501", "일정 변경");

    expect(String(fetchMock.mock.calls[0]![0])).toContain("/api/v1/operator/content-revisions/501");

    expect(fetchMock.mock.calls[0]![1]?.method).toBe("PUT");

    expect(JSON.parse(String(fetchMock.mock.calls[0]![1]?.body))).toEqual(input);

    expect(String(fetchMock.mock.calls[1]![0])).toContain(
      "/api/v1/operator/content-revisions/501/withdraw",
    );

    expect(JSON.parse(String(fetchMock.mock.calls[1]![1]?.body))).toEqual({
      reason: "일정 변경",
    });
  });
});

describe("운영자 콘텐츠 회차·철회 계약", () => {
  it("운영자 전용 회차 조회 URL을 사용한다", async () => {
    const fetchMock = vi.fn((_: RequestInfo | URL, _init?: RequestInit) =>
      success({ contentId: "104", sessions: [] }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await listOperatorContentSessions("104");

    expect(String(fetchMock.mock.calls[0]![0])).toContain("/api/v1/operator/contents/104/sessions");
  });

  it("전체 철회 재시도에 호출자가 지정한 멱등 키를 유지한다", async () => {
    const fetchMock = vi.fn((_: RequestInfo | URL, _init?: RequestInit) =>
      success({ withdrawalRequestId: "701", status: "PENDING" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await requestContentWithdrawal("104", "운영 종료", "withdrawal-key");
    await requestContentWithdrawal("104", "운영 종료", "withdrawal-key");

    for (const [, init] of fetchMock.mock.calls) {
      expect(new Headers(init?.headers).get("Idempotency-Key")).toBe("withdrawal-key");
      expect(JSON.parse(String(init?.body))).toEqual({ reason: "운영 종료" });
    }
  });

  it("최신 수정본 조회와 반려 수정본 재제출 URL을 사용한다", async () => {
    const fetchMock = vi.fn((_: RequestInfo | URL, _init?: RequestInit) =>
      success({ revisionId: "502", contentId: "101" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await getLatestContentRevision("101");
    await resubmitContentRevision("501");

    expect(String(fetchMock.mock.calls[0]![0])).toContain(
      "/api/v1/operator/contents/101/revisions/latest",
    );
    expect(fetchMock.mock.calls[0]![1]?.method).toBeUndefined();
    expect(String(fetchMock.mock.calls[1]![0])).toContain(
      "/api/v1/operator/content-revisions/501/resubmit",
    );
    expect(fetchMock.mock.calls[1]![1]?.method).toBe("POST");
  });
});

describe("운영자 스탬프북 조회", () => {
  it("dev 계약의 목록·상세 GET URL을 호출한다", async () => {
    const fetchMock = vi.fn((_: RequestInfo | URL, _init?: RequestInit) =>
      success({ stampbooks: [] }),
    );

    vi.stubGlobal("fetch", fetchMock);

    await listStampbooks();

    await getStampbook("801");

    expect(String(fetchMock.mock.calls[0]![0])).toContain("/api/v1/operator/stampbooks");

    expect(String(fetchMock.mock.calls[1]![0])).toContain("/api/v1/operator/stampbooks/801");

    expect(fetchMock.mock.calls[0]![1]?.method).toBeUndefined();

    expect(fetchMock.mock.calls[1]![1]?.method).toBeUndefined();
  });
});
