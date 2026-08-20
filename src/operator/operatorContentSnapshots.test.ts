import { beforeEach, describe, expect, it } from "vitest"
import {
  isContentRevisionReviewFresh,
  mergeContentSessionSnapshots,
  readContentRevisionSnapshot,
  readContentSessionSnapshots,
  readLatestContentRevisionSnapshot,
  writeContentRevisionSnapshot,
  writeContentSessionSnapshots,
} from "./operatorContentSnapshots"

describe("운영자 콘텐츠 화면 상태 복원", () => {
  beforeEach(() => window.localStorage.clear())

  it("수정본을 ID와 원본 콘텐츠 양쪽에서 다시 찾을 수 있게 저장한다", () => {
    const snapshot = {
      revisionId: "501",
      contentId: "101",
      status: "EDIT_REQUESTED",
      candidate: {
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
      },
    }

    writeContentRevisionSnapshot("44", snapshot)

    expect(readContentRevisionSnapshot("44", "501")).toEqual(
      expect.objectContaining(snapshot),
    )
    expect(readLatestContentRevisionSnapshot("44", "101")).toEqual(
      expect.objectContaining(snapshot),
    )
  })

  it("공개 회차와 로컬 심사·취소 상태를 합쳐 새로고침 뒤에도 표시한다", () => {
    writeContentSessionSnapshots("44", "101", [
      {
        sessionId: "201",
        contentId: "101",
        status: "PENDING",
        startsAt: "2099-08-25T01:00:00Z",
        endsAt: "2099-08-25T03:00:00Z",
        checkinOpenAt: "2099-08-25T00:30:00Z",
        checkinCloseAt: "2099-08-25T02:00:00Z",
        capacity: 20,
      },
      {
        sessionId: "202",
        contentId: "101",
        status: "CANCELLED",
        startsAt: "2099-08-26T01:00:00Z",
        endsAt: "2099-08-26T03:00:00Z",
        checkinOpenAt: "2099-08-26T00:30:00Z",
        checkinCloseAt: "2099-08-26T02:00:00Z",
        capacity: 20,
      },
    ])

    const merged = mergeContentSessionSnapshots(
      [
        {
          sessionId: "201",
          startsAt: "2099-08-25T01:00:00Z",
          endsAt: "2099-08-25T03:00:00Z",
        },
      ],
      readContentSessionSnapshots("44", "101"),
    )

    expect(merged).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sessionId: "201", status: "SCHEDULED" }),
        expect.objectContaining({ sessionId: "202", status: "CANCELLED" }),
      ]),
    )
  })

  it("오래된 수정본 요청은 화면 잠금에 사용하지 않는다", () => {
    const snapshot = {
      revisionId: "501",
      contentId: "101",
      status: "EDIT_REQUESTED",
      submittedAt: "2026-08-20T00:00:00Z",
      candidate: {
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
      },
    }

    expect(
      isContentRevisionReviewFresh(
        snapshot,
        Date.parse("2026-08-20T00:30:00Z"),
      ),
    ).toBe(true)
    expect(
      isContentRevisionReviewFresh(
        snapshot,
        Date.parse("2026-08-20T02:00:00Z"),
      ),
    ).toBe(false)
  })

  it("공개 일정이 후보와 같으면 승인으로 추론하고 오래된 요청은 결과 미확인으로 푼다", () => {
    const stored = {
      sessionId: "201",
      contentId: "101",
      status: "SCHEDULED",
      startsAt: "2026-08-20T01:00:00Z",
      endsAt: "2026-08-20T03:00:00Z",
      checkinOpenAt: "2026-08-20T00:30:00Z",
      checkinCloseAt: "2026-08-20T02:00:00Z",
      capacity: 20,
      changeRequestId: "301",
      changeRequestStatus: "PENDING",
      changeRequestedAt: "2026-08-20T00:00:00Z",
      changeCandidate: {
        startsAt: "2026-08-21T01:00:00Z",
        endsAt: "2026-08-21T03:00:00Z",
        checkinOpenAt: "2026-08-21T00:30:00Z",
        checkinCloseAt: "2026-08-21T02:00:00Z",
        capacity: 30,
      },
    }

    const approved = mergeContentSessionSnapshots(
      [
        {
          sessionId: "201",
          startsAt: "2026-08-21T01:00:00Z",
          endsAt: "2026-08-21T03:00:00Z",
        },
      ],
      [stored],
      Date.parse("2026-08-20T02:00:00Z"),
    )[0]
    expect(approved.changeRequestStatus).toBeUndefined()

    const unknown = mergeContentSessionSnapshots(
      [
        {
          sessionId: "201",
          startsAt: stored.startsAt,
          endsAt: stored.endsAt,
        },
      ],
      [stored],
      Date.parse("2026-08-20T02:00:00Z"),
    )[0]
    expect(unknown.changeRequestStatus).toBe("UNKNOWN")
  })
})
