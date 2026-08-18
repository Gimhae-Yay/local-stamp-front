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
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>내 지역 활동</h2>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>예약과 지역 혜택을 확인하세요.</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ ...dashedBorder, borderRadius: 'var(--radius)', padding: '20px' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>내 지역 혜택</p>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>지역 미션과 쿠폰</h3>
          <p style={{ fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.7 }}>참여한 미션의 진행도와 보유 쿠폰을 확인할 수 있어요.</p>
          <div style={{ display: 'flex', gap: 14, marginTop: 16 }}>
            <button className="text-link-button" type="button" onClick={() => navigate('/missions')}>미션 보기 ›</button>
            <button className="text-link-button" type="button" onClick={() => navigate('/coupons')}>쿠폰 보기 ›</button>
          </div>
        </div>

        <div style={{ ...dashedBorder, borderRadius: 'var(--radius)', padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>내 예약</p>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>예약 일정과 체크인</h3>
            <p style={{ fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.7 }}>예약 상태와 체크인 가능 시간은 예약 상세에서 확인할 수 있어요.</p>
          </div>
          <GreenButton large fullWidth onClick={() => navigate('/reservations')}>
            내 예약 보기
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </GreenButton>
        </div>
      </div>
    </section>
  )
}
