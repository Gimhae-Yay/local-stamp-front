import { useEffect, useRef, useState, type ReactNode } from "react"

import { ApiError } from "../api/client"

const statusLabels: Record<string, string> = {
  DRAFT: "초안",

  PENDING: "심사 대기",

  PENDING_REVIEW: "심사 대기",

  EDIT_REQUESTED: "수정 심사 중",
  EDIT_APPROVED: "수정 승인",
  EDIT_REJECTED: "수정 반려",
  EDIT_WITHDRAWN: "수정 철회",
  EDIT_INVALIDATED: "수정 무효",
  REVIEW_UNKNOWN: "심사 결과 확인 필요",
  APPROVED: "승인",

  PUBLISHED: "공개 중",

  REJECTED: "반려",

  SCHEDULED: "예정",

  CANCELLED: "취소",

  ENDED: "종료",

  COMPLETED: "완료",

  CONFIRMED: "확정",

  CHECKED_IN: "체크인",

  EXPIRED: "만료",

  PROCESSING: "처리 중",

  SUCCEEDED: "완료",

  FAILED: "실패",

  OPEN: "확인 필요",

  VISIT: "방문",

  MISSION_REWARD: "미션 보상",

  STAMPBOOK_COMPLETION: "스탬프북 완주",

  VISIT_COUNT: "방문 횟수",

  CONTENT_SET: "콘텐츠 세트",
}

export function statusLabel(value: string) {
  return statusLabels[value] ?? value
}

export function statusTone(value: string) {
  if (
    [
      "PUBLISHED",
      "APPROVED",
      "SCHEDULED",
      "CONFIRMED",
      "SUCCEEDED",
      "COMPLETED",
    ].includes(value)
  )
    return "success"

  if (
    [
      "PENDING",
      "PENDING_REVIEW",
      "EDIT_REQUESTED",
      "REVIEW_UNKNOWN",
      "PROCESSING",
    ].includes(
      value,
    )
  )
    return "pending"

  if (
    [
      "REJECTED",
      "EDIT_REJECTED",
      "EDIT_WITHDRAWN",
      "EDIT_INVALIDATED",
      "CANCELLED",
      "FAILED",
      "OPEN",
      "ENDED",
    ].includes(value)
  )
    return "danger"

  if (value === "CHECKED_IN") return "blue"

  return "draft"
}

export function StatusBadge({ value }: { value: string }) {
  return (
    <span className={`op-badge op-badge-${statusTone(value)}`}>
      {statusLabel(value)}
    </span>
  )
}

export function PageHeader({
  title,

  description,

  actions,
}: {
  title: string

  description: string

  actions?: ReactNode
}) {
  return (
    <header className="op-page-header">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="op-button-row">{actions}</div>}
    </header>
  )
}

export function Breadcrumb({ children }: { children: ReactNode }) {
  return <div className="op-breadcrumb">{children}</div>
}

export function RouteState({
  loading,

  error,

  empty,

  onRetry,
}: {
  loading?: boolean

  error?: string

  empty?: string

  onRetry?: () => void
}) {
  return (
    <section className="op-state">
      <div>
        {loading && <span className="op-spinner" />}
        <h3>
          {loading
            ? "불러오는 중입니다"
            : error
              ? "요청을 완료하지 못했습니다"
              : "표시할 항목이 없습니다"}
        </h3>
        <p>{error ?? empty}</p>
        {error && onRetry && (
          <button className="op-button" onClick={onRetry}>
            다시 시도
          </button>
        )}
      </div>
    </section>
  )
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",

    timeStyle: "short",

    timeZone: "Asia/Seoul",
  }).format(date)
}

export function formatMoney(value: number, currency = "KRW") {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",

    currency,

    maximumFractionDigits: 0,
  }).format(value)
}

export function apiErrorMessage(caught: unknown, fallback: string) {
  if (caught instanceof ApiError) return caught.message

  if (caught instanceof Error && caught.message.trim()) return caught.message

  return fallback
}

export function ActionModal({
  title,

  description,

  label = "사유",

  placeholder,

  confirmLabel,

  tone = "admin",

  initialReason = "",

  reasonOptions,

  onClose,

  onConfirm,
}: {
  title: string

  description: string

  label?: string

  placeholder?: string

  confirmLabel: string

  tone?: "admin" | "danger" | "primary"

  initialReason?: string

  reasonOptions?: Array<{ value: string; label: string }>

  onClose: () => void

  onConfirm: (reason: string) => Promise<void>
}) {
  const [reason, setReason] = useState(initialReason)

  const [submitting, setSubmitting] = useState(false)

  const [error, setError] = useState("")

  const dialogRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null

    dialogRef.current?.focus()

    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) onClose()
    }

    document.addEventListener("keydown", keydown)

    return () => {
      document.removeEventListener("keydown", keydown)

      previous?.focus()
    }
  }, [onClose, submitting])

  const submit = async () => {
    if (!reason.trim()) {
      setError(`${label}을 입력해 주세요.`)

      return
    }

    setSubmitting(true)

    setError("")

    try {
      await onConfirm(reason.trim())
    } catch (caught) {
      setError(apiErrorMessage(caught, "처리하지 못했습니다."))

      setSubmitting(false)
    }
  }

  return (
    <div
      className="op-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose()
      }}
    >
      <section
        ref={dialogRef}
        className="op-modal"
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
      >
        <header>
          <h2>{title}</h2>
          <p>{description}</p>
        </header>
        <div className="op-modal-body">
          <label className="op-field">
            {label}
            {reasonOptions ? (
              <select
                className="op-control"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                autoFocus
              >
                {reasonOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <>
                <textarea
                  className="op-control"
                  value={reason}
                  placeholder={placeholder}
                  maxLength={500}
                  onChange={(event) => setReason(event.target.value)}
                  autoFocus
                />
                <small>{reason.length} / 500자</small>
              </>
            )}
          </label>
          {error && (
            <div className="op-alert" role="alert">
              {error}
            </div>
          )}
        </div>
        <footer>
          <button className="op-button" onClick={onClose} disabled={submitting}>
            취소
          </button>
          <button
            className={`op-button op-button-${tone}`}
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? "처리 중…" : confirmLabel}
          </button>
        </footer>
      </section>
    </div>
  )
}

export function ConfirmModal({
  title,

  description,

  confirmLabel,

  tone = "admin",

  onClose,

  onConfirm,
}: {
  title: string

  description: string

  confirmLabel: string

  tone?: "admin" | "danger" | "primary"

  onClose: () => void

  onConfirm: () => Promise<void>
}) {
  const [submitting, setSubmitting] = useState(false)

  const [error, setError] = useState("")

  return (
    <div
      className="op-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose()
      }}
    >
      <section className="op-modal" role="dialog" aria-modal="true">
        <header>
          <h2>{title}</h2>
          <p>{description}</p>
        </header>
        <div className="op-modal-body">
          {error && (
            <div className="op-alert" role="alert">
              {error}
            </div>
          )}
        </div>
        <footer>
          <button className="op-button" onClick={onClose} disabled={submitting}>
            취소
          </button>
          <button
            className={`op-button op-button-${tone}`}
            onClick={async () => {
              setSubmitting(true)

              setError("")

              try {
                await onConfirm()
              } catch (caught) {
                setError(apiErrorMessage(caught, "처리하지 못했습니다."))

                setSubmitting(false)
              }
            }}
            disabled={submitting}
          >
            {submitting ? "처리 중…" : confirmLabel}
          </button>
        </footer>
      </section>
    </div>
  )
}
