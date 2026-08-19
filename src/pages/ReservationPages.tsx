import * as PortOne from '@portone/browser-sdk/v2'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { cancelMyReservation, createReservationHold, createReservationPayment, getMyPayment, getMyReservation, getMyReservationQr, getMyReservations, getPublicContent, getPublicContentSessions, getPublicSessionReservationInfo, type MyPayment, type MyReservationCancellation, type MyReservationDetail, type MyReservationQr, type MyReservationSummary, type PublicContentDetail, type PublicContentSession, type PublicSessionReservationInfo } from '../api/public'
import { Breadcrumbs, InfoRow, Notice, PageHeader, StatusPill } from '../components/PageElements'

interface BookingFlowState {
  holdId?: string
  expiresAt?: string
  quantity?: number
  sessionId?: string
  startsAt?: string
  endsAt?: string
}

interface PaymentFlowState {
  contentId?: string
  contentTitle?: string
}

const sessionDateFormatter = new Intl.DateTimeFormat('ko-KR', {
  month: 'long',
  day: 'numeric',
  weekday: 'short',
  timeZone: 'Asia/Seoul',
})
const sessionDayFormatter = new Intl.DateTimeFormat('ko-KR', { day: '2-digit', timeZone: 'Asia/Seoul' })
const sessionTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Seoul',
})
const holdExpirationFormatter = new Intl.DateTimeFormat('ko-KR', {
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Seoul',
})
const currencyFormatter = new Intl.NumberFormat('ko-KR')

function formatSessionDuration(startsAt: string, endsAt: string) {
  const durationInMinutes = Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000)
  const hours = Math.floor(durationInMinutes / 60)
  const minutes = durationInMinutes % 60

  if (hours === 0) return `${minutes}분`
  if (minutes === 0) return `${hours}시간`
  return `${hours}시간 ${minutes}분`
}

function formatSessionSchedule(startsAt: string, endsAt: string) {
  return `${sessionDateFormatter.format(new Date(startsAt))} ${sessionTimeFormatter.format(new Date(startsAt))}–${sessionTimeFormatter.format(new Date(endsAt))}`
}

function formatDateTime(dateTime: string) {
  return `${sessionDateFormatter.format(new Date(dateTime))} ${sessionTimeFormatter.format(new Date(dateTime))}`
}

function reservationStatusLabel(status: MyReservationDetail['reservation']['status']) {
  return ({ CONFIRMED: '예약 확정', CHECKED_IN: '체크인 완료', CANCELLED: '예약 취소', EXPIRED: '예약 만료' })[status]
}

function reservationStatusTone(status: MyReservationSummary['status']) {
  return ({ CONFIRMED: 'green', CHECKED_IN: 'blue', CANCELLED: 'red', EXPIRED: 'gray' })[status]
}

function isUpcomingReservation(reservation: MyReservationSummary) {
  return reservation.status === 'CONFIRMED' && reservation.session.status === 'SCHEDULED'
}

function sessionStatusLabel(status: MyReservationDetail['session']['status']) {
  return ({ SCHEDULED: '운영 예정', COMPLETED: '운영 종료', CANCELLED: '회차 취소' })[status]
}

function cancellationReasonLabel(reason: string | null) {
  return reason === 'USER_REQUEST' ? '사용자 요청' : reason ?? '확인할 수 없음'
}

function paymentStatusLabel(status: MyPayment['status']) {
  return ({
    PENDING: '결제 대기',
    APPROVED: '결제 승인 완료',
    DECLINED: '결제 승인 거절',
    CANCELLED: '결제 취소',
    EXPIRED: '결제 만료',
    DISCREPANT: '결제 확인 필요',
  })[status]
}

function ReservationCrumbs({ eventTitle, current }: { eventTitle?: string; current: string }) {
  return <Breadcrumbs items={[{ label: '홈', to: '/' }, { label: '내 예약', to: '/reservations' }, ...(eventTitle ? [{ label: eventTitle }] : []), { label: current }]} />
}

