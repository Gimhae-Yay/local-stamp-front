import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Breadcrumbs, InfoRow, Notice, PageHeader, StatusPill } from '../components/PageElements'
import { getEvent } from '../data/events'

const bookingId = 'r20260813'

interface BookingFlowState {
  quantity?: number
}

function ReservationCrumbs({ eventTitle, current }: { eventTitle?: string; current: string }) {
  return <Breadcrumbs items={[{ label: '홈', to: '/' }, { label: '내 예약', to: '/reservations' }, ...(eventTitle ? [{ label: eventTitle }] : []), { label: current }]} />
}

export function BookingPage() {
  const event = getEvent(useParams().eventId)
  const navigate = useNavigate()
  const [selected, setSelected] = useState('17-10')
  const [quantity, setQuantity] = useState(1)
  const sessions: Array<[string, string, string]> = [
    ['17-10', '8월 17일 (일)', '10:00–12:00'], ['17-14', '8월 17일 (일)', '14:00–16:00'],
    ['23-10', '8월 23일 (토)', '10:00–12:00'], ['23-14', '8월 23일 (토)', '14:00–16:00'],
    ['30-10', '8월 30일 (토)', '10:00–12:00'], ['30-14', '8월 30일 (토)', '14:00–16:00'],
  ]
  const adjustQuantity = (amount: number) => setQuantity((current) => Math.max(1, current + amount))
  return (
    <section className="page-container booking-page">
      <PageHeader title="회차 선택 및 예약" description="참여할 회차와 인원을 선택해 주세요."><Breadcrumbs items={[{ label: '홈', to: '/' }, { label: event.title, to: `/events/${event.id}` }, { label: '예약' }]} /></PageHeader>
      <section className="booking-section"><div className="section-title"><h2>예약할 회차 선택</h2><span>남은 회차 {sessions.length}개</span></div>
        <div className="session-list">{sessions.map(([id, date, time]) => <button key={id} className={`session-row${selected === id ? ' selected' : ''}`} onClick={() => setSelected(id)}>
          <span className="date-box">{String(date).slice(3, 5)}</span><span><b>{time}</b><small>{event.address} · 2시간</small></span>
        </button>)}</div>
      </section>
      <section className="booking-section"><div className="section-title"><h2>예약 인원</h2></div>
        <div className="counter-row"><div><b>예약 인원</b><small>참여할 인원 수를 선택해 주세요.</small></div><div className="counter"><button onClick={() => adjustQuantity(-1)} aria-label="예약 인원 감소">−</button><strong>{quantity}</strong><button onClick={() => adjustQuantity(1)} aria-label="예약 인원 증가">＋</button></div></div>
        <div className="total-people"><span>총 예약 인원</span><b>{quantity}명</b></div>
      </section>
      <button className="button-primary booking-submit" onClick={() => navigate(`/events/${event.id}/reserve/confirm`, { state: { quantity } })}>예약하기</button>
    </section>
  )
}

export function BookingConfirmPage() {
  const event = getEvent(useParams().eventId)
  const navigate = useNavigate()
  const { state } = useLocation()
  const { quantity = 1 } = (state as BookingFlowState | null) ?? {}
  return <section className="page-container narrow-page">
    <ReservationCrumbs eventTitle={event.title} current="예약 확인" />
    <PageHeader title="예약을 확정하시겠어요?" />
    <Notice>선택한 회차와 자리를 확보했어요. <span>10분이 지나면 확보한 자리는 자동으로 해제됩니다.</span></Notice>
    <div className="confirmation-grid"><section><h2>예약 내용</h2><h3>{event.title}</h3><InfoRow label="선택 회차">8월 17일(일) 10:00–12:00</InfoRow><InfoRow label="위치">{event.location}</InfoRow><InfoRow label="예약 인원">{quantity}명</InfoRow></section><section><h2>예약 확인</h2><InfoRow label="예약 금액">0원</InfoRow><button className="button-primary" onClick={() => navigate(`/events/${event.id}/reserve/complete`, { state: { quantity } })}>예약 확정하기</button><p className="summary-caption">현장 혹은 내 예약에서 예약 QR을 확인할 수 있습니다.</p></section></div>
  </section>
}

