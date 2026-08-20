import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  endMission,
  endStampbook,
  getCouponPolicy,
  getMission,
  getStampbook,
  listCouponPolicies,
  listMissions,
  listMyContents,
  listStampbooks,
  updateStampbook,
} from "../api"
import type { CouponPolicyDetail } from "../types"
import {
  CouponFormPage,
  CouponListPage,
  MissionListPage,
  StampbookDetailPage,
  StampbookFormPage,
  StampbookListPage,
  type CouponDraft,
  validateCouponDraft,
} from "./BenefitPages"

vi.mock("../api", () => ({
  createCouponPolicy: vi.fn(),
  createMission: vi.fn(),
  createStampbook: vi.fn(),
  endCouponPolicy: vi.fn(),
  endMission: vi.fn(),
  endStampbook: vi.fn(),
  getCouponPolicy: vi.fn(),
  getMission: vi.fn(),
  getStampbook: vi.fn(),
  listCouponPolicies: vi.fn(),
  listMissions: vi.fn(),
  listMyContents: vi.fn(),
  listStampbooks: vi.fn(),
  publishCouponPolicy: vi.fn(),
  publishStampbook: vi.fn(),
  submitMission: vi.fn(),
  updateCouponPolicy: vi.fn(),
  updateMission: vi.fn(),
  updateStampbook: vi.fn(),
}))

