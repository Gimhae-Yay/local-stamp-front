import { describe, expect, it } from "vitest";

import { ApiError } from "../../api/client";

import {
  canManageSession,
  contentMutationErrorMessage,
  sessionMutationErrorMessage,
  validateContentDraft,
  validateSessionDraft,
} from "./ContentPages";

const validSession = {
  startsAt: "2026-08-25T10:00",

  endsAt: "2026-08-25T12:00",

  checkinOpenAt: "2026-08-25T09:30",

  checkinCloseAt: "2026-08-25T10:30",

  capacity: "20",
};

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
};

describe("운영자 콘텐츠 생성 입력 검증", () => {
  it("Backend와 같은 회차 시간 순서를 검사한다", () => {
    expect(validateSessionDraft(validSession)).toBeNull();

    expect(
      validateSessionDraft({
        ...validSession,

        checkinCloseAt: validSession.endsAt,
      }),
    ).toContain("체크인 종료는 회차 종료보다 빨라야");
  });

  it("유효한 콘텐츠와 회차 입력을 허용한다", () => {
    expect(validateContentDraft(validContent, [validSession], true, true)).toBeNull();
  });

  it("공백 필드와 유효하지 않은 금액을 API 호출 전에 차단한다", () => {
    expect(
      validateContentDraft(
        { ...validContent, title: "   " },

        [validSession],

        true,

        true,
      ),
    ).toContain("콘텐츠 제목");

    expect(
      validateContentDraft(
        { ...validContent, reservationPrice: "1.5" },

        [validSession],

        true,

        true,
      ),
    ).toContain("정수");
  });
});

describe("운영자 회차 상태 처리", () => {
  it("예정된 SCHEDULED 회차에만 변경·취소를 허용한다", () => {
    const now = Date.parse("2026-08-20T00:00:00Z");

    expect(
      canManageSession(
        { status: "SCHEDULED", startsAt: "2026-08-25T01:00:00Z" },

        now,
      ),
    ).toBe(true);

    expect(
      canManageSession(
        { status: "PENDING", startsAt: "2026-08-25T01:00:00Z" },

        now,
      ),
    ).toBe(false);

    expect(
      canManageSession(
        { status: "CANCELLED", startsAt: "2026-08-25T01:00:00Z" },

        now,
      ),
    ).toBe(false);

    expect(
      canManageSession(
        { status: "SCHEDULED", startsAt: "2026-08-19T01:00:00Z" },

        now,
      ),
    ).toBe(false);
  });

  it("중복 변경 요청과 재취소 충돌을 구체적으로 안내한다", () => {
    expect(
      sessionMutationErrorMessage(
        new ApiError("회차 상태 충돌", 409, "SESSION_STATE_CONFLICT"),

        "change",
      ),
    ).toContain("이미 변경 요청이 심사 중");

    expect(
      sessionMutationErrorMessage(
        new ApiError("취소 불가", 409, "SESSION_NOT_CANCELLABLE"),

        "cancel",
      ),
    ).toContain("이미 취소");
  });
});

describe("운영자 콘텐츠 중복 요청 처리", () => {
  it("중복 제출과 중복 수정본 생성을 구분해 안내한다", () => {
    const conflict = new ApiError("상태 충돌", 409, "CONTENT_STATE_CONFLICT");
    expect(contentMutationErrorMessage(conflict, "submit")).toContain("이미 심사 요청");
    expect(contentMutationErrorMessage(conflict, "revision")).toContain("이미 심사 중인 수정본");
  });
});
