import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react"

import { Link, useLocation, useNavigate, useParams } from "react-router-dom"

import { ApiError, isAbortError } from "../../api/client"

import {
  cancelSession,
  createContent,
  createContentRevision,
  createContentSession,
  getLatestContentRevision,
  getMyContent,
  listMyContents,
  listOperatorContentSessions,
  requestContentWithdrawal,
  resubmitContentRevision,
  requestSessionChange,
  submitContent,
  updateContentRevision,
  updateRejectedContent,
  uploadRepresentativeImage,
  withdrawContentRevision,
} from "../api"

import {
  ActionModal,
  apiErrorMessage,
  Breadcrumb,
  ConfirmModal,
  formatDate,
  PageHeader,
  RouteState,
  StatusBadge,
  statusLabel,
} from "../OperatorComponents"

import { useOperatorAuth } from "../OperatorAuth"

import {
  isContentRevisionReviewFresh,
  readContentRevisionSnapshot,
  readContentSessionSnapshots,
  readLatestContentRevisionSnapshot,
  toContentRevisionSnapshot,
  writeContentRevisionSnapshot,
  writeContentSessionSnapshots,
  type ContentRevisionSnapshot,
  type ContentSessionSnapshot,
} from "../operatorContentSnapshots"

import {
  readOperatorCompatValue,
  writeOperatorCompatValue,
} from "../operatorCompatStorage"

import type {
  ContentDetail,
  ContentInput,
  ContentSessionSummary,
  ContentSummary,
  CreatedContentSession,
  SessionChangeRequestResult,
  SessionInput,
} from "../types"

function toSeoulOffset(value: string) {
  if (!value) return null

  return `${value.length === 16 ? `${value}:00` : value}+09:00`
}

function toDateTimeInput(value: string | null | undefined) {
  if (!value) return ""

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value.slice(0, 16)

  const parts = new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",

    month: "2-digit",

    day: "2-digit",

    hour: "2-digit",

    minute: "2-digit",

    hour12: false,

    timeZone: "Asia/Seoul",
  }).format(date)

  return parts.replace(" ", "T")
}

const emptyDraft = {
  title: "",

  description: "",

  locationText: "",

  operatingHoursText: "",

  contactText: "",

  precautions: "",

  ageRequirement: "",

  materials: "",

  cancellationPolicyText: "",

  reservationPrice: "",

  publishAt: "",
}

const emptySession = {
  startsAt: "",

  endsAt: "",

  checkinOpenAt: "",

  checkinCloseAt: "",

  capacity: "",
}

interface DisplayContentSession extends ContentSessionSummary {
  status: string

  contentId?: string

  checkinOpenAt?: string

  checkinCloseAt?: string

  capacity?: number

  changeRequestId?: string

  changeRequestStatus?: string

  cancellationReason?: string | null
}

interface ContentDetailNavigationState {
  createdSession?: CreatedContentSession

  notice?: string
}

export function canManageSession(
  session: Pick<DisplayContentSession, "status" | "startsAt">,

  now = Date.now(),
) {
  return session.status === "SCHEDULED" && Date.parse(session.startsAt) > now
}

export function sessionMutationErrorMessage(
  caught: unknown,

  action: "change" | "cancel",
) {
  if (caught instanceof ApiError) {
    if (caught.code === "SESSION_STATE_CONFLICT") {
      return action === "change"
        ? "이미 변경 요청이 심사 중이거나 변경할 수 없는 회차입니다. 화면을 새로고침한 뒤 상태를 확인해 주세요."
        : "이미 취소되었거나 현재 취소할 수 없는 회차입니다. 화면을 새로고침한 뒤 상태를 확인해 주세요."
    }

    if (caught.code === "SESSION_NOT_CANCELLABLE")
      return "이미 취소되었거나 현재 취소할 수 없는 회차입니다."

    if (caught.code === "INVALID_INPUT")
      return `입력한 회차 정보를 확인해 주세요. ${caught.message}`
  }

  return apiErrorMessage(
    caught,

    action === "change"
      ? "회차 변경을 요청하지 못했습니다."
      : "회차를 취소하지 못했습니다.",
  )
}

export function contentMutationErrorMessage(
  caught: unknown,

  action: "submit" | "revision",
) {
  if (caught instanceof ApiError && caught.code === "CONTENT_STATE_CONFLICT") {
    return action === "submit"
      ? "이미 심사 요청되었거나 현재 제출할 수 없는 콘텐츠입니다. 최신 상태를 확인해 주세요."
      : "이미 심사 중인 수정본이 있거나 현재 수정본을 만들 수 없는 콘텐츠입니다. 최신 상태를 확인해 주세요."
  }

  return apiErrorMessage(
    caught,

    action === "submit"
      ? "심사를 요청하지 못했습니다."
      : "수정본을 생성하지 못했습니다.",
  )
}

async function getLatestContentRevisionOrNull(
  contentId: string,
  signal?: AbortSignal,
) {
  try {
    return await getLatestContentRevision(contentId, signal)
  } catch (caught) {
    if (caught instanceof ApiError && caught.status === 404) return null
    throw caught
  }
}

const requiredContentFields: Array<{
  key: keyof typeof emptyDraft

  label: string

  maxLength?: number
}> = [
  { key: "title", label: "콘텐츠 제목", maxLength: 255 },

  { key: "description", label: "콘텐츠 소개" },

  { key: "locationText", label: "위치 안내", maxLength: 255 },

  { key: "operatingHoursText", label: "운영 시간 안내" },

  { key: "contactText", label: "연락처 안내", maxLength: 255 },

  { key: "precautions", label: "유의사항" },

  { key: "ageRequirement", label: "연령 조건", maxLength: 255 },

  { key: "materials", label: "준비물" },

  { key: "cancellationPolicyText", label: "취소 정책 안내" },
]

export function validateSessionDraft(draft: typeof emptySession, index = 0) {
  const label = `회차 ${index + 1}`

  if (
    !draft.startsAt ||
    !draft.endsAt ||
    !draft.checkinOpenAt ||
    !draft.checkinCloseAt
  )
    return `${label}의 시각을 모두 입력해 주세요.`

  const startsAt = Date.parse(toSeoulOffset(draft.startsAt)!)

  const endsAt = Date.parse(toSeoulOffset(draft.endsAt)!)

  const checkinOpenAt = Date.parse(toSeoulOffset(draft.checkinOpenAt)!)

  const checkinCloseAt = Date.parse(toSeoulOffset(draft.checkinCloseAt)!)

  if ([startsAt, endsAt, checkinOpenAt, checkinCloseAt].some(Number.isNaN))
    return `${label}의 날짜와 시각을 확인해 주세요.`

  if (startsAt >= endsAt)
    return `${label}의 종료 시각은 시작 시각보다 늦어야 합니다.`

  if (checkinOpenAt >= checkinCloseAt)
    return `${label}의 체크인 종료는 체크인 시작보다 늦어야 합니다.`

  if (checkinCloseAt >= endsAt)
    return `${label}의 체크인 종료는 회차 종료보다 빨라야 합니다.`

  const capacity = Number(draft.capacity)

  if (!Number.isInteger(capacity) || capacity <= 0)
    return `${label}의 정원은 1명 이상의 정수여야 합니다.`

  return null
}