export function BookingCompletePage() {
  const event = getEvent(useParams().eventId)
  const { state } = useLocation()
  const { quantity = 1 } = (state as BookingFlowState | null) ?? {}
  return <section className="page-container narrow-page">
    <ReservationCrumbs eventTitle={event.title} current="예약 완료" />
    <div className="complete-title"><span>✓</span><div><h1>예약이 완료되었습니다!</h1><p>예약 내용을 확인해 주세요.</p></div></div>
    <div className="confirmation-grid"><section><h2>예약 내용</h2><h3>{event.title}</h3><InfoRow label="선택 회차">8월 17일(일) 10:00–12:00</InfoRow><InfoRow label="위치">{event.location}</InfoRow><InfoRow label="예약 인원">{quantity}명</InfoRow></section><section><h2>예약 번호</h2><div className="booking-number">R20260813A7K3M9Q2W5XZ</div><InfoRow label="예약 금액">0원</InfoRow><Link className="button-primary" to={`/reservations/${bookingId}`}>내 예약 확인하기</Link><p className="summary-caption">체크인 가능 시간이 되면 내 예약에서 QR을 확인할 수 있습니다.</p></section></div>
  </section>
}

export function ReservationsPage() {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')
  const upcomingReservations: Reservation[] = [
    { id: bookingId, date: '오늘 14:00–16:00', dateLabel: '2026. 08. 13 (목)', title: '김해 가야문화 체험', location: '김해문화회관 1층 · 김해시 가야의길 190', status: '체크인 가능', checkin: true },
    { id: 'r20260824', date: '8월 23일(일) 13:00', dateLabel: '2026. 08. 23 (일)', title: '분청도자기 원데이 클래스', location: '김해시 진례면 · 김해문화센터', status: '예약 확정', checkin: false },
  ]
  const pastReservations: Reservation[] = [
    { id: 'r20260730', date: '7월 30일(목) 14:00', dateLabel: '2026. 07. 30 (목)', title: '김해 가야문화 체험', location: '김해문화회관 1층 · 김해시 가야의길 190', status: '체크인 완료', checkin: false, reviewable: true },
    { id: 'r20260718', date: '7월 18일(토) 10:00', dateLabel: '2026. 07. 18 (토)', title: '대성동 고분 박물관 해설', location: '대성동고분박물관 · 김해시 가야안길 126', status: '체크인 완료', checkin: false, reviewable: true },
    { id: 'r20260629', date: '6월 29일(일) 11:00', dateLabel: '2026. 06. 29 (일)', title: '낙동강 생태 탐방', location: '김해시 생태원 일대', status: '체크인 완료', checkin: false, reviewable: false },
  ]
  const reservations = activeTab === 'upcoming' ? upcomingReservations : pastReservations
  return <section className="page-container reservations-page"><PageHeader title="내 예약" description="예약한 행사·체험의 일정과 체크인 정보를 확인하세요."><Breadcrumbs items={[{ label: '홈', to: '/' }, { label: '내 예약' }]} /></PageHeader>
    <div className="tab-row"><button className={activeTab === 'upcoming' ? 'active' : ''} onClick={() => setActiveTab('upcoming')}>다가오는 예약 <b>{upcomingReservations.length}</b></button><button className={activeTab === 'past' ? 'active' : ''} onClick={() => setActiveTab('past')}>지난 예약 <b>{pastReservations.length}</b></button></div>
    <div className="reservation-list">{reservations.map((reservation) => <ReservationCard key={reservation.id} reservation={reservation} />)}</div>
  </section>
}

interface Reservation {
  id: string
  date: string
  dateLabel: string
  title: string
  location: string
  status: string
  checkin: boolean
  reviewable?: boolean
}

function ReservationCard({ reservation }: { reservation: Reservation }) {
  return <article className="reservation-card"><div className="reservation-date"><b>{reservation.date}</b><span>{reservation.dateLabel}</span></div><div className="reservation-info"><StatusPill tone={reservation.status === '체크인 완료' ? 'gray' : 'green'}>{reservation.status}</StatusPill><h2>{reservation.title}</h2><p>{reservation.location}</p><small>예약 번호 {reservation.id.toUpperCase()}A7K3M9Q2W5XZ</small></div><div className="reservation-actions">{reservation.checkin && <Link className="button-primary button-small" to={`/reservations/${reservation.id}`}>체크인 QR 보기</Link>}{reservation.reviewable && <Link className="button-primary button-small" to="/reviews/new">후기 작성</Link>}<Link className="button-outline" to={`/reservations/${reservation.id}`}>예약 상세</Link></div></article>
}