export function BookingPage() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const [content, setContent] = useState<PublicContentDetail | null>(null)
  const [sessions, setSessions] = useState<PublicContentSession[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null)
  const isSubmittingRef = useRef(false)

  useEffect(() => {
    if (!eventId) {
      setContent(null)
      setSessions([])
      setSelectedSessionId(null)
      setErrorMessage('행사·체험 정보를 찾을 수 없습니다.')
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    setContent(null)
    setSessions([])
    setSelectedSessionId(null)
    setIsLoading(true)
    setErrorMessage(null)
    Promise.all([
      getPublicContent(eventId, controller.signal),
      getPublicContentSessions(eventId, controller.signal),
    ])
      .then(([publicContent, { sessions: publicSessions }]) => {
        setContent(publicContent)
        setSessions(publicSessions)
        setSelectedSessionId(publicSessions[0]?.sessionId ?? null)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setErrorMessage(error instanceof Error ? error.message : '예약할 회차를 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [eventId, requestVersion])

  const adjustQuantity = (amount: number) => setQuantity((current) => Math.max(1, current + amount))
  const selectedSession = sessions.find(({ sessionId }) => sessionId === selectedSessionId)

  const moveToConfirmation = async () => {
    if (!content || !selectedSession || isSubmittingRef.current) return

    const accessToken = window.sessionStorage.getItem('accessToken')
    if (!accessToken) {
      setSubmitErrorMessage('로그인 정보가 없어 예약을 진행할 수 없습니다. 다시 로그인해 주세요.')
      return
    }

    isSubmittingRef.current = true
    setIsSubmitting(true)
    setSubmitErrorMessage(null)
    try {
      const hold = await createReservationHold({ sessionId: selectedSession.sessionId, quantity }, accessToken)
      navigate(`/events/${content.contentId}/reserve/confirm`, {
        state: {
          holdId: hold.holdId,
          expiresAt: hold.expiresAt,
          sessionId: selectedSession.sessionId,
          startsAt: selectedSession.startsAt,
          endsAt: selectedSession.endsAt,
          quantity: hold.quantity,
        },
      })
    } catch (error: unknown) {
      setSubmitErrorMessage(error instanceof Error ? error.message : '예약 자리를 확보하지 못했습니다.')
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <section className="page-container empty-page"><p>예약할 회차를 불러오는 중입니다.</p></section>
  }

  if (errorMessage || !content) {
    return <section className="page-container empty-page"><p>{errorMessage ?? '행사·체험 정보를 찾을 수 없습니다.'}</p><button className="text-link-button" type="button" onClick={() => setRequestVersion((version) => version + 1)}>다시 시도</button></section>
  }

  return (
    <section className="page-container booking-page">
      <PageHeader title="회차 선택 및 예약" description="참여할 회차와 인원을 선택해 주세요."><Breadcrumbs items={[{ label: '홈', to: '/' }, { label: content.title, to: `/events/${content.contentId}` }, { label: '예약' }]} /></PageHeader>
      <section className="booking-section"><div className="section-title"><h2>예약할 회차 선택</h2><span>남은 회차 {sessions.length}개</span></div>
        {sessions.length > 0
          ? <div className="session-list">{sessions.map((session) => <button key={session.sessionId} type="button" className={`session-row${selectedSessionId === session.sessionId ? ' selected' : ''}`} onClick={() => setSelectedSessionId(session.sessionId)}>
            <span className="date-box">{sessionDayFormatter.format(new Date(session.startsAt))}</span><span><b>{sessionDateFormatter.format(new Date(session.startsAt))} {sessionTimeFormatter.format(new Date(session.startsAt))}–{sessionTimeFormatter.format(new Date(session.endsAt))}</b><small>{content.locationText} · {formatSessionDuration(session.startsAt, session.endsAt)}</small></span>
          </button>)}</div>
          : <p className="empty-page">예약할 수 있는 회차가 없습니다.</p>}
      </section>
      <section className="booking-section"><div className="section-title"><h2>예약 인원</h2></div>
        <div className="counter-row"><div><b>예약 인원</b><small>참여할 인원 수를 선택해 주세요.</small></div><div className="counter"><button onClick={() => adjustQuantity(-1)} aria-label="예약 인원 감소">−</button><strong>{quantity}</strong><button onClick={() => adjustQuantity(1)} aria-label="예약 인원 증가">＋</button></div></div>
        <div className="total-people"><span>총 예약 인원</span><b>{quantity}명</b></div>
      </section>
      {submitErrorMessage && <Notice tone="red">{submitErrorMessage}</Notice>}
      <button className="button-primary booking-submit" type="button" disabled={!selectedSession || isSubmitting} onClick={moveToConfirmation}>{isSubmitting ? '예약 자리를 확보하는 중입니다.' : '예약하기'}</button>
    </section>
  )
}

export function BookingConfirmPage() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const { state } = useLocation()
  const bookingState = (state as BookingFlowState | null) ?? {}
  const { holdId, expiresAt, sessionId, quantity = 1 } = bookingState
  const [content, setContent] = useState<PublicContentDetail | null>(null)
  const [sessionInfo, setSessionInfo] = useState<PublicSessionReservationInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)
  const [isConfirming, setIsConfirming] = useState(false)
  const [confirmErrorMessage, setConfirmErrorMessage] = useState<string | null>(null)
  const isConfirmingRef = useRef(false)
  const paymentIdempotencyKeyRef = useRef(crypto.randomUUID())

  useEffect(() => {
    if (!eventId || !sessionId || !holdId || !expiresAt) {
      setContent(null)
      setSessionInfo(null)
      setErrorMessage('예약 확인 정보가 없습니다. 회차를 다시 선택해 주세요.')
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    setContent(null)
    setSessionInfo(null)
    setIsLoading(true)
    setErrorMessage(null)
    Promise.all([
      getPublicContent(eventId, controller.signal),
      getPublicSessionReservationInfo(sessionId, controller.signal),
    ])
      .then(([publicContent, publicSessionInfo]) => {
        setContent(publicContent)
        setSessionInfo(publicSessionInfo)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setErrorMessage(error instanceof Error ? error.message : '예약 확인 정보를 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [eventId, expiresAt, holdId, requestVersion, sessionId])

  const proceedReservation = async () => {
    if (!content || !sessionInfo || !holdId || isConfirmingRef.current) return
    const currentHoldId = holdId

    const accessToken = window.sessionStorage.getItem('accessToken')
    if (!accessToken) {
      setConfirmErrorMessage('로그인 정보가 없어 예약을 진행할 수 없습니다. 다시 로그인해 주세요.')
      return
    }

    isConfirmingRef.current = true
    setIsConfirming(true)
    setConfirmErrorMessage(null)
    try {
      const paymentCreation = await createReservationPayment(currentHoldId, paymentIdempotencyKeyRef.current, accessToken)
      if (paymentCreation.requiresPayment && paymentCreation.payment) {
        navigate(`/payments/${paymentCreation.payment.paymentId}`, {
          state: { contentId: content.contentId, contentTitle: content.title },
        })
        return
      }

      if (!paymentCreation.requiresPayment && paymentCreation.reservation?.status === 'CONFIRMED') {
        navigate(`/events/${content.contentId}/reserve/complete/${paymentCreation.reservation.reservationId}`)
        return
      }

      setConfirmErrorMessage('예약 또는 결제 정보를 준비하지 못했습니다. 다시 시도해 주세요.')
    } catch (error: unknown) {
      setConfirmErrorMessage(error instanceof Error ? error.message : '예약을 진행하지 못했습니다.')
    } finally {
      isConfirmingRef.current = false
      setIsConfirming(false)
    }
  }

  if (isLoading) {
    return <section className="page-container empty-page"><p>예약 확인 정보를 불러오는 중입니다.</p></section>
  }

  if (errorMessage || !content || !sessionInfo || !eventId || !expiresAt) {
    return <section className="page-container empty-page"><p>{errorMessage ?? '예약 확인 정보를 찾을 수 없습니다.'}</p><Link className="button-outline" to={eventId ? `/events/${eventId}/reserve` : '/events'}>회차 다시 선택하기</Link>{eventId && sessionId && holdId && expiresAt && <button className="text-link-button" type="button" onClick={() => setRequestVersion((version) => version + 1)}>다시 시도</button>}</section>
  }

  const isFreeReservation = sessionInfo.price === 0
  return <section className="page-container narrow-page">
    <ReservationCrumbs eventTitle={content.title} current="예약 확인" />
    <PageHeader title="예약을 확정하시겠어요?" />
    <Notice>선택한 회차와 자리를 확보했어요. <span>{holdExpirationFormatter.format(new Date(expiresAt))}까지 예약을 확정해 주세요.</span></Notice>
    <div className="confirmation-grid"><section><h2>예약 내용</h2><h3>{content.title}</h3><InfoRow label="선택 회차">{formatSessionSchedule(sessionInfo.startsAt, sessionInfo.endsAt)}</InfoRow><InfoRow label="위치">{content.locationText}</InfoRow><InfoRow label="예약 인원">{quantity}명</InfoRow></section><section><h2>예약 확인</h2><InfoRow label="예약 금액">{currencyFormatter.format(sessionInfo.price)}원</InfoRow>{!isFreeReservation && <Notice>결제 정보를 준비한 뒤 PortOne 결제창으로 이동합니다.</Notice>}{confirmErrorMessage && <Notice tone="red">{confirmErrorMessage}</Notice>}<button className="button-primary" type="button" disabled={isConfirming} onClick={proceedReservation}>{isConfirming ? (isFreeReservation ? '예약을 확정하는 중입니다.' : '결제를 준비하는 중입니다.') : (isFreeReservation ? '예약 확정하기' : '결제하기')}</button><p className="summary-caption">현장 혹은 내 예약에서 예약 QR을 확인할 수 있습니다.</p></section></div>
  </section>
}

export function BookingCompletePage() {
  const { reservationId } = useParams()
  const [reservationDetail, setReservationDetail] = useState<MyReservationDetail | null>(null)
  const [content, setContent] = useState<PublicContentDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)

  useEffect(() => {
    if (!reservationId) {
      setReservationDetail(null)
      setContent(null)
      setErrorMessage('예약 정보를 찾을 수 없습니다.')
      setIsLoading(false)
      return
    }

    const accessToken = window.sessionStorage.getItem('accessToken')
    if (!accessToken) {
      setReservationDetail(null)
      setContent(null)
      setErrorMessage('로그인 정보가 없어 예약을 조회할 수 없습니다. 다시 로그인해 주세요.')
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    setReservationDetail(null)
    setContent(null)
    setIsLoading(true)
    setErrorMessage(null)
    getMyReservation(reservationId, accessToken, controller.signal)
      .then(async (myReservation) => {
        const publicContent = await getPublicContent(myReservation.session.contentId, controller.signal)
        if (controller.signal.aborted) return
        setReservationDetail(myReservation)
        setContent(publicContent)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setErrorMessage(error instanceof Error ? error.message : '예약 완료 정보를 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [requestVersion, reservationId])

  if (isLoading) {
    return <section className="page-container empty-page"><p>예약 완료 정보를 불러오는 중입니다.</p></section>
  }

  if (errorMessage || !reservationDetail || !content) {
    return <section className="page-container empty-page"><p>{errorMessage ?? '예약 완료 정보를 찾을 수 없습니다.'}</p><Link className="button-outline" to="/reservations">내 예약으로 이동</Link>{reservationId && <button className="text-link-button" type="button" onClick={() => setRequestVersion((version) => version + 1)}>다시 시도</button>}</section>
  }

  const { reservation, session } = reservationDetail
  const isConfirmed = reservation.status === 'CONFIRMED'
  return <section className="page-container narrow-page">
    <ReservationCrumbs eventTitle={content.title} current="예약 완료" />
    <div className="complete-title"><span>{isConfirmed ? '✓' : '!'}</span><div><h1>{isConfirmed ? '예약이 완료되었습니다!' : '예약 상태를 확인해 주세요.'}</h1><p>{isConfirmed ? '예약 내용을 확인해 주세요.' : `현재 예약 상태는 ${reservationStatusLabel(reservation.status)}입니다.`}</p></div></div>
    <div className="confirmation-grid"><section><h2>예약 내용</h2><h3>{content.title}</h3><InfoRow label="선택 회차">{formatSessionSchedule(session.startsAt, session.endsAt)}</InfoRow><InfoRow label="위치">{content.locationText}</InfoRow><InfoRow label="예약 인원">{reservation.quantity}명</InfoRow></section><section><h2>예약 번호</h2><div className="booking-number">{reservation.reservationNo}</div><InfoRow label="예약 상태">{reservationStatusLabel(reservation.status)}</InfoRow><InfoRow label="예약 확정">{formatDateTime(reservation.confirmedAt)}</InfoRow><Link className="button-primary" to={`/reservations/${reservation.reservationId}`}>내 예약 확인하기</Link><p className="summary-caption">체크인 가능 시간이 되면 내 예약에서 QR을 확인할 수 있습니다.</p></section></div>
  </section>
}

export function ReservationsPage() {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')
  const [listedReservations, setListedReservations] = useState<MyReservationSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)

  useEffect(() => {
    const accessToken = window.sessionStorage.getItem('accessToken')
    if (!accessToken) {
      setListedReservations([])
      setErrorMessage('로그인 정보가 없어 예약 목록을 조회할 수 없습니다. 다시 로그인해 주세요.')
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    setListedReservations([])
    setIsLoading(true)
    setErrorMessage(null)
    getMyReservations(accessToken, controller.signal)
      .then(({ reservations }) => setListedReservations(reservations))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setErrorMessage(error instanceof Error ? error.message : '예약 목록을 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [requestVersion])

  if (isLoading) {
    return <section className="page-container empty-page"><p>예약 목록을 불러오는 중입니다.</p></section>
  }

  if (errorMessage) {
    return <section className="page-container empty-page"><p>{errorMessage}</p><button className="text-link-button" type="button" onClick={() => setRequestVersion((version) => version + 1)}>다시 시도</button></section>
  }

  const upcomingReservations = listedReservations.filter(isUpcomingReservation)
  const pastReservations = listedReservations.filter((reservation) => !isUpcomingReservation(reservation))
  const reservations = activeTab === 'upcoming' ? upcomingReservations : pastReservations
  return <section className="page-container reservations-page"><PageHeader title="내 예약" description="예약한 행사·체험의 일정과 체크인 정보를 확인하세요."><Breadcrumbs items={[{ label: '홈', to: '/' }, { label: '내 예약' }]} /></PageHeader>
    <div className="tab-row"><button className={activeTab === 'upcoming' ? 'active' : ''} onClick={() => setActiveTab('upcoming')}>다가오는 예약 <b>{upcomingReservations.length}</b></button><button className={activeTab === 'past' ? 'active' : ''} onClick={() => setActiveTab('past')}>지난 예약 <b>{pastReservations.length}</b></button></div>
    {reservations.length > 0
      ? <div className="reservation-list">{reservations.map((reservation) => <ReservationCard key={reservation.reservationId} reservation={reservation} />)}</div>
      : <section className="empty-page"><p>{activeTab === 'upcoming' ? '다가오는 예약이 없습니다.' : '지난 예약이 없습니다.'}</p></section>}
  </section>
}

function ReservationCard({ reservation }: { reservation: MyReservationSummary }) {
  return <article className="reservation-card"><div className="reservation-date"><b>{formatSessionSchedule(reservation.session.startsAt, reservation.session.endsAt)}</b><span>예약 확정 {formatDateTime(reservation.confirmedAt)}</span></div><div className="reservation-info"><StatusPill tone={reservationStatusTone(reservation.status)}>{reservationStatusLabel(reservation.status)}</StatusPill><h2>{reservation.content.title}</h2><small>예약 번호 {reservation.reservationNo}</small><small>예약 인원 {reservation.quantity}명</small></div><div className="reservation-actions"><Link className="button-outline" to={`/reservations/${reservation.reservationId}`}>예약 상세</Link></div></article>
}

export function ReservationDetailPage() {
  const { reservationId } = useParams()
  const [reservationDetail, setReservationDetail] = useState<MyReservationDetail | null>(null)
  const [content, setContent] = useState<PublicContentDetail | null>(null)
  const [qr, setQr] = useState<MyReservationQr | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isQrLoading, setIsQrLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [qrErrorMessage, setQrErrorMessage] = useState<string | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)
  const qrRequestControllerRef = useRef<AbortController | null>(null)
  const qrRequestVersionRef = useRef(0)

  useEffect(() => {
    qrRequestVersionRef.current += 1
    qrRequestControllerRef.current?.abort()
    if (!reservationId) {
      setReservationDetail(null)
      setContent(null)
      setQr(null)
      setIsQrLoading(false)
      setErrorMessage('예약 정보를 찾을 수 없습니다.')
      setIsLoading(false)
      return
    }

    const accessToken = window.sessionStorage.getItem('accessToken')
    if (!accessToken) {
      setReservationDetail(null)
      setContent(null)
      setQr(null)
      setIsQrLoading(false)
      setErrorMessage('로그인 정보가 없어 예약을 조회할 수 없습니다. 다시 로그인해 주세요.')
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    setReservationDetail(null)
    setContent(null)
    setQr(null)
    setQrErrorMessage(null)
    setIsQrLoading(false)
    setIsLoading(true)
    setErrorMessage(null)
    getMyReservation(reservationId, accessToken, controller.signal)
      .then(async (myReservation) => {
        const publicContent = await getPublicContent(myReservation.session.contentId, controller.signal)
        if (controller.signal.aborted) return
        setReservationDetail(myReservation)
        setContent(publicContent)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setErrorMessage(error instanceof Error ? error.message : '예약 정보를 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => {
      controller.abort()
      qrRequestControllerRef.current?.abort()
    }
  }, [requestVersion, reservationId])

  const loadQr = async () => {
    if (!reservationDetail || isQrLoading) return

    const accessToken = window.sessionStorage.getItem('accessToken')
    if (!accessToken) {
      setQrErrorMessage('로그인 정보가 없어 QR을 불러올 수 없습니다. 다시 로그인해 주세요.')
      return
    }

    qrRequestControllerRef.current?.abort()
    const controller = new AbortController()
    qrRequestControllerRef.current = controller
    const qrRequestVersion = qrRequestVersionRef.current
    setIsQrLoading(true)
    setQrErrorMessage(null)
    try {
      const issuedQr = await getMyReservationQr(
        reservationDetail.reservation.reservationId,
        accessToken,
        controller.signal,
      )
      if (controller.signal.aborted || qrRequestVersion !== qrRequestVersionRef.current) return
      setQr(issuedQr)
    } catch (error: unknown) {
      if (controller.signal.aborted || qrRequestVersion !== qrRequestVersionRef.current) return
      setQrErrorMessage(error instanceof Error ? error.message : '체크인 QR을 불러오지 못했습니다.')
    } finally {
      if (qrRequestControllerRef.current === controller) {
        qrRequestControllerRef.current = null
      }
      if (!controller.signal.aborted && qrRequestVersion === qrRequestVersionRef.current) {
        setIsQrLoading(false)
      }
    }
  }

  if (isLoading) {
    return <section className="page-container empty-page"><p>예약 정보를 불러오는 중입니다.</p></section>
  }

  if (errorMessage || !reservationDetail || !content) {
    return <section className="page-container empty-page"><p>{errorMessage ?? '예약 정보를 찾을 수 없습니다.'}</p><Link className="button-outline" to="/reservations">내 예약으로 이동</Link>{reservationId && <button className="text-link-button" type="button" onClick={() => setRequestVersion((version) => version + 1)}>다시 시도</button>}</section>
  }

  const { reservation, session, checkIn } = reservationDetail
  return <section className="page-container narrow-page"><ReservationCrumbs eventTitle={content.title} current="예약 상세" />
    <div className="detail-heading"><h1>{content.title}</h1><StatusPill tone={reservationStatusTone(reservation.status)}>{reservationStatusLabel(reservation.status)}</StatusPill></div>
    <div className="confirmation-grid"><section><h2>예약 내용</h2><h3>{content.title}</h3><InfoRow label="행사 일정">{formatSessionSchedule(session.startsAt, session.endsAt)}</InfoRow><InfoRow label="회차 상태">{sessionStatusLabel(session.status)}</InfoRow><InfoRow label="체크인 시간">{formatSessionSchedule(session.checkinOpenAt, session.checkinCloseAt)}</InfoRow><InfoRow label="체크인">{checkIn.checkedIn && checkIn.checkedAt ? `완료 (${formatDateTime(checkIn.checkedAt)})` : '아직 안 함'}</InfoRow><InfoRow label="예약 인원">{reservation.quantity}명</InfoRow><InfoRow label="예약 번호">{reservation.reservationNo}</InfoRow>{reservation.status === 'CONFIRMED' && <Link className="text-danger-link" to={`/reservations/${reservation.reservationId}/cancel`}>예약 취소</Link>}</section><section><h2>체크인 QR</h2><div className="qr-panel">{qr ? <><QRCodeSVG value={qr.qrToken} size={155} title="체크인 QR 코드" /><p>QR은 {formatDateTime(qr.expiresAt)}까지 유효합니다.</p></> : <p>현장 담당자에게 제시할 QR을 불러오세요.</p>}{qrErrorMessage && <Notice tone="red">{qrErrorMessage}</Notice>}<button className="button-primary" type="button" disabled={isQrLoading} onClick={loadQr}>{isQrLoading ? '체크인 QR을 불러오는 중입니다.' : qr ? '새 QR 불러오기' : '체크인 QR 불러오기'}</button></div></section></div>
  </section>
}

export function CancelReservationPage() {
  const { reservationId } = useParams()
  const [reservationDetail, setReservationDetail] = useState<MyReservationDetail | null>(null)
  const [cancellation, setCancellation] = useState<MyReservationCancellation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCancelling, setIsCancelling] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [cancelErrorMessage, setCancelErrorMessage] = useState<string | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)

  useEffect(() => {
    if (!reservationId) {
      setReservationDetail(null)
      setCancellation(null)
      setErrorMessage('예약 정보를 찾을 수 없습니다.')
      setIsLoading(false)
      return
    }

    const accessToken = window.sessionStorage.getItem('accessToken')
    if (!accessToken) {
      setReservationDetail(null)
      setCancellation(null)
      setErrorMessage('로그인 정보가 없어 예약을 조회할 수 없습니다. 다시 로그인해 주세요.')
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    setReservationDetail(null)
    setCancellation(null)
    setCancelErrorMessage(null)
    setErrorMessage(null)
    setIsLoading(true)
    getMyReservation(reservationId, accessToken, controller.signal)
      .then((myReservation) => {
        if (controller.signal.aborted) return
        setReservationDetail(myReservation)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setErrorMessage(error instanceof Error ? error.message : '예약 정보를 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [requestVersion, reservationId])

  const cancelReservation = async () => {
    if (!reservationDetail || isCancelling) return

    const accessToken = window.sessionStorage.getItem('accessToken')
    if (!accessToken) {
      setCancelErrorMessage('로그인 정보가 없어 예약을 취소할 수 없습니다. 다시 로그인해 주세요.')
      return
    }

    setIsCancelling(true)
    setCancelErrorMessage(null)
    try {
      const result = await cancelMyReservation(reservationDetail.reservation.reservationId, accessToken)
      setCancellation(result)
    } catch (error: unknown) {
      setCancelErrorMessage(error instanceof Error ? error.message : '예약을 취소하지 못했습니다.')
    } finally {
      setIsCancelling(false)
    }
  }

  if (isLoading) {
    return <section className="page-container empty-page"><p>예약 정보를 불러오는 중입니다.</p></section>
  }

  if (errorMessage || !reservationDetail) {
    return <section className="page-container empty-page"><p>{errorMessage ?? '예약 정보를 찾을 수 없습니다.'}</p><Link className="button-outline" to="/reservations">내 예약으로 이동</Link>{reservationId && <button className="text-link-button" type="button" onClick={() => setRequestVersion((version) => version + 1)}>다시 시도</button>}</section>
  }

  const { reservation, session, content } = reservationDetail
  const isCancelled = reservation.status === 'CANCELLED' || cancellation?.status === 'CANCELLED'
  const cancelledAt = cancellation?.cancelledAt ?? reservation.cancelledAt
  return <section className="page-container narrow-page"><ReservationCrumbs eventTitle={content.title} current="예약 취소" /><PageHeader title={isCancelled ? '예약이 취소되었습니다.' : '예약을 취소하시겠어요?'} description={isCancelled ? '취소한 예약은 내 예약에서 계속 확인할 수 있습니다.' : '취소한 예약은 되돌릴 수 없습니다.'} />
    <div className="confirmation-grid"><section><h2>취소할 예약</h2><h3>{content.title}</h3><InfoRow label="예약 상태">{reservationStatusLabel(isCancelled ? 'CANCELLED' : reservation.status)}</InfoRow><InfoRow label="행사 일정">{formatSessionSchedule(session.startsAt, session.endsAt)}</InfoRow><InfoRow label="예약 인원">{reservation.quantity}명</InfoRow><InfoRow label="예약 번호">{reservation.reservationNo}</InfoRow></section><section><h2>{isCancelled ? '취소 결과' : '취소 전 확인'}</h2>{isCancelled ? <div className="cancel-done"><span>✓</span><h3>예약이 취소되었습니다.</h3><InfoRow label="취소 사유">{cancellationReasonLabel(cancellation?.cancellationReason ?? reservation.cancellationReason)}</InfoRow>{cancelledAt && <InfoRow label="취소 시각">{formatDateTime(cancelledAt)}</InfoRow>}{cancellation && <InfoRow label="정원 복구 시각">{cancellation.capacityReleasedAt ? formatDateTime(cancellation.capacityReleasedAt) : '정원 복구 없음'}</InfoRow>}<Link className="button-primary" to="/reservations">내 예약으로 돌아가기</Link></div> : reservation.status === 'CONFIRMED' ? <><Notice tone="red"><b>예약 전체가 취소됩니다.</b><br />행사 시작 전의 확정 예약만 취소할 수 있습니다.<ul><li>일부 인원만 취소하거나 인원을 변경할 수 없습니다.</li><li>취소가 완료되면 확보한 자리가 한 번 복구됩니다.</li></ul></Notice>{cancelErrorMessage && <Notice tone="red">{cancelErrorMessage}</Notice>}<div className="cancel-actions"><Link className="button-outline" to={`/reservations/${reservation.reservationId}`}>예약 상세로 돌아가기</Link><button className="button-danger" type="button" disabled={isCancelling} onClick={cancelReservation}>{isCancelling ? '예약을 취소하는 중입니다.' : '예약 전체 취소하기'}</button></div></> : <><Notice tone="red">현재 예약 상태에서는 취소할 수 없습니다.</Notice><Link className="button-outline" to={`/reservations/${reservation.reservationId}`}>예약 상세로 돌아가기</Link></>}</section></div>
  </section>
}

export function PaymentPage() {
  const { paymentId } = useParams()
  const { state, search } = useLocation()
  const navigate = useNavigate()
  const paymentFlowState = (state as PaymentFlowState | null) ?? {}
  const paymentRedirectParams = new URLSearchParams(search)
  const paymentRedirectError = paymentRedirectParams.get('code')
    ? paymentRedirectParams.get('message') ?? '결제를 완료하지 못했습니다.'
    : null
  const [payment, setPayment] = useState<MyPayment | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isRequestingPayment, setIsRequestingPayment] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)

  const loadPayment = async (signal?: AbortSignal) => {
    if (!paymentId) throw new Error('결제 정보를 찾을 수 없습니다.')

    const accessToken = window.sessionStorage.getItem('accessToken')
    if (!accessToken) throw new Error('로그인 정보가 없어 결제 상태를 조회할 수 없습니다. 다시 로그인해 주세요.')

    const myPayment = await getMyPayment(paymentId, accessToken, signal)
    setPayment(myPayment)
    return myPayment
  }

  useEffect(() => {
    const controller = new AbortController()
    setPayment(null)
    setIsLoading(true)
    setErrorMessage(null)
    setPaymentMessage(null)

    loadPayment(controller.signal)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setErrorMessage(error instanceof Error ? error.message : '결제 정보를 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [paymentId, requestVersion])

  const refreshPayment = async () => {
    setIsRefreshing(true)
    setErrorMessage(null)
    try {
      const updatedPayment = await loadPayment()
      if (updatedPayment.status === 'APPROVED') {
        setPaymentMessage('결제 승인이 확인되었습니다. 예약 상세에서 일정을 확인해 주세요.')
      } else {
        setPaymentMessage('결제 승인 상태를 다시 확인했습니다.')
      }
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : '결제 상태를 갱신하지 못했습니다.')
    } finally {
      setIsRefreshing(false)
    }
  }

  const requestPayment = async () => {
    if (!payment || payment.status !== 'PENDING' || isRequestingPayment) return

    const storeId = import.meta.env.VITE_PORTONE_STORE_ID?.trim()
    const channelKey = import.meta.env.VITE_PORTONE_CHANNEL_KEY?.trim()
    if (!storeId || !channelKey) {
      setErrorMessage('VITE_PORTONE_STORE_ID와 VITE_PORTONE_CHANNEL_KEY 환경 변수를 설정해 주세요.')
      return
    }

    if (payment.amount.finalAmount < 1) {
      setErrorMessage('결제 금액이 올바르지 않습니다. 예약을 다시 진행해 주세요.')
      return
    }

    setIsRequestingPayment(true)
    setErrorMessage(null)
    setPaymentMessage(null)
    try {
      const response = await PortOne.requestPayment({
        storeId,
        channelKey,
        paymentId: payment.orderId,
        orderName: paymentFlowState.contentTitle ?? '지역 행사·체험 예약',
        totalAmount: payment.amount.finalAmount,
        currency: 'KRW',
        payMethod: 'CARD',
        redirectUrl: `${window.location.origin}/payments/${payment.paymentId}`,
      })

      if (response?.code !== undefined) {
        setErrorMessage(response.message ?? '결제를 완료하지 못했습니다.')
        return
      }

      setPaymentMessage('결제 요청이 완료되었습니다. 서버에서 승인 상태를 확인하고 있습니다.')
      await refreshPayment()
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'PortOne 결제창을 열지 못했습니다.')
    } finally {
      setIsRequestingPayment(false)
    }
  }

  if (isLoading) {
    return <section className="page-container empty-page"><p>결제 정보를 불러오는 중입니다.</p></section>
  }

  if (errorMessage && !payment) {
    return <section className="page-container empty-page"><p>{errorMessage}</p><button className="text-link-button" type="button" onClick={() => setRequestVersion((version) => version + 1)}>다시 시도</button></section>
  }

  if (!payment) {
    return <section className="page-container empty-page"><p>결제 정보를 찾을 수 없습니다.</p><Link className="button-outline" to="/reservations">내 예약으로 이동</Link></section>
  }

  const isApproved = payment.status === 'APPROVED' && payment.reservationId
  const isPending = payment.status === 'PENDING'
  const reservationPath = isApproved
    ? paymentFlowState.contentId
      ? `/events/${paymentFlowState.contentId}/reserve/complete/${payment.reservationId}`
      : `/reservations/${payment.reservationId}`
    : null

  return <section className="payment-result">
    <Breadcrumbs items={[{ label: '홈', to: '/' }, ...(paymentFlowState.contentTitle ? [{ label: paymentFlowState.contentTitle }] : []), { label: '결제' }]} />
    <div className="payment-success"><span>{isApproved ? '✓' : '₩'}</span><div><h1>{isApproved ? '결제가 승인되어 예약이 완료되었어요.' : '예약 결제를 진행해 주세요.'}</h1><p>{isApproved ? '서버에서 결제 승인과 예약 확정을 확인했습니다.' : '결제창에서 카드 결제를 완료한 뒤, 결제 상태를 다시 확인해 주세요.'}</p></div></div>
    <div className="payment-state"><div>{isApproved ? '✓' : '•'} <span>결제 상태<b>{paymentStatusLabel(payment.status)}</b></span></div><div>{isApproved ? '✓' : '•'} <span>예약 상태<b>{isApproved ? '예약 확정' : '결제 승인 대기'}</b></span></div></div>
    <div className="confirmation-grid"><section><h2>결제 대상</h2><h3>{paymentFlowState.contentTitle ?? '지역 행사·체험 예약'}</h3><InfoRow label="주문 번호">{payment.orderId}</InfoRow><InfoRow label="결제 요청 시각">{formatDateTime(payment.createdAt)}</InfoRow>{payment.finalizedAt && <InfoRow label="최종 처리 시각">{formatDateTime(payment.finalizedAt)}</InfoRow>}</section><section><h2>결제 내역</h2><InfoRow label="기본 금액">{currencyFormatter.format(payment.amount.baseAmount)}원</InfoRow><InfoRow label="쿠폰 할인">-{currencyFormatter.format(payment.amount.discountAmount)}원</InfoRow><InfoRow label="최종 결제 금액">{currencyFormatter.format(payment.amount.finalAmount)}원</InfoRow>{paymentMessage && <Notice>{paymentMessage}</Notice>}{(paymentRedirectError ?? errorMessage) && <Notice tone="red">{paymentRedirectError ?? errorMessage}</Notice>}{isPending && <><button className="button-primary" type="button" disabled={isRequestingPayment} onClick={requestPayment}>{isRequestingPayment ? '결제창을 여는 중입니다.' : '카드로 결제하기'}</button><button className="text-link-button" type="button" disabled={isRefreshing} onClick={refreshPayment}>{isRefreshing ? '결제 상태를 확인하는 중입니다.' : '결제 상태 새로고침'}</button></>}{reservationPath && <button className="button-primary" type="button" onClick={() => navigate(reservationPath)}>예약 상세 확인하기</button>}{!isPending && !reservationPath && <Link className="button-outline" to="/reservations">내 예약으로 이동</Link>}</section></div>
  </section>
}
