import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  CreateContentRevisionPage,
  EditContentRevisionPage,
  OperatorContentDetailPage,
} from "./OperatorContentPages"

function response(data: unknown, status = 200) {
  return new Response(
    JSON.stringify({
      statusCode: status,
      code: "SUCCESS",
      message: "success",
      data,
    }),
    { status, headers: { "Content-Type": "application/json" } },
  )
}

function errorResponse(code: string, message: string, status: number) {
  return new Response(
    JSON.stringify({ statusCode: status, code, message, data: null }),
    { status, headers: { "Content-Type": "application/json" } },
  )
}

const content = {
  contentId: "10",
  contentType: "EVENT_EXPERIENCE",
  title: "가야 체험",
  description: "가야 문화 체험",
  locationText: "김해시",
  operatingHoursText: "10:00-18:00",
  contactText: "055-000-0000",
  precautions: "편한 복장",
  ageRequirement: "전체",
  materials: "없음",
  cancellationPolicyText: "시작 전 취소 가능",
  publishAt: null,
  status: "PUBLISHED",
  reservationPrice: 10000,
  representativeImageUrl: null,
  representativeImageUrlExpiresAt: null,
  rejectionReason: null,
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-01T00:00:00Z",
}

function operatorSession(
  sessionId: string,
  day: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    sessionId,
    status: "SCHEDULED",
    version: 1,
    startsAt: `2027-09-${day}T10:00:00+09:00`,
    endsAt: `2027-09-${day}T12:00:00+09:00`,
    checkinOpenAt: `2027-09-${day}T09:30:00+09:00`,
    checkinCloseAt: `2027-09-${day}T11:30:00+09:00`,
    capacity: 30,
    remainingCapacity: 30,
    rejectReason: null,
    cancelledAt: null,
    cancellationReason: null,
    completedAt: null,
    createdAt: "2026-08-20T01:00:00Z",
    pendingChangeRequest: null,
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
  vi.unstubAllGlobals()
})

