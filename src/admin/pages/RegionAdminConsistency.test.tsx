import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { apiRequest } from "../api"
import type {
  ContentDetail,
  OperatorRequestDetail,
  PublicContentDetail,
  PublicContentSessions,
  QrExceptionDetail,
} from "../types"
import {
  ContentRevisionDetailPage,
  PublishedContentDetailPage,
} from "./ContentPages"
import { OperatorRequestDetailPage } from "./OperatorPages"
import { QrExceptionDetailPage } from "./QrPages"

vi.mock("../api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api")>()
  return { ...actual, apiRequest: vi.fn() }
})

const publicContent: PublicContentDetail = {
  contentId: "100",
  contentType: "EVENT_EXPERIENCE",
  title: "공개 콘텐츠",
  description: "상세 설명",
  representativeImageUrl: null,
  representativeImageUrlExpiresAt: null,
  locationText: "행사장",
  operatingHoursText: "10:00-18:00",
  contactText: "010-0000-0000",
  precautions: "주의사항",
  ageRequirement: "전체 연령",
  materials: "준비물",
  cancellationPolicyText: "취소 정책",
}

describe("region admin response consistency", () => {
  beforeEach(() => {
    vi.mocked(apiRequest).mockReset()
  })

  it("loads and renders public sessions on the published content detail", async () => {
    const sessions: PublicContentSessions = {
      contentId: "100",
      sessions: [
        {
          sessionId: "501",
          startsAt: "2026-08-20T10:00:00+09:00",
          endsAt: "2026-08-20T12:00:00+09:00",
        },
      ],
    }
    vi.mocked(apiRequest).mockImplementation(async (path) => {
      if (path.endsWith("/sessions")) return sessions
      return publicContent
    })

    render(
      <MemoryRouter initialEntries={["/region-admin/contents/published/100"]}>
        <Routes>
          <Route
            path="/region-admin/contents/published/:contentId"
            element={<PublishedContentDetailPage />}
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText("회차 501")).toBeInTheDocument()
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/contents/100/sessions")
  })

  it("shows the full candidate snapshot for a pre-public revision", async () => {
    const candidate: ContentDetail = {
      contentId: "100",
      regionId: "1",
      operatorId: "2",
      contentType: "EVENT_EXPERIENCE",
      status: "PENDING",
      title: "수정 후보 제목",
      description: "수정 후보 설명",
      representativeImageUrl: null,
      locationText: "수정 장소",
      operatingHoursText: "11:00-19:00",
      contactText: "010-1111-2222",
      precautions: "수정 주의사항",
      ageRequirement: "만 12세 이상",
      materials: "우산",
      cancellationPolicyText: "수정 취소 정책",
      reservationPrice: 10_000,
      sessions: [],
      revisionId: "700",
      reviewType: "PRE_PUBLIC_REVISION",
      contentStatus: "APPROVED",
      candidatePublishAt: "2026-08-21T10:00:00+09:00",
      submittedAt: "2026-08-19T10:00:00Z",
    }
    vi.mocked(apiRequest).mockResolvedValue(candidate)

    render(
      <MemoryRouter initialEntries={["/region-admin/content-revisions/700"]}>
        <Routes>
          <Route
            path="/region-admin/content-revisions/:revisionId"
            element={<ContentRevisionDetailPage />}
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText("후보 제목")).toBeInTheDocument()
    expect(screen.getByText("수정 후보 설명")).toBeInTheDocument()
    expect(
      screen.getByText(/현재 원본이 아니라 승인 시 반영될 수정 후보/),
    ).toBeInTheDocument()
  })

  it("renders withdrawn operator data without blank sensitive fields", async () => {
    const detail: OperatorRequestDetail = {
      operatorApplicationId: "10",
      applicantUserId: null,
      requestedRegionId: "1",
      requestedAt: "2026-08-19T10:00:00Z",
      updatedAt: "2026-08-19T11:00:00Z",
      businessInformation: null,
      status: "CANCELLED",
      inspectedUserId: null,
      rejectedReason: null,
    }
    vi.mocked(apiRequest).mockResolvedValue(detail)

    render(
      <MemoryRouter initialEntries={["/region-admin/operator-requests/10"]}>
        <Routes>
          <Route
            path="/region-admin/operator-requests/:requestId"
            element={<OperatorRequestDetailPage />}
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText("연결 해제됨")).toBeInTheDocument()
    expect(
      screen.getByText("신청자 탈퇴로 확인할 수 없습니다."),
    ).toBeInTheDocument()
  })

  it("does not stringify a missing participant phone number", async () => {
    const detail: QrExceptionDetail = {
      exceptionId: "20",
      exceptionType: "INVALID_QR",
      result: "FAILURE",
      reasonCode: "QR_INVALID",
      reservationResolved: true,
      reservationId: "30",
      contentId: "100",
      sessionId: "501",
      occurredAt: "2026-08-19T10:00:00Z",
      reservation: {
        reservationId: 30,
        reservationNo: "RA-001",
        status: "CONFIRMED",
        contentId: 100,
        contentTitle: "공개 콘텐츠",
        sessionId: 501,
        startsAt: "2026-08-20T10:00:00+09:00",
        checkinOpenAt: "2026-08-20T09:30:00+09:00",
        checkinCloseAt: "2026-08-20T10:30:00+09:00",
        participant: {
          memberLinked: false,
          name: "탈퇴한 사용자",
          phone: null,
        },
        checkIn: { checkedIn: false, canCheckIn: false, checkedAt: null },
      },
    }
    vi.mocked(apiRequest).mockResolvedValue(detail)

    render(
      <MemoryRouter initialEntries={["/region-admin/qr-exceptions/20"]}>
        <Routes>
          <Route
            path="/region-admin/qr-exceptions/:exceptionId"
            element={<QrExceptionDetailPage />}
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(
      await screen.findByText("탈퇴한 사용자 · 연락처 없음"),
    ).toBeInTheDocument()
    expect(screen.queryByText(/· null/)).not.toBeInTheDocument()
  })
})
