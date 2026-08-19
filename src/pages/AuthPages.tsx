import { useState, type FormEvent, type ReactNode } from "react"
import { Link, useNavigate } from "react-router-dom"
import { signup } from "../api/auth"
import { useAppState } from "../components/AppLayout"

function AuthFrame({
  mode,
  children,
}: {
  mode: "login" | "signup"
  children: ReactNode
}) {
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
  )
}

export function LoginPage() {
  const { login } = useAppState()
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await login(email, password)
      navigate("/")
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "로그인하지 못했습니다.",
      )
    } finally {
      setSubmitting(false)
    }
  }

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
  )
}

export function SignupPage() {
  const { login } = useAppState()
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (password !== passwordConfirm) {
      setError("비밀번호 확인이 일치하지 않습니다.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await signup({ email, password, name, phone })
      await login(email, password)
      navigate("/")
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "회원가입을 완료하지 못했습니다.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthFrame mode="signup">
      <form onSubmit={onSubmit}>
        <h1>Local Stamp 시작하기</h1>
        <p>방문자 계정을 만들고 지역 체험을 예약해 보세요.</p>
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
        <label className="terms">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
            required
          />
          서비스 이용을 위해 이용약관 및 개인정보 처리에 동의합니다.
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="button-primary" type="submit" disabled={submitting}>
          {submitting ? "가입 처리 중…" : "회원가입"}
        </button>
        <p className="auth-footer">
          행사 운영자이신가요? <span>운영자 가입 신청 →</span>
        </p>
      </form>
    </AuthFrame>
  )
}
