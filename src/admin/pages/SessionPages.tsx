import { useState } from "react";
import { Link, NavLink, useNavigate, useParams } from "react-router-dom";
import {
  ActionModal,
  AsyncContent,
  KeyValueGrid,
  PageHeader,
  Panel,
  StatusBadge,
  formatDate,
  useApiData,
  type ActionConfig,
} from "../AdminComponents";
import type { PendingSession, SessionRevisionDetail, SessionRevisionSummary } from "../types";

const SESSION_REVISION_APPROVABLE_CONTENT_STATUSES = new Set(["APPROVED", "PUBLISHED"]);

export function isSessionRevisionApprovalAvailable(contentStatus: string) {
  return SESSION_REVISION_APPROVABLE_CONTENT_STATUSES.has(contentStatus);
}

function SessionTabs({ active }: { active: "new" | "revision" }) {
  return (
    <nav className="ra-tabs" aria-label="회차 관리">
      <NavLink className={active === "new" ? "active" : ""} to="/region-admin/sessions">
        추가 회차 심사
      </NavLink>
      <NavLink
        className={active === "revision" ? "active" : ""}
        to="/region-admin/session-revisions"
      >
        회차 수정 심사
      </NavLink>
    </nav>
  );
}

export function SessionListPage() {
  const state = useApiData<{ sessions: PendingSession[] }>(
    "/api/v1/region-admin/sessions?status=PENDING",
  );
  return (
    <>
      <PageHeader title="회차 관리" description="신규 회차 심사 대상을 확인합니다." />
      <SessionTabs active="new" />
      <div className="ra-filter-bar">
        <div>
          <strong>추가 회차 심사 대기</strong>
          <span>승인 대기 상태 고정</span>
        </div>
        <small>생성 시각 오래된 순 · 정렬 고정</small>
      </div>
      <AsyncContent
        state={state}
        empty={(data) => data.sessions.length === 0}
        emptyTitle="심사 대기 중인 추가 회차가 없습니다."
      >
        {({ sessions }) => (
          <div className="ra-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>회차 ID</th>
                  <th>콘텐츠</th>
                  <th>상태</th>
                  <th>일정</th>
                  <th>체크인 창</th>
                  <th>정원</th>
                  <th>운영자</th>
                  <th>생성 시각</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.sessionId}>
                    <td className="ra-mono">{session.sessionId}</td>
                    <td>
                      <strong className="ra-cell-title">{session.contentTitle}</strong>
                      <span className="ra-cell-sub">{session.contentId}</span>
                    </td>
                    <td>
                      <StatusBadge value={session.status} />
                    </td>
                    <td>
                      {formatDate(session.startsAt)}
                      <span className="ra-cell-sub">~ {formatDate(session.endsAt)}</span>
                    </td>
                    <td>
                      {formatDate(session.checkinOpenAt)}
                      <span className="ra-cell-sub">~ {formatDate(session.checkinCloseAt)}</span>
                    </td>
                    <td>{session.capacity}명</td>
                    <td>{session.operator.name}</td>
                    <td>{formatDate(session.createdAt)}</td>
                    <td className="ra-right">
                      <Link className="ra-button ra-button-small" to={`${session.sessionId}`}>
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

export function SessionDetailPage() {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const state = useApiData<PendingSession>(`/api/v1/region-admin/sessions/${sessionId}`);
  const [action, setAction] = useState<ActionConfig | null>(null);
  const configs: Record<string, ActionConfig> = {
    approve: {
      title: "추가 회차 승인",
      description: "일정, 체크인 창과 정원을 확인했습니다.",
      confirmLabel: "회차 승인",
      endpoint: `/api/v1/region-admin/sessions/${sessionId}/approve`,
      tone: "admin",
      target: `회차 ${sessionId}`,
      result: "추가 회차 승인",
    },
    reject: {
      title: "추가 회차 반려",
      description: "운영자가 수정할 수 있도록 사유를 입력해 주세요.",
      confirmLabel: "회차 반려",
      endpoint: `/api/v1/region-admin/sessions/${sessionId}/reject`,
      tone: "danger",
      target: `회차 ${sessionId}`,
      result: "추가 회차 반려",
      reason: { label: "반려 사유", field: "reason", required: true },
    },
  };
  return (
    <>
      <PageHeader
        title="추가 회차 상세"
        description="일정, 체크인 창과 정원을 검토합니다."
        actions={
          <Link className="ra-button" to="/region-admin/sessions">
            ← 목록으로
          </Link>
        }
      />
      <AsyncContent state={state}>
        {(detail) => (
          <div className="ra-detail-layout">
            <div className="ra-detail-main">
              <Panel title="회차 정보" action={<StatusBadge value={detail.status} />}>
                <KeyValueGrid
                  items={[
                    ["회차 ID", detail.sessionId],
                    ["콘텐츠 ID", detail.contentId],
                    ["콘텐츠", detail.contentTitle, true],
                    ["시작", formatDate(detail.startsAt)],
                    ["종료", formatDate(detail.endsAt)],
                    ["체크인 시작", formatDate(detail.checkinOpenAt)],
                    ["체크인 종료", formatDate(detail.checkinCloseAt)],
                    ["정원", `${detail.capacity}명`],
                    ["잔여 정원", `${detail.remainingCapacity}명`],
                    ["운영자", `${detail.operator.name} (${detail.operator.operatorId})`],
                    ["생성 시각", formatDate(detail.createdAt)],
                  ]}
                />
              </Panel>
            </div>
            <aside className="ra-detail-aside">
              <section className="ra-action-card">
                <h2>심사 처리</h2>
                <p>콘텐츠 상태와 회차 시간 조건을 서버가 다시 검증합니다.</p>
                <button
                  className="ra-button ra-button-admin"
                  onClick={() => setAction(configs.approve)}
                >
                  회차 승인
                </button>
                <button
                  className="ra-button ra-button-danger"
                  onClick={() => setAction(configs.reject)}
                >
                  회차 반려
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
            navigate("/region-admin/sessions", {
              state: { completed: true },
            })
          }
        />
      )}
    </>
  );
}

export function SessionRevisionListPage() {
  const state = useApiData<{ revisions: SessionRevisionSummary[] }>(
    "/api/v1/region-admin/session-revisions?status=PENDING",
  );
  return (
    <>
      <PageHeader title="회차 관리" description="기존 회차 변경 요청을 확인합니다." />
      <SessionTabs active="revision" />
      <div className="ra-filter-bar">
        <div>
          <strong>회차 수정 심사 대기</strong>
          <span>심사 대기 상태 고정</span>
        </div>
        <small>제출 시각 오래된 순 · 정렬 고정</small>
      </div>
      <AsyncContent
        state={state}
        empty={(data) => data.revisions.length === 0}
        emptyTitle="심사 대기 중인 회차 수정 요청이 없습니다."
      >
        {({ revisions }) => (
          <div className="ra-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>요청 ID</th>
                  <th>콘텐츠</th>
                  <th>대상 회차</th>
                  <th>기준 버전</th>
                  <th>후보 일정</th>
                  <th>후보 체크인</th>
                  <th>정원</th>
                  <th>운영자</th>
                  <th>제출 시각</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {revisions.map((revision) => (
                  <tr key={revision.revisionId}>
                    <td className="ra-mono">{revision.revisionId}</td>
                    <td>
                      <strong className="ra-cell-title">{revision.contentTitle}</strong>
                      <span className="ra-cell-sub">{revision.contentId}</span>
                    </td>
                    <td className="ra-mono">{revision.targetSessionId}</td>
                    <td>v{revision.baseSessionVersion}</td>
                    <td>
                      {formatDate(revision.startsAt)}
                      <span className="ra-cell-sub">~ {formatDate(revision.endsAt)}</span>
                    </td>
                    <td>
                      {formatDate(revision.checkinOpenAt)}
                      <span className="ra-cell-sub">~ {formatDate(revision.checkinCloseAt)}</span>
                    </td>
                    <td>{revision.capacity}명</td>
                    <td>{revision.operator.name}</td>
                    <td>{formatDate(revision.submittedAt)}</td>
                    <td className="ra-right">
                      <Link className="ra-button ra-button-small" to={`${revision.revisionId}`}>
                        비교
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

function CompareCard({
  title,
  candidate,
  data,
}: {
  title: string;
  candidate?: boolean;
  data: {
    startsAt: string;
    endsAt: string;
    checkinOpenAt: string;
    checkinCloseAt: string;
    capacity: number;
  };
}) {
  return (
    <section className={`ra-compare-card${candidate ? " candidate" : ""}`}>
      <h3>{title}</h3>
      <KeyValueGrid
        items={[
          ["시작", formatDate(data.startsAt)],
          ["종료", formatDate(data.endsAt)],
          ["체크인 시작", formatDate(data.checkinOpenAt)],
          ["체크인 종료", formatDate(data.checkinCloseAt)],
          ["정원", `${data.capacity}명`],
        ]}
      />
    </section>
  );
}

export function SessionRevisionDetailPage() {
  const { revisionId = "" } = useParams();
  const navigate = useNavigate();
  const state = useApiData<SessionRevisionDetail>(
    `/api/v1/region-admin/session-revisions/${revisionId}`,
  );
  const [action, setAction] = useState<ActionConfig | null>(null);
  const configs: Record<string, ActionConfig> = {
    approve: {
      title: "회차 변경 승인",
      description: "변경 후보가 현재 회차에 반영됩니다.",
      confirmLabel: "변경 승인",
      endpoint: `/api/v1/region-admin/session-revisions/${revisionId}/approve`,
      tone: "admin",
      target: `회차 수정 요청 ${revisionId}`,
      result: "변경 후보 반영",
    },
    reject: {
      title: "회차 변경 반려",
      description: "운영자에게 전달할 보완 사유를 입력해 주세요.",
      confirmLabel: "변경 반려",
      endpoint: `/api/v1/region-admin/session-revisions/${revisionId}/reject`,
      tone: "danger",
      target: `회차 수정 요청 ${revisionId}`,
      result: "회차 변경 반려",
      reason: { label: "반려 사유", field: "reason", required: true },
    },
  };
  return (
    <>
      <PageHeader
        title="회차 수정 상세"
        description="현재 회차와 변경 후보를 비교합니다."
        actions={
          <Link className="ra-button" to="/region-admin/session-revisions">
            ← 목록으로
          </Link>
        }
      />
      <AsyncContent state={state}>
        {(detail) => {
          const approvalAvailable = isSessionRevisionApprovalAvailable(detail.contentStatus);

          return (
            <div className="ra-detail-layout">
              <div className="ra-detail-main">
                <Panel
                  title={detail.contentTitle}
                  action={<StatusBadge value={detail.contentStatus} />}
                >
                  <KeyValueGrid
                    items={[
                      ["변경 요청 ID", detail.revisionId],
                      ["콘텐츠 ID", detail.contentId],
                      ["대상 회차", detail.targetSession.sessionId],
                      ["기준 버전", `v${detail.baseSessionVersion}`],
                      ["운영자", `${detail.operator.name} (${detail.operator.operatorId})`],
                      ["제출 시각", formatDate(detail.submittedAt)],
                    ]}
                  />
                </Panel>
                <div className="ra-compare-grid">
                  <CompareCard title="현재 회차" data={detail.targetSession} />
                  <CompareCard title="변경 후보" candidate data={detail.candidate} />
                </div>
              </div>
              <aside className="ra-detail-aside">
                <section className="ra-action-card">
                  <h2>변경 심사</h2>
                  <p>승인 시점에 기준 버전과 회차 상태를 다시 확인합니다.</p>
                  {!approvalAvailable && (
                    <div
                      className="ra-inline-warning"
                      id="session-revision-approval-warning"
                      role="status"
                    >
                      현재 콘텐츠 상태({detail.contentStatus})에서는 변경을 승인할 수 없습니다.
                      콘텐츠가 승인 또는 공개 상태가 된 뒤 다시 확인해 주세요.
                    </div>
                  )}
                  <button
                    aria-describedby={
                      approvalAvailable ? undefined : "session-revision-approval-warning"
                    }
                    className="ra-button ra-button-admin"
                    disabled={!approvalAvailable}
                    onClick={() => setAction(configs.approve)}
                  >
                    변경 승인
                  </button>
                  <button
                    className="ra-button ra-button-danger"
                    onClick={() => setAction(configs.reject)}
                  >
                    변경 반려
                  </button>
                </section>
              </aside>
            </div>
          );
        }}
      </AsyncContent>
      {action && (
        <ActionModal
          config={action}
          onClose={() => setAction(null)}
          onSuccess={() =>
            navigate("/region-admin/session-revisions", {
              state: { completed: true },
            })
          }
        />
      )}
    </>
  );
}
