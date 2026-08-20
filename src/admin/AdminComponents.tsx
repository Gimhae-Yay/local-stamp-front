import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { ApiError, apiRequest } from "./api"

export function useApiData<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(Boolean(path))
  const [error, setError] = useState<ApiError | null>(null)
  const [revision, setRevision] = useState(0)

  const reload = useCallback(() => setRevision((value) => value + 1), [])

  useEffect(() => {
    if (!path) return
    let active = true
    setLoading(true)
    setError(null)
    apiRequest<T>(path)
      .then((value) => {
        if (active) setData(value)
      })
      .catch((caught) => {
        if (active)
          setError(
            caught instanceof ApiError
              ? caught
              : new ApiError(
                  "데이터를 불러오지 못했습니다.",
                  0,
                  "NETWORK_ERROR",
                ),
          )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [path, revision])

  return { data, loading, error, reload }
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
  const location = useLocation()
  const navigate = useNavigate()
  const routeState = location.state as {
    completed?: boolean
    successMessage?: string
  } | null
  const incomingCompletion = routeState?.completed
    ? (routeState.successMessage ?? "요청 처리가 완료되었습니다.")
    : null
  const [completion, setCompletion] = useState(incomingCompletion)

  useEffect(() => {
    if (!incomingCompletion) return
    setCompletion(incomingCompletion)
    navigate(`${location.pathname}${location.search}${location.hash}`, {
      replace: true,
      state: null,
    })
  }, [
    incomingCompletion,
    location.hash,
    location.pathname,
    location.search,
    navigate,
  ])

  return (
    <>
      <div className="ra-breadcrumb">지역 관리자 &nbsp;›&nbsp; {title}</div>
      <div className="ra-page-header">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {actions && <div className="ra-button-row">{actions}</div>}
      </div>
      {completion && (
        <div className="ra-info-banner" role="status" aria-live="polite">
          <div>
            <strong>처리가 완료되었습니다.</strong>
            <span>{completion}</span>
          </div>
          <StatusBadge value="SUCCESS" />
        </div>
      )}
    </>
  )
}

export function StatusBadge({
  value,
  label,
}: {
  value: string
  label?: string
}) {
  const normalized = value.toLowerCase().replace(/_/g, "-")
  const labels: Record<string, string> = {
    PENDING: "승인 대기",
    PENDING_REVIEW: "심사 대기",
    APPROVED: "승인됨",
    PUBLISHED: "공개",
    REJECTED: "반려",
    SUSPENDED: "운영 중단",
    WITHDRAWN: "전체 철회",
    ENDED: "종료",
    DELETED: "삭제",
    DRAFT: "초안",
    SCHEDULED: "예정",
    SUCCESS: "성공",
    FAILURE: "실패",
    CHECKED_IN: "체크인 완료",
    CONFIRMED: "예약 확정",
    CANCELLED: "취소",
    EXPIRED: "만료",
    COMPLETED: "완료",
    EVENT_EXPERIENCE: "행사·체험",
    PUBLISHED_REVISION: "공개 콘텐츠 수정",
    PRE_PUBLIC_REVISION: "공개 전 수정",
  }
  return (
    <span className={`ra-badge ra-badge-${normalized}`}>
      {label ?? labels[value] ?? value}
    </span>
  )
}

export function LoadingState({ detail = false }: { detail?: boolean }) {
  return (
    <div className="ra-state">
      <div className="ra-state-inner">
        <span className="ra-spinner" />
        <h3>{detail ? "상세 정보를" : "목록을"} 불러오는 중입니다</h3>
        <p>담당 지역의 최신 데이터를 확인하고 있습니다.</p>
      </div>
    </div>
  )
}

export function EmptyState({
  title = "현재 처리할 업무가 없습니다.",
  description,
  filtered = false,
}: {
  title?: string
  description?: string
  filtered?: boolean
}) {
  return (
    <div className="ra-state">
      <div className="ra-state-inner">
        <span className="ra-empty-icon">{filtered ? "⌕" : "✓"}</span>
        <h3>{title}</h3>
        <p>
          {description ??
            (filtered
              ? "선택한 필터 조건을 확인해 주세요."
              : "새로운 업무가 생기면 이 화면에 표시됩니다.")}
        </p>
      </div>
    </div>
  )
}

export function ErrorState({
  error,
  onRetry,
}: {
  error: ApiError
  onRetry: () => void
}) {
  return (
    <div className="ra-alert" role="alert">
      <strong>정보를 불러오지 못했습니다.</strong>
      <span>
        <code>{error.code}</code> · {error.message}
      </span>
      <button className="ra-button ra-button-small" onClick={onRetry}>
        다시 시도
      </button>
    </div>
  )
}

export function AsyncContent<T>({
  state,
  children,
  empty,
  emptyTitle,
  emptyDescription,
  emptyFiltered = false,
}: {
  state: ReturnType<typeof useApiData<T>>
  children: (data: T) => ReactNode
  empty?: (data: T) => boolean
  emptyTitle?: string
  emptyDescription?: string
  emptyFiltered?: boolean
}) {
  if (state.loading && !state.data) return <LoadingState />
  if (state.error && !state.data)
    return <ErrorState error={state.error} onRetry={state.reload} />
  if (!state.data || empty?.(state.data))
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        filtered={emptyFiltered}
      />
    )
  return (
    <>
      {state.error && (
        <div className="ra-inline-warning">
          새로고침에 실패해 이전 데이터를 표시합니다.
        </div>
      )}
      {children(state.data)}
    </>
  )
}

export function KeyValueGrid({
  items,
}: {
  items: Array<[string, ReactNode, boolean?]>
}) {
  return (
    <dl className="ra-kv-grid">
      {items.map(([label, value, full]) => (
        <div className={`ra-kv${full ? " ra-kv-full" : ""}`} key={label}>
          <dt>{label}</dt>
          <dd>{value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Panel({
  title,
  children,
  action,
}: {
  title: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <section className="ra-panel">
      <header>
        <h2>{title}</h2>
        {action}
      </header>
      <div className="ra-panel-body">{children}</div>
    </section>
  )
}

export interface ActionConfig {
  title: string
  description: string
  confirmLabel: string
  endpoint: string
  method?: "POST" | "DELETE"
  tone?: "admin" | "danger" | "primary"
  reason?: {
    label: string
    field: string
    required?: boolean
    maxLength?: number
    placeholder?: string
    options?: Array<{ value: string; label: string }>
  }
  body?: Record<string, unknown>
  target?: string
  result?: string
  warning?: string
  errorMessages?: Record<string, string>
}

export function ActionModal({
  config,
  onClose,
  onSuccess,
}: {
  config: ActionConfig
  onClose: () => void
  onSuccess: () => void
}) {
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const dialogRef = useRef<HTMLElement>(null)
  const onCloseRef = useRef(onClose)
  const submittingRef = useRef(submitting)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    submittingRef.current = submitting
  }, [submitting])

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const dialog = dialogRef.current
    const focusableSelector =
      'button:not([disabled]), textarea:not([disabled]), select:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'

    const focusDialog = () => {
      if (!dialog?.contains(document.activeElement)) dialog?.focus()
    }
    queueMicrotask(focusDialog)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submittingRef.current) {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== "Tab" || !dialog) return

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(focusableSelector),
      )
      if (!focusable.length) {
        event.preventDefault()
        dialog.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === dialog)
      ) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      previouslyFocused?.focus()
    }
  }, [])

  const submit = async () => {
    if (submittingRef.current) return
    if (config.reason?.required && !reason.trim()) {
      setError(`${config.reason.label}을 입력해 주세요.`)
      return
    }
    submittingRef.current = true
    setSubmitting(true)
    setError("")
    const body = {
      ...config.body,
      ...(config.reason ? { [config.reason.field]: reason.trim() } : {}),
    }
    try {
      await apiRequest(config.endpoint, {
        method: config.method ?? "POST",
        body: Object.keys(body).length ? JSON.stringify(body) : undefined,
      })
      onSuccess()
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? (config.errorMessages?.[caught.code] ?? caught.message)
          : "처리하지 못했습니다.",
      )
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <div
      className="ra-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose()
      }}
    >
      <section
        ref={dialogRef}
        className="ra-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ra-modal-title"
        aria-describedby="ra-modal-description"
        tabIndex={-1}
      >
        <header>
          <h2 id="ra-modal-title">{config.title}</h2>
          <p id="ra-modal-description">{config.description}</p>
        </header>
        <div className="ra-modal-body">
          {(config.target || config.result) && (
            <dl className="ra-modal-summary">
              {config.target && (
                <div>
                  <dt>대상</dt>
                  <dd>{config.target}</dd>
                </div>
              )}
              {config.result && (
                <div>
                  <dt>처리 결과</dt>
                  <dd>{config.result}</dd>
                </div>
              )}
            </dl>
          )}
          {config.warning && (
            <div className="ra-modal-warning">{config.warning}</div>
          )}
          {config.reason && (
            <label className="ra-field">
              {config.reason.label}
              {config.reason.options ? (
                <select
                  className="ra-control"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  autoFocus
                >
                  <option value="">선택해 주세요</option>
                  {config.reason.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <textarea
                    className="ra-control"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    maxLength={config.reason.maxLength ?? 2000}
                    placeholder={config.reason.placeholder}
                    autoFocus
                  />
                  <small>
                    {reason.length} / {config.reason.maxLength ?? 2000}자
                  </small>
                </>
              )}
            </label>
          )}
          {error && (
            <div className="ra-alert ra-alert-compact" role="alert">
              {error}
            </div>
          )}
        </div>
        <footer>
          <button
            className="ra-button"
            type="button"
            onClick={onClose}
            disabled={submitting}
          >
            취소
          </button>
          <button
            className={`ra-button ra-button-${config.tone ?? "admin"}`}
            type="button"
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? "처리 중…" : config.confirmLabel}
          </button>
        </footer>
      </section>
    </div>
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

export function formatMoney(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(value)
}
