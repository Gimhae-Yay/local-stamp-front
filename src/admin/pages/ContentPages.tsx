import { useMemo, useState } from "react";
import {
  Link,
  NavLink,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ActionModal,
  AsyncContent,
  EmptyState,
  ErrorState,
  KeyValueGrid,
  PageHeader,
  Panel,
  StatusBadge,
  formatDate,
  formatMoney,
  useApiData,
  type ActionConfig,
} from "../AdminComponents";
import { useAdminAuth } from "../AdminAuth";
import { withQuery } from "../api";
import type {
  ContentDetail,
  ContentHistory,
  ContentRevisionSummary,
  ContentSummary,
  PublicContentDetail,
  PublicContentSessions,
  WithdrawalDetail,
  WithdrawalSummary,
} from "../types";

function ContentTabs({ active }: { active: "review" | "revisions" | "published" | "withdrawals" }) {
  return (
    <nav className="ra-tabs" aria-label="콘텐츠 관리">
      <NavLink className={active === "review" ? "active" : ""} to="/region-admin/contents/review">
        최초 심사
      </NavLink>
      <NavLink
        className={active === "revisions" ? "active" : ""}
        to="/region-admin/content-revisions"
      >
        수정본 심사
      </NavLink>
      <NavLink
        className={active === "published" ? "active" : ""}
        to="/region-admin/contents/published"
      >
        공개 콘텐츠
      </NavLink>
      <NavLink
        className={active === "withdrawals" ? "active" : ""}
        to="/region-admin/withdrawal-requests"
      >
        전체 철회
      </NavLink>
    </nav>
  );
}

function ContentImage({ src, alt }: { src: string | null; alt: string }) {
  return src ? (
    <img className="ra-content-image" src={src} alt={alt} />
  ) : (
    <div className="ra-image-placeholder" role="img" aria-label={`${alt} 이미지 없음`}>
      대표 이미지
    </div>
  );
}

export interface ContentRevisionComparisonField {
  label: string;
  original: string;
  candidate: string;
  changed: boolean;
}

export function buildContentRevisionComparison(
  original: PublicContentDetail,
  candidate: ContentDetail,
): ContentRevisionComparisonField[] {
  const fields: Array<[string, keyof PublicContentDetail, keyof ContentDetail]> = [
    ["제목", "title", "title"],
    ["설명", "description", "description"],
    ["장소", "locationText", "locationText"],
    ["운영 시간", "operatingHoursText", "operatingHoursText"],
    ["연락처", "contactText", "contactText"],
    ["주의사항", "precautions", "precautions"],
    ["연령 조건", "ageRequirement", "ageRequirement"],
    ["준비물", "materials", "materials"],
    ["취소 정책", "cancellationPolicyText", "cancellationPolicyText"],
  ];

  return fields.map(([label, originalKey, candidateKey]) => {
    const originalValue = String(original[originalKey] ?? "—");
    const candidateValue = String(candidate[candidateKey] ?? "—");
    return {
      label,
      original: originalValue,
      candidate: candidateValue,
      changed: originalValue !== candidateValue,
    };
  });
}

export function ContentReviewListPage() {
  const [search, setSearch] = useSearchParams();
  const status = search.get("status") === "APPROVED" ? "APPROVED" : "PENDING";
  const state = useApiData<{ contents: ContentSummary[] }>(
    withQuery("/api/v1/region-admin/contents", { status }),
  );
  return (
    <>
      <PageHeader title="콘텐츠 관리" description="승인 대기와 공개 전 삭제 대상을 관리합니다." />
      <ContentTabs active="review" />
      <div className="ra-filter-bar">
        <div className="ra-filter-row">
          <button
            className={`ra-button ra-button-small${status === "PENDING" ? " ra-button-admin" : ""}`}
            type="button"
            aria-pressed={status === "PENDING"}
            onClick={() => setSearch({ status: "PENDING" })}
          >
            승인 대기
          </button>
          <button
            className={`ra-button ra-button-small${
              status === "APPROVED" ? " ra-button-admin" : ""
            }`}
            type="button"
            aria-pressed={status === "APPROVED"}
            onClick={() => setSearch({ status: "APPROVED" })}
          >
            공개 전 삭제
          </button>
        </div>
        <small>{status === "PENDING" ? "제출" : "공개 예정"} 시각 오래된 순 · 정렬 고정</small>
      </div>
      <AsyncContent
        state={state}
        empty={(data) => data.contents.length === 0}
        emptyTitle={
          status === "PENDING"
            ? "승인 대기 중인 콘텐츠가 없습니다."
            : "공개 전 삭제 대상이 없습니다."
        }
      >
        {({ contents }) => (
          <ContentTable contents={contents} status={status} onChanged={state.reload} />
        )}
      </AsyncContent>
    </>
  );
}

