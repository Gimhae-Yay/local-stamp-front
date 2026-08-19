import { useEffect, useState, type ReactNode } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { ApiError, apiRequest } from "../admin/api"

export function usePlatformData<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(Boolean(path))
  const [error, setError] = useState<ApiError | null>(null)
  const [revision, setRevision] = useState(0)
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
  return {
    data,
    loading,
    error,
    reload: () => setRevision((value) => value + 1),
  }
}

export function PageHeader({
  title,
  description,
  action,
  status,
}: {
  title: string
  description: string
  action?: ReactNode
  status?: ReactNode
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const incoming = (location.state as { success?: string } | null)?.success
  const [success, setSuccess] = useState(incoming)
  useEffect(() => {
    if (!incoming) return
    setSuccess(incoming)
    navigate(`${location.pathname}${location.search}`, {
      replace: true,
      state: null,
    })
  }, [incoming, location.pathname, location.search, navigate])
  return (
    <>
      <div className="pa-breadcrumb">
        전체 관리자 &nbsp;›&nbsp; <strong>{title}</strong>
      </div>
      <div className="pa-page-head">
        <div>
          <div className="pa-title-line">
            <h1>{title}</h1>
            {status}
          </div>
          <p>{description}</p>
        </div>
        {action}
      </div>
      {success && (
        <div className="pa-result pa-result-success" role="status">
          <strong>✓ &nbsp;처리 완료</strong>
          <span>{success}</span>
          <button onClick={() => setSuccess(undefined)}>닫기</button>
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
  const tone: Record<string, string> = {
    OPEN: "red",
    RESOLVED_NO_ISSUE: "green",
    REFUND_REQUESTED: "orange",
    REQUESTED: "blue",
    PROCESSING: "blue",
    SUCCEEDED: "green",
    FAILED: "red",
    DISCREPANT: "yellow",
    ACTIVE: "green",
    INACTIVE: "gray",
    REGION_ADMIN: "green",
    OPERATOR: "gray",
    VISITOR: "gray",
  }
  const labels: Record<string, string> = {
    OPEN: "미처리",
    RESOLVED_NO_ISSUE: "문제없음 종결",
    REFUND_REQUESTED: "환불 요청",
    REQUESTED: "요청 접수",
    PROCESSING: "처리 중",
    SUCCEEDED: "성공",
    FAILED: "실패",
    DISCREPANT: "결과 불일치",
    REGION_ADMIN: "지역 관리자",
    OPERATOR: "운영자",
    VISITOR: "방문자",
    ACTIVE: "활성",
    INACTIVE: "비활성",
  }
  return (
    <span className={`pa-badge pa-badge-${tone[value] ?? "gray"}`}>
      {label ?? labels[value] ?? value}
    </span>
  )
}

export function AsyncState<T>({
  state,
  empty,
  children,
}: {
  state: ReturnType<typeof usePlatformData<T>>
  empty: (value: T) => boolean
  children: (value: T) => ReactNode
}) {
  if (state.loading && !state.data)
    return (
      <div className="pa-state">
        <span className="pa-spinner" />
        <h2>정보를 불러오는 중입니다</h2>
      </div>
    )
  if (state.error && !state.data)
    return (
      <div className="pa-state pa-state-error">
        <strong>{state.error.code}</strong>
        <h2>정보를 불러오지 못했습니다</h2>
        <p>{state.error.message}</p>
        <button className="pa-button" onClick={state.reload}>
          다시 시도
        </button>
      </div>
    )
  if (!state.data || empty(state.data))
    return (
      <div className="pa-state">
        <span className="pa-empty-icon">⌕</span>
        <h2>조건에 맞는 항목이 없습니다</h2>
        <p>다른 필터를 선택하거나 최신 상태를 확인해 주세요.</p>
      </div>
    )
  return <>{children(state.data)}</>
}

export function Pagination({
  page,
  total,
  onChange,
}: {
  page: number
  total: number
  onChange: (page: number) => void
}) {
  if (total <= 1) return null
  return (
    <nav className="pa-pagination" aria-label="페이지 이동">
      <button disabled={page === 1} onClick={() => onChange(page - 1)}>
        ‹
      </button>
      {Array.from({ length: total }, (_, index) => index + 1).map((number) => (
        <button
          className={page === number ? "active" : ""}
          key={number}
          onClick={() => onChange(number)}
        >
          {number}
        </button>
      ))}
      <button disabled={page === total} onClick={() => onChange(page + 1)}>
        ›
      </button>
    </nav>
  )
}

export function Field({
  label,
  children,
  help,
}: {
  label: string
  children: ReactNode
  help?: string
}) {
  return (
    <label className="pa-field">
      <span>{label}</span>
      {children}
      {help && <small>{help}</small>}
    </label>
  )
}

export function Modal({
  title,
  description,
  children,
  onClose,
}: {
  title: string
  description?: string
  children: ReactNode
  onClose: () => void
}) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", close)
    return () => document.removeEventListener("keydown", close)
  }, [onClose])
  return (
    <div
      className="pa-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section className="pa-drawer" role="dialog" aria-modal="true">
        <header>
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button
            className="pa-icon-button"
            onClick={onClose}
            aria-label="닫기"
          >
            ×
          </button>
        </header>
        {children}
      </section>
    </div>
  )
}

export function ApiErrorMessage({ error }: { error: string }) {
  return error ? (
    <div className="pa-alert pa-alert-danger" role="alert">
      {error}
    </div>
  ) : null
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "미기록"
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
