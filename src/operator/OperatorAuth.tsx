import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  getAuthenticatedUser,
  login as loginRequest,
  logout as logoutRequest,
  restoreAuthentication,
} from "../api/auth";
import { ApiError, clearAuthentication, storedUserId } from "../api/client";
import type { OperatorAssignment, OperatorSession } from "./types";

interface OperatorAuthValue {
  session: OperatorSession | null;
  restoring: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const OperatorAuthContext = createContext<OperatorAuthValue | null>(null);

function operatorSession(
  userId: string | null,
  assignments: Array<{
    role: string;
    regionId: string | null;
    regionName: string | null;
  }>,
): OperatorSession {
  const assignment = assignments.find((item) => item.role === "OPERATOR" && item.regionId);
  if (!userId || !assignment?.regionId) {
    throw new ApiError("활성 운영자 권한을 확인할 수 없습니다.", 403, "OPERATOR_REQUIRED");
  }
  return {
    userId,
    assignment: assignment as OperatorAssignment,
  };
}

export function useOperatorAuth() {
  const value = useContext(OperatorAuthContext);
  if (!value) throw new Error("useOperatorAuth must be used in OperatorAuthProvider");
  return value;
}

export function OperatorAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<OperatorSession | null>(null);
  const [restoring, setRestoring] = useState(Boolean(storedUserId()));

  useEffect(() => {
    if (!storedUserId()) {
      setRestoring(false);
      return;
    }
    let active = true;
    restoreAuthentication()
      .then((user) => {
        if (active && user) {
          setSession(operatorSession(user.userId, user.roleAssignments));
        }
      })
      .catch(() => clearAuthentication())
      .finally(() => {
        if (active) setRestoring(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<OperatorAuthValue>(
    () => ({
      session,
      restoring,
      login: async (email, password) => {
        await loginRequest(email, password);
        try {
          const user = await getAuthenticatedUser();
          setSession(operatorSession(user.userId, user.roleAssignments));
        } catch (error) {
          clearAuthentication();
          throw error;
        }
      },
      logout: async () => {
        await logoutRequest().catch(() => clearAuthentication());
        setSession(null);
      },
    }),
    [restoring, session],
  );

  return <OperatorAuthContext.Provider value={value}>{children}</OperatorAuthContext.Provider>;
}

export function OperatorGuard() {
  const { session, restoring } = useOperatorAuth();
  const location = useLocation();
  if (restoring) {
    return (
      <div className="op-route-state">
        <span className="op-spinner" />
        <p>운영자 권한을 확인하고 있습니다.</p>
      </div>
    );
  }
  if (!session) {
    return (
      <Navigate
        to="/operator/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }
  return <Outlet />;
}

export function OperatorLoginPage() {
  const { session, login } = useOperatorAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (session) return <Navigate to="/operator" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await login(email, password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from?.startsWith("/operator") ? from : "/operator", {
        replace: true,
      });
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "운영자 로그인을 완료하지 못했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="op-login-page">
      <section className="op-login-brand">
        <div className="op-brand">
          <span className="op-brand-mark">S</span>
          <strong>Local Stamp</strong>
          <span className="op-role-chip">운영자 콘솔</span>
        </div>
        <div>
          <span className="op-eyebrow">현장과 콘텐츠를 한곳에서</span>
          <h1>운영 업무에 집중할 수 있는 콘솔</h1>
          <p>본인 소유 콘텐츠와 담당 지역 범위에서만 업무를 처리합니다.</p>
        </div>
      </section>
      <section className="op-login-card">
        <div>
          <span className="op-eyebrow">OPERATOR ACCESS</span>
          <h2>운영자 로그인</h2>
          <p>승인된 운영자 계정으로 로그인해 주세요.</p>
        </div>
        <form onSubmit={submit}>
          <label className="op-field">
            이메일
            <input
              className="op-control"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label className="op-field">
            비밀번호
            <input
              className="op-control"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && (
            <div className="op-alert" role="alert">
              {error}
            </div>
          )}
          <button className="op-button op-button-admin" disabled={submitting}>
            {submitting ? "권한 확인 중…" : "운영자 콘솔 로그인"}
          </button>
        </form>
      </section>
    </main>
  );
}