vi.mock("../OperatorAuth", () => ({
  useOperatorAuth: () => ({
    session: {
      userId: "44",
      assignment: {
        role: "OPERATOR",
        regionId: "11",
        regionName: "경상남도 김해시",
      },
    },
  }),
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

describe("미션·스탬프북 종료 흐름", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    vi.mocked(listMissions).mockResolvedValue({
      content: [],
      page: 0,
      size: 20,
      totalElements: 0,
      totalPages: 0,
    })
  })

  it("미션 종료 사유를 Backend 허용 코드 중에서 선택한다", async () => {
    vi.mocked(listMissions).mockResolvedValue({
      content: [
        {
          missionId: "701",
          status: "PUBLISHED",
          conditionType: "VISIT_COUNT",
          endsAt: "2026-09-30T14:59:59Z",
        },
      ],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
    })
    vi.mocked(getMission).mockResolvedValue({
      missionId: "701",
      title: "김해 골목 세 곳 방문하기",
      regionId: "11",
      status: "PUBLISHED",
      conditionType: "VISIT_COUNT",
      requiredVisitCount: 3,
      targetContents: [{ contentId: "101", title: "김해 체험" }],
      rewardCouponPolicyId: "501",
      endsAt: "2026-09-30T14:59:59Z",
      publishedAt: "2026-08-01T00:00:00Z",
      endedAt: null,
    })
    vi.mocked(endMission).mockResolvedValue({
      missionId: "701",
      status: "ENDED",
      endedAt: "2026-08-21T00:00:00Z",
    })

    render(
      <MemoryRouter>
        <MissionListPage />
      </MemoryRouter>,
    )

    expect(
      await screen.findByText("김해 골목 세 곳 방문하기"),
    ).toBeInTheDocument()
    fireEvent.click(
      screen.getByRole("button", { name: "미션 종료" }),
    )
    const dialog = screen.getByRole("dialog")
    const reason = within(dialog).getByRole("combobox")
    expect(reason).toHaveValue("MISSION_OPERATION_SCHEDULE_CHANGED")
    expect(within(reason).getAllByRole("option")).toHaveLength(4)
    fireEvent.click(within(dialog).getByRole("button", { name: "미션 종료" }))

    await waitFor(() =>
      expect(endMission).toHaveBeenCalledWith(
        "701",
        "MISSION_OPERATION_SCHEDULE_CHANGED",
      ),
    )
  })

  it("서버 상세 URL에서 종료 사유 확인 후 스탬프북 종료 API를 호출한다", async () => {
    vi.mocked(getStampbook).mockResolvedValue({
      stampbookId: "801",
      title: "김해 한 바퀴",
      regionId: "11",
      status: "PUBLISHED",
      targetContents: [
        {
          contentId: "101",
          regionId: "11",
          title: "김해 체험",
          status: "PUBLISHED",
        },
      ],
      rewardCouponPolicy: {
        couponPolicyId: "501",
        regionId: "11",
        issuanceType: "STAMPBOOK_COMPLETION",
        status: "PUBLISHED",
      },
      publishedAt: "2026-08-20T00:00:00Z",
      endedAt: null,
    })
    vi.mocked(endStampbook).mockResolvedValue({
      stampbookId: "801",
      status: "ENDED",
      endedAt: "2026-08-21T00:00:00Z",
    })

    render(
      <MemoryRouter initialEntries={["/operator/stampbooks/801"]}>
        <Routes>
          <Route
            path="/operator/stampbooks/:stampbookId"
            element={<StampbookDetailPage />}
          />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(
      await screen.findByRole("button", { name: "스탬프북 종료" }),
    )
    const dialog = screen.getByRole("dialog")
    fireEvent.change(within(dialog).getByRole("textbox"), {
      target: { value: "행사 운영 종료" },
    })
    fireEvent.click(
      within(dialog).getByRole("button", { name: "스탬프북 종료" }),
    )

    await waitFor(() =>
      expect(endStampbook).toHaveBeenCalledWith("801", "행사 운영 종료"),
    )
    await waitFor(() => expect(getStampbook).toHaveBeenCalledTimes(2))
  })

  it("Backend 목록 응답에서 스탬프북 상세 URL을 제공한다", async () => {
    vi.mocked(listStampbooks).mockResolvedValue({
      stampbooks: [
        {
          stampbookId: "801",
          title: "김해 한 바퀴",
          regionId: "11",
          status: "DRAFT",
          targetCount: 1,
          rewardCouponPolicyId: "501",
          publishedAt: null,
          endedAt: null,
        },
      ],
    })

    render(
      <MemoryRouter>
        <StampbookListPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText("김해 한 바퀴")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "상세" })).toHaveAttribute(
      "href",
      "/operator/stampbooks/801",
    )
  })

  it("직접 수정 URL에서 Backend 상세를 불러와 PATCH 요청한다", async () => {
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
    vi.mocked(listCouponPolicies).mockResolvedValue({
      couponPolicies: [
        {
          couponPolicyId: "501",
          contentId: "101",
          name: "완주 보상",
          status: "PUBLISHED",
        },
      ],
    })
    vi.mocked(getStampbook).mockResolvedValue({
      stampbookId: "801",
      title: "김해 한 바퀴",
      regionId: "11",
      status: "DRAFT",
      targetContents: [
        {
          contentId: "101",
          regionId: "11",
          title: "김해 체험",
          status: "PUBLISHED",
        },
      ],
      rewardCouponPolicy: {
        couponPolicyId: "501",
        regionId: "11",
        issuanceType: "STAMPBOOK_COMPLETION",
        status: "PUBLISHED",
      },
      publishedAt: null,
      endedAt: null,
    })
    vi.mocked(updateStampbook).mockResolvedValue({
      stampbookId: "801",
      status: "DRAFT",
      targetCount: 1,
    })

    render(
      <MemoryRouter initialEntries={["/operator/stampbooks/801/edit"]}>
        <Routes>
          <Route
            path="/operator/stampbooks/:stampbookId/edit"
            element={<StampbookFormPage />}
          />
          <Route
            path="/operator/stampbooks/:stampbookId"
            element={<div>상세 이동 완료</div>}
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByDisplayValue("김해 한 바퀴")).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("수정 사유"), {
      target: { value: "대상 구성 보완" },
    })
    fireEvent.click(screen.getByRole("button", { name: "수정 내용 저장" }))

    await waitFor(() =>
      expect(updateStampbook).toHaveBeenCalledWith(
        "801",
        expect.objectContaining({
          title: "김해 한 바퀴",
          contentIds: ["101"],
          rewardCouponPolicyId: "501",
          reason: "대상 구성 보완",
        }),
      ),
    )
    expect(await screen.findByText("상세 이동 완료")).toBeInTheDocument()
  })
})
