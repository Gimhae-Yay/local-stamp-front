import { useMemo, useState } from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { ApiError, apiRequest } from "../../admin/api"
import {
  ApiErrorMessage,
  AsyncState,
  Field,
  Modal,
  PageHeader,
  Pagination,
  StatusBadge,
  formatDate,
  formatMoney,
  usePlatformData,
} from "../PlatformComponents"
import type {
  PaymentDiscrepancy,
  PaymentDiscrepancyDetail,
  RefundFailure,
  RefundFailureDetail,
} from "../types"

const discrepancyFilters = [
  ["OPEN", "미처리"],
  ["RESOLVED_NO_ISSUE", "문제없음 종결"],
  ["REFUND_REQUESTED", "환불 요청"],
] as const
const refundFilters = [
  ["", "실패·결과 불일치"],
  ["FAILED", "실패"],
  ["DISCREPANT", "결과 불일치"],
  ["REQUESTED", "요청 접수"],
  ["PROCESSING", "처리 중"],
  ["SUCCEEDED", "성공"],
] as const

function TransactionTabs({ active }: { active: "discrepancy" | "refund" }) {
  return (
    <div className="pa-tabs">
      <Link
        className={active === "discrepancy" ? "active" : ""}
        to="/admin/payment-discrepancies"
      >
        결제 불일치
      </Link>
      <Link
        className={active === "refund" ? "active" : ""}
        to="/admin/refund-failures"
      >
        환불 실패
      </Link>
    </div>
  )
}

