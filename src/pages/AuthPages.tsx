import { FormEvent, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginWithEmail, storeAccessToken } from '../api/public'
import { useAppState } from '../components/AppLayout'
import { Notice } from '../components/PageElements'

function AuthFrame({ mode, children }: { mode: 'login' | 'signup'; children: ReactNode }) {
  return <section className="auth-page"><div className="auth-card"><div className="auth-tabs"><Link className={mode === 'login' ? 'active' : ''} to="/login">로그인</Link><Link className={mode === 'signup' ? 'active' : ''} to="/signup">회원가입</Link></div>{children}</div></section>
}

export function LoginPage() {
  const { login } = useAppState()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const result = await loginWithEmail({ email, password })
      storeAccessToken(result.accessToken)
      login()
      navigate('/', { replace: true })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '로그인하지 못했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return <AuthFrame mode="login"><form onSubmit={onSubmit}><h1>다시 만나서 반가워요.</h1><p>예약과 방문 기록을 이어서 확인하세요.</p><label>이메일<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="example@email.com" autoComplete="email" required /></label><label>비밀번호<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="비밀번호를 입력하세요" autoComplete="current-password" required /></label>{errorMessage && <Notice tone="red">{errorMessage}</Notice>}<button className="button-primary" type="submit" disabled={isSubmitting}>{isSubmitting ? '로그인하는 중입니다.' : '로그인'}</button><p className="auth-footer">처음이신가요? <Link to="/signup">회원가입</Link></p></form></AuthFrame>
}

export function SignupPage() {
  const { login } = useAppState()
  const navigate = useNavigate()
  const [agreed, setAgreed] = useState(false)
  const onSubmit = (event: FormEvent) => { event.preventDefault(); login(); navigate('/') }
  return <AuthFrame mode="signup"><form onSubmit={onSubmit}><h1>Local Stamp 시작하기</h1><p>방문자 계정을 만들고 지역 체험을 예약해 보세요.</p><div className="form-pair"><label>이름<input placeholder="이름" required /></label><label>전화번호<input type="tel" placeholder="01012345678" required /></label></div><label>이메일<input type="email" placeholder="example@email.com" required /></label><div className="form-pair"><label>비밀번호<input type="password" placeholder="8자 이상" minLength={8} required /></label><label>비밀번호 확인<input type="password" placeholder="한 번 더 입력" minLength={8} required /></label></div><label className="terms"><input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} required /> 서비스 이용을 위해 이용약관 및 개인정보 처리에 동의합니다.</label><button className="button-primary" type="submit">회원가입</button><p className="auth-footer">행사 운영자이신가요? <span>운영자 가입 신청 →</span></p></form></AuthFrame>
}
