import { beforeEach, describe, expect, it } from "vitest"
import {
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

    expect(readContentRevisionSnapshot("44", "501")).toEqual(snapshot)
    expect(readLatestContentRevisionSnapshot("44", "101")).toEqual(snapshot)
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
})
