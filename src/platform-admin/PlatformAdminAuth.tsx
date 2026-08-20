import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom"
import {
  ApiError,
  apiRequest,
  clearLogin,
  login as loginRequest,
  logout as logoutRequest,
  storedUserId,
} from "../admin/api"
import type { PlatformAdminAccount, PlatformAdminGrade } from "./types"

interface PlatformSession {
  userId: string
  grade: PlatformAdminGrade
}

interface PlatformAuthValue {
  session: PlatformSession | null
  restoring: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const PlatformAuthContext = createContext<PlatformAuthValue | null>(null)

export function usePlatformAuth() {
  const value = useContext(PlatformAuthContext)
  if (!value)
    throw new Error("usePlatformAuth must be used inside PlatformAuthProvider")
  return value
}

async function verifyPlatformAccess(
  userId: string,
): Promise<PlatformAdminGrade> {
  await apiRequest<{ regions: unknown[] }>("/api/v1/platform-admin/regions")
  const result = await apiRequest<{ adminAccounts: PlatformAdminAccount[] }>(
    "/api/v1/platform-admin/admin-accounts",
  )
  const currentAccount = result.adminAccounts.find(
    (account) => account.userId === userId && account.status === "ACTIVE",
  )
  if (!currentAccount)
    throw new ApiError(
      "활성 전체 관리자 계정을 확인할 수 없습니다.",
      403,
      "PLATFORM_ADMIN_REQUIRED",
    )
  return currentAccount.grade
}

export function PlatformAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<PlatformSession | null>(null)
  const [restoring, setRestoring] = useState(Boolean(storedUserId()))

  useEffect(() => {
    const userId = storedUserId()
    if (!userId) {
      setRestoring(false)
      return
    }
    let active = true
    verifyPlatformAccess(userId)
      .then((grade) => {
        if (active) setSession({ userId, grade })
      })
      .catch(() => {
        if (active) clearLogin()
      })
      .finally(() => {
        if (active) setRestoring(false)
      })
    return () => {
      active = false
    }
  }, [])

  const value = useMemo<PlatformAuthValue>(
    () => ({
      session,
      restoring,
      login: async (email, password) => {
        const result = await loginRequest(email, password)
        try {
          const grade = await verifyPlatformAccess(result.userId)
          setSession({ userId: result.userId, grade })
        } catch (error) {
          clearLogin()
          throw error
        }
      },
      logout: async () => {
        await logoutRequest().catch(() => clearLogin())
        setSession(null)
      },
    }),
    [restoring, session],
  )

  return (
    <PlatformAuthContext.Provider value={value}>
      {children}
    </PlatformAuthContext.Provider>
  )
}

export function PlatformGuard() {
  const { session, restoring } = usePlatformAuth()
  const location = useLocation()
  if (restoring)
    return (
      <div className="pa-route-state">
        <span className="pa-spinner" />
        <p>전체 관리자 권한을 확인하고 있습니다.</p>
      </div>
    )
  if (!session)
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  return <Outlet />
}

export function SuperAdminGuard() {
  const { session } = usePlatformAuth()
  if (session?.grade !== "SUPER_ADMIN")
    return <Navigate to="/admin" replace />
  return <Outlet />
}

export function PlatformLoginPage() {
  const { session, login } = usePlatformAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  if (session) return <Navigate to="/admin" replace />

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError("")
    try {
      await login(email, password)
      navigate((location.state as { from?: string } | null)?.from ?? "/admin", {
        replace: true,
      })
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "전체 관리자 로그인을 완료하지 못했습니다.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="pa-login">
      <section className="pa-login-intro">
        <Brand />
        <div>
          <span className="pa-console-pill">전체 관리자 콘솔</span>
          <h1>
            플랫폼 운영을
            <br />
            한곳에서 관리합니다.
          </h1>
          <p>지역, 계정·권한, 결제와 환불 예외를 안전하게 처리합니다.</p>
        </div>
        <small>Local Stamp · Platform Operations</small>
      </section>
      <section className="pa-login-form-wrap">
        <form className="pa-login-card" onSubmit={submit}>
          <h2>전체 관리자 로그인</h2>
          <p>승인된 전체 관리자 계정으로 로그인해 주세요.</p>
          {error && (
            <div className="pa-alert pa-alert-danger" role="alert">
              {error}
            </div>
          )}
          <label className="pa-field">
            이메일
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label className="pa-field">
            비밀번호
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <button className="pa-button pa-button-primary" disabled={submitting}>
            {submitting ? "로그인 중…" : "로그인"}
          </button>
        </form>
      </section>
    </main>
  )
}

export function Brand() {
  return (
    <div className="pa-brand">
      <span className="pa-brand-mark">S</span>
      <strong>Local Stamp</strong>
    </div>
  )
}
