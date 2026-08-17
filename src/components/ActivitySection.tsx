import { GreenButton } from './Button'
import { useNavigate } from 'react-router-dom'

const dashedBorder: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1.5px dashed var(--border-2)',
}

export default function ActivitySection() {
  const navigate = useNavigate()
  return (
    <section style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 56px' }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>내 지역 활동</h2>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>방문 기록과 혜택을 확인하세요.</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Benefit card */}
        <div style={{ ...dashedBorder, borderRadius: 'var(--radius)', padding: '20px' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>내 지역 혜택 · P1</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>김해 문화 한 바퀴</h3>
            <span onClick={() => navigate('/missions')} style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              혜택 보기 ›
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-sub)' }}>미션 2 / 3 완료 · 사용 가능한 쿠폰 2장</p>
        </div>

        {/* Review card */}
        <div style={{ ...dashedBorder, borderRadius: 'var(--radius)', padding: '20px' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>방문 후기</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>후기 작성 가능 1건</h3>
            <span onClick={() => navigate('/reviews/new')} style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              후기 작성 ›
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-sub)' }}>체크인한 체험의 경험을 기록해 보세요.</p>
        </div>

        {/* Next check-in card */}
        <div style={{ ...dashedBorder, borderRadius: 'var(--radius)', padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>내 다음 예약 · 체크인 가능</p>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>김해 가야문화 체험</h3>
            <p style={{ fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.7 }}>오늘 14:00–16:00</p>
            <p style={{ fontSize: 12, color: 'var(--text-sub)' }}>체크인 13:30부터 · 2명</p>
          </div>
          <GreenButton large fullWidth onClick={() => navigate('/reservations/r20260813')}>
            체크인 QR 제시
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </GreenButton>
        </div>

        {/* My reservations card */}
        <div style={{ ...dashedBorder, borderRadius: 'var(--radius)', padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14 }}>내 예약</p>
          {[
            { label: '다가오는 예약', sub: '일정과 예약 상태를 확인합니다.', count: '1건' },
            { label: '지난 예약', sub: '체크인 후 후기를 작성할 수 있습니다.', count: '3건' },
          ].map(item => (
            <div
              key={item.label}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'opacity 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            onClick={() => navigate('/reservations')}
            >
              <div>
                <p style={{ fontSize: 14, fontWeight: 500 }}>{item.label}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.sub}</p>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)', whiteSpace: 'nowrap' }}>{item.count} ›</span>
            </div>
          ))}
          <div onClick={() => navigate('/reservations')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, cursor: 'pointer', color: 'var(--text-sub)', fontSize: 13 }}>
            내 예약 전체 보기
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  )
}
