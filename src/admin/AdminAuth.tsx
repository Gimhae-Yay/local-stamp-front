import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import {
  ApiError,
  clearLogin,
  getRegionAdminAssignment,
  login as loginRequest,
  logout as logoutRequest,
  storedUserId,
} from "./api";
import type { AdminSession } from "./types";

interface AdminAuthValue {
  session: AdminSession | null;
  restoring: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthValue | null>(null);

export function useAdminAuth() {
  const value = useContext(AdminAuthContext);
  if (!value) throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  return value;
}

export function adminReturnPath(location: { pathname: string; search: string; hash: string }) {
  return `${location.pathname}${location.search}${location.hash}`;
}

export function adminLoginDestination(state: unknown) {
  const from = (state as { from?: unknown } | null)?.from;
  if (typeof from !== "string") return "/region-admin";
  if (!/^\/region-admin(?:\/|\?|#|$)/.test(from)) return "/region-admin";
  if (/^\/region-admin\/login(?:\?|#|$)/.test(from)) return "/region-admin";
  return from;
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [restoring, setRestoring] = useState(Boolean(storedUserId()));

  useEffect(() => {
    const userId = storedUserId();
    if (!userId) {
      setRestoring(false);
      return;
    }
    let active = true;
    getRegionAdminAssignment()
      .then((assignment) => {
        if (active) setSession({ userId, assignment });
      })
      .catch(() => {
        if (active) clearLogin();
      })
      .finally(() => {
        if (active) setRestoring(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AdminAuthValue>(
    () => ({
      session,
      restoring,
      login: async (email, password) => {
        const result = await loginRequest(email, password);
        try {
          const assignment = await getRegionAdminAssignment();
          setSession({ userId: result.userId, assignment });
        } catch (error) {
          clearLogin();
          throw error;
        }
      },
      logout: async () => {
        await logoutRequest().catch(() => clearLogin());
        setSession(null);
      },
    }),
    [restoring, session],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function AdminGuard() {
  const { session, restoring } = useAdminAuth();
  const location = useLocation();

  if (restoring)
    return (
      <div className="ra-route-loader">
        <span className="ra-spinner" />
        <p>지역 관리자 권한을 확인하고 있습니다.</p>
      </div>
    );
  if (!session)
    return (
      <Navigate
        to="/region-admin/login"
        replace
        state={{
          from: adminReturnPath(location),
        }}
      />
    );
  return <Outlet />;
}

export function AdminLoginPage() {
  const { session, login } = useAdminAuth();
  const location = useLocation();
  const destination = adminLoginDestination(location.state);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (session) return <Navigate to={destination} replace />;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await login(email, password);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "로그인하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ra-login-page">
      <section className="ra-login-visual">
        <div className="ra-brand">
          <span className="ra-brand-mark">S</span>
          <strong>Local Stamp</strong>
        </div>
        <div className="ra-login-copy">
          <span className="ra-role-chip">지역 관리자 콘솔</span>
          <h1>
            지역의 좋은 경험이
            <br />
            안전하게 이어지도록.
          </h1>
          <p>운영자 신청, 콘텐츠와 회차, QR 예외와 지역 혜택을 담당 지역 기준으로 검토합니다.</p>
        </div>
        <small>Local Stamp · Regional Operations</small>
      </section>
      <section className="ra-login-form-wrap">
        <form className="ra-login-card" onSubmit={submit}>
          <h2>관리자 로그인</h2>
          <p>승인된 지역 관리자 계정으로 로그인해 주세요.</p>
          {error && (
            <div className="ra-alert" role="alert">
              <strong>로그인하지 못했습니다.</strong>
              <span>{error}</span>
            </div>
          )}
          <label className="ra-field">
            이메일
            <input
              className="ra-control"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label className="ra-field">
            비밀번호
            <input
              className="ra-control"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <button className="ra-button ra-button-primary" type="submit" disabled={submitting}>
            {submitting ? "로그인 중…" : "로그인"}
          </button>
          <div className="ra-login-note">
            로그인 후 서버가 현재 역할과 담당 지역을 다시 확인합니다.
          </div>
        </form>
      </section>
    </div>
  );
}
