import { describe, expect, it } from "vitest"
import { validateContentDraft, validateSessionDraft } from "./ContentPages"

const validSession = {
  startsAt: "2026-08-25T10:00",
  endsAt: "2026-08-25T12:00",
  checkinOpenAt: "2026-08-25T09:30",
  checkinCloseAt: "2026-08-25T10:30",
  capacity: "20",
}

const validContent = {
  title: "김해 가야문화 체험",
  description: "가야 문화를 체험합니다.",
  locationText: "김해시 가야의길 190",
  operatingHoursText: "매주 토요일",
  contactText: "055-000-0000",
  precautions: "편한 복장",
  ageRequirement: "초등학생 이상",
  materials: "필기도구",
  cancellationPolicyText: "시작 전까지 취소 가능",
  reservationPrice: "20000",
  publishAt: "2026-08-21T09:00",
}

describe("운영자 콘텐츠 생성 입력 검증", () => {
  it("Backend와 같은 회차 시간 순서를 검사한다", () => {
    expect(validateSessionDraft(validSession)).toBeNull()
    expect(
      validateSessionDraft({
        ...validSession,
        checkinCloseAt: validSession.endsAt,
      }),
    ).toContain("체크인 종료는 회차 종료보다 빨라야")
  })

  it("유효한 콘텐츠와 회차 입력을 허용한다", () => {
    expect(
      validateContentDraft(validContent, [validSession], true, true),
    ).toBeNull()
  })

  it("공백 필드와 유효하지 않은 금액을 API 호출 전에 차단한다", () => {
    expect(
      validateContentDraft(
        { ...validContent, title: "   " },
        [validSession],
        true,
        true,
      ),
    ).toContain("콘텐츠 제목")
    expect(
      validateContentDraft(
        { ...validContent, reservationPrice: "1.5" },
        [validSession],
        true,
        true,
      ),
    ).toContain("정수")
  })
})
