import { GreenButton, OutlineButton } from './Button'

interface NavbarProps {
  loggedIn: boolean
  onToggleLogin: () => void
}

export default function Navbar({ loggedIn, onToggleLogin }: NavbarProps) {
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
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
        </div>

        {/* Center nav links — logged out only */}
        {!loggedIn && (
          <div style={{ display: 'flex', gap: 32 }}>
            {['홈', '행사·체험', '지역 미션'].map(item => (
              <span
                key={item}
                style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-sub)', cursor: 'pointer', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-sub)')}
              >
                {item}
              </span>
            ))}
          </div>
        )}

        {/* Right actions */}
        {loggedIn ? (
          <button
            onClick={onToggleLogin}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 13, fontWeight: 500, color: 'var(--text)',
              background: 'var(--surface)', border: '1px solid var(--border-2)',
              borderRadius: 999, padding: '7px 16px',
              cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l2.5 2.5" />
            </svg>
            내 예약 · 내 계정
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <OutlineButton onClick={onToggleLogin}>로그인</OutlineButton>
            <GreenButton onClick={onToggleLogin}>회원가입</GreenButton>
          </div>
        )}
      </div>
    </nav>
  )
}
