import { useState } from "react"
import {
  Link,
  NavLink,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom"
import {
  ActionModal,
  AsyncContent,
  ErrorState,
  KeyValueGrid,
  PageHeader,
  Panel,
  StatusBadge,
  formatDate,
  useApiData,
  type ActionConfig,
} from "../AdminComponents"
import { withQuery } from "../api"
import type {
  MissionDetail,
  MissionHistory,
  MissionSummary,
  PageData,
  StampbookDetail,
  StampbookSummary,
} from "../types"

const couponIssuanceTypeLabels: Record<string, string> = {
  STAMPBOOK_COMPLETION: "스탬프북 완료",
}

const missionConditionTypeLabels: Record<string, string> = {
  CONTENT_SET: "콘텐츠 묶음",
}

const missionStatusLabels: Record<string, string> = {
  DRAFT: "초안",
  PENDING_REVIEW: "심사 대기",
  PUBLISHED: "공개",
  ENDED: "종료",
}

const missionHistoryActionLabels: Record<string, string> = {
  CREATED: "생성",
  UPDATED: "수정",
  SUBMITTED: "심사 요청",
  APPROVED: "승인",
  REJECTED: "반려",
}

const missionHistoryReasonLabels: Record<string, string> = {
  MISSION_CREATED: "미션 생성",
  MISSION_UPDATED: "미션 수정",
  MISSION_SUBMITTED: "미션 심사 요청",
  MISSION_APPROVED: "미션 승인",
  MISSION_REJECTED: "미션 반려",
  MISSION_INFORMATION_INCOMPLETE: "미션 정보가 불완전함",
  MISSION_CONDITION_INVALID: "미션 조건이 올바르지 않음",
  MISSION_TARGET_CONTENT_INVALID: "대상 콘텐츠가 올바르지 않음",
  MISSION_REWARD_POLICY_INVALID: "보상 정책이 올바르지 않음",
  MISSION_SCHEDULE_INVALID: "미션 일정이 올바르지 않음",
}

const operationResultLabels: Record<string, string> = {
  SUCCESS: "성공",
  FAILURE: "실패",
}

const auditActorKindLabels: Record<string, string> = {
  USER: "사용자",
}

function displayLabel(labels: Record<string, string>, value: string | null) {
  if (!value) return "없음"
  return labels[value] ?? value
}

function BenefitTabs({ active }: { active: "stampbook" | "mission" }) {
  return (
    <nav aria-label="혜택 심사" className="ra-tabs">
      <NavLink
        className={active === "stampbook" ? "active" : ""}
        to="/region-admin/stampbooks"
      >
        스탬프북
      </NavLink>
      <NavLink
        className={active === "mission" ? "active" : ""}
        to="/region-admin/missions"
      >
        미션
      </NavLink>
    </nav>
  )
}

export function StampbookListPage() {
  const state = useApiData<{ stampbooks: StampbookSummary[] }>(
    "/api/v1/region-admin/stampbooks?status=PENDING_REVIEW",
  )
  return (
    <>
      <PageHeader
        title="혜택 심사"
        description="공개 심사 대기 스탬프북을 확인합니다."
      />
      <BenefitTabs active="stampbook" />
      <div className="ra-filter-bar">
        <div>
          <strong>스탬프북 공개 심사</strong>
          <span>공개 심사 대기 상태 고정</span>
        </div>
        <small>요청 시각 오래된 순 · 정렬 고정</small>
      </div>
      <AsyncContent
        state={state}
        empty={(data) => data.stampbooks.length === 0}
        emptyTitle="심사 대기 중인 스탬프북이 없습니다."
      >
        {({ stampbooks }) => (
          <div className="ra-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>스탬프북 ID</th>
                  <th>상태</th>
                  <th>목표 스탬프</th>
                  <th>보상 정책 ID</th>
                  <th>요청 시각</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {stampbooks.map((stampbook) => (
                  <tr key={stampbook.stampbookId}>
                    <td className="ra-mono">{stampbook.stampbookId}</td>
                    <td>
                      <StatusBadge value={stampbook.status} />
                    </td>
                    <td>{stampbook.targetCount}개</td>
                    <td className="ra-mono">
                      {stampbook.rewardCouponPolicyId}
                    </td>
                    <td>{formatDate(stampbook.requestedAt)}</td>
                    <td className="ra-right">
                      <Link
                        className="ra-button ra-button-small"
                        to={`${stampbook.stampbookId}`}
                      >
                        상세
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AsyncContent>
    </>
  )
}

export function StampbookDetailPage() {
  const { stampbookId = "" } = useParams()
  const navigate = useNavigate()
  const state = useApiData<StampbookDetail>(
    `/api/v1/region-admin/stampbooks/${stampbookId}`,
  )
  const [action, setAction] = useState<ActionConfig | null>(null)
  const configs: Record<string, ActionConfig> = {
    approve: {
      title: "스탬프북 공개 승인",
      description: "대상 콘텐츠와 완료 보상 정책을 확인했습니다.",
      confirmLabel: "공개 승인",
      endpoint: `/api/v1/region-admin/stampbooks/${stampbookId}/approve`,
      tone: "admin",
      target: `스탬프북 ${stampbookId}`,
      result: "스탬프북 공개 승인",
      reason: {
        label: "승인 메모",
        field: "reason",
        required: true,
        maxLength: 500,
      },
    },
    reject: {
      title: "스탬프북 반려",
      description: "운영자에게 전달할 보완 사유를 입력해 주세요.",
      confirmLabel: "반려",
      endpoint: `/api/v1/region-admin/stampbooks/${stampbookId}/reject`,
      tone: "danger",
      target: `스탬프북 ${stampbookId}`,
      result: "스탬프북 반려",
      reason: {
        label: "반려 사유",
        field: "reason",
        required: true,
        maxLength: 500,
      },
    },
  }
  return (
    <>
      <PageHeader
        title="스탬프북 상세"
        description="대상 콘텐츠와 완료 보상 정책을 검토합니다."
        actions={
          <Link className="ra-button" to="/region-admin/stampbooks">
            ← 목록으로
          </Link>
        }
      />
      <AsyncContent state={state}>
        {(detail) => (
          <div className="ra-detail-layout">
            <div className="ra-detail-main">
              <Panel
                title="스탬프북 정보"
                action={<StatusBadge value={detail.status} />}
              >
                <KeyValueGrid
                  items={[
                    ["스탬프북 ID", detail.stampbookId],
                    ["지역 ID", detail.regionId],
                    ["요청 시각", formatDate(detail.requestedAt)],
                    ["요청 사유", detail.requestReason, true],
                  ]}
                />
              </Panel>
              <Panel title={`대상 콘텐츠 ${detail.targetContents.length}개`}>
                <div className="ra-list-cards">
                  {detail.targetContents.map((content, index) => (
                    <article key={content.contentId}>
                      <span>{index + 1}</span>
                      <div>
                        <strong>{content.title}</strong>
                        <small>
                          콘텐츠 {content.contentId} · 지역 {content.regionId}
                        </small>
                      </div>
                      <StatusBadge value={content.status} />
                    </article>
                  ))}
                </div>
              </Panel>
              <Panel title="완료 보상 정책">
                <KeyValueGrid
                  items={[
                    ["쿠폰 정책 ID", detail.rewardCouponPolicy.couponPolicyId],
                    ["지역 ID", detail.rewardCouponPolicy.regionId],
                    [
                      "발급 유형",
                      displayLabel(
                        couponIssuanceTypeLabels,
                        detail.rewardCouponPolicy.issuanceType,
                      ),
                    ],
                    [
                      "정책 상태",
                      <StatusBadge value={detail.rewardCouponPolicy.status} />,
                    ],
                  ]}
                />
              </Panel>
            </div>
            <aside className="ra-detail-aside">
              <section className="ra-action-card">
                <h2>공개 심사</h2>
                <p>
                  모든 대상이 같은 담당 지역의 공개 콘텐츠인지 확인해 주세요.
                </p>
                <button
                  className="ra-button ra-button-admin"
                  onClick={() => setAction(configs.approve)}
                >
                  공개 승인
                </button>
                <button
                  className="ra-button ra-button-danger"
                  onClick={() => setAction(configs.reject)}
                >
                  반려
                </button>
              </section>
            </aside>
          </div>
        )}
      </AsyncContent>
      {action && (
        <ActionModal
          config={action}
          onClose={() => setAction(null)}
          onSuccess={() =>
            navigate("/region-admin/stampbooks", {
              state: { completed: true },
            })
          }
        />
      )}
    </>
  )
}

export function MissionListPage() {
  const [search, setSearch] = useSearchParams()
  const { status, page, size } = readMissionListFilters(search)
  const state = useApiData<PageData<MissionSummary>>(
    withQuery("/api/v1/region-admin/missions", { status, page, size }),
  )
  const update = (values: Record<string, string | number>) =>
    setSearch({
      status,
      page: String(page),
      size: String(size),
      ...Object.fromEntries(
        Object.entries(values).map(([key, value]) => [key, String(value)]),
      ),
    })
  return (
    <>
      <PageHeader
        title="혜택 심사"
        description="담당 지역 미션을 상태별로 확인합니다."
      />
      <BenefitTabs active="mission" />
      <div className="ra-filter-bar">
        <div className="ra-filter-row">
          <label className="ra-field">
            미션 상태
            <select
              className="ra-control"
              value={status}
              onChange={(event) =>
                update({ status: event.target.value, page: 0 })
              }
            >
              <option value="">전체</option>
              <option value="DRAFT">초안</option>
              <option value="PENDING_REVIEW">심사 대기</option>
              <option value="PUBLISHED">공개</option>
              <option value="ENDED">종료</option>
            </select>
          </label>
          <label className="ra-field">
            페이지 크기
            <select
              className="ra-control"
              value={size}
              onChange={(event) =>
                update({ size: event.target.value, page: 0 })
              }
            >
              <option value="20">20개</option>
              <option value="50">50개</option>
              <option value="100">100개</option>
            </select>
          </label>
        </div>
        <small>미션 ID 내림차순 · 정렬 고정</small>
      </div>
      <AsyncContent
        state={state}
        empty={(data) => data.content.length === 0}
        emptyTitle="선택한 상태의 미션이 없습니다."
        emptyFiltered={Boolean(status)}
      >
        {(data) => (
          <>
            <div className="ra-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>미션</th>
                    <th>상태</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.content.map((mission) => (
                    <tr key={mission.missionId}>
                      <td>
                        <strong className="ra-cell-title">
                          {mission.title ?? `미션 #${mission.missionId}`}
                        </strong>
                        <span className="ra-cell-sub">
                          미션 {mission.missionId}
                        </span>
                      </td>
                      <td>
                        <StatusBadge value={mission.status} />
                      </td>
                      <td className="ra-right">
                        <Link
                          className="ra-button ra-button-small"
                          to={`${mission.missionId}`}
                        >
                          상세
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ra-pagination">
              <button
                className="ra-page-button"
                disabled={data.page <= 0}
                onClick={() => update({ page: data.page - 1 })}
              >
                ‹
              </button>
              <span>
                {data.page + 1} / {Math.max(data.totalPages, 1)}
              </span>
              <button
                className="ra-page-button"
                disabled={data.page + 1 >= data.totalPages}
                onClick={() => update({ page: data.page + 1 })}
              >
                ›
              </button>
            </div>
          </>
        )}
      </AsyncContent>
    </>
  )
}

const missionListStatuses = new Set([
  "",
  "DRAFT",
  "PENDING_REVIEW",
  "PUBLISHED",
  "ENDED",
])

export function readMissionListFilters(search: URLSearchParams) {
  const requestedStatus = search.get("status")
  const status =
    requestedStatus === null
      ? "PENDING_REVIEW"
      : missionListStatuses.has(requestedStatus)
        ? requestedStatus
        : "PENDING_REVIEW"
  const requestedPage = Number(search.get("page") ?? 0)
  const page =
    Number.isInteger(requestedPage) && requestedPage >= 0 ? requestedPage : 0
  const requestedSize = Number(search.get("size") ?? 20)
  const size = [20, 50, 100].includes(requestedSize) ? requestedSize : 20
  return { status, page, size }
}

const missionRejectionReasons = [
  ["MISSION_INFORMATION_INCOMPLETE", "미션 정보가 불완전함"],
  ["MISSION_CONDITION_INVALID", "미션 조건이 올바르지 않음"],
  ["MISSION_TARGET_CONTENT_INVALID", "대상 콘텐츠가 올바르지 않음"],
  ["MISSION_REWARD_POLICY_INVALID", "보상 정책이 올바르지 않음"],
  ["MISSION_SCHEDULE_INVALID", "미션 일정이 올바르지 않음"],
].map(([value, label]) => ({ value, label }))

export function MissionDetailPage() {
  const { missionId = "" } = useParams()
  const navigate = useNavigate()
  const detailState = useApiData<MissionDetail>(
    `/api/v1/region-admin/missions/${missionId}`,
  )
  const historyState = useApiData<MissionHistory>(
    `/api/v1/region-admin/missions/${missionId}/history`,
  )
  const [action, setAction] = useState<ActionConfig | null>(null)
  const configs: Record<string, ActionConfig> = {
    approve: {
      title: "미션 승인",
      description: "미션 조건과 보상 정책을 확인했습니다.",
      confirmLabel: "미션 승인",
      endpoint: `/api/v1/region-admin/missions/${missionId}/approve`,
      tone: "admin",
      target: `미션 ${missionId}`,
      result: "미션 승인",
    },
    reject: {
      title: "미션 반려",
      description: "Backend가 허용하는 반려 사유를 선택해 주세요.",
      confirmLabel: "미션 반려",
      endpoint: `/api/v1/region-admin/missions/${missionId}/reject`,
      tone: "danger",
      target: `미션 ${missionId}`,
      result: "미션 반려",
      reason: {
        label: "반려 사유",
        field: "reasonCode",
        required: true,
        options: missionRejectionReasons,
      },
    },
  }
  return (
    <>
      <PageHeader
        title="미션 상세·이력"
        description="미션 조건과 최근 90일 수명주기 이력을 검토합니다."
        actions={
          <Link className="ra-button" to="/region-admin/missions">
            ← 목록으로
          </Link>
        }
      />
      <AsyncContent state={detailState}>
        {(detail) => (
          <div className="ra-detail-layout">
            <div className="ra-detail-main">
              <Panel
                title={detail.title ?? `미션 #${detail.missionId}`}
                action={<StatusBadge value={detail.status} />}
              >
                <KeyValueGrid
                  items={[
                    ["미션 ID", detail.missionId],
                    ["지역 ID", detail.regionId],
                    [
                      "조건 유형",
                      displayLabel(
                        missionConditionTypeLabels,
                        detail.conditionType,
                      ),
                    ],
                    ["필요 방문 수", detail.requiredVisitCount ?? "대상 전체"],
                    ["보상 쿠폰 정책", detail.rewardCouponPolicyId],
                    ["종료 시각", formatDate(detail.endsAt)],
                  ]}
                />
              </Panel>
              <Panel title={`대상 콘텐츠 ${detail.targetContents.length}개`}>
                <div className="ra-list-cards">
                  {detail.targetContents.map((content, index) => (
                    <article key={content.contentId}>
                      <span>{index + 1}</span>
                      <div>
                        <strong>{content.title}</strong>
                        <small>콘텐츠 {content.contentId}</small>
                      </div>
                    </article>
                  ))}
                </div>
              </Panel>
              <Panel title="최근 90일 이력">
                {historyState.loading && !historyState.data ? (
                  <p className="ra-muted">이력을 불러오는 중입니다.</p>
                ) : historyState.error && !historyState.data ? (
                  <ErrorState
                    error={historyState.error}
                    onRetry={historyState.reload}
                  />
                ) : (
                  <>
                    {historyState.error && (
                      <div className="ra-inline-warning">
                        이력 새로고침에 실패해 이전 데이터를 표시합니다.
                      </div>
                    )}
                    {historyState.data?.histories.length ? (
                      <div className="ra-timeline">
                        {historyState.data.histories.map((history) => (
                          <div
                            className="ra-timeline-item"
                            key={history.auditEventId}
                          >
                            <span />
                            <div>
                              <strong>
                                {displayLabel(
                                  missionHistoryActionLabels,
                                  history.action,
                                )}{" "}
                                ·{" "}
                                {displayLabel(
                                  missionStatusLabels,
                                  history.previousStatus,
                                )}{" "}
                                →{" "}
                                {displayLabel(
                                  missionStatusLabels,
                                  history.nextStatus,
                                )}
                              </strong>
                              <p>
                                이벤트 {history.auditEventId} · 결과{" "}
                                {displayLabel(
                                  operationResultLabels,
                                  history.result,
                                )}{" "}
                                ·{" "}
                                {displayLabel(
                                  missionHistoryReasonLabels,
                                  history.reasonCode,
                                )}
                              </p>
                              <small>
                                {displayLabel(
                                  auditActorKindLabels,
                                  history.actorKind,
                                )}{" "}
                                {history.actorUserId ?? ""} ·{" "}
                                {formatDate(history.recordedAt)}
                              </small>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="ra-muted">최근 90일 이력이 없습니다.</p>
                    )}
                  </>
                )}
              </Panel>
            </div>
            <aside className="ra-detail-aside">
              <section className="ra-action-card">
                <h2>미션 심사</h2>
                <p>조건, 대상 콘텐츠, 보상 정책과 종료 일정을 확인해 주세요.</p>
                {detail.status === "PENDING_REVIEW" ? (
                  <>
                    <button
                      className="ra-button ra-button-admin"
                      onClick={() => setAction(configs.approve)}
                    >
                      미션 승인
                    </button>
                    <button
                      className="ra-button ra-button-danger"
                      onClick={() => setAction(configs.reject)}
                    >
                      미션 반려
                    </button>
                  </>
                ) : (
                  <Link className="ra-button" to="/region-admin/missions">
                    목록으로
                  </Link>
                )}
              </section>
            </aside>
          </div>
        )}
      </AsyncContent>
      {action && (
        <ActionModal
          config={action}
          onClose={() => setAction(null)}
          onSuccess={() =>
            navigate("/region-admin/missions", {
              state: { completed: true },
            })
          }
        />
      )}
    </>
  )
}