export function PaymentDiscrepancyListPage() {
  const [status, setStatus] = useState("OPEN")
  const [page, setPage] = useState(1)
  const state = usePlatformData<{ discrepancies: PaymentDiscrepancy[] }>(
    `/api/v1/platform-admin/payment-discrepancies?status=${status}`,
  )
  const rows = useMemo(
    () =>
      [...(state.data?.discrepancies ?? [])].sort(
        (a, b) => +new Date(a.detectedAt) - +new Date(b.detectedAt),
      ),
    [state.data],
  )
  const totalPages = Math.max(1, Math.ceil(rows.length / 8))
  const visible = rows.slice((page - 1) * 8, page * 8)
  return (
    <main className="pa-content">
      <PageHeader
        title="거래 예외 관리"
        description="오래된 미처리 결제 불일치부터 확인합니다."
        action={
          <Link
            className="pa-button pa-button-primary"
            to="/admin/manual-refund"
          >
            ↯ 수동 전액 환불
          </Link>
        }
      />
      <TransactionTabs active="discrepancy" />
      <div className="pa-toolbar">
        <div className="pa-chips">
          {discrepancyFilters.map(([value, label]) => (
            <button
              className={status === value ? "active" : ""}
              key={value}
              onClick={() => {
                setStatus(value)
                setPage(1)
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <span>오래된 감지순</span>
      </div>
      <AsyncState
        state={state}
        empty={(data) => data.discrepancies.length === 0}
      >
        {() => (
          <>
            <section className="pa-list">
              {visible.map((item) => (
                <article
                  className="pa-list-row pa-transaction-row"
                  key={item.discrepancyId}
                >
                  <StatusBadge value={item.status} />
                  <div>
                    <strong>불일치 ID {item.discrepancyId}</strong>
                    <small>결제 ID {item.paymentId}</small>
                  </div>
                  <div>
                    <strong>
                      {formatMoney(item.finalAmount, item.currency)}
                    </strong>
                    <small>{labelDiscrepancy(item.discrepancyType)}</small>
                  </div>
                  <Link
                    className="pa-button pa-button-outline"
                    to={`/admin/payment-discrepancies/${item.discrepancyId}`}
                  >
                    상세 ›
                  </Link>
                  <small>감지 {formatDate(item.detectedAt)}</small>
                </article>
              ))}
            </section>
            <Pagination page={page} total={totalPages} onChange={setPage} />
          </>
        )}
      </AsyncState>
    </main>
  )
}

export function RefundFailureListPage() {
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(1)
  const state = usePlatformData<{ refunds: RefundFailure[] }>(
    `/api/v1/platform-admin/refund-failures${
      status ? `?status=${status}` : ""
    }`,
  )
  const rows = useMemo(
    () =>
      [...(state.data?.refunds ?? [])].sort(
        (a, b) => +new Date(a.requestedAt) - +new Date(b.requestedAt),
      ),
    [state.data],
  )
  const totalPages = Math.max(1, Math.ceil(rows.length / 8))
  const visible = rows.slice((page - 1) * 8, page * 8)
  return (
    <main className="pa-content">
      <PageHeader
        title="거래 예외 관리"
        description="실패하거나 외부 결과가 불일치한 환불을 확인합니다."
        action={
          <Link
            className="pa-button pa-button-primary"
            to="/admin/manual-refund"
          >
            ↯ 수동 전액 환불
          </Link>
        }
      />
      <TransactionTabs active="refund" />
      <div className="pa-toolbar">
        <div className="pa-chips pa-chips-wrap">
          {refundFilters.map(([value, label]) => (
            <button
              className={status === value ? "active" : ""}
              key={value || "default"}
              onClick={() => {
                setStatus(value)
                setPage(1)
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <span>오래된 요청순</span>
      </div>
      <AsyncState state={state} empty={(data) => data.refunds.length === 0}>
        {() => (
          <>
            <section className="pa-list">
              {visible.map((item) => (
                <article
                  className="pa-list-row pa-transaction-row"
                  key={item.refundId}
                >
                  <StatusBadge value={item.status} />
                  <div>
                    <strong>환불 ID {item.refundId}</strong>
                    <small>
                      결제 ID {item.paymentId} · 예약 ID {item.reservationId}
                    </small>
                  </div>
                  <div>
                    <strong>{formatMoney(item.amount, item.currency)}</strong>
                    <small>외부 호출 {item.attemptCount} / 3</small>
                  </div>
                  <Link
                    className="pa-button pa-button-outline"
                    to={`/admin/refund-failures/${item.refundId}`}
                  >
                    상세 ›
                  </Link>
                  <small>요청 {formatDate(item.requestedAt)}</small>
                </article>
              ))}
            </section>
            <Pagination page={page} total={totalPages} onChange={setPage} />
          </>
        )}
      </AsyncState>
    </main>
  )
}

export function PaymentDiscrepancyDetailPage() {
  const { discrepancyId } = useParams()
  const navigate = useNavigate()
  const state = usePlatformData<PaymentDiscrepancyDetail>(
    discrepancyId
      ? `/api/v1/platform-admin/payment-discrepancies/${discrepancyId}`
      : null,
  )
  const [action, setAction] = useState<"resolve" | null>(null)
  return (
    <main className="pa-content">
      <AsyncState state={state} empty={() => false}>
        {(detail) => (
          <>
            <PageHeader
              title={`결제 불일치 #${detail.discrepancy.discrepancyId}`}
              description="결제 검증 이력과 외부 승인 금액을 확인하고 필요한 조치를 수행합니다."
              status={<StatusBadge value={detail.discrepancy.status} />}
            />
            <section className="pa-summary-cards">
              <Summary
                label="최종 결제 금액"
                value={formatMoney(
                  detail.payment.finalAmount,
                  detail.payment.currency,
                )}
              />
              <Summary
                label="검증 기록"
                value={`${detail.verifications.length}건`}
              />
              <Summary
                label="감지 시각"
                value={formatDate(detail.discrepancy.detectedAt)}
              />
            </section>
            <div className="pa-detail-grid">
              <Panel title="불일치·결제 정보">
                <KeyValues
                  items={[
                    ["결제 ID", detail.payment.paymentId],
                    ["예약 선점 ID", detail.payment.holdId],
                    ["주문 ID", detail.payment.orderId],
                    ["PortOne 결제 ID", detail.payment.portonePaymentId],
                    ["결제 상태", detail.payment.status],
                    [
                      "불일치 유형",
                      labelDiscrepancy(detail.discrepancy.discrepancyType),
                    ],
                  ]}
                />
              </Panel>
              <Panel title="검증 타임라인">
                <Timeline
                  items={detail.verifications.map((item) => ({
                    title: `${item.reason} · ${item.externalStatus}`,
                    copy: `관측 금액 ${formatMoney(item.observedAmount)} · ${
                      item.matched ? "일치" : "불일치"
                    }`,
                    date: formatDate(item.verifiedAt),
                    tone: item.matched ? "green" : "red",
                  }))}
                />
              </Panel>
            </div>
            {detail.actions.length > 0 && (
              <Panel title="관리자 조치 이력">
                <Timeline
                  items={detail.actions.map((item) => ({
                    title: item.action,
                    copy: `${item.reason} · 증빙 ${item.evidenceReference}`,
                    date: formatDate(item.actedAt),
                    tone: "green",
                  }))}
                />
              </Panel>
            )}
            {detail.discrepancy.status === "OPEN" && (
              <div className="pa-action-bar">
                <div>
                  <strong>관리자 조치</strong>
                  <span>
                    검증 결과에 따라 문제없음으로 종결하거나 전액 환불을
                    요청합니다.
                  </span>
                </div>
                <div>
                  <button
                    className="pa-button pa-button-outline"
                    onClick={() => setAction("resolve")}
                  >
                    문제없음 종결
                  </button>
                  <Link
                    className="pa-button pa-button-danger"
                    to={`/admin/manual-refund?paymentId=${detail.payment.paymentId}&discrepancyId=${detail.discrepancy.discrepancyId}`}
                  >
                    전액 환불 요청
                  </Link>
                </div>
              </div>
            )}
            <button className="pa-back-link" onClick={() => navigate(-1)}>
              ← 결제 불일치 목록으로
            </button>
            {action === "resolve" && (
              <EvidenceModal
                title="문제없음으로 종결"
                description="외부 승인 금액과 최종 결제 금액이 일치함을 확인합니다."
                endpoint={`/api/v1/platform-admin/payment-discrepancies/${detail.discrepancy.discrepancyId}/manual-actions`}
                submitLabel="문제없음 종결"
                onClose={() => setAction(null)}
                onSuccess={() => {
                  setAction(null)
                  state.reload()
                }}
              />
            )}
          </>
        )}
      </AsyncState>
    </main>
  )
}

export function ManualRefundPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [paymentId, setPaymentId] = useState(params.get("paymentId") ?? "")
  const [evidenceReference, setEvidenceReference] = useState("")
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<{
    refundId: string
    status: string
    amount: number
    requestedAt: string
  } | null>(null)
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError("")
    try {
      const response = await apiRequest<{
        refundId: string
        status: string
        amount: number
        requestedAt: string
      }>(`/api/v1/platform-admin/payments/${paymentId}/refund`, {
        method: "POST",
        body: JSON.stringify({ evidenceReference, reason }),
      })
      setResult(response)
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "환불을 요청하지 못했습니다.",
      )
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <main className="pa-content pa-content-narrow">
      <PageHeader
        title="수동 전액 환불"
        description="결제 ID를 기준으로 전체 결제 금액의 환불을 요청합니다."
      />
      <form className="pa-panel pa-standalone-form" onSubmit={submit}>
        <h2>환불 요청 정보</h2>
        <Field label="결제 ID *">
          <input
            value={paymentId}
            onChange={(event) =>
              setPaymentId(event.target.value.replace(/\D/g, ""))
            }
            inputMode="numeric"
            required
          />
        </Field>
        <Field
          label="증빙 참조 *"
          help="고객 문의, 운영 승인 문서 등 추적 가능한 참조를 입력합니다."
        >
          <input
            value={evidenceReference}
            onChange={(event) => setEvidenceReference(event.target.value)}
            required
          />
        </Field>
        <Field label="환불 사유 *">
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
          />
        </Field>
        <div className="pa-notice pa-notice-danger">
          <strong>전액 환불</strong>
          <span>
            부분 환불은 지원하지 않습니다. 요청 후 외부 결제 결과에 따라 상태가
            변경됩니다.
          </span>
        </div>
        <ApiErrorMessage error={error} />
        <div className="pa-form-actions">
          <button
            type="button"
            className="pa-button"
            onClick={() => navigate(-1)}
          >
            취소
          </button>
          <button className="pa-button pa-button-danger" disabled={submitting}>
            {submitting ? "환불 요청 중…" : "전액 환불 요청"}
          </button>
        </div>
      </form>
      {result && (
        <div className="pa-result pa-result-success">
          <strong>✓ &nbsp;환불 요청 완료</strong>
          <span>
            환불 ID {result.refundId} · {formatMoney(result.amount)} ·{" "}
            {formatDate(result.requestedAt)}
          </span>
          <StatusBadge value={result.status} />
          <Link
            className="pa-button pa-button-outline"
            to={`/admin/refund-failures/${result.refundId}`}
          >
            환불 상세로 이동
          </Link>
        </div>
      )}
    </main>
  )
}

export function RefundFailureDetailPage() {
  const { refundId } = useParams()
  const navigate = useNavigate()
  const state = usePlatformData<RefundFailureDetail>(
    refundId ? `/api/v1/platform-admin/refund-failures/${refundId}` : null,
  )
  const [confirming, setConfirming] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [error, setError] = useState("")
  const retry = async () => {
    if (!refundId) return
    setRetrying(true)
    setError("")
    try {
      await apiRequest(`/api/v1/platform-admin/refunds/${refundId}/retry`, {
        method: "POST",
      })
      state.reload()
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "환불을 재시도하지 못했습니다.",
      )
    } finally {
      setRetrying(false)
    }
  }
  return (
    <main className="pa-content">
      <AsyncState state={state} empty={() => false}>
        {(detail) => {
          const canRetry =
            detail.refund.status === "FAILED" && detail.attempts.length < 3
          return (
            <>
              <PageHeader
                title={`환불 실패 #${detail.refund.refundId}`}
                description="환불·결제 정보와 외부 호출 시도를 확인하고 실제 결과를 처리합니다."
                status={<StatusBadge value={detail.refund.status} />}
              />
              <section className="pa-summary-cards">
                <Summary
                  label="환불 금액"
                  value={formatMoney(
                    detail.refund.amount,
                    detail.refund.currency,
                  )}
                />
                <Summary
                  label="외부 호출 시도"
                  value={`${detail.attempts.length} / 3`}
                />
                <Summary
                  label="요청·완료 시각"
                  value={`${formatDate(detail.refund.requestedAt)} · ${formatDate(detail.refund.completedAt)}`}
                />
              </section>
              <div className="pa-detail-grid">
                <Panel title="환불·결제 정보">
                  <KeyValues
                    items={[
                      ["환불 ID", detail.refund.refundId],
                      ["결제 ID", detail.payment.paymentId],
                      ["예약 ID", detail.refund.reservationId],
                      ["주문 ID", detail.payment.orderId],
                      ["PortOne 결제 ID", detail.payment.portonePaymentId],
                      [
                        "최종 결제 금액",
                        formatMoney(
                          detail.payment.finalAmount,
                          detail.payment.currency,
                        ),
                      ],
                    ]}
                  />
                </Panel>
                <Panel title="외부 호출 시도 타임라인">
                  <Timeline
                    items={
                      detail.attempts.length
                        ? detail.attempts.map((attempt) => ({
                            title: `시도 ${attempt.attemptNo} · ${
                              attempt.initiatorKind === "SYSTEM"
                                ? "시스템"
                                : "플랫폼 관리자"
                            }`,
                            copy: `${attempt.outcomeKind} · ${attempt.externalStatus ?? attempt.failureReasonCode ?? "응답 없음"}${
                              attempt.portoneCancellationId
                                ? ` · 취소 ID ${attempt.portoneCancellationId}`
                                : ""
                            }`,
                            date: formatDate(attempt.attemptedAt),
                            tone:
                              attempt.externalStatus === "SUCCEEDED"
                                ? "green"
                                : attempt.outcomeKind === "NO_RESPONSE"
                                  ? "gray"
                                  : "red",
                          }))
                        : [
                            {
                              title: "외부 호출 대기 중",
                              copy: "아직 외부 호출을 시작하지 않았습니다.",
                              date: "0 / 3",
                              tone: "gray",
                            },
                          ]
                    }
                  />
                </Panel>
              </div>
              <ApiErrorMessage error={error} />
              {detail.refund.status === "DISCREPANT" && (
                <div className="pa-action-bar">
                  <div>
                    <strong>외부 결과 확정</strong>
                    <span>
                      PortOne의 실제 환불 결과를 증빙과 함께 확정합니다.
                    </span>
                  </div>
                  <button
                    className="pa-button pa-button-primary"
                    onClick={() => setConfirming(true)}
                  >
                    외부 결과 확정
                  </button>
                </div>
              )}
              {canRetry && (
                <div className="pa-action-bar pa-action-danger">
                  <div>
                    <strong>환불 재시도 가능</strong>
                    <span>
                      요청 본문 없이 새 외부 호출을 시작합니다. 남은 시도{" "}
                      {3 - detail.attempts.length}회
                    </span>
                  </div>
                  <button
                    className="pa-button pa-button-danger"
                    onClick={retry}
                    disabled={retrying}
                  >
                    {retrying ? "재시도 중…" : "환불 재시도"}
                  </button>
                </div>
              )}
              {detail.refund.status === "FAILED" && !canRetry && (
                <div className="pa-notice pa-notice-danger">
                  <strong>재시도 횟수 소진</strong>
                  <span>전체 외부 호출 최대 3회를 모두 사용했습니다.</span>
                </div>
              )}
              {["REQUESTED", "PROCESSING"].includes(detail.refund.status) && (
                <div className="pa-action-bar">
                  <div>
                    <strong>최신 환불 상태 확인</strong>
                    <span>외부 결제 시스템의 처리 결과를 다시 조회합니다.</span>
                  </div>
                  <button
                    className="pa-button pa-button-outline"
                    onClick={state.reload}
                  >
                    최신 상태 확인
                  </button>
                </div>
              )}
              <button className="pa-back-link" onClick={() => navigate(-1)}>
                ← 환불 실패 목록으로
              </button>
              {confirming && (
                <ConfirmRefundModal
                  refundId={detail.refund.refundId}
                  onClose={() => setConfirming(false)}
                  onSuccess={() => {
                    setConfirming(false)
                    state.reload()
                  }}
                />
              )}
            </>
          )
        }}
      </AsyncState>
    </main>
  )
}

function EvidenceModal({
  title,
  description,
  endpoint,
  submitLabel,
  onClose,
  onSuccess,
}: {
  title: string
  description: string
  endpoint: string
  submitLabel: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [evidenceReference, setEvidenceReference] = useState("")
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError("")
    try {
      await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify({ evidenceReference, reason }),
      })
      onSuccess()
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "조치를 완료하지 못했습니다.",
      )
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <Modal title={title} description={description} onClose={onClose}>
      <form className="pa-drawer-form" onSubmit={submit}>
        <Field label="증빙 참조 *">
          <input
            value={evidenceReference}
            onChange={(event) => setEvidenceReference(event.target.value)}
            required
          />
        </Field>
        <Field label="조치 사유 *">
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
          />
        </Field>
        <ApiErrorMessage error={error} />
        <div className="pa-form-actions">
          <button type="button" className="pa-button" onClick={onClose}>
            취소
          </button>
          <button className="pa-button pa-button-primary" disabled={submitting}>
            {submitting ? "처리 중…" : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function ConfirmRefundModal({
  refundId,
  onClose,
  onSuccess,
}: {
  refundId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [confirmedStatus, setConfirmedStatus] = useState("SUCCEEDED")
  const [evidenceReference, setEvidenceReference] = useState("")
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError("")
    try {
      await apiRequest(
        `/api/v1/platform-admin/refund-failures/${refundId}/manual-actions`,
        {
          method: "POST",
          body: JSON.stringify({ confirmedStatus, evidenceReference, reason }),
        },
      )
      onSuccess()
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "외부 결과를 확정하지 못했습니다.",
      )
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <Modal
      title="외부 결과 확정"
      description="결과 불일치 상태의 실제 처리 결과를 확정합니다."
      onClose={onClose}
    >
      <form className="pa-drawer-form" onSubmit={submit}>
        <Field label="확정 상태 *">
          <select
            value={confirmedStatus}
            onChange={(event) => setConfirmedStatus(event.target.value)}
          >
            <option value="SUCCEEDED">성공</option>
            <option value="FAILED">실패</option>
          </select>
        </Field>
        <Field label="증빙 참조 *">
          <input
            value={evidenceReference}
            onChange={(event) => setEvidenceReference(event.target.value)}
            required
          />
        </Field>
        <Field label="확정 사유 *">
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
          />
        </Field>
        <div className="pa-notice pa-notice-orange">
          <strong>
            {confirmedStatus === "SUCCEEDED" ? "성공 확정" : "실패 확정"}
          </strong>
          <span>
            {confirmedStatus === "SUCCEEDED"
              ? "완료 시각을 기록하고 이후 재시도할 수 없습니다."
              : "완료 시각을 기록하지 않으며 남은 횟수 안에서 재시도할 수 있습니다."}
          </span>
        </div>
        <ApiErrorMessage error={error} />
        <div className="pa-form-actions">
          <button type="button" className="pa-button" onClick={onClose}>
            취소
          </button>
          <button className="pa-button pa-button-primary" disabled={submitting}>
            {submitting ? "확정 중…" : "외부 결과 확정"}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function Summary({ label, value }: { label: string, value: string }) {
  return (
    <article>
      <small>{label}</small>
      <strong>{value}</strong>
    </article>
  )
}
function Panel({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="pa-panel">
      <h2>{title}</h2>
      {children}
    </section>
  )
}
function KeyValues({ items }: { items: Array<[string, string]> }) {
  return (
    <dl className="pa-kv">
      {items.map(([key, value]) => (
        <div key={key}>
          <dt>{key}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}
function Timeline({
  items,
}: {
  items: Array<{ title: string, copy: string, date: string, tone: string }>
}) {
  return (
    <ol className="pa-timeline">
      {items.map((item, index) => (
        <li key={`${item.title}-${index}`} className={`tone-${item.tone}`}>
          <span>{index + 1}</span>
          <div>
            <strong>{item.title}</strong>
            <p>{item.copy}</p>
            <small>{item.date}</small>
          </div>
        </li>
      ))}
    </ol>
  )
}
function labelDiscrepancy(value: string) {
  return (
    ({
      AMOUNT_MISMATCH: "금액 불일치",
      DELAYED_APPROVAL: "지연 승인",
      PAYMENT_STATUS_MISMATCH: "결제 상태 불일치",
    } as Record<string, string>)[value] ?? value
  )
}
