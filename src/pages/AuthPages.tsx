import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { signup, type SignupResponse } from "../api/auth";
import { useAppState } from "../components/AppLayout";

function AuthFrame({ mode, children }: { mode: "login" | "signup"; children: ReactNode }) {
  return (
    <section className="auth-page">
      <div className="auth-card">
        <div className="auth-tabs">
          <Link className={mode === "login" ? "active" : ""} to="/login">
            로그인
          </Link>
          <Link className={mode === "signup" ? "active" : ""} to="/signup">
            회원가입
          </Link>
        </div>
        {children}
      </div>
    </section>
  );
}

export function LoginPage() {
  const { login } = useAppState();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      const requestedPath = (location.state as { from?: unknown } | null)?.from;
      const returnPath =
        typeof requestedPath === "string" &&
        requestedPath.startsWith("/") &&
        !requestedPath.startsWith("//")
          ? requestedPath
          : "/";
      navigate(returnPath, { replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "로그인하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthFrame mode="login">
      <form onSubmit={onSubmit}>
        <h1>다시 만나서 반가워요.</h1>
        <p>예약과 방문 기록을 이어서 확인하세요.</p>
        <label>
          이메일
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            placeholder="example@email.com"
            autoComplete="email"
            required
          />
        </label>
        <label>
          비밀번호
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            placeholder="비밀번호를 입력하세요"
            autoComplete="current-password"
            required
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="button-primary" type="submit" disabled={submitting}>
          {submitting ? "로그인 중…" : "로그인"}
        </button>
        <p className="auth-footer">
          처음이신가요? <Link to="/signup">회원가입</Link>
        </p>
      </form>
    </AuthFrame>
  );
}

export function SignupPage() {
  const { login, regionId, regions } = useAppState();
  const navigate = useNavigate();
  const [requestedRole, setRequestedRole] = useState<"VISITOR" | "OPERATOR">("VISITOR");
  const [requestedRegionId, setRequestedRegionId] = useState(regionId);
  const [businessInformation, setBusinessInformation] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [operatorSignupResult, setOperatorSignupResult] = useState<Extract<
    SignupResponse,
    { requestedRole: "OPERATOR" }
  > | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== passwordConfirm) {
      setError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    if (requestedRole === "OPERATOR" && (!requestedRegionId || !businessInformation.trim())) {
      setError("신청 지역과 사업자 정보를 입력해 주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const commonRequest = { email, password, name, phone };
      const result = await signup(
        requestedRole === "VISITOR"
          ? { ...commonRequest, requestedRole: "VISITOR" }
          : {
              ...commonRequest,
              requestedRole: "OPERATOR",
              requestedRegionId,
              businessInformation: businessInformation.trim(),
            },
      );
      if (result.requestedRole === "OPERATOR") {
        setOperatorSignupResult(result);
        return;
      }
      await login(email, password);
      navigate("/");
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "회원가입을 완료하지 못했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (operatorSignupResult) {
    const requestedRegion = regions.find((region) => region.regionId === requestedRegionId);
    return (
      <AuthFrame mode="signup">
        <section className="operator-signup-result">
          <span className="operator-signup-status">심사 대기</span>
          <h1>운영자 신청이 접수되었습니다.</h1>
          <p>
            {requestedRegion?.name ?? `지역 #${requestedRegionId}`} 담당 관리자가 사업자 정보와 신청
            내용을 검토합니다.
          </p>
          <p>승인 전에는 운영자 콘솔을 사용할 수 없습니다.</p>
          <Link className="button-primary" to="/login">
            로그인 화면으로 이동
          </Link>
        </section>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame mode="signup">
      <form onSubmit={onSubmit}>
        <h1>Local Stamp 시작하기</h1>
        <p>
          {requestedRole === "VISITOR"
            ? "방문자 계정을 만들고 지역 체험을 예약해 보세요."
            : "운영할 지역과 사업자 정보를 제출하고 운영자 승인을 요청하세요."}
        </p>
        <fieldset className="signup-role-picker">
          <legend>가입 유형</legend>
          <div className="signup-role-options">
            <label className={requestedRole === "VISITOR" ? "active" : ""}>
              <input
                type="radio"
                name="requestedRole"
                value="VISITOR"
                checked={requestedRole === "VISITOR"}
                onChange={() => setRequestedRole("VISITOR")}
              />
              <span>
                <strong>방문자 가입</strong>
                <small>지역 체험 예약과 스탬프 적립</small>
              </span>
            </label>
            <label className={requestedRole === "OPERATOR" ? "active" : ""}>
              <input
                type="radio"
                name="requestedRole"
                value="OPERATOR"
                checked={requestedRole === "OPERATOR"}
                onChange={() => setRequestedRole("OPERATOR")}
              />
              <span>
                <strong>운영자 가입 신청</strong>
                <small>지역 콘텐츠 운영 권한 심사 신청</small>
              </span>
            </label>
          </div>
        </fieldset>
        <div className="form-pair">
          <label>
            이름
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="이름"
              maxLength={50}
              required
            />
          </label>
          <label>
            전화번호
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              type="tel"
              placeholder="01012345678"
              pattern="[0-9-]{10,13}"
              required
            />
          </label>
        </div>
        <label>
          이메일
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            placeholder="example@email.com"
            autoComplete="email"
            maxLength={254}
            required
          />
        </label>
        <div className="form-pair">
          <label>
            비밀번호
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              placeholder="영문·숫자·특수문자 포함 8자 이상"
              minLength={8}
              maxLength={64}
              autoComplete="new-password"
              required
            />
          </label>
          <label>
            비밀번호 확인
            <input
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
              type="password"
              placeholder="한 번 더 입력"
              minLength={8}
              maxLength={64}
              autoComplete="new-password"
              required
            />
          </label>
        </div>
        {requestedRole === "OPERATOR" && (
          <div className="operator-signup-fields">
            <label>
              신청 지역
              <select
                value={requestedRegionId}
                onChange={(event) => setRequestedRegionId(event.target.value)}
                required
              >
                <option value="" disabled>
                  지역을 선택하세요
                </option>
                {regions.map((region) => (
                  <option key={region.regionId} value={region.regionId}>
                    {region.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              사업자 정보
              <textarea
                aria-label="사업자 정보"
                value={businessInformation}
                onChange={(event) => setBusinessInformation(event.target.value)}
                placeholder="상호명, 사업자등록번호 등 심사에 필요한 정보를 입력하세요."
                maxLength={2000}
                required
              />
              <span className="character-count">{businessInformation.length} / 2,000자</span>
            </label>
          </div>
        )}
        {error && <p className="form-error">{error}</p>}
        <button className="button-primary" type="submit" disabled={submitting}>
          {submitting
            ? "가입 처리 중…"
            : requestedRole === "OPERATOR"
              ? "운영자 가입 신청"
              : "회원가입"}
        </button>
      </form>
    </AuthFrame>
  );
}