function ContentTable({
  contents,
  status,
  onChanged,
}: {
  contents: ContentSummary[];
  status: string;
  onChanged: () => void;
}) {
  const [deleteTarget, setDeleteTarget] = useState<ContentSummary | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <>
      <div className="ra-table-wrap">
        <table>
          <thead>
            <tr>
              <th>이미지</th>
              <th>콘텐츠</th>
              <th>유형</th>
              <th>운영자</th>
              <th>공개 예정</th>
              <th>{status === "PENDING" ? "제출" : "승인"} 시각</th>
              <th>상태</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {contents.map((content) => (
              <tr key={content.contentId}>
                <td>
                  <ContentImage src={content.representativeImageUrl} alt={content.title} />
                </td>
                <td>
                  <strong className="ra-cell-title">{content.title}</strong>
                  <span className="ra-cell-sub">콘텐츠 {content.contentId}</span>
                </td>
                <td>
                  <StatusBadge value={content.contentType} />
                </td>
                <td>
                  <strong className="ra-cell-title">{content.operator.name}</strong>
                  <span className="ra-cell-sub">{content.operator.operatorId}</span>
                </td>
                <td>{formatDate(content.publishAt)}</td>
                <td>
                  {formatDate(status === "PENDING" ? content.submittedAt : content.approvedAt)}
                </td>
                <td>
                  <StatusBadge value={content.status} />
                </td>
                <td className="ra-right">
                  {status === "PENDING" ? (
                    <Link
                      className="ra-button ra-button-small"
                      to={`/region-admin/contents/${content.contentId}`}
                    >
                      상세
                    </Link>
                  ) : (
                    <button
                      className="ra-button ra-button-small ra-button-danger"
                      type="button"
                      onClick={() => setDeleteTarget(content)}
                    >
                      삭제
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {deleteTarget && (
        <ActionModal
          config={{
            title: "공개 전 콘텐츠 삭제",
            description: `${deleteTarget.title} 콘텐츠를 삭제합니다. 삭제 사유를 입력해 주세요.`,
            confirmLabel: "삭제",
            endpoint: `/api/v1/region-admin/contents/${deleteTarget.contentId}`,
            method: "DELETE",
            tone: "danger",
            target: `${deleteTarget.title} · 콘텐츠 ${deleteTarget.contentId}`,
            result: "공개 전 콘텐츠 삭제",
            warning: "삭제 후에는 현재 심사 목록에서 제거됩니다.",
            reason: { label: "삭제 사유", field: "reason", required: true },
          }}
          onClose={() => setDeleteTarget(null)}
          onSuccess={() => {
            setDeleteTarget(null);
            onChanged();
            navigate(`${location.pathname}${location.search}`, {
              replace: true,
              state: {
                completed: true,
                successMessage: "공개 전 콘텐츠 삭제가 완료되었습니다.",
              },
            });
          }}
        />
      )}
    </>
  );
}

function ContentHistoryPanel({ state }: { state: ReturnType<typeof useApiData<ContentHistory>> }) {
  return (
    <Panel title="처리 이력">
      {state.loading && !state.data ? (
        <p className="ra-muted">이력을 불러오는 중입니다.</p>
      ) : state.error && !state.data ? (
        <ErrorState error={state.error} onRetry={state.reload} />
      ) : (
        <>
          {state.error && (
            <div className="ra-inline-warning">
              이력 새로고침에 실패해 이전 데이터를 표시합니다.
            </div>
          )}
          {state.data?.histories.length ? (
            <div className="ra-timeline">
              {state.data.histories.map((history, index) => (
                <div className="ra-timeline-item" key={`${history.processedAt}-${index}`}>
                  <span />
                  <div>
                    <strong>
                      <StatusBadge value={history.status} />{" "}
                      {history.actor?.displayName ?? "시스템"}
                    </strong>
                    <p>{history.reason ?? "상태가 변경되었습니다."}</p>
                    <small>{formatDate(history.processedAt)}</small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="ra-muted">표시할 처리 이력이 없습니다.</p>
          )}
        </>
      )}
    </Panel>
  );
}

export function ContentDetailPage() {
  const { contentId = "" } = useParams();
  const navigate = useNavigate();
  const detailState = useApiData<ContentDetail>(`/api/v1/region-admin/contents/${contentId}`);
  const historyState = useApiData<ContentHistory>(
    `/api/v1/region-admin/contents/${contentId}/history`,
  );
  const [action, setAction] = useState<ActionConfig | null>(null);
  const backPath = "/region-admin/contents/review";
  const actions = useMemo<Record<string, ActionConfig>>(
    () => ({
      approve: {
        title: "콘텐츠 승인",
        description: "콘텐츠 정보와 최초 회차를 모두 확인했습니다.",
        confirmLabel: "승인",
        endpoint: `/api/v1/region-admin/contents/${contentId}/approve`,
        tone: "admin",
        target: `콘텐츠 ${contentId}`,
        result: "승인 및 최초 회차 운영 예정 전환",
      },
      reject: {
        title: "콘텐츠 반려",
        description: "운영자가 수정할 수 있도록 구체적인 사유를 남겨 주세요.",
        confirmLabel: "반려",
        endpoint: `/api/v1/region-admin/contents/${contentId}/reject`,
        tone: "danger",
        target: `콘텐츠 ${contentId}`,
        result: "콘텐츠 반려",
        reason: { label: "반려 사유", field: "reason", required: true },
      },
      delete: {
        title: "공개 전 콘텐츠 삭제",
        description: "삭제 후에는 현재 심사 목록에서 제거됩니다.",
        confirmLabel: "삭제",
        endpoint: `/api/v1/region-admin/contents/${contentId}`,
        method: "DELETE",
        tone: "danger",
        target: `콘텐츠 ${contentId}`,
        result: "공개 전 콘텐츠 삭제",
        warning: "삭제 후에는 현재 심사 목록에서 제거됩니다.",
        reason: { label: "삭제 사유", field: "reason", required: true },
      },
    }),
    [contentId],
  );

  return (
    <>
      <PageHeader
        title="최초 콘텐츠 심사 상세"
        description="콘텐츠 전체 정보와 최초 회차를 검토합니다."
        actions={
          <Link className="ra-button" to={backPath}>
            ← 목록으로
          </Link>
        }
      />
      <AsyncContent state={detailState}>
        {(detail) => (
          <div className="ra-detail-layout">
            <div className="ra-detail-main">
              <Panel title="콘텐츠 정보" action={<StatusBadge value={detail.status} />}>
                <ContentImage src={detail.representativeImageUrl} alt={detail.title} />
                <KeyValueGrid
                  items={[
                    ["콘텐츠 ID", detail.contentId],
                    ["유형", <StatusBadge value={detail.contentType} />],
                    ["제목", detail.title, true],
                    ["설명", detail.description, true],
                    ["장소", detail.locationText],
                    ["운영 시간", detail.operatingHoursText],
                    ["연락처", detail.contactText],
                    ["연령 조건", detail.ageRequirement],
                    ["준비물", detail.materials],
                    ["예약 가격", formatMoney(detail.reservationPrice)],
                    ["공개 예정", formatDate(detail.publishAt ?? detail.candidatePublishAt)],
                    ["주의사항", detail.precautions, true],
                    ["취소 정책", detail.cancellationPolicyText, true],
                  ]}
                />
              </Panel>
              <Panel title="회차 정보">
                {detail.sessions.length ? (
                  <div className="ra-session-cards">
                    {detail.sessions.map((session) => (
                      <article key={session.sessionId}>
                        <div>
                          <strong>회차 {session.sessionId}</strong>
                          <StatusBadge value={session.status} />
                        </div>
                        <p>
                          {formatDate(session.startsAt)} ~ {formatDate(session.endsAt)}
                        </p>
                        <small>
                          체크인 {formatDate(session.checkinOpenAt)} ~{" "}
                          {formatDate(session.checkinCloseAt)} · 잔여 {session.remainingCapacity}/
                          {session.capacity}명
                        </small>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="등록된 회차가 없습니다." />
                )}
              </Panel>
              <ContentHistoryPanel state={historyState} />
            </div>
            <aside className="ra-detail-aside">
              <section className="ra-action-card">
                <div className="ra-status-line">
                  <h2>처리 상태</h2>
                  <StatusBadge value={detail.status} />
                </div>
                <p>처리 시 서버가 최신 상태와 담당 지역을 다시 검증합니다.</p>
                {detail.status === "PENDING" ? (
                  <>
                    <button
                      className="ra-button ra-button-admin"
                      onClick={() => setAction(actions.approve)}
                    >
                      승인
                    </button>
                    <button
                      className="ra-button ra-button-danger"
                      onClick={() => setAction(actions.reject)}
                    >
                      반려
                    </button>
                    <button className="ra-button" onClick={() => setAction(actions.delete)}>
                      삭제
                    </button>
                  </>
                ) : (
                  <button
                    className="ra-button ra-button-danger"
                    onClick={() => setAction(actions.delete)}
                  >
                    공개 전 삭제
                  </button>
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
          onSuccess={() => navigate(backPath, { state: { completed: true } })}
        />
      )}
    </>
  );
}

export function ContentRevisionListPage() {
  const state = useApiData<{ revisions: ContentRevisionSummary[] }>(
    "/api/v1/region-admin/content-revisions?status=EDIT_REQUESTED",
  );
  return (
    <>
      <PageHeader title="콘텐츠 관리" description="제출된 콘텐츠 수정 후보를 검토합니다." />
      <ContentTabs active="revisions" />
      <div className="ra-filter-bar">
        <div>
          <strong>수정본 심사 대기</strong>
          <span>수정 요청 상태 고정</span>
        </div>
        <small>제출 시각 오래된 순 · 정렬 고정</small>
      </div>
      <AsyncContent
        state={state}
        empty={(data) => data.revisions.length === 0}
        emptyTitle="심사 대기 중인 콘텐츠 수정본이 없습니다."
      >
        {({ revisions }) => (
          <div className="ra-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>이미지</th>
                  <th>수정 후보</th>
                  <th>검토 유형</th>
                  <th>원본 상태</th>
                  <th>후보 공개</th>
                  <th>운영자</th>
                  <th>제출 시각</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {revisions.map((revision) => (
                  <tr key={revision.revisionId}>
                    <td>
                      <ContentImage src={revision.representativeImageUrl} alt={revision.title} />
                    </td>
                    <td>
                      <strong className="ra-cell-title">{revision.title}</strong>
                      <span className="ra-cell-sub">
                        수정본 {revision.revisionId} · 원본 {revision.contentId}
                      </span>
                    </td>
                    <td>
                      <StatusBadge value={revision.reviewType} />
                    </td>
                    <td>
                      <StatusBadge value={revision.contentStatus} />
                    </td>
                    <td>{formatDate(revision.candidatePublishAt)}</td>
                    <td>{revision.operator.name}</td>
                    <td>{formatDate(revision.submittedAt)}</td>
                    <td className="ra-right">
                      <Link className="ra-button ra-button-small" to={`${revision.revisionId}`}>
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
  );
}

export function ContentRevisionDetailPage() {
  const { revisionId = "" } = useParams();
  const navigate = useNavigate();
  const state = useApiData<ContentDetail>(`/api/v1/region-admin/content-revisions/${revisionId}`);
  const originalState = useApiData<PublicContentDetail>(
    state.data?.contentStatus === "PUBLISHED" ? `/api/v1/contents/${state.data.contentId}` : null,
  );
  const [action, setAction] = useState<ActionConfig | null>(null);
  const configs: Record<string, ActionConfig> = {
    approve: {
      title: "콘텐츠 수정본 승인",
      description: "후보 정보가 원본 콘텐츠에 반영됩니다.",
      confirmLabel: "수정본 승인",
      endpoint: `/api/v1/region-admin/content-revisions/${revisionId}/approve`,
      tone: "admin",
      target: `콘텐츠 수정본 ${revisionId}`,
      result: "후보 정보 반영",
    },
    reject: {
      title: "콘텐츠 수정본 반려",
      description: "운영자에게 전달할 보완 사유를 입력해 주세요.",
      confirmLabel: "수정본 반려",
      endpoint: `/api/v1/region-admin/content-revisions/${revisionId}/reject`,
      tone: "danger",
      target: `콘텐츠 수정본 ${revisionId}`,
      result: "콘텐츠 수정본 반려",
      reason: { label: "반려 사유", field: "reason", required: true },
    },
  };
  return (
    <>
      <PageHeader
        title="콘텐츠 수정본 상세"
        description="원본과 수정 후보를 나란히 비교하고 변경된 필드를 확인합니다."
        actions={
          <Link className="ra-button" to="/region-admin/content-revisions">
            ← 목록으로
          </Link>
        }
      />
      <AsyncContent state={state}>
        {(detail) => (
          <div className="ra-detail-layout">
            <div className="ra-detail-main">
              <Panel
                title="심사 정보"
                action={<StatusBadge value={detail.contentStatus ?? "PENDING"} />}
              >
                <KeyValueGrid
                  items={[
                    ["수정본 ID", detail.revisionId],
                    ["원본 콘텐츠 ID", detail.contentId],
                    ["검토 유형", <StatusBadge value={detail.reviewType ?? ""} />],
                    ["가격", formatMoney(detail.reservationPrice)],
                    ["후보 공개 시각", formatDate(detail.candidatePublishAt)],
                    ["제출 시각", formatDate(detail.submittedAt)],
                  ]}
                />
              </Panel>
              <Panel title="원본과 수정 후보 비교">
                {detail.contentStatus !== "PUBLISHED" ? (
                  <>
                    <div className="ra-inline-warning">
                      공개 전 수정본은 원본 공개 상세 API가 제공되지 않아 후보 정보만 확인할 수
                      있습니다. 아래 값은 현재 원본이 아니라 승인 시 반영될 수정 후보입니다.
                    </div>
                    <ContentImage
                      src={detail.representativeImageUrl}
                      alt={`${detail.title} 수정 후보`}
                    />
                    <KeyValueGrid
                      items={[
                        ["후보 제목", detail.title, true],
                        ["후보 설명", detail.description, true],
                        ["장소", detail.locationText],
                        ["운영 시간", detail.operatingHoursText],
                        ["연락처", detail.contactText],
                        ["연령 조건", detail.ageRequirement],
                        ["준비물", detail.materials],
                        ["주의사항", detail.precautions, true],
                        ["취소 정책", detail.cancellationPolicyText, true],
                      ]}
                    />
                  </>
                ) : originalState.loading && !originalState.data ? (
                  <p className="ra-muted">원본 정보를 불러오는 중입니다.</p>
                ) : originalState.error && !originalState.data ? (
                  <ErrorState error={originalState.error} onRetry={originalState.reload} />
                ) : originalState.data ? (
                  (() => {
                    const fields = buildContentRevisionComparison(originalState.data, detail);
                    const changedCount = fields.filter((field) => field.changed).length;
                    return (
                      <>
                        <div className="ra-status-line">
                          <p className="ra-muted">
                            총 {fields.length}개 비교 필드 중 {changedCount}개가 변경되었습니다.
                          </p>
                          <StatusBadge
                            value={changedCount ? "PENDING" : "SUCCESS"}
                            label={`${changedCount}개 변경`}
                          />
                        </div>
                        <div className="ra-compare-grid">
                          <div className="ra-compare-card">
                            <h3>현재 원본</h3>
                            <ContentImage
                              src={originalState.data.representativeImageUrl}
                              alt={`${originalState.data.title} 원본`}
                            />
                          </div>
                          <div className="ra-compare-card candidate">
                            <h3>수정 후보</h3>
                            <ContentImage
                              src={detail.representativeImageUrl}
                              alt={`${detail.title} 수정 후보`}
                            />
                          </div>
                        </div>
                        <div className="ra-table-wrap">
                          <table className="ra-revision-compare">
                            <thead>
                              <tr>
                                <th>필드</th>
                                <th>현재 원본</th>
                                <th>수정 후보</th>
                              </tr>
                            </thead>
                            <tbody>
                              {fields.map((field) => (
                                <tr className={field.changed ? "changed" : ""} key={field.label}>
                                  <td>
                                    {field.label}
                                    {field.changed && <span className="ra-change-mark">변경</span>}
                                  </td>
                                  <td className="ra-preline">{field.original}</td>
                                  <td className="ra-preline">{field.candidate}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    );
                  })()
                ) : null}
              </Panel>
            </div>
            <aside className="ra-detail-aside">
              <section className="ra-action-card">
                <h2>심사 처리</h2>
                <p>승인 시 후보 정보가 원본에 반영됩니다.</p>
                <button
                  className="ra-button ra-button-admin"
                  onClick={() => setAction(configs.approve)}
                >
                  수정본 승인
                </button>
                <button
                  className="ra-button ra-button-danger"
                  onClick={() => setAction(configs.reject)}
                >
                  수정본 반려
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
            navigate("/region-admin/content-revisions", {
              state: { completed: true },
            })
          }
        />
      )}
    </>
  );
}

export function PublishedContentDetailPage() {
  const { contentId = "" } = useParams();
  const navigate = useNavigate();
  const detailState = useApiData<PublicContentDetail>(`/api/v1/contents/${contentId}`);
  const sessionsState = useApiData<PublicContentSessions>(`/api/v1/contents/${contentId}/sessions`);
  const [action, setAction] = useState<ActionConfig | null>(null);
  const actions = useMemo<Record<string, ActionConfig>>(
    () => ({
      suspend: {
        title: "콘텐츠 운영 중단",
        description: "예약과 노출에 영향을 주는 조치입니다.",
        confirmLabel: "운영 중단",
        endpoint: `/api/v1/region-admin/contents/${contentId}/suspend`,
        tone: "danger",
        target: `공개 콘텐츠 ${contentId}`,
        result: "콘텐츠 운영 중단",
        warning: "예약과 공개 노출에 영향을 주는 조치입니다.",
        reason: { label: "중단 사유", field: "reason", required: true },
      },
      end: {
        title: "콘텐츠 정상 종료",
        description: "향후 예약과 노출을 정상 종료합니다.",
        confirmLabel: "정상 종료",
        endpoint: `/api/v1/region-admin/contents/${contentId}/end`,
        tone: "admin",
        target: `공개 콘텐츠 ${contentId}`,
        result: "콘텐츠 정상 종료",
      },
    }),
    [contentId],
  );

  return (
    <>
      <PageHeader
        title="공개 콘텐츠 운영 상세"
        description="현재 공개 정보와 회차를 확인하고 운영 상태를 관리합니다."
        actions={
          <Link className="ra-button" to="/region-admin/contents/published">
            ← 목록으로
          </Link>
        }
      />
      <AsyncContent state={detailState}>
        {(detail) => (
          <div className="ra-detail-layout">
            <div className="ra-detail-main">
              <Panel title="공개 정보" action={<StatusBadge value="PUBLISHED" />}>
                <ContentImage src={detail.representativeImageUrl} alt={detail.title} />
                <KeyValueGrid
                  items={[
                    ["콘텐츠 ID", detail.contentId],
                    ["유형", <StatusBadge value={detail.contentType} />],
                    ["제목", detail.title, true],
                    ["설명", detail.description, true],
                    ["장소", detail.locationText],
                    ["운영 시간", detail.operatingHoursText],
                    ["연락처", detail.contactText],
                    ["연령 조건", detail.ageRequirement],
                    ["준비물", detail.materials],
                    ["주의사항", detail.precautions, true],
                    ["취소 정책", detail.cancellationPolicyText, true],
                  ]}
                />
              </Panel>
              <Panel title="공개 회차">
                {sessionsState.loading && !sessionsState.data ? (
                  <p className="ra-muted">회차 정보를 불러오는 중입니다.</p>
                ) : sessionsState.error && !sessionsState.data ? (
                  <ErrorState error={sessionsState.error} onRetry={sessionsState.reload} />
                ) : sessionsState.data?.sessions.length ? (
                  <div className="ra-session-cards">
                    {sessionsState.data.sessions.map((session) => (
                      <article key={session.sessionId}>
                        <div>
                          <strong>회차 {session.sessionId}</strong>
                          <StatusBadge value="PUBLISHED" label="공개" />
                        </div>
                        <p>
                          {formatDate(session.startsAt)} ~ {formatDate(session.endsAt)}
                        </p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="현재 공개된 회차가 없습니다."
                    description="공개 회차가 등록되면 이곳에 표시됩니다."
                  />
                )}
              </Panel>
            </div>
            <aside className="ra-detail-aside">
              <section className="ra-action-card">
                <div className="ra-status-line">
                  <h2>운영 상태</h2>
                  <StatusBadge value="PUBLISHED" />
                </div>
                <p>처리 시 서버가 최신 상태와 담당 지역을 다시 검증합니다.</p>
                <button
                  className="ra-button ra-button-danger"
                  type="button"
                  onClick={() => setAction(actions.suspend)}
                >
                  운영 중단
                </button>
                <button className="ra-button" type="button" onClick={() => setAction(actions.end)}>
                  정상 종료
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
            navigate("/region-admin/contents/published", {
              state: { completed: true },
            })
          }
        />
      )}
    </>
  );
}

export function PublishedContentListPage() {
  const { session } = useAdminAuth();
  const [search, setSearch] = useSearchParams();
  const reservationAvailable = search.get("reservationAvailable");
  const path = withQuery("/api/v1/contents", {
    regionId: session!.assignment.regionId,
    contentType: "EVENT_EXPERIENCE",
    reservationAvailable: reservationAvailable === null ? null : reservationAvailable,
  });
  const state = useApiData<{ contents: ContentSummary[] }>(path);
  return (
    <>
      <PageHeader
        title="콘텐츠 관리"
        description="담당 지역의 공개 콘텐츠를 탐색하고 운영 상태를 관리합니다."
      />
      <ContentTabs active="published" />
      <div className="ra-filter-bar">
        <div className="ra-filter-row">
          <label className="ra-field">
            콘텐츠 유형
            <select className="ra-control" disabled>
              <option>행사·체험</option>
            </select>
          </label>
          <label className="ra-field">
            예약 가능 여부
            <select
              className="ra-control"
              value={reservationAvailable ?? "ALL"}
              onChange={(event) =>
                event.target.value === "ALL"
                  ? setSearch({})
                  : setSearch({ reservationAvailable: event.target.value })
              }
            >
              <option value="ALL">전체</option>
              <option value="true">예약 가능</option>
              <option value="false">예약 불가</option>
            </select>
          </label>
        </div>
        <small>{session!.assignment.regionName} · 공개 시각 최신 순</small>
      </div>
      <div className="ra-info-banner">
        <div>
          <strong>공개 조회 API를 사용하는 탐색 보조 화면</strong>
          <span>운영 명령 시 서버가 담당 지역 권한을 다시 확인합니다.</span>
        </div>
        <StatusBadge value="PUBLISHED" />
      </div>
      <AsyncContent
        state={state}
        empty={(data) => data.contents.length === 0}
        emptyTitle="조건에 맞는 공개 콘텐츠가 없습니다."
        emptyDescription="예약 가능 여부 필터를 바꾸거나 공개 상태를 확인해 주세요."
        emptyFiltered={reservationAvailable !== null}
      >
        {({ contents }) => (
          <div className="ra-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>이미지</th>
                  <th>콘텐츠</th>
                  <th>유형</th>
                  <th>장소</th>
                  <th>예약 가능</th>
                  <th>상태</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {contents.map((content) => (
                  <tr key={content.contentId}>
                    <td>
                      <ContentImage src={content.representativeImageUrl} alt={content.title} />
                    </td>
                    <td>
                      <strong className="ra-cell-title">{content.title}</strong>
                      <span className="ra-cell-sub">{content.contentId}</span>
                    </td>
                    <td>
                      <StatusBadge value={content.contentType} />
                    </td>
                    <td>{content.locationText ?? "—"}</td>
                    <td>
                      <StatusBadge
                        value={content.reservationAvailable ? "APPROVED" : "ENDED"}
                        label={content.reservationAvailable ? "예약 가능" : "예약 불가"}
                      />
                    </td>
                    <td>
                      <StatusBadge value="PUBLISHED" />
                    </td>
                    <td className="ra-right">
                      <Link className="ra-button ra-button-small" to={`${content.contentId}`}>
                        운영 상세
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
  );
}

export function WithdrawalListPage() {
  const state = useApiData<{ withdrawalRequests: WithdrawalSummary[] }>(
    "/api/v1/region-admin/content-withdrawal-requests?status=PENDING",
  );
  return (
    <>
      <PageHeader title="콘텐츠 관리" description="전체 철회 요청을 오래된 순으로 확인합니다." />
      <ContentTabs active="withdrawals" />
      <div className="ra-filter-bar">
        <div>
          <strong>전체 철회 심사 대기</strong>
          <span>승인 대기 상태 고정</span>
        </div>
        <small>요청 시각 오래된 순 · 정렬 고정</small>
      </div>
      <AsyncContent
        state={state}
        empty={(data) => data.withdrawalRequests.length === 0}
        emptyTitle="심사 대기 중인 전체 철회 요청이 없습니다."
      >
        {({ withdrawalRequests }) => (
          <div className="ra-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>요청 ID</th>
                  <th>콘텐츠</th>
                  <th>상태</th>
                  <th>요청자</th>
                  <th>요청 시각</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {withdrawalRequests.map((request) => (
                  <tr key={request.withdrawalRequestId}>
                    <td className="ra-mono">{request.withdrawalRequestId}</td>
                    <td>
                      <strong className="ra-cell-title">{request.contentTitle}</strong>
                      <span className="ra-cell-sub">{request.contentId}</span>
                    </td>
                    <td>
                      <StatusBadge value={request.contentStatus} />
                    </td>
                    <td>{request.requester?.name ?? "요청자 연결 없음"}</td>
                    <td>{formatDate(request.requestedAt)}</td>
                    <td className="ra-right">
                      <Link
                        className="ra-button ra-button-small"
                        to={`${request.withdrawalRequestId}`}
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
  );
}

export function WithdrawalDetailPage() {
  const { requestId = "" } = useParams();
  const navigate = useNavigate();
  const state = useApiData<WithdrawalDetail>(
    `/api/v1/region-admin/content-withdrawal-requests/${requestId}`,
  );
  const [action, setAction] = useState<ActionConfig | null>(null);
  const configs: Record<string, ActionConfig> = {
    approve: {
      title: "전체 철회 승인",
      description: "콘텐츠의 전체 철회 요청을 승인합니다.",
      confirmLabel: "철회 승인",
      endpoint: `/api/v1/region-admin/content-withdrawal-requests/${requestId}/approve`,
      tone: "admin",
      target: `전체 철회 요청 ${requestId}`,
      result: "요청 승인 및 콘텐츠 철회",
      warning: "승인 후 콘텐츠는 철회 상태로 전환됩니다.",
    },
    reject: {
      title: "전체 철회 반려",
      description: "요청자에게 전달할 반려 사유를 입력해 주세요.",
      confirmLabel: "철회 반려",
      endpoint: `/api/v1/region-admin/content-withdrawal-requests/${requestId}/reject`,
      tone: "danger",
      target: `전체 철회 요청 ${requestId}`,
      result: "전체 철회 요청 반려",
      reason: { label: "반려 사유", field: "reason", required: true },
    },
  };
  return (
    <>
      <PageHeader
        title="전체 철회 요청 상세"
        description="요청 사유와 대상 콘텐츠를 확인하고 심사합니다."
        actions={
          <Link className="ra-button" to="/region-admin/withdrawal-requests">
            ← 목록으로
          </Link>
        }
      />
      <AsyncContent state={state}>
        {(detail) => (
          <div className="ra-detail-layout">
            <div className="ra-detail-main">
              <Panel title="철회 요청" action={<StatusBadge value={detail.status} />}>
                <KeyValueGrid
                  items={[
                    ["요청 ID", detail.withdrawalRequestId],
                    ["요청 시각", formatDate(detail.requestedAt)],
                    ["콘텐츠", detail.content.title, true],
                    ["콘텐츠 ID", detail.content.contentId],
                    ["콘텐츠 상태", <StatusBadge value={detail.content.status} />],
                    ["요청자", detail.requester?.name ?? "연결 없음"],
                    ["요청 사유", detail.requestReason, true],
                  ]}
                />
              </Panel>
            </div>
            <aside className="ra-detail-aside">
              <section className="ra-action-card">
                <h2>심사 처리</h2>
                <p>요청 대상과 현재 콘텐츠 상태를 확인해 주세요.</p>
                <button
                  className="ra-button ra-button-admin"
                  onClick={() => setAction(configs.approve)}
                >
                  철회 승인
                </button>
                <button
                  className="ra-button ra-button-danger"
                  onClick={() => setAction(configs.reject)}
                >
                  철회 반려
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
            navigate("/region-admin/withdrawal-requests", {
              state: { completed: true },
            })
          }
        />
      )}
    </>
  );
}
