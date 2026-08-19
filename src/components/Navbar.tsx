import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import type { MyRoleAssignment } from '../api/public'

interface NavbarProps {
  loggedIn: boolean
  roleAssignments?: MyRoleAssignment[]
  onLogout: () => Promise<void>
}

function accountSummary(roleAssignments?: MyRoleAssignment[]) {
  if (!roleAssignments) {
    return { title: '내 계정', description: '계정 정보를 불러오는 중입니다.' }
  }

  const assignment = roleAssignments.find(({ role }) => role === 'VISITOR') ?? roleAssignments[0]
  if (!assignment) return { title: '내 계정', description: '부여된 역할이 없습니다.' }

  const roleLabel = ({ VISITOR: '방문자', OPERATOR: '운영자', REGION_ADMIN: '지역 관리자' })[assignment.role]
  return {
    title: `${roleLabel} 계정`,
    description: assignment.regionName ? `${assignment.regionName} 담당` : `${roleLabel} 권한`,
  }
}

export default function Navbar({ loggedIn, roleAssignments, onLogout }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const account = accountSummary(roleAssignments)
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
              <span aria-hidden="true">●</span> {account.title}
            </button>
            {menuOpen && (
              <div className="account-menu">
                <div className="account-menu-user"><b>{account.title}</b><small>{account.description}</small></div>
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
