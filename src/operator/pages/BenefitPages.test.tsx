import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { getCouponPolicy, listCouponPolicies, listMyContents } from "../api"
import type { CouponPolicyDetail } from "../types"
import {
  CouponFormPage,
  CouponListPage,
  type CouponDraft,
  validateCouponDraft,
} from "./BenefitPages"

vi.mock("../api", () => ({
  createCouponPolicy: vi.fn(),
  createMission: vi.fn(),
  createStampbook: vi.fn(),
  endCouponPolicy: vi.fn(),
  endMission: vi.fn(),
  getCouponPolicy: vi.fn(),
  getMission: vi.fn(),
  listCouponPolicies: vi.fn(),
  listMissions: vi.fn(),
  listMyContents: vi.fn(),
  publishCouponPolicy: vi.fn(),
  publishStampbook: vi.fn(),
  submitMission: vi.fn(),
  updateCouponPolicy: vi.fn(),
  updateMission: vi.fn(),
  updateStampbook: vi.fn(),
}))

const detail = (status = "DRAFT"): CouponPolicyDetail => ({
  couponPolicyId: "501",
  contentId: "101",
  regionId: "12",
  name: "재방문 할인",
  description: null,
  status,
  issueSourceType: "VISIT",
  discountAmount: 3_000,
  minimumPaymentAmount: 10_000,
  validDaysAfterIssue: 30,
  issueStartsAt: "2026-08-01T00:00:00Z",
  issueEndsAt: "2026-08-31T14:59:59Z",
  totalIssueLimit: 1_000,
  issuedCount: 42,
  publishedAt: status === "DRAFT" ? null : "2026-08-01T00:00:00Z",
  endedAt: status === "ENDED" ? "2026-08-20T00:00:00Z" : null,
})

const validDraft = (overrides: Partial<CouponDraft> = {}): CouponDraft => ({
  contentId: "101",
  issueSourceType: "VISIT",
  name: "재방문 할인",
  description: "",
  discountAmount: "3000",
  minimumPaymentAmount: "10000",
  validDaysAfterIssue: "30",
  totalIssueLimit: "1000",
  issueStartsAt: "2026-08-01T09:00",
  issueEndsAt: "2026-08-31T23:59",
  reason: "할인 조건 조정",
  ...overrides,
})

describe("쿠폰 정책 입력 검증", () => {
  it("백엔드 계약을 만족하고 설명이 비어 있는 입력을 허용한다", () => {
    expect(validateCouponDraft(validDraft())).toBe("")
    expect(validateCouponDraft(validDraft(), true)).toBe("")
  })

  it("금액 관계, 유효일 상한, 발급 기간 순서를 검사한다", () => {
    expect(
      validateCouponDraft(validDraft({ minimumPaymentAmount: "2999" })),
    ).toContain("할인 금액 이상")
    expect(
      validateCouponDraft(validDraft({ validDaysAfterIssue: "366" })),
    ).toContain("365일 이하")
    expect(
      validateCouponDraft(validDraft({ issueEndsAt: "2026-08-01T09:00" })),
    ).toContain("시작 시각보다 뒤")
  })

  it("정수 형식과 수정 사유를 검사한다", () => {
    expect(
      validateCouponDraft(validDraft({ discountAmount: "1.5" })),
    ).toContain("정수")
    expect(validateCouponDraft(validDraft({ reason: "" }), true)).toContain(
      "수정 사유",
    )
  })
})

describe("쿠폰 정책 화면 상태 처리", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(listMyContents).mockResolvedValue({
      contents: [
        {
          contentId: "101",
          contentType: "EVENT_EXPERIENCE",
          title: "김해 체험",
          status: "PUBLISHED",
          createdAt: "2026-07-01T00:00:00Z",
        },
      ],
    })
  })

  it("공개·종료된 정책의 직접 수정 URL 접근을 차단한다", async () => {
    vi.mocked(getCouponPolicy).mockResolvedValue(detail("PUBLISHED"))

    render(
      <MemoryRouter initialEntries={["/operator/coupon-policies/501/edit"]}>
        <Routes>
          <Route
            path="/operator/coupon-policies/:couponPolicyId/edit"
            element={<CouponFormPage />}
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(
      await screen.findByText("초안 상태의 쿠폰 정책만 수정할 수 있습니다."),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "수정 내용 저장" }),
    ).not.toBeInTheDocument()
  })

  it("생성 폼은 설명을 선택값으로 두고 입력 길이와 유효일을 제한한다", async () => {
    render(
      <MemoryRouter initialEntries={["/operator/coupon-policies/new"]}>
        <Routes>
          <Route
            path="/operator/coupon-policies/new"
            element={<CouponFormPage />}
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByLabelText("정책 설명")).not.toBeRequired()
    expect(screen.getByLabelText("정책명")).toHaveAttribute("maxlength", "255")
    expect(screen.getByLabelText("정책 설명")).toHaveAttribute(
      "maxlength",
      "1000",
    )
    expect(screen.getByLabelText("발급 후 유효일")).toHaveAttribute(
      "max",
      "365",
    )
  })

  it("종료된 정책의 전체 상세와 상태를 표시하고 변경 버튼을 숨긴다", async () => {
    vi.mocked(listCouponPolicies).mockResolvedValue({
      couponPolicies: [detail("ENDED")],
    })
    vi.mocked(getCouponPolicy).mockResolvedValue(detail("ENDED"))

    render(
      <MemoryRouter>
        <CouponListPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText("지역 ID")).toBeInTheDocument()
    expect(screen.getByText("공개 시각")).toBeInTheDocument()
    expect(screen.getByText("종료 시각")).toBeInTheDocument()
    expect(screen.getAllByText("종료").length).toBeGreaterThan(0)
    expect(screen.queryByRole("link", { name: "수정" })).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "정책 공개" }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "정책 종료" }),
    ).not.toBeInTheDocument()
  })
})