export function validateContentDraft(
  draft: typeof emptyDraft,

  sessions: Array<typeof emptySession>,

  requiresImage: boolean,

  hasImage: boolean,
) {
  for (const field of requiredContentFields) {
    const value = draft[field.key].trim()

    if (!value) return `${field.label}을(를) 입력해 주세요.`

    if (field.maxLength && value.length > field.maxLength)
      return `${field.label}은(는) ${field.maxLength}자 이내로 입력해 주세요.`
  }

  const price = Number(draft.reservationPrice)

  if (!Number.isSafeInteger(price) || price < 0)
    return "예약 기본 금액은 0원 이상의 정수로 입력해 주세요."

  if (requiresImage) {
    if (!draft.publishAt) return "공개 예정 시각을 입력해 주세요."

    if (!hasImage) return "대표 이미지를 선택해 주세요."

    if (sessions.length === 0) return "하나 이상의 운영 회차를 추가해 주세요."

    for (let index = 0; index < sessions.length; index += 1) {
      const sessionError = validateSessionDraft(sessions[index], index)

      if (sessionError) return sessionError
    }
  }

  return null
}

export function ContentListPage() {
  const [items, setItems] = useState<ContentSummary[]>([])

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState("")

  const [version, setVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    setLoading(true)

    setError("")

    listMyContents(controller.signal)

      .then(({ contents }) => setItems(contents))

      .catch((caught) => {
        if (!isAbortError(caught, controller.signal)) {
          setError(apiErrorMessage(caught, "내 콘텐츠를 불러오지 못했습니다."))
        }
      })

      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [version])

  return (
    <>
      <Breadcrumb>운영자 콘솔 › 내 콘텐츠</Breadcrumb>
      <PageHeader
        title="내 콘텐츠"
        description="내가 등록한 행사·체험의 심사와 공개 상태를 확인합니다."
        actions={
          <Link
            className="op-button op-button-primary"
            to="/operator/contents/new"
          >
            ＋ 새 콘텐츠 등록
          </Link>
        }
      />
      {loading ? (
        <RouteState loading />
      ) : error ? (
        <RouteState
          error={error}
          onRetry={() => setVersion((value) => value + 1)}
        />
      ) : items.length === 0 ? (
        <RouteState empty="등록한 콘텐츠가 없습니다. 새 콘텐츠를 등록해 주세요." />
      ) : (
        <>
          <div className="op-info-banner">
            <div>
              <strong>총 {items.length}개 콘텐츠</strong>
              <span>Backend 제공 순서 · 검색/필터/페이지 없음</span>
            </div>
          </div>
          <div className="op-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>콘텐츠 ID</th>
                  <th>제목</th>
                  <th>유형</th>
                  <th>상태</th>
                  <th>생성 시각</th>
                  <th className="op-right">액션</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.contentId}>
                    <td className="op-mono">{item.contentId}</td>
                    <td>
                      <span className="op-cell-title">{item.title}</span>
                      {item.status === "REJECTED" && (
                        <span className="op-cell-sub">
                          반려 사유 확인 후 수정 가능
                        </span>
                      )}
                    </td>
                    <td>
                      {item.contentType === "EVENT_EXPERIENCE"
                        ? "행사·체험"
                        : item.contentType}
                    </td>
                    <td>
                      <StatusBadge value={item.status} />
                    </td>
                    <td>{formatDate(item.createdAt)}</td>
                    <td className="op-right">
                      <Link
                        className="op-button op-button-small"
                        to={`/operator/contents/${item.contentId}`}
                      >
                        상세 보기
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  )
}

type DetailModal = { kind: "withdraw" } | {
  kind: "cancel"

  session: DisplayContentSession
} | { kind: "change", session: DisplayContentSession } | null

export function ContentDetailPage() {
  const { contentId = "" } = useParams()

  const navigate = useNavigate()

  const location = useLocation()

  const { session } = useOperatorAuth()

  const [content, setContent] = useState<ContentDetail | null>(null)

  const [sessions, setSessions] = useState<DisplayContentSession[]>([])

  const [latestRevision, setLatestRevision] =
    useState<ContentRevisionSnapshot | null>(null)

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState("")

  const [notice, setNotice] = useState("")

  const [version, setVersion] = useState(0)

  const [modal, setModal] = useState<DetailModal>(null)

  const withdrawalIdempotencyKey = useRef(
    `operator-content-withdrawal-${crypto.randomUUID()}`,
  )

  useEffect(() => {
    const controller = new AbortController()

    setLoading(true)

    setError("")

    Promise.all([
      getMyContent(contentId, controller.signal),
      listOperatorContentSessions(contentId, controller.signal),
      getLatestContentRevisionOrNull(contentId, controller.signal),
    ])

      .then(([detail, result, revision]) => {
        setContent(detail)

        const loadedRevision = revision
          ? toContentRevisionSnapshot(revision)
          : null
        setLatestRevision(loadedRevision)
        if (session && loadedRevision)
          writeContentRevisionSnapshot(session.userId, loadedRevision)

        const navigationState =
          location.state as ContentDetailNavigationState | null

        const createdSession =
          navigationState?.createdSession?.contentId === contentId
            ? navigationState.createdSession
            : null

        const loadedSessions: DisplayContentSession[] = result.sessions.map(
          (item) => ({
            ...item,
            contentId,
            changeRequestId: item.pendingChangeRequest?.revisionId,
            changeRequestStatus: item.pendingChangeRequest?.status,
          }),
        )
        if (
          createdSession &&
          !loadedSessions.some(
            (session) => session.sessionId === createdSession.sessionId,
          )
        ) {
          loadedSessions.unshift(createdSession)
        }

        setSessions(loadedSessions)

        if (navigationState?.notice) setNotice(navigationState.notice)
      })

      .catch((caught) => {
        if (!isAbortError(caught, controller.signal)) {
          setError(
            apiErrorMessage(caught, "콘텐츠 상세를 불러오지 못했습니다."),
          )
        }
      })

      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [contentId, location.state, session, version])

  if (loading) return <RouteState loading />

  if (error || !content)
    return (
      <RouteState
        error={error || "콘텐츠가 없습니다."}
        onRetry={() => setVersion((value) => value + 1)}
      />
    )

  const revisionPending = latestRevision?.status === "EDIT_REQUESTED"
  const revisionCreatable =
    ["APPROVED", "PUBLISHED"].includes(content.status) && !revisionPending

  const editable = content.status === "REJECTED" || revisionCreatable

  const sessionCreatable = ["APPROVED", "PUBLISHED"].includes(content.status)

  return (
    <>
      <Breadcrumb>내 콘텐츠 › {content.title}</Breadcrumb>
      <PageHeader
        title={content.title}
        description={`콘텐츠 ID ${content.contentId} · 행사·체험`}
        actions={
          <>
            <Link className="op-button" to="/operator">
              목록으로
            </Link>
            {editable && (
              <Link
                className="op-button"
                to={`/operator/contents/${contentId}/edit`}
              >
                {content.status === "REJECTED" ? "반려 내용 수정" : "수정 요청"}
              </Link>
            )}
          </>
        }
      />
      {notice && (
        <div className="op-alert op-alert-success" role="status">
          {notice}
        </div>
      )}
      {content.rejectionReason && (
        <div className="op-rejection">
          <strong>최신 반려 사유</strong>
          {content.rejectionReason}
        </div>
      )}
      <div className="op-detail-layout">
        <div className="op-detail-main">
          <article className="op-panel">
            <header>
              <h2>콘텐츠 정보</h2>
              <StatusBadge value={content.status} />
            </header>
            <div className="op-panel-body">
              {content.representativeImageUrl ? (
                <img
                  className="op-content-image"
                  src={content.representativeImageUrl}
                  alt={`${content.title} 대표`}
                />
              ) : (
                <div className="op-image-placeholder">
                  등록된 대표 이미지가 없습니다.
                </div>
              )}
              <dl className="op-kv-grid">
                <div className="op-kv">
                  <dt>위치 안내</dt>
                  <dd>{content.locationText}</dd>
                </div>
                <div className="op-kv">
                  <dt>운영 시간</dt>
                  <dd>{content.operatingHoursText}</dd>
                </div>
                <div className="op-kv">
                  <dt>연락처</dt>
                  <dd>{content.contactText}</dd>
                </div>
                <div className="op-kv">
                  <dt>공개 예정 시각</dt>
                  <dd>{formatDate(content.publishAt)}</dd>
                </div>
                <div className="op-kv op-full">
                  <dt>콘텐츠 소개</dt>
                  <dd>{content.description}</dd>
                </div>
                <div className="op-kv">
                  <dt>연령 조건</dt>
                  <dd>{content.ageRequirement}</dd>
                </div>
                <div className="op-kv">
                  <dt>준비물</dt>
                  <dd>{content.materials}</dd>
                </div>
                <div className="op-kv op-full">
                  <dt>유의사항</dt>
                  <dd>{content.precautions}</dd>
                </div>
                <div className="op-kv op-full">
                  <dt>취소 정책</dt>
                  <dd>{content.cancellationPolicyText}</dd>
                </div>
              </dl>
            </div>
          </article>
          <article className="op-panel">
            <header>
              <h2>운영 회차</h2>
              {sessionCreatable && (
                <Link
                  className="op-button op-button-small op-button-primary"
                  to={`/operator/contents/${contentId}/sessions/new`}
                >
                  ＋ 회차 추가
                </Link>
              )}
            </header>
            <div className="op-panel-body">
              <div className="op-notice">
                운영자용 전체 회차 조회 결과와 현재 변경 요청 상태를 표시합니다.
              </div>
              {sessions.length === 0 ? (
                <p className="op-muted">
                  조회 가능한 공개 예정 회차가 없습니다.
                </p>
              ) : (
                <div className="op-list-cards">
                  {sessions.map((session, index) => {
                    const manageable = canManageSession(session)

                    const changePending =
                      session.changeRequestStatus === "PENDING"

                    const changeUnknown =
                      session.changeRequestStatus === "UNKNOWN"

                    return (
                      <div className="op-list-card" key={session.sessionId}>
                        <span>{index + 1}</span>
                        <div>
                          <strong>
                            {formatDate(session.startsAt)}–
                            {formatDate(session.endsAt)}
                          </strong>
                          <small>회차 ID {session.sessionId}</small>
                          {changePending && (
                            <small>
                              변경 요청 {session.changeRequestId} · 심사 대기
                            </small>
                          )}
                          {changeUnknown && (
                            <small>
                              변경 요청 {session.changeRequestId} · 결과 미확인
                            </small>
                          )}
                          {session.status === "CANCELLED" &&
                            session.cancellationReason && (
                              <small>
                                취소 사유: {session.cancellationReason}
                              </small>
                            )}
                        </div>
                        <StatusBadge value={session.status} />
                        {session.status === "SCHEDULED" && (
                          <Link
                            className="op-button op-button-small"
                            to={`/operator/reservations?contentId=${contentId}&sessionId=${session.sessionId}`}
                          >
                            예약자
                          </Link>
                        )}
                        {manageable && (
                          <button
                            className="op-button op-button-small"
                            disabled={changePending}
                            onClick={() =>
                              setModal({ kind: "change", session })
                            }
                          >
                            {changePending ? "변경 심사 중" : "변경 요청"}
                          </button>
                        )}
                        {manageable && !changePending && (
                          <button
                            className="op-button op-button-small op-button-danger-outline"
                            onClick={() =>
                              setModal({ kind: "cancel", session })
                            }
                          >
                            회차 취소
                          </button>
                        )}
                        {!manageable && (
                          <span className="op-muted">변경·취소 불가</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </article>
        </div>
        <aside className="op-action-card">
          <h2>가능한 처리</h2>
          <p>현재 상태와 Backend 소유권 검증을 기준으로 처리됩니다.</p>
          {latestRevision && (
            <Link
              className="op-button"
              to={`/operator/contents/${contentId}/revisions/latest`}
            >
              수정본 {latestRevision.revisionId} ·{" "}
              {statusLabel(latestRevision.status)}
            </Link>
          )}
          {editable && (
            <Link
              className="op-button op-button-primary"
              to={`/operator/contents/${contentId}/edit`}
            >
              콘텐츠 수정
            </Link>
          )}
          {sessionCreatable && (
            <Link
              className="op-button"
              to={`/operator/contents/${contentId}/sessions/new`}
            >
              추가 회차 등록
            </Link>
          )}
          {sessions[0] && (
            <Link
              className="op-button"
              to={`/operator/reservations?contentId=${contentId}&sessionId=${sessions[0].sessionId}`}
            >
              예약자 목록 보기
            </Link>
          )}
          {content.status === "PUBLISHED" && (
            <button
              className="op-button op-button-danger-outline"
              onClick={() => setModal({ kind: "withdraw" })}
            >
              전체 콘텐츠 철회 요청
            </button>
          )}
        </aside>
      </div>
      {modal?.kind === "withdraw" && (
        <ActionModal
          title="콘텐츠 철회를 요청할까요?"
          description="지역 관리자 심사 후 콘텐츠 전체가 철회됩니다."
          label="철회 사유"
          confirmLabel="철회 요청"
          tone="danger"
          onClose={() => setModal(null)}
          onConfirm={async (reason) => {
            await requestContentWithdrawal(
              contentId,
              reason,
              withdrawalIdempotencyKey.current,
            )

            setModal(null)

            setNotice("콘텐츠 철회 요청이 접수되었습니다.")
          }}
        />
      )}
      {modal?.kind === "cancel" && (
        <ActionModal
          title="회차를 취소할까요?"
          description="미체크인 확정 예약이 취소되며 결제 환불 후처리가 시작됩니다."
          label="취소 사유"
          confirmLabel="회차 취소"
          tone="danger"
          onClose={() => setModal(null)}
          onConfirm={async (reason) => {
            try {
              const result = await cancelSession(
                modal.session.sessionId,

                reason,
              )

              setSessions((current) => {
                const next = current.map((session) =>
                  session.sessionId === result.sessionId
                    ? { ...session, status: result.status }
                    : session,
                )

                if (session)
                  writeContentSessionSnapshots(
                    session.userId,

                    contentId,

                    next as ContentSessionSnapshot[],
                  )

                return next
              })

              setModal(null)

              setNotice("회차가 취소 상태로 변경되었습니다.")
            } catch (caught) {
              throw new Error(sessionMutationErrorMessage(caught, "cancel"))
            }
          }}
        />
      )}
      {modal?.kind === "change" && (
        <SessionChangeModal
          session={modal.session}
          onClose={() => setModal(null)}
          onSuccess={(result, candidate) => {
            setSessions((current) => {
              const next = current.map((session) =>
                session.sessionId === modal.session.sessionId
                  ? {
                      ...session,

                      changeRequestId: result.revisionId,

                      changeRequestStatus: result.status,

                      changeCandidate: candidate,

                      changeRequestedAt: new Date().toISOString(),
                    }
                  : session,
              )

              if (session)
                writeContentSessionSnapshots(
                  session.userId,

                  contentId,

                  next as ContentSessionSnapshot[],
                )

              return next
            })

            setModal(null)

            setNotice("회차 변경 요청이 심사 대기로 접수되었습니다.")
          }}
        />
      )}
    </>
  )
}

function SessionChangeModal({
  session,

  onClose,

  onSuccess,
}: {
  session: DisplayContentSession

  onClose: () => void

  onSuccess: (
    result: SessionChangeRequestResult,

    candidate: SessionInput,
  ) => void
}) {
  const [draft, setDraft] = useState({
    ...emptySession,

    startsAt: toDateTimeInput(session.startsAt),

    endsAt: toDateTimeInput(session.endsAt),
  })

  const [submitting, setSubmitting] = useState(false)

  const [error, setError] = useState("")

  const set = (key: keyof typeof draft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }))

  const submit = async (event: FormEvent) => {
    event.preventDefault()

    const validationError = validateSessionDraft(draft)

    if (validationError) {
      setError(validationError)

      return
    }

    setSubmitting(true)

    setError("")

    try {
      const candidate = sessionPayload(draft)

      const result = await requestSessionChange(session.sessionId, candidate)

      onSuccess(result, candidate)
    } catch (caught) {
      setError(sessionMutationErrorMessage(caught, "change"))

      setSubmitting(false)
    }
  }

  return (
    <div className="op-modal-backdrop">
      <form className="op-modal op-modal-wide" onSubmit={submit}>
        <header>
          <h2>회차 변경 요청</h2>
          <p>기존 회차는 유지되고 후보 일정과 정원이 심사 대기로 저장됩니다.</p>
        </header>
        <div className="op-modal-body">
          <div className="op-form-grid">
            <DateField
              label="시작 시각"
              value={draft.startsAt}
              onChange={(value) => set("startsAt", value)}
            />
            <DateField
              label="종료 시각"
              value={draft.endsAt}
              onChange={(value) => set("endsAt", value)}
            />
            <DateField
              label="체크인 시작"
              value={draft.checkinOpenAt}
              onChange={(value) => set("checkinOpenAt", value)}
            />
            <DateField
              label="체크인 종료"
              value={draft.checkinCloseAt}
              onChange={(value) => set("checkinCloseAt", value)}
            />
            <label className="op-field op-full">
              정원
              <input
                className="op-control"
                type="number"
                min="1"
                value={draft.capacity}
                onChange={(event) => set("capacity", event.target.value)}
                required
              />
            </label>
          </div>
          {error && <div className="op-alert">{error}</div>}
        </div>
        <footer>
          <button className="op-button" type="button" onClick={onClose}>
            취소
          </button>
          <button className="op-button op-button-admin" disabled={submitting}>
            {submitting ? "요청 중…" : "변경 심사 요청"}
          </button>
        </footer>
      </form>
    </div>
  )
}

export function ContentFormPage() {
  const { contentId } = useParams()

  const navigate = useNavigate()

  const { session } = useOperatorAuth()

  const editing = Boolean(contentId)

  const [source, setSource] = useState<ContentDetail | null>(null)

  const [draft, setDraft] = useState(emptyDraft)

  const [sessions, setSessions] = useState([{ ...emptySession }])

  const [file, setFile] = useState<File | null>(null)

  const [loading, setLoading] = useState(editing)

  const [submitting, setSubmitting] = useState(false)

  const [savedRejected, setSavedRejected] = useState(false)

  const [restoredPrice, setRestoredPrice] = useState(false)

  const [error, setError] = useState("")

  const [confirmation, setConfirmation] = useState<"save" | "resubmit" | null>(
    null,
  )

  useEffect(() => {
    if (!contentId) return

    const controller = new AbortController()

    Promise.all([
      getMyContent(contentId, controller.signal),
      getLatestContentRevisionOrNull(contentId, controller.signal),
    ])

      .then(([detail, remoteRevision]) => {
        const storedPrice = session
          ? readOperatorCompatValue<number>(
              session.userId,

              "content-price",

              contentId,
            )
          : null

        const storedRevision = session
          ? readLatestContentRevisionSnapshot(session.userId, contentId)
          : null
        const latestRevision = remoteRevision
          ? toContentRevisionSnapshot(remoteRevision)
          : storedRevision
        const revisionPrice =
          latestRevision &&
          !["EDIT_WITHDRAWN", "EDIT_INVALIDATED"].includes(
            latestRevision.status,
          )
            ? latestRevision.candidate.reservationPrice
            : undefined

        const restoredPriceValue = Number.isFinite(revisionPrice)
          ? revisionPrice
          : typeof storedPrice?.value === "number" &&
              Number.isFinite(storedPrice.value)
            ? storedPrice.value
            : undefined
        const canRestorePrice = Number.isFinite(restoredPriceValue)

        setSource(detail)

        setRestoredPrice(canRestorePrice)

        setDraft({
          title: detail.title,

          description: detail.description,

          locationText: detail.locationText,

          operatingHoursText: detail.operatingHoursText,

          contactText: detail.contactText,

          precautions: detail.precautions,

          ageRequirement: detail.ageRequirement,

          materials: detail.materials,

          cancellationPolicyText: detail.cancellationPolicyText,

          reservationPrice: canRestorePrice ? String(restoredPriceValue) : "",

          publishAt:
            detail.status === "PUBLISHED"
              ? ""
              : toDateTimeInput(detail.publishAt),
        })
      })

      .catch((caught) => {
        if (!isAbortError(caught, controller.signal))
          setError(apiErrorMessage(caught, "콘텐츠를 불러오지 못했습니다."))
      })

      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [contentId, session])

  const set = (key: keyof typeof draft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }))

  const payload = async (): Promise<ContentInput> => {
    let imageObjectId: string | undefined

    if (file) imageObjectId = await uploadRepresentativeImage(file)

    if (!editing && !imageObjectId)
      throw new Error("대표 이미지를 선택해 주세요.")

    return {
      title: draft.title.trim(),

      description: draft.description.trim(),

      locationText: draft.locationText.trim(),

      operatingHoursText: draft.operatingHoursText.trim(),

      contactText: draft.contactText.trim(),

      precautions: draft.precautions.trim(),

      ageRequirement: draft.ageRequirement.trim(),

      materials: draft.materials.trim(),

      cancellationPolicyText: draft.cancellationPolicyText.trim(),

      reservationPrice: Number(draft.reservationPrice),

      publishAt:
        source?.status === "PUBLISHED" ? null : toSeoulOffset(draft.publishAt),

      ...(imageObjectId ? { representativeImageObjectId: imageObjectId } : {}),
    }
  }

  const requestSubmit = (event: FormEvent) => {
    event.preventDefault()

    const validationError = validateContentDraft(
      draft,

      sessions,

      !editing,

      Boolean(file),
    )

    if (validationError) {
      setError(validationError)

      return
    }

    setError("")

    setConfirmation("save")
  }

  const save = async () => {
    setSubmitting(true)

    setError("")

    try {
      const input = await payload()

      if (!contentId) {
        const result = await createContent(input, sessions.map(sessionPayload))

        if (session)
          writeOperatorCompatValue(
            session.userId,

            "content-price",

            result.contentId,

            input.reservationPrice,
          )

        navigate(`/operator/contents/${result.contentId}`, { replace: true })
      } else if (source?.status === "REJECTED") {
        await updateRejectedContent(contentId, input)

        if (session)
          writeOperatorCompatValue(
            session.userId,

            "content-price",

            contentId,

            input.reservationPrice,
          )

        setSavedRejected(true)
      } else {
        const result = await createContentRevision(contentId, input)

        if (session)
          writeOperatorCompatValue(
            session.userId,

            "content-price",

            contentId,

            input.reservationPrice,
          )

        if (session)
          writeContentRevisionSnapshot(session.userId, {
            revisionId: result.revisionId,

            contentId: result.contentId,

            status: result.status,

            candidate: input,

            submittedAt: result.submittedAt,
          })

        navigate(`/operator/contents/${result.contentId}/revisions/latest`, {
          replace: true,

          state: { notice: "수정본이 생성되어 심사 요청되었습니다." },
        })
      }

      setConfirmation(null)
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.code === "INVALID_INPUT"
          ? "Backend가 입력값을 거부했습니다. 회차의 시작 < 종료, 체크인 시작 < 체크인 종료 < 회차 종료 순서와 모든 필수 항목을 확인해 주세요."
          : contentId && source?.status !== "REJECTED"
            ? contentMutationErrorMessage(caught, "revision")
            : apiErrorMessage(caught, "콘텐츠를 저장하지 못했습니다."),
      )

      setConfirmation(null)
    } finally {
      setSubmitting(false)
    }
  }

  const resubmit = async () => {
    if (!contentId) return

    setSubmitting(true)

    setError("")

    try {
      await submitContent(contentId)

      navigate(`/operator/contents/${contentId}`, { replace: true })
    } catch (caught) {
      setError(contentMutationErrorMessage(caught, "submit"))

      setConfirmation(null)

      setSubmitting(false)
    }
  }

  if (loading) return <RouteState loading />

  if (editing && !source)
    return <RouteState error={error || "콘텐츠를 불러오지 못했습니다."} />

  const mode = !editing
    ? "등록"
    : source?.status === "REJECTED"
      ? "반려 콘텐츠 보완"
      : `${statusLabel(source?.status ?? "")} 콘텐츠 수정 요청`

  return (
    <>
      <Breadcrumb>
        내 콘텐츠 › {editing ? source?.title : "새 콘텐츠 등록"}
      </Breadcrumb>
      <PageHeader
        title={mode}
        description={
          !editing
            ? "필수 정보, 대표 이미지, 하나 이상의 회차를 함께 등록해 심사를 요청합니다."
            : source?.status === "REJECTED"
              ? "반려 사유를 반영해 저장한 뒤 재심사를 요청합니다."
              : "현재 원본은 유지하고 변경 후보를 수정본으로 제출합니다."
        }
      />
      {source?.rejectionReason && (
        <div className="op-rejection">
          <strong>반려 사유</strong>
          {source.rejectionReason}
        </div>
      )}
      <form className="op-form-shell" onSubmit={requestSubmit}>
        <article className="op-panel">
          <header>
            <h2>기본 정보</h2>
            <StatusBadge value={source?.status ?? "PENDING"} />
          </header>
          <div className="op-panel-body">
            <div className="op-form-grid">
              <TextField
                full
                label="콘텐츠 제목"
                value={draft.title}
                onChange={(value) => set("title", value)}
              />
              <TextArea
                full
                label="콘텐츠 소개"
                value={draft.description}
                onChange={(value) => set("description", value)}
              />
              <TextField
                label="위치 안내"
                value={draft.locationText}
                onChange={(value) => set("locationText", value)}
              />
              <TextField
                label="운영 시간 안내"
                value={draft.operatingHoursText}
                onChange={(value) => set("operatingHoursText", value)}
              />
              <TextField
                label="연락처 안내"
                value={draft.contactText}
                onChange={(value) => set("contactText", value)}
              />
              <label className="op-field">
                예약 기본 금액 (원)
                <input
                  className="op-control"
                  type="number"
                  min="0"
                  value={draft.reservationPrice}
                  onChange={(event) =>
                    set("reservationPrice", event.target.value)
                  }
                  required
                />
                <small>
                  {editing &&
                    (restoredPrice
                      ? "이 브라우저에서 마지막으로 성공한 요청 금액을 복원했습니다. 저장 전 확인해 주세요."
                      : "Backend 상세 응답에 기존 금액이 없어 다시 입력해야 합니다.")}
                </small>
              </label>
              <TextField
                label="연령 조건"
                value={draft.ageRequirement}
                onChange={(value) => set("ageRequirement", value)}
              />
              <TextField
                label="준비물"
                value={draft.materials}
                onChange={(value) => set("materials", value)}
              />
              <TextArea
                full
                label="유의사항"
                value={draft.precautions}
                onChange={(value) => set("precautions", value)}
              />
              <TextArea
                full
                label="취소 정책 안내"
                value={draft.cancellationPolicyText}
                onChange={(value) => set("cancellationPolicyText", value)}
              />
              {source?.status !== "PUBLISHED" && (
                <DateField
                  full
                  label="공개 예정 시각"
                  value={draft.publishAt}
                  onChange={(value) => set("publishAt", value)}
                />
              )}
              <label className="op-upload op-full">
                <strong>
                  {editing ? "대표 이미지 변경" : "대표 이미지 업로드"}
                </strong>
                <span>
                  {file?.name ??
                    (editing
                      ? "변경하지 않으면 현재 이미지를 유지합니다."
                      : "JPG/PNG/WEBP · 최대 5MB")}
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  required={!editing}
                />
              </label>
              {!editing && (
                <div className="op-full">
                  <h3>운영 회차</h3>
                  <div className="op-notice">
                    시간 순서: 회차 시작 &lt; 회차 종료, 체크인 시작 &lt; 체크인
                    종료 &lt; 회차 종료
                  </div>
                  {sessions.map((session, index) => (
                    <SessionEditor
                      key={index}
                      value={session}
                      index={index}
                      canDelete={sessions.length > 1}
                      onChange={(next) =>
                        setSessions((items) =>
                          items.map((item, itemIndex) =>
                            itemIndex === index ? next : item,
                          ),
                        )
                      }
                      onDelete={() =>
                        setSessions((items) =>
                          items.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                    />
                  ))}
                  <button
                    className="op-button"
                    type="button"
                    onClick={() =>
                      setSessions((items) => [...items, { ...emptySession }])
                    }
                  >
                    ＋ 회차 추가
                  </button>
                </div>
              )}
            </div>
          </div>
        </article>
        <aside className="op-action-card">
          <h2>{savedRejected ? "저장 완료" : "등록 전 확인"}</h2>
          <p>
            {editing
              ? "입력값은 실제 Backend 상태 전이 규칙에 따라 처리됩니다."
              : "소유자와 담당 지역은 로그인 계정에서 자동 지정됩니다."}
          </p>
          {savedRejected ? (
            <>
              <div className="op-notice">
                보완 내용이 저장되었습니다. 이제 재심사를 요청할 수 있습니다.
              </div>
              <button
                className="op-button op-button-admin"
                type="button"
                onClick={() => setConfirmation("resubmit")}
                disabled={submitting}
              >
                재심사 요청
              </button>
            </>
          ) : (
            <button
              className="op-button op-button-primary"
              disabled={submitting}
            >
              {submitting
                ? "저장 중…"
                : !editing
                  ? "콘텐츠 등록 및 심사 요청"
                  : source?.status === "REJECTED"
                    ? "보완 내용 저장"
                    : "수정본 생성 및 심사 요청"}
            </button>
          )}
          {error && (
            <div className="op-alert" role="alert">
              {error}
            </div>
          )}
          <Link
            className="op-button"
            to={contentId ? `/operator/contents/${contentId}` : "/operator"}
          >
            취소하고 돌아가기
          </Link>
        </aside>
      </form>
      {confirmation === "save" && (
        <ConfirmModal
          title={
            !editing
              ? "콘텐츠를 심사 요청할까요?"
              : source?.status === "REJECTED"
                ? "보완 내용을 저장할까요?"
                : "수정본을 생성해 심사 요청할까요?"
          }
          description={
            !editing
              ? "콘텐츠와 회차가 심사 대기 상태로 등록됩니다."
              : source?.status === "REJECTED"
                ? "저장 후 별도의 재심사 요청이 필요합니다."
                : "현재 원본은 유지되고 입력한 후보 정보가 수정본으로 제출됩니다."
          }
          confirmLabel={
            source?.status === "REJECTED" ? "보완 내용 저장" : "심사 요청"
          }
          tone="primary"
          onClose={() => setConfirmation(null)}
          onConfirm={save}
        />
      )}
      {confirmation === "resubmit" && (
        <ConfirmModal
          title="콘텐츠를 재심사 요청할까요?"
          description="저장한 보완 내용이 심사 대기 상태로 전환되며 심사 중에는 수정할 수 없습니다."
          confirmLabel="재심사 요청"
          tone="primary"
          onClose={() => setConfirmation(null)}
          onConfirm={resubmit}
        />
      )}
    </>
  )
}

function revisionDraft(snapshot: ContentRevisionSnapshot) {
  return {
    title: snapshot.candidate.title,

    description: snapshot.candidate.description,

    locationText: snapshot.candidate.locationText,

    operatingHoursText: snapshot.candidate.operatingHoursText,

    contactText: snapshot.candidate.contactText,

    precautions: snapshot.candidate.precautions,

    ageRequirement: snapshot.candidate.ageRequirement,

    materials: snapshot.candidate.materials,

    cancellationPolicyText: snapshot.candidate.cancellationPolicyText,

    reservationPrice: String(snapshot.candidate.reservationPrice),

    publishAt: toDateTimeInput(snapshot.candidate.publishAt),
  }
}

export function ContentRevisionPage() {
  const { revisionId = "", contentId = "" } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { session } = useOperatorAuth()
  const initialSnapshot =
    session && revisionId
      ? readContentRevisionSnapshot(session.userId, revisionId)
      : null
  const requestedContentId = contentId || initialSnapshot?.contentId || ""
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const [draft, setDraft] = useState(
    initialSnapshot ? revisionDraft(initialSnapshot) : emptyDraft,
  )

  const [file, setFile] = useState<File | null>(null)

  const [editing, setEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [error, setError] = useState("")

  const [notice, setNotice] = useState(
    (location.state as { notice?: string } | null)?.notice ?? "",
  )

  const [modal, setModal] = useState<"withdraw" | "resubmit" | null>(null)
  const [loading, setLoading] = useState(Boolean(requestedContentId))
  const [serverStateLoaded, setServerStateLoaded] = useState(false)

  useEffect(() => {
    if (!session || !requestedContentId) return

    const controller = new AbortController()
    setLoading(true)
    setError("")
    getLatestContentRevision(requestedContentId, controller.signal)
      .then((revision) => {
        const loaded = toContentRevisionSnapshot(revision)
        writeContentRevisionSnapshot(session.userId, loaded)
        setSnapshot(loaded)
        setDraft(revisionDraft(loaded))
        setEditing(false)
        setServerStateLoaded(true)
      })
      .catch((caught) => {
        if (!isAbortError(caught, controller.signal))
          setError(
            apiErrorMessage(caught, "최신 수정본을 불러오지 못했습니다."),
          )
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [requestedContentId, session])

  const revisionStateUnknown =
    !serverStateLoaded &&
    snapshot?.status === "EDIT_REQUESTED" &&
    !isContentRevisionReviewFresh(snapshot)

  if (loading) return <RouteState loading />

  if (!session || !snapshot) {
    return (
      <RouteState
        error={
          error ||
          "수정본의 콘텐츠를 확인할 수 없습니다. 콘텐츠 상세에서 최신 수정본을 다시 열어 주세요."
        }
      />
    )
  }

  const set = (key: keyof typeof draft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }))

  const candidatePayload = async (): Promise<ContentInput> => {
    const imageObjectId = file
      ? await uploadRepresentativeImage(file)
      : undefined

    return {
      title: draft.title.trim(),

      description: draft.description.trim(),

      locationText: draft.locationText.trim(),

      operatingHoursText: draft.operatingHoursText.trim(),

      contactText: draft.contactText.trim(),

      precautions: draft.precautions.trim(),

      ageRequirement: draft.ageRequirement.trim(),

      materials: draft.materials.trim(),

      cancellationPolicyText: draft.cancellationPolicyText.trim(),

      reservationPrice: Number(draft.reservationPrice),

      publishAt:
        snapshot.candidate.publishAt === null
          ? null
          : toSeoulOffset(draft.publishAt),

      ...(imageObjectId
        ? { representativeImageObjectId: imageObjectId }
        : snapshot.candidate.representativeImageObjectId
          ? {
              representativeImageObjectId:
                snapshot.candidate.representativeImageObjectId,
            }
          : {}),
    }
  }

  const saveRevision = async (event: FormEvent) => {
    event.preventDefault()

    const validationError = validateContentDraft(draft, [], false, true)

    if (validationError) {
      setError(validationError)

      return
    }

    setSubmitting(true)

    setError("")

    try {
      const candidate = await candidatePayload()

      const result = await updateContentRevision(snapshot.revisionId, candidate)
      const next: ContentRevisionSnapshot = {
        ...snapshot,

        status: result.status,

        candidate,

        updatedAt: result.updatedAt,
      }

      writeContentRevisionSnapshot(session.userId, next)

      setSnapshot(next)

      setEditing(false)

      setNotice("수정본 데이터가 저장되었습니다.")
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.code === "CONTENT_STATE_CONFLICT"
          ? "아직 심사 중이거나 편집할 수 없는 수정본입니다. 최신 심사 결과를 확인해 주세요."
          : apiErrorMessage(caught, "수정본을 저장하지 못했습니다."),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const resubmitRevision = async () => {
    setSubmitting(true)

    setError("")

    try {
      const result = await resubmitContentRevision(snapshot.revisionId)
      const next: ContentRevisionSnapshot = {
        revisionId: result.revisionId,
        contentId: result.contentId,
        status: result.status,
        candidate: snapshot.candidate,
        submittedAt: result.submittedAt,
        representativeImageUrl: snapshot.representativeImageUrl,
        representativeImageUrlExpiresAt:
          snapshot.representativeImageUrlExpiresAt,
      }
      writeContentRevisionSnapshot(session.userId, next)
      setSnapshot(next)
      setEditing(false)
      setModal(null)
      setNotice("새 수정본으로 재심사 요청되었습니다.")
      navigate(`/operator/contents/${result.contentId}/revisions/latest`, {
        replace: true,
      })
    } catch (caught) {
      setError(apiErrorMessage(caught, "수정본 재심사를 요청하지 못했습니다."))

      setModal(null)

      setSubmitting(false)
    }
  }

  return (
    <>
      <Breadcrumb>내 콘텐츠 › 수정본 {snapshot.revisionId}</Breadcrumb>
      <PageHeader
        title={`콘텐츠 수정본 ${snapshot.revisionId}`}
        description={`원본 콘텐츠 ${snapshot.contentId}의 변경 후보입니다.`}
        actions={
          <Link
            className="op-button"
            to={`/operator/contents/${snapshot.contentId}`}
          >
            원본 상세
          </Link>
        }
      />
      {notice && (
        <div className="op-alert op-alert-success" role="status">
          {notice}
        </div>
      )}
      {revisionStateUnknown && (
        <div className="op-notice">
          마지막 요청 후 1시간이 지나 현재 심사 상태를 확인할 수 없습니다. 편집
          저장을 시도하면 Backend가 반려 여부를 최종 확인하며, 아직 심사 중이면
          저장하지 않고 안내합니다.
        </div>
      )}
      {editing ? (
        <form className="op-form-shell" onSubmit={saveRevision}>
          <article className="op-panel">
            <header>
              <h2>
                {snapshot.status === "EDIT_REJECTED"
                  ? "반려 수정본 편집"
                  : "수정본 편집 상태 확인"}
              </h2>
              <StatusBadge value={snapshot.status} />
            </header>
            <div className="op-panel-body">
              <div className="op-form-grid">
                <TextField
                  full
                  label="콘텐츠 제목"
                  value={draft.title}
                  onChange={(value) => set("title", value)}
                />
                <TextArea
                  full
                  label="콘텐츠 소개"
                  value={draft.description}
                  onChange={(value) => set("description", value)}
                />
                <TextField
                  label="위치 안내"
                  value={draft.locationText}
                  onChange={(value) => set("locationText", value)}
                />
                <TextField
                  label="운영 시간 안내"
                  value={draft.operatingHoursText}
                  onChange={(value) => set("operatingHoursText", value)}
                />
                <TextField
                  label="연락처 안내"
                  value={draft.contactText}
                  onChange={(value) => set("contactText", value)}
                />
                <label className="op-field">
                  예약 기본 금액 (원)
                  <input
                    className="op-control"
                    type="number"
                    min="0"
                    value={draft.reservationPrice}
                    onChange={(event) =>
                      set("reservationPrice", event.target.value)
                    }
                    required
                  />
                </label>
                <TextField
                  label="연령 조건"
                  value={draft.ageRequirement}
                  onChange={(value) => set("ageRequirement", value)}
                />
                <TextField
                  label="준비물"
                  value={draft.materials}
                  onChange={(value) => set("materials", value)}
                />
                <TextArea
                  full
                  label="유의사항"
                  value={draft.precautions}
                  onChange={(value) => set("precautions", value)}
                />
                <TextArea
                  full
                  label="취소 정책 안내"
                  value={draft.cancellationPolicyText}
                  onChange={(value) => set("cancellationPolicyText", value)}
                />
                {snapshot.candidate.publishAt !== null && (
                  <DateField
                    full
                    label="공개 예정 시각"
                    value={draft.publishAt}
                    onChange={(value) => set("publishAt", value)}
                  />
                )}
                <label className="op-upload op-full">
                  <strong>대표 이미지 변경</strong>
                  <span>
                    {file?.name ?? "변경하지 않으면 후보 이미지를 유지합니다."}
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) =>
                      setFile(event.target.files?.[0] ?? null)
                    }
                  />
                </label>
              </div>
            </div>
          </article>
          <aside className="op-action-card">
            <h2>수정본 저장</h2>
            <button
              className="op-button op-button-primary"
              disabled={submitting}
            >
              {submitting ? "저장 중…" : "수정본 저장"}
            </button>
            <button
              className="op-button"
              type="button"
              onClick={() => setEditing(false)}
              disabled={submitting}
            >
              취소
            </button>
            {error && (
              <div className="op-alert" role="alert">
                {error}
              </div>
            )}
          </aside>
        </form>
      ) : (
        <div className="op-detail-layout">
          <article className="op-panel">
            <header>
              <h2>수정본 데이터</h2>
              <StatusBadge value={snapshot.status} />
            </header>
            <div className="op-panel-body">
              <dl className="op-kv-grid">
                <RevisionValue label="제목" value={snapshot.candidate.title} />
                <RevisionValue
                  label="예약 기본 금액"
                  value={`${snapshot.candidate.reservationPrice.toLocaleString()}원`}
                />
                <RevisionValue
                  label="위치"
                  value={snapshot.candidate.locationText}
                />
                <RevisionValue
                  label="운영 시간"
                  value={snapshot.candidate.operatingHoursText}
                />
                <RevisionValue
                  label="연락처"
                  value={snapshot.candidate.contactText}
                />
                <RevisionValue
                  label="연령 조건"
                  value={snapshot.candidate.ageRequirement}
                />
                <RevisionValue
                  label="소개"
                  value={snapshot.candidate.description}
                  full
                />
                <RevisionValue
                  label="유의사항"
                  value={snapshot.candidate.precautions}
                  full
                />
                <RevisionValue
                  label="준비물"
                  value={snapshot.candidate.materials}
                  full
                />
                <RevisionValue
                  label="취소 정책"
                  value={snapshot.candidate.cancellationPolicyText}
                  full
                />
                {snapshot.candidate.publishAt && (
                  <RevisionValue
                    label="공개 예정 시각"
                    value={formatDate(snapshot.candidate.publishAt)}
                  />
                )}
                {snapshot.withdrawalReason && (
                  <RevisionValue
                    label="철회 사유"
                    value={snapshot.withdrawalReason}
                    full
                  />
                )}
                {snapshot.reviewReason && (
                  <RevisionValue
                    label="심사 사유"
                    value={snapshot.reviewReason}
                    full
                  />
                )}
              </dl>
            </div>
          </article>
          <aside className="op-action-card">
            <h2>가능한 처리</h2>
            {snapshot.status === "EDIT_REQUESTED" && (
              <>
                <button
                  className="op-button op-button-danger-outline"
                  onClick={() => setModal("withdraw")}
                >
                  수정본 철회
                </button>
                {revisionStateUnknown && (
                  <button
                    className="op-button op-button-primary"
                    onClick={() => setEditing(true)}
                  >
                    반려 여부 확인하며 편집
                  </button>
                )}
              </>
            )}
            {snapshot.status === "EDIT_REJECTED" && (
              <>
                <button
                  className="op-button op-button-primary"
                  onClick={() => setEditing(true)}
                >
                  반려 수정본 편집
                </button>
                <button
                  className="op-button"
                  onClick={() => setModal("resubmit")}
                >
                  새 수정본으로 재심사 요청
                </button>
              </>
            )}
            {snapshot.status === "EDIT_WITHDRAWN" && (
              <div className="op-notice">이미 철회된 수정본입니다.</div>
            )}
            {error && (
              <div className="op-alert" role="alert">
                {error}
              </div>
            )}
          </aside>
        </div>
      )}
      {modal === "withdraw" && (
        <ActionModal
          title="수정본을 철회할까요?"
          description="심사 중인 변경 후보가 철회되며 원본 콘텐츠에는 반영되지 않습니다."
          label="철회 사유"
          confirmLabel="수정본 철회"
          tone="danger"
          onClose={() => setModal(null)}
          onConfirm={async (reason) => {
            const result = await withdrawContentRevision(
              snapshot.revisionId,
              reason,
            )
            const next: ContentRevisionSnapshot = {
              ...snapshot,

              status: result.status,

              withdrawalReason: result.withdrawalReason,

              withdrawnAt: result.withdrawnAt,
            }

            writeContentRevisionSnapshot(session.userId, next)

            setSnapshot(next)

            setModal(null)

            setNotice("수정본이 철회되었습니다.")
          }}
        />
      )}
      {modal === "resubmit" && (
        <ConfirmModal
          title="수정본을 재심사 요청할까요?"
          description="저장한 반려 수정본을 기준으로 새 심사 요청을 생성합니다."
          confirmLabel="재심사 요청"
          tone="primary"
          onClose={() => setModal(null)}
          onConfirm={resubmitRevision}
        />
      )}
    </>
  )
}

function RevisionValue({
  label,

  value,

  full,
}: {
  label: string

  value: string

  full?: boolean
}) {
  return (
    <div className={`op-kv${full ? " op-full" : ""}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

export function ContentSessionFormPage() {
  const { contentId = "" } = useParams()

  const navigate = useNavigate()

  const { session } = useOperatorAuth()

  const [content, setContent] = useState<ContentDetail | null>(null)

  const [draft, setDraft] = useState({ ...emptySession })

  const [submitting, setSubmitting] = useState(false)

  const [error, setError] = useState("")

  useEffect(() => {
    const controller = new AbortController()

    getMyContent(contentId, controller.signal)

      .then(setContent)

      .catch((caught) => {
        if (!isAbortError(caught, controller.signal))
          setError(apiErrorMessage(caught, "콘텐츠를 불러오지 못했습니다."))
      })

    return () => controller.abort()
  }, [contentId])

  const set = (key: keyof typeof draft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }))

  const submit = async (event: FormEvent) => {
    event.preventDefault()

    const validationError = validateSessionDraft(draft)

    if (validationError) {
      setError(validationError)

      return
    }

    setSubmitting(true)

    setError("")

    try {
      const payload = sessionPayload(draft)

      const result = await createContentSession(contentId, payload)

      if (session) {
        const stored = readContentSessionSnapshots(session.userId, contentId)

        writeContentSessionSnapshots(session.userId, contentId, [
          result,

          ...stored.filter((item) => item.sessionId !== result.sessionId),
        ])
      }

      navigate(`/operator/contents/${contentId}`, {
        replace: true,

        state: {
          createdSession: { ...payload, ...result },

          notice: "새 회차가 심사 대기 상태로 등록되었습니다.",
        } satisfies ContentDetailNavigationState,
      })
    } catch (caught) {
      setError(apiErrorMessage(caught, "회차를 등록하지 못했습니다."))

      setSubmitting(false)
    }
  }

  return (
    <>
      <Breadcrumb>
        내 콘텐츠 › {content?.title ?? `#${contentId}`} › 추가 회차 등록
      </Breadcrumb>
      <PageHeader
        title="추가 회차 등록"
        description="승인 또는 공개 콘텐츠에 새 운영 회차를 심사 대기 상태로 추가합니다."
      />
      <form className="op-form-shell" onSubmit={submit}>
        <article className="op-panel">
          <header>
            <h2>새 회차 정보</h2>
            <StatusBadge value="PENDING" />
          </header>
          <div className="op-panel-body">
            <div className="op-form-grid">
              <DateField
                label="시작 시각"
                value={draft.startsAt}
                onChange={(value) => set("startsAt", value)}
              />
              <DateField
                label="종료 시각"
                value={draft.endsAt}
                onChange={(value) => set("endsAt", value)}
              />
              <DateField
                label="체크인 시작"
                value={draft.checkinOpenAt}
                onChange={(value) => set("checkinOpenAt", value)}
              />
              <DateField
                label="체크인 종료"
                value={draft.checkinCloseAt}
                onChange={(value) => set("checkinCloseAt", value)}
              />
              <label className="op-field op-full">
                정원
                <input
                  className="op-control"
                  type="number"
                  min="1"
                  value={draft.capacity}
                  onChange={(event) => set("capacity", event.target.value)}
                  required
                />
              </label>
            </div>
          </div>
        </article>
        <aside className="op-action-card">
          <h2>회차 생성</h2>
          <p>
            생성 직후 상태는 심사 대기이며 승인 전에는 공개 목록에 노출되지
            않습니다.
          </p>
          <button className="op-button op-button-primary" disabled={submitting}>
            {submitting ? "등록 중…" : "회차 생성 및 심사 요청"}
          </button>
          {error && <div className="op-alert">{error}</div>}
          <Link className="op-button" to={`/operator/contents/${contentId}`}>
            취소하고 상세로
          </Link>
        </aside>
      </form>
    </>
  )
}

function sessionPayload(draft: typeof emptySession): SessionInput {
  return {
    startsAt: toSeoulOffset(draft.startsAt)!,

    endsAt: toSeoulOffset(draft.endsAt)!,

    checkinOpenAt: toSeoulOffset(draft.checkinOpenAt)!,

    checkinCloseAt: toSeoulOffset(draft.checkinCloseAt)!,

    capacity: Number(draft.capacity),
  }
}

function TextField({
  label,

  value,

  onChange,

  full,
}: {
  label: string

  value: string

  onChange: (value: string) => void

  full?: boolean
}) {
  return (
    <label className={`op-field${full ? " op-full" : ""}`}>
      {label}
      <input
        className="op-control"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      />
    </label>
  )
}

function TextArea({
  label,

  value,

  onChange,

  full,
}: {
  label: string

  value: string

  onChange: (value: string) => void

  full?: boolean
}) {
  return (
    <label className={`op-field${full ? " op-full" : ""}`}>
      {label}
      <textarea
        className="op-control"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      />
    </label>
  )
}

function DateField({
  label,

  value,

  onChange,

  full,
}: {
  label: string

  value: string

  onChange: (value: string) => void

  full?: boolean
}) {
  return (
    <label className={`op-field${full ? " op-full" : ""}`}>
      {label}
      <input
        className="op-control"
        type="datetime-local"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      />
    </label>
  )
}

function SessionEditor({
  value,

  index,

  canDelete,

  onChange,

  onDelete,
}: {
  value: typeof emptySession

  index: number

  canDelete: boolean

  onChange: (value: typeof emptySession) => void

  onDelete: () => void
}) {
  const set = (key: keyof typeof value, next: string) =>
    onChange({ ...value, [key]: next })

  return (
    <div className="op-session-editor">
      <h3>회차 {index + 1}</h3>
      <div className="op-form-grid">
        <DateField
          label="시작 시각"
          value={value.startsAt}
          onChange={(next) => set("startsAt", next)}
        />
        <DateField
          label="종료 시각"
          value={value.endsAt}
          onChange={(next) => set("endsAt", next)}
        />
        <DateField
          label="체크인 시작"
          value={value.checkinOpenAt}
          onChange={(next) => set("checkinOpenAt", next)}
        />
        <DateField
          label="체크인 종료"
          value={value.checkinCloseAt}
          onChange={(next) => set("checkinCloseAt", next)}
        />
        <label className="op-field">
          정원
          <input
            className="op-control"
            type="number"
            min="1"
            value={value.capacity}
            onChange={(event) => set("capacity", event.target.value)}
            required
          />
        </label>
        {canDelete && (
          <button className="op-button" type="button" onClick={onDelete}>
            회차 삭제
          </button>
        )}
      </div>
    </div>
  )
}
