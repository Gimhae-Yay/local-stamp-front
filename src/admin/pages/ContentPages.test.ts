import { describe, expect, it } from "vitest"
import type { ContentDetail, PublicContentDetail } from "../types"
import { buildContentRevisionComparison } from "./ContentPages"

const original: PublicContentDetail = {
  contentId: "100",
  contentType: "EVENT_EXPERIENCE",
  title: "원본 제목",
  description: "같은 설명",
  representativeImageUrl: null,
  representativeImageUrlExpiresAt: null,
  locationText: "원본 장소",
  operatingHoursText: "10:00-18:00",
  contactText: "010-0000-0000",
  precautions: "우산 준비",
  ageRequirement: "전체 연령",
  materials: "편한 신발",
  cancellationPolicyText: "24시간 전 취소",
}

const candidate: ContentDetail = {
  contentId: "100",
  regionId: "1",
  operatorId: "2",
  contentType: "EVENT_EXPERIENCE",
  status: "PUBLISHED",
  title: "수정 제목",
  description: "같은 설명",
  representativeImageUrl: null,
  locationText: "수정 장소",
  operatingHoursText: "10:00-18:00",
  contactText: "010-0000-0000",
  precautions: "우산 준비",
  ageRequirement: "전체 연령",
  materials: "편한 신발",
  cancellationPolicyText: "24시간 전 취소",
  reservationPrice: 0,
  sessions: [],
}

describe("buildContentRevisionComparison", () => {
  it("marks only fields whose candidate value differs from the original", () => {
    const fields = buildContentRevisionComparison(original, candidate)

    expect(
      fields.filter((field) => field.changed).map((field) => field.label),
    ).toEqual(["제목", "장소"])
    expect(fields.find((field) => field.label === "설명")?.changed).toBe(false)
  })
})