describe("operator content integration", () => {
  it("creates a revision, navigates to it, and withdraws it", async () => {
    const fetchMock = vi.fn().mockImplementation((input: string) => {
      if (input === "/api/v1/operator/contents/10") {
        return Promise.resolve(response(content))
      }
      if (input === "/api/v1/operator/contents/10/revisions") {
        return Promise.resolve(
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
      }
      if (input === "/api/v1/operator/content-revisions/51/withdraw") {
        return Promise.resolve(
          response({
            revisionId: "51",
            contentId: "10",
            status: "EDIT_WITHDRAWN",
            withdrawalReason: "일정 재검토",
            withdrawnAt: "2026-08-20T02:00:00Z",
          }),
        )
      }
      return Promise.reject(new Error(`unexpected request: ${input}`))
    })
    vi.stubGlobal("fetch", fetchMock)
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={["/operator/contents/10/revisions/new"]}>
        <Routes>
          <Route
            path="/operator/contents/:contentId/revisions/new"
            element={<CreateContentRevisionPage />}
          />
          <Route
            path="/operator/content-revisions/:revisionId/edit"
            element={<EditContentRevisionPage />}
          />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(
      await screen.findByRole("button", {
        name: "수정본 생성 및 심사 요청",
      }),
    )
    expect(await screen.findByText("수정 심사 중")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "수정본 철회" }))
    await user.type(screen.getByLabelText("철회 사유"), "일정 재검토")
    await user.click(screen.getByRole("button", { name: "철회 확정" }))

    expect(
      await screen.findByText("수정본이 철회되었습니다."),
    ).toBeInTheDocument()
    expect(
      screen.getByText("이미 철회된 수정본입니다. 다시 철회할 수 없습니다."),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "수정본 철회" }),
    ).not.toBeInTheDocument()
    expect(
      fetchMock.mock.calls.find(
        ([input]) => input === "/api/v1/operator/content-revisions/51/withdraw",
      )?.[1]?.method,
    ).toBe("POST")
  })

  it("updates a cached rejected revision and reflects the result", async () => {
    window.sessionStorage.setItem(
      "local-stamp:operator-revision:52",
      JSON.stringify({
        revisionId: "52",
        contentId: "10",
        status: "EDIT_REJECTED",
        fields: {
          title: "기존 제목",
          description: "설명",
          locationText: "장소",
          operatingHoursText: "10:00-18:00",
          contactText: "055-000-0000",
          precautions: "유의사항",
          ageRequirement: "전체",
          materials: "없음",
          cancellationPolicyText: "시작 전 취소 가능",
          reservationPrice: "10000",
          publishAt: "",
          representativeImageObjectId: "",
        },
      }),
    )
    const fetchMock = vi.fn().mockResolvedValue(
      response({
        revisionId: "52",
        contentId: "10",
        status: "EDIT_REJECTED",
      }),
    )
    vi.stubGlobal("fetch", fetchMock)
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={["/operator/content-revisions/52/edit"]}>
        <Routes>
          <Route
            path="/operator/content-revisions/:revisionId/edit"
            element={<EditContentRevisionPage />}
          />
        </Routes>
      </MemoryRouter>,
    )

    const title = screen.getByLabelText("제목")
    await user.clear(title)
    await user.type(title, "수정 제목")
    await user.click(screen.getByRole("button", { name: "수정본 저장" }))

    expect(
      await screen.findByText("수정 결과가 저장되었습니다."),
    ).toBeInTheDocument()
    expect(title).toHaveValue("수정 제목")
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "/api/v1/operator/content-revisions/52",
    )
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("PUT")
  })

  it("creates, changes, and cancels sessions while reflecting each status", async () => {
    let sessionList = [operatorSession("21", "01"), operatorSession("22", "02")]
    const fetchMock = vi.fn().mockImplementation((input: string, init?: RequestInit) => {
      if (input === "/api/v1/operator/contents/10") {
        return Promise.resolve(response(content))
      }
      if (input === "/api/v1/operator/contents/10/sessions") {
        if (init?.method === "POST") {
          sessionList = [
            ...sessionList,
            operatorSession("23", "03", {
              status: "PENDING",
              startsAt: "2027-10-01T10:00:00+09:00",
              endsAt: "2027-10-01T12:00:00+09:00",
              checkinOpenAt: "2027-10-01T09:30:00+09:00",
              checkinCloseAt: "2027-10-01T11:30:00+09:00",
              capacity: 20,
              remainingCapacity: 20,
            }),
          ]
          return Promise.resolve(
            response(
              {
                sessionId: "23",
                contentId: "10",
                status: "PENDING",
                startsAt: "2027-10-01T10:00:00+09:00",
                endsAt: "2027-10-01T12:00:00+09:00",
                checkinOpenAt: "2027-10-01T09:30:00+09:00",
                checkinCloseAt: "2027-10-01T11:30:00+09:00",
                capacity: 20,
                remainingCapacity: 20,
                createdAt: "2026-08-20T01:00:00Z",
              },
              201,
            ),
          )
        }
        return Promise.resolve(
          response({
            contentId: "10",
            sessions: sessionList,
          }),
        )
      }
      if (input === "/api/v1/operator/sessions/21/change-requests") {
        sessionList = sessionList.map((session) =>
          session.sessionId === "21"
            ? operatorSession("21", "01", {
                pendingChangeRequest: {
                  revisionId: "31",
                  status: "PENDING",
                  baseSessionVersion: 1,
                  candidate: {
                    startsAt: "2027-09-01T10:00:00+09:00",
                    endsAt: "2027-09-01T12:00:00+09:00",
                    checkinOpenAt: "2027-09-01T09:30:00+09:00",
                    checkinCloseAt: "2027-09-01T11:30:00+09:00",
                    capacity: 30,
                  },
                  submittedAt: "2026-08-20T01:00:00Z",
                },
              })
            : session,
        )
        return Promise.resolve(
          response(
            {
              revisionId: "31",
              status: "PENDING",
              contentId: "10",
              targetSessionId: "21",
              baseSessionVersion: 1,
              startsAt: "2027-09-01T10:00:00+09:00",
              endsAt: "2027-09-01T12:00:00+09:00",
              checkinOpenAt: "2027-09-01T09:30:00+09:00",
              checkinCloseAt: "2027-09-01T11:30:00+09:00",
              capacity: 30,
              requestedAt: "2026-08-20T01:00:00Z",
            },
            201,
          ),
        )
      }
      if (input === "/api/v1/operator/sessions/22/cancel") {
        sessionList = sessionList.map((session) =>
          session.sessionId === "22"
            ? operatorSession("22", "02", {
                status: "CANCELLED",
                cancelledAt: "2026-08-20T01:00:00Z",
                cancellationReason: "기상 악화",
              })
            : session,
        )
        return Promise.resolve(
          response({
            sessionId: "22",
            status: "CANCELLED",
            cancellationReason: "기상 악화",
            cancelledAt: "2026-08-20T01:00:00Z",
          }),
        )
      }
      return Promise.reject(new Error(`unexpected request: ${input}`))
    })
    vi.stubGlobal("fetch", fetchMock)
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={["/operator/contents/10"]}>
        <Routes>
          <Route
            path="/operator/contents/:contentId"
            element={<OperatorContentDetailPage />}
          />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole("button", { name: "회차 생성" }))
    const createForm = screen
      .getByRole("button", { name: "회차 생성 요청" })
      .closest("form")!
    await user.type(
      within(createForm).getByLabelText("시작 시각"),
      "2027-10-01T10:00",
    )
    await user.type(
      within(createForm).getByLabelText("종료 시각"),
      "2027-10-01T12:00",
    )
    await user.type(
      within(createForm).getByLabelText("체크인 시작"),
      "2027-10-01T09:30",
    )
    await user.type(
      within(createForm).getByLabelText("체크인 종료"),
      "2027-10-01T11:30",
    )
    await user.type(within(createForm).getByLabelText("정원"), "20")
    await user.click(
      within(createForm).getByRole("button", { name: "회차 생성 요청" }),
    )
    expect(await screen.findByText("회차 #23")).toBeInTheDocument()

    const session21 = screen.getByText("회차 #21").closest("article")!
    await user.click(
      within(session21).getByRole("button", { name: "변경 요청" }),
    )
    await user.click(
      within(session21).getByRole("button", { name: "변경 심사 요청" }),
    )
    expect(
      await within(session21).findByText("변경 심사 대기"),
    ).toBeInTheDocument()

    const session22 = screen.getByText("회차 #22").closest("article")!
    await user.click(
      within(session22).getByRole("button", { name: "회차 취소" }),
    )
    await user.type(within(session22).getByLabelText("취소 사유"), "기상 악화")
    await user.click(
      within(session22).getByRole("button", { name: "취소 확정" }),
    )
    expect(await within(session22).findByText("취소됨")).toBeInTheDocument()
    expect(
      within(session22).queryByRole("button", { name: "회차 취소" }),
    ).not.toBeInTheDocument()
  })

  it("requests full content withdrawal and loads reservations for each session", async () => {
    const fetchMock = vi.fn().mockImplementation((input: string) => {
      if (input === "/api/v1/operator/contents/10") {
        return Promise.resolve(response(content))
      }
      if (input === "/api/v1/operator/contents/10/sessions") {
        return Promise.resolve(
          response({
            contentId: "10",
            sessions: [operatorSession("21", "01"), operatorSession("22", "02")],
          }),
        )
      }
      if (input === "/api/v1/operator/contents/10/withdrawal-requests") {
        return Promise.resolve(
          response(
            {
              withdrawalRequestId: "7001",
              contentId: "10",
              status: "PENDING",
              requestReason: "운영 계획 변경",
              requestedAt: "2026-08-20T01:00:00Z",
            },
            201,
          ),
        )
      }
      if (input === "/api/v1/operator/contents/10/reservations?sessionId=21") {
        return Promise.resolve(
          response({
            contentId: "10",
            session: {
              sessionId: "21",
              status: "SCHEDULED",
              startsAt: "2027-09-01T10:00:00+09:00",
              endsAt: "2027-09-01T12:00:00+09:00",
              checkinOpenAt: "2027-09-01T09:30:00+09:00",
              checkinCloseAt: "2027-09-01T10:30:00+09:00",
            },
            reservations: [
              {
                reservationId: "301",
                reservationNo: "R2026-301",
                status: "CONFIRMED",
                quantity: 2,
                confirmedAt: "2026-08-20T01:00:00Z",
                participant: { name: "김*수", phone: "010-****-1234" },
                checkIn: { checkedIn: false, checkedAt: null },
              },
            ],
          }),
        )
      }
      if (input === "/api/v1/operator/contents/10/reservations?sessionId=22") {
        return Promise.resolve(
          response({
            contentId: "10",
            session: {
              sessionId: "22",
              status: "SCHEDULED",
              startsAt: "2027-09-02T10:00:00+09:00",
              endsAt: "2027-09-02T12:00:00+09:00",
              checkinOpenAt: "2027-09-02T09:30:00+09:00",
              checkinCloseAt: "2027-09-02T10:30:00+09:00",
            },
            reservations: [],
          }),
        )
      }
      return Promise.reject(new Error(`unexpected request: ${input}`))
    })
    vi.stubGlobal("fetch", fetchMock)
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={["/operator/contents/10"]}>
        <Routes>
          <Route
            path="/operator/contents/:contentId"
            element={<OperatorContentDetailPage />}
          />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(
      await screen.findByRole("button", { name: "전체 콘텐츠 철회 요청" }),
    )
    await user.click(screen.getByRole("button", { name: "철회 요청 확정" }))
    expect(
      screen.getByText("전체 철회 사유를 입력해 주세요."),
    ).toBeInTheDocument()
    await user.type(screen.getByLabelText("전체 철회 사유"), "운영 계획 변경")
    await user.click(screen.getByRole("button", { name: "철회 요청 확정" }))

    expect(
      await screen.findByText(/전체 콘텐츠 철회 요청이 접수되었습니다/),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "전체 콘텐츠 철회 요청" }),
    ).not.toBeInTheDocument()
    const withdrawalCall = fetchMock.mock.calls.find(
      ([input]) => input === "/api/v1/operator/contents/10/withdrawal-requests",
    )
    expect(withdrawalCall?.[1]?.method).toBe("POST")
    expect(
      new Headers(withdrawalCall?.[1]?.headers).get("Idempotency-Key"),
    ).toMatch(/.+/)

    const session21 = screen.getByText("회차 #21").closest("article")!
    await user.click(
      within(session21).getByRole("button", { name: "예약자 보기" }),
    )
    expect(await screen.findByText("R2026-301")).toBeInTheDocument()
    expect(screen.getByText("예약 확정")).toBeInTheDocument()
    expect(screen.getByText("김*수")).toBeInTheDocument()

    const session22 = screen.getByText("회차 #22").closest("article")!
    await user.click(
      within(session22).getByRole("button", { name: "예약자 보기" }),
    )
    expect(
      await screen.findByText("이 회차에는 예약자가 없습니다."),
    ).toBeInTheDocument()
  })

  it("shows server validation and duplicate command errors", async () => {
    const fetchMock = vi.fn().mockImplementation((input: string, init?: RequestInit) => {
      if (input === "/api/v1/operator/contents/10") {
        return Promise.resolve(response(content))
      }
      if (input === "/api/v1/operator/contents/10/sessions") {
        if (init?.method !== "POST") {
          return Promise.resolve(
            response({
              contentId: "10",
              sessions: [operatorSession("21", "01")],
            }),
          )
        }
        return Promise.resolve(
          errorResponse("INVALID_INPUT", "회차 일정이 올바르지 않습니다.", 400),
        )
      }
      if (input === "/api/v1/operator/sessions/21/change-requests") {
        return Promise.resolve(
          errorResponse(
            "SESSION_STATE_CONFLICT",
            "회차 상태가 요청을 처리할 수 없습니다.",
            409,
          ),
        )
      }
      if (input === "/api/v1/operator/sessions/21/cancel") {
        return Promise.resolve(
          errorResponse(
            "SESSION_NOT_CANCELLABLE",
            "취소할 수 없는 회차 상태입니다.",
            409,
          ),
        )
      }
      return Promise.reject(new Error(`unexpected request: ${input}`))
    })
    vi.stubGlobal("fetch", fetchMock)
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={["/operator/contents/10"]}>
        <Routes>
          <Route
            path="/operator/contents/:contentId"
            element={<OperatorContentDetailPage />}
          />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole("button", { name: "회차 생성" }))
    const createForm = screen
      .getByRole("button", { name: "회차 생성 요청" })
      .closest("form")!
    await user.type(
      within(createForm).getByLabelText("시작 시각"),
      "2027-10-01T12:00",
    )
    await user.type(
      within(createForm).getByLabelText("종료 시각"),
      "2027-10-01T12:00",
    )
    await user.type(
      within(createForm).getByLabelText("체크인 시작"),
      "2027-10-01T09:30",
    )
    await user.type(
      within(createForm).getByLabelText("체크인 종료"),
      "2027-10-01T11:30",
    )
    await user.type(within(createForm).getByLabelText("정원"), "20")
    await user.click(
      within(createForm).getByRole("button", { name: "회차 생성 요청" }),
    )
    expect(
      await within(createForm).findByText(
        "종료 시각은 시작 시각보다 뒤여야 합니다.",
      ),
    ).toBeInTheDocument()
    await user.clear(within(createForm).getByLabelText("시작 시각"))
    await user.type(
      within(createForm).getByLabelText("시작 시각"),
      "2027-10-01T10:00",
    )
    await user.click(
      within(createForm).getByRole("button", { name: "회차 생성 요청" }),
    )
    expect(
      await within(createForm).findByText("회차 일정이 올바르지 않습니다."),
    ).toBeInTheDocument()

    await user.click(within(createForm).getByRole("button", { name: "닫기" }))
    const session = screen.getByText("회차 #21").closest("article")!
    await user.click(within(session).getByRole("button", { name: "변경 요청" }))
    await user.click(
      within(session).getByRole("button", { name: "변경 심사 요청" }),
    )
    expect(
      await within(session).findByText(
        "이미 심사 중인 변경 요청이 있거나 변경할 수 없는 회차입니다. 최신 상태를 확인해 주세요.",
      ),
    ).toBeInTheDocument()

    await user.click(within(session).getByRole("button", { name: "닫기" }))
    await user.click(within(session).getByRole("button", { name: "회차 취소" }))
    await user.type(within(session).getByLabelText("취소 사유"), "재확인")
    await user.click(within(session).getByRole("button", { name: "취소 확정" }))
    expect(
      await within(session).findByText(
        "이미 취소됐거나 현재 취소할 수 없는 회차입니다.",
      ),
    ).toBeInTheDocument()
  })
})
