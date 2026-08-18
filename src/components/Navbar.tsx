import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'

interface NavbarProps {
  loggedIn: boolean
  onLogout: () => Promise<void>
}

export default function Navbar({ loggedIn, onLogout }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const links = [
    ['홈', '/'],
    ['행사·체험', '/events'],
    ['지역 미션', '/missions'],
  ]
  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(247,248,245,0.92)',
      borderBottom: '1px solid var(--border)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    }}>
      <div style={{
        maxWidth: 900,
        margin: '0 auto',
        padding: '0 24px',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <Link to="/" className="brand">
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: 'var(--green)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'Outfit, sans-serif',
            flexShrink: 0,
          }}>S</div>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', fontFamily: 'Outfit, sans-serif' }}>
            Local Stamp
          </span>
        </Link>

        {/* Center nav links — logged out only */}
        <div className="primary-nav">
          {links.map(([label, to]) => (
            <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'active' : ''}>{label}</NavLink>
          ))}
        </div>

        {/* Right actions */}
        {loggedIn ? (
          <div className="account-menu-wrap">
            <button className="account-trigger" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen}>
              <span>김</span> 내 예약 · 내 계정
            </button>
            {menuOpen && (
              <div className="account-menu">
                <div className="account-menu-user"><b>김 방문자 계정</b><small>김해시 지역 회원</small></div>
                {[
                  ['내 예약', '/reservations'], ['내 방문 후기', '/reviews/new'], ['내 스탬프북', '/stampbook'], ['내 지역 미션', '/missions'], ['쿠폰함', '/coupons'],
                ].map(([label, to]) => <Link key={to} to={to} onClick={() => setMenuOpen(false)}>{label}</Link>)}
                <button onClick={async () => { setMenuOpen(false); await onLogout(); navigate('/') }}>로그아웃</button>
              </div>
            )}
          </div>
        ) : (
          <div className="guest-actions">
            <Link className="button-outline" to="/login">로그인</Link>
            <Link className="button-primary button-small" to="/signup">회원가입</Link>
          </div>
        )}
      </div>
    </nav>
  )
}