export function ReservationDetailPage() {
  const [qrOpen, setQrOpen] = useState(false)
  return <section className="page-container narrow-page"><ReservationCrumbs eventTitle="김해 가야문화 체험" current="예약 상세" />
    <div className="detail-heading"><h1>김해 가야문화 체험</h1><StatusPill>예약 확정</StatusPill></div>
    <div className="confirmation-grid"><section><h2>예약 내용</h2><h3>김해 가야문화 체험</h3><InfoRow label="행사 일정">2026년 8월 13일(목) 14:00–16:00</InfoRow><InfoRow label="회차 상태">운영 예정</InfoRow><InfoRow label="체크인 시간">2026년 8월 13일(목) 13:30–16:00</InfoRow><InfoRow label="체크인">아직 안 함</InfoRow><InfoRow label="예약 번호">R20260730A7K3M9Q2W5XZ</InfoRow><Link className="text-danger-link" to={`/reservations/${bookingId}/cancel`}>예약 취소</Link></section><section><h2>체크인 QR</h2><div className="qr-panel">{qrOpen ? <div className="fake-qr" aria-label="체크인 QR 코드">▦</div> : <><StatusPill>현재 체크인 가능</StatusPill><p>현장 담당자에게 제시할 QR을 불러오세요.</p><button className="button-primary" onClick={() => setQrOpen(true)}>체크인 QR 불러오기</button></>}</div></section></div>
  </section>
}

export function CancelReservationPage() {
  const [done, setDone] = useState(false)
  return <section className="page-container narrow-page"><ReservationCrumbs eventTitle="김해 가야문화 체험" current="예약 취소" /><PageHeader title="예약을 취소하시겠어요?" description="취소한 예약은 되돌릴 수 없습니다." />
    <div className="confirmation-grid"><section><h2>취소할 예약</h2><h3>김해 가야문화 체험</h3><InfoRow label="예약 상태">예약 확정</InfoRow><InfoRow label="행사 일정">2026년 8월 13일(목) 14:00–16:00</InfoRow><InfoRow label="예약 번호">R20260730A7K3M9Q2W5XZ</InfoRow></section><section><h2>취소 전 확인</h2>{done ? <div className="cancel-done"><span>✓</span><h3>예약이 취소되었습니다.</h3><p>취소한 예약은 내 예약에서 계속 확인할 수 있습니다.</p><InfoRow label="예약 상태">취소 완료</InfoRow><InfoRow label="취소 사유">사용자 요청</InfoRow><InfoRow label="정원 복구">처리 완료</InfoRow><Link className="button-primary" to="/reservations">내 예약으로 돌아가기</Link></div> : <><Notice tone="red"><b>예약 전체가 취소됩니다.</b><br />행사 시작 전의 확정 예약만 취소할 수 있습니다.<ul><li>일부 인원만 취소하거나 인원을 변경할 수 없습니다.</li><li>취소가 완료되면 확보한 자리가 한 번 복구됩니다.</li></ul></Notice><div className="cancel-actions"><Link className="button-outline" to={`/reservations/${bookingId}`}>예약 상세로 돌아가기</Link><button className="button-danger" onClick={() => setDone(true)}>예약 전체 취소하기</button></div></>}</section></div>
  </section>
}

export function PaymentCompletePage() {
  return <section className="payment-result"><Breadcrumbs items={[{ label: '홈', to: '/' }, { label: '김해 가야문화 체험', to: '/events/101' }, { label: '예약' }, { label: '결제 결과' }]} />
    <div className="payment-success"><span>✓</span><div><h1>결제가 승인되어 예약이 완료되었어요.</h1><p>결제 승인과 예약 확정이 모두 완료되었습니다. 예약 상세에서 일정과 체크인 정보를 확인하세요.</p></div></div>
    <div className="payment-state"><div>✓ <span>예약 상태<b>예약 확정</b></span></div><div>✓ <span>결제 상태<b>결제 승인 완료</b></span></div></div>
    <div className="confirmation-grid"><section><h2>예약 정보</h2><h3>김해 가야문화 체험</h3><InfoRow label="예약 번호">R20260806A7K3M9Q2W5XZ</InfoRow><InfoRow label="예약 회차">8월 17일(일) 10:00–12:00</InfoRow><InfoRow label="예약 확정">2026. 08. 13. 11:31</InfoRow></section><section><h2>결제 내역</h2><InfoRow label="기본 금액">20,000원</InfoRow><InfoRow label="쿠폰 할인">-3,000원</InfoRow><InfoRow label="최종 결제 금액">17,000원</InfoRow><div className="booking-number">주문 번호<br /><b>ORD-20260813-9F3K7Q</b></div></section></div>
    <Notice>체크인 QR은 체크인 가능 시간에 예약 상세에서 확인할 수 있어요.</Notice><div className="payment-actions"><Link className="button-outline" to="/reservations">내 예약으로 이동</Link><Link className="button-primary" to={`/reservations/${bookingId}`}>예약 상세 보기</Link></div>
  </section>
}
