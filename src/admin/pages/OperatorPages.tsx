import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
import type { OperatorRequest, OperatorRequestDetail } from "../types";

export function OperatorRequestListPage() {
  const state = useApiData<{ operatorRequests: OperatorRequest[] }>(
    "/api/v1/region-admin/operator-requests?status=PENDING",
  );
  return (
    <>
      <PageHeader
        title="운영자 신청"
        description="담당 지역의 승인 대기 신청을 오래된 순으로 확인합니다."
      />
      <div className="ra-filter-bar">
        <div>
          <strong>승인 대기</strong>
          <span>승인 대기 상태 고정</span>
        </div>
        <small>신청 시각 오래된 순 · 정렬 고정</small>
      </div>
      <AsyncContent
        state={state}
        empty={(data) => data.operatorRequests.length === 0}
        emptyTitle="승인 대기 중인 운영자 신청이 없습니다."
      >
        {({ operatorRequests }) => (
          <div className="ra-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>신청 ID</th>
                  <th>신청자 ID</th>
                  <th>요청 지역</th>
                  <th>신청 시각</th>
                  <th>상태</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {operatorRequests.map((request) => (
                  <tr key={request.operatorApplicationId}>
                    <td className="ra-mono">{request.operatorApplicationId}</td>
                    <td className="ra-mono">{request.applicantUserId}</td>
                    <td>지역 ID {request.requestedRegionId}</td>
                    <td>{formatDate(request.requestedAt)}</td>
                    <td>
                      <StatusBadge value="PENDING" />
                    </td>
                    <td className="ra-right">
                      <Link
                        className="ra-button ra-button-small"
                        to={`${request.operatorApplicationId}`}
                      >
                        상세 보기
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

export function OperatorRequestDetailPage() {
  const { requestId = "" } = useParams();
  const navigate = useNavigate();
  const state = useApiData<OperatorRequestDetail>(
    `/api/v1/region-admin/operator-requests/${requestId}`,
  );
  const [action, setAction] = useState<ActionConfig | null>(null);
  const actions = useMemo(
    () => ({
      approve: {
        title: "운영자 신청 승인",
        description: "사업자 정보와 요청 지역을 확인했습니다.",
        confirmLabel: "승인",
        endpoint: `/api/v1/region-admin/operator-requests/${requestId}/approve`,
        tone: "admin" as const,
        target: `운영자 신청 ${requestId}`,
        result: "신청 승인 및 운영자 역할 부여",
      },
      reject: {
        title: "운영자 신청 반려",
        description: "반려 사유는 신청자에게 전달됩니다.",
        confirmLabel: "반려",
        endpoint: `/api/v1/region-admin/operator-requests/${requestId}/reject`,
        tone: "danger" as const,
        target: `운영자 신청 ${requestId}`,
        result: "운영자 신청 반려",
        reason: {
          label: "반려 사유",
          field: "rejectedReason",
          required: true,
          maxLength: 2000,
          placeholder: "보완이 필요한 내용을 구체적으로 입력해 주세요.",
        },
      },
    }),
    [requestId],
  );

  return (
    <>
      <PageHeader
        title="운영자 신청 상세"
        description="사업자 정보와 요청 지역을 확인하고 신청을 심사합니다."
        actions={
          <Link className="ra-button" to="/region-admin/operator-requests">
            ← 목록으로
          </Link>
        }
      />
      <AsyncContent state={state}>
        {(detail) => (
          <div className="ra-detail-layout">
            <div className="ra-detail-main">
              <Panel title="신청 정보" action={<StatusBadge value={detail.status} />}>
                <KeyValueGrid
                  items={[
                    ["신청 ID", detail.operatorApplicationId],
                    ["신청자 ID", detail.applicantUserId ?? "연결 해제됨"],
                    ["요청 지역 ID", detail.requestedRegionId],
                    ["신청 시각", formatDate(detail.requestedAt)],
                    ["최근 변경", formatDate(detail.updatedAt)],
                    [
                      "사업자 정보",
                      <span className="ra-preline">
                        {detail.businessInformation ?? "신청자 탈퇴로 확인할 수 없습니다."}
                      </span>,
                      true,
                    ],
                    ...(detail.rejectedReason
                      ? [["반려 사유", detail.rejectedReason, true] as [string, string, boolean]]
                      : []),
                  ]}
                />
              </Panel>
            </div>
            <aside className="ra-detail-aside">
              <section className="ra-action-card">
                <div className="ra-status-line">
                  <h2>처리 상태</h2>
                  <StatusBadge value={detail.status} />
                </div>
                <p>서버가 처리 시점의 상태와 담당 지역 권한을 다시 검증합니다.</p>
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
                  </>
                ) : (
                  <button
                    className="ra-button"
                    onClick={() => navigate("/region-admin/operator-requests")}
                  >
                    목록으로
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
          onSuccess={() =>
            navigate("/region-admin/operator-requests", {
              state: { completed: true },
            })
          }
        />
      )}
    </>
  );
}
