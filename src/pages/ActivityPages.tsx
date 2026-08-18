import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createVisitReview, getMyCouponUsageHistory, getMyCoupons, getMyReservations, type CouponIssueSourceType, type CouponStatus, type MyCoupon, type MyCouponUsageHistoryItem, type MyReservationSummary } from '../api/public'
import { Breadcrumbs, Notice, PageHeader, StatusPill } from '../components/PageElements'
import { useAppState } from '../components/AppLayout'

const reviewSessionDateFormatter = new Intl.DateTimeFormat('ko-KR', {
  month: 'long',
  day: 'numeric',
  weekday: 'short',
  timeZone: 'Asia/Seoul',
})
const reviewSessionTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Seoul',
})

function formatReviewSession(startsAt: string, endsAt: string) {
  return `${reviewSessionDateFormatter.format(new Date(startsAt))} ${reviewSessionTimeFormatter.format(new Date(startsAt))}–${reviewSessionTimeFormatter.format(new Date(endsAt))}`
}

function isReviewableReservation(reservation: MyReservationSummary) {
  return reservation.status === 'CHECKED_IN' && reservation.checkIn.checkedIn && reservation.checkIn.visitId !== null
}

const couponDateFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'Asia/Seoul',
})
const couponDateTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Seoul',
})
const couponCurrencyFormatter = new Intl.NumberFormat('ko-KR')

function couponStatusLabel(status: CouponStatus) {
  return ({ AVAILABLE: '사용 가능', RESERVED: '사용 예정', USED: '사용 완료', EXPIRED: '만료', INVALIDATED: '사용 불가' })[status]
}

function couponStatusTone(status: CouponStatus) {
  return ({ AVAILABLE: 'green', RESERVED: 'amber', USED: 'blue', EXPIRED: 'gray', INVALIDATED: 'red' })[status] as const
}

function couponIssueSourceLabel(issueSourceType: CouponIssueSourceType) {
  return ({ VISIT: '방문 인증', MISSION_REWARD: '미션 보상', STAMPBOOK_COMPLETION: '스탬프북 완료 보상' })[issueSourceType]
}

function usageHistoryTitle(history: MyCouponUsageHistoryItem) {
  return history.status === 'REVERSED'
    ? `${couponCurrencyFormatter.format(history.discountAmount)}원 할인 · 쿠폰 복구`
    : `${couponCurrencyFormatter.format(history.discountAmount)}원 할인 · 사용 확정`
}

function usageHistoryDate(history: MyCouponUsageHistoryItem) {
  const dateTime = history.status === 'REVERSED' && history.reversedAt ? history.reversedAt : history.confirmedAt
  return `${history.status === 'REVERSED' ? '복구' : '사용'} ${couponDateTimeFormatter.format(new Date(dateTime))}`
}

export function ReviewPage() {
  const navigate = useNavigate()
  const [rating, setRating] = useState(0)
  const [review, setReview] = useState('')
  const [reservations, setReservations] = useState<MyReservationSummary[]>([])
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)
  const isSubmittingRef = useRef(false)

  useEffect(() => {
    const accessToken = window.sessionStorage.getItem('accessToken')
    if (!accessToken) {
      setReservations([])
      setSelectedVisitId(null)
      setErrorMessage('로그인 정보가 없어 후기 작성 대상을 조회할 수 없습니다. 다시 로그인해 주세요.')
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    setReservations([])
    setSelectedVisitId(null)
    setIsLoading(true)
    setErrorMessage(null)
    getMyReservations(accessToken, controller.signal)
      .then(({ reservations: myReservations }) => {
        if (controller.signal.aborted) return
        const reviewableReservations = myReservations.filter(isReviewableReservation)
        setReservations(reviewableReservations)
        setSelectedVisitId(reviewableReservations[0]?.checkIn.visitId ?? null)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setErrorMessage(error instanceof Error ? error.message : '후기 작성 대상을 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [requestVersion])

  const selectedReservation = reservations.find((reservation) => reservation.checkIn.visitId === selectedVisitId) ?? null

  const submitReview = async () => {
    if (!selectedReservation?.checkIn.visitId || !rating || !review.trim() || isSubmittingRef.current) return

    const accessToken = window.sessionStorage.getItem('accessToken')
    if (!accessToken) {
      setSubmitErrorMessage('로그인 정보가 없어 후기를 등록할 수 없습니다. 다시 로그인해 주세요.')
      return
    }

    isSubmittingRef.current = true
    setIsSubmitting(true)
    setSubmitErrorMessage(null)
    try {
      const createdReview = await createVisitReview(
        selectedReservation.checkIn.visitId,
        { rating, reviewText: review.trim() },
        accessToken,
      )
      navigate(`/events/${createdReview.contentId}/reviews`)
    } catch (error: unknown) {
      setSubmitErrorMessage(error instanceof Error ? error.message : '후기를 등록하지 못했습니다.')
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }

  return <section className="page-container narrow-page"><PageHeader title="방문 후기를 남겨주세요" description="체크인이 완료된 방문에 대해 한 번 작성할 수 있어요."><Breadcrumbs items={[{ label: '홈', to: '/' }, { label: '내 예약', to: '/reservations' }, ...(selectedReservation ? [{ label: selectedReservation.content.title }] : []), { label: '후기 작성' }]} /></PageHeader>
    <div className="confirmation-grid review-layout"><section><h2>후기 내용</h2><label className="field-label">만족도 <em>필수</em></label><div className="stars" aria-label="만족도">{[1, 2, 3, 4, 5].map((star) => <button key={star} type="button" onClick={() => setRating(star)} aria-label={`${star}점`}>{star <= rating ? '★' : '☆'}</button>)}</div><p className="field-help">별점을 선택해 주세요.</p><label className="field-label" htmlFor="review">후기 <em>필수</em></label><textarea id="review" value={review} onChange={(event) => setReview(event.target.value)} maxLength={2000} placeholder="방문하며 좋았던 점이나 다른 방문자에게 도움이 될 내용을 남겨 주세요." /><span className="character-count">{review.length} / 2,000</span>{submitErrorMessage && <Notice tone="red">{submitErrorMessage}</Notice>}<button className="button-primary review-submit" type="button" disabled={!selectedReservation || !rating || !review.trim() || isSubmitting} onClick={submitReview}>{isSubmitting ? '후기를 등록하는 중입니다.' : '후기 등록하기'}</button></section><section className="visited-content"><h2>방문한 콘텐츠</h2>{isLoading && <p>후기 작성 대상을 불러오는 중입니다.</p>}{!isLoading && errorMessage && <><Notice tone="red">{errorMessage}</Notice><button className="text-link-button" type="button" onClick={() => setRequestVersion((version) => version + 1)}>다시 시도</button></>}{!isLoading && !errorMessage && reservations.length === 0 && <p>후기를 작성할 수 있는 체크인 완료 방문이 없습니다.</p>}{!isLoading && !errorMessage && reservations.length > 0 && <><label className="field-label" htmlFor="review-visit">방문 선택 <em>필수</em></label><select id="review-visit" value={selectedVisitId ?? ''} onChange={(event) => setSelectedVisitId(event.target.value)}>{reservations.map((reservation) => <option key={reservation.checkIn.visitId} value={reservation.checkIn.visitId ?? ''}>{reservation.content.title} · {formatReviewSession(reservation.session.startsAt, reservation.session.endsAt)}</option>)}</select>{selectedReservation && <article><StatusPill>체크인 완료</StatusPill><h3>{selectedReservation.content.title}</h3><p>{formatReviewSession(selectedReservation.session.startsAt, selectedReservation.session.endsAt)}<br />{selectedReservation.content.locationText}</p></article>}</>}<h3>작성 안내</h3><ul><li>후기는 콘텐츠 상세에 ‘인증 방문자’로 공개됩니다.</li><li>방문당 한 개의 후기만 작성할 수 있습니다.</li></ul></section></div>
  </section>
}

export function CouponsPage() {
  const [coupons, setCoupons] = useState<MyCoupon[]>([])
  const [openCouponId, setOpenCouponId] = useState<string | null>(null)
  const [usageHistories, setUsageHistories] = useState<Record<string, MyCouponUsageHistoryItem[]>>({})
  const [usageHistoryErrors, setUsageHistoryErrors] = useState<Record<string, string>>({})
  const [loadingUsageHistoryCouponIds, setLoadingUsageHistoryCouponIds] = useState<Record<string, true>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)
  const usageHistoryRequestControllersRef = useRef(new Map<string, AbortController>())

  useEffect(() => {
    const accessToken = window.sessionStorage.getItem('accessToken')
    if (!accessToken) {
      setCoupons([])
      setOpenCouponId(null)
      setErrorMessage('로그인 정보가 없어 쿠폰을 조회할 수 없습니다. 다시 로그인해 주세요.')
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    setCoupons([])
    setOpenCouponId(null)
    setUsageHistories({})
    setUsageHistoryErrors({})
    setLoadingUsageHistoryCouponIds({})
    setIsLoading(true)
    setErrorMessage(null)
    getMyCoupons(accessToken, controller.signal)
      .then(({ coupons: myCoupons }) => {
        if (!controller.signal.aborted) setCoupons(myCoupons)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setErrorMessage(error instanceof Error ? error.message : '쿠폰을 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [requestVersion])

  useEffect(() => () => {
    usageHistoryRequestControllersRef.current.forEach((controller) => controller.abort())
    usageHistoryRequestControllersRef.current.clear()
  }, [])

  const loadUsageHistory = (couponId: string) => {
    if (usageHistories[couponId] || loadingUsageHistoryCouponIds[couponId]) return

    const accessToken = window.sessionStorage.getItem('accessToken')
    if (!accessToken) {
      setUsageHistoryErrors((current) => ({ ...current, [couponId]: '로그인 정보가 없어 사용 이력을 조회할 수 없습니다. 다시 로그인해 주세요.' }))
      return
    }

    const controller = new AbortController()
    usageHistoryRequestControllersRef.current.set(couponId, controller)
    setLoadingUsageHistoryCouponIds((current) => ({ ...current, [couponId]: true }))
    setUsageHistoryErrors((current) => {
      const { [couponId]: _, ...remainingErrors } = current
      return remainingErrors
    })
    getMyCouponUsageHistory(couponId, accessToken, controller.signal)
      .then(({ usageHistory }) => {
        if (!controller.signal.aborted) setUsageHistories((current) => ({ ...current, [couponId]: usageHistory }))
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setUsageHistoryErrors((current) => ({ ...current, [couponId]: error instanceof Error ? error.message : '사용 이력을 불러오지 못했습니다.' }))
      })
      .finally(() => {
        usageHistoryRequestControllersRef.current.delete(couponId)
        if (!controller.signal.aborted) {
          setLoadingUsageHistoryCouponIds((current) => {
            const { [couponId]: _, ...remainingCouponIds } = current
            return remainingCouponIds
          })
        }
      })
  }

  const toggleUsageHistory = (couponId: string) => {
    if (openCouponId === couponId) {
      setOpenCouponId(null)
      return
    }

    setOpenCouponId(couponId)
    loadUsageHistory(couponId)
  }

  const availableCouponCount = coupons.filter((coupon) => coupon.status === 'AVAILABLE').length

  return <section className="page-container narrow-page"><PageHeader title="쿠폰 지갑" description="보유한 쿠폰과 사용 내역을 확인하세요." action={!isLoading && !errorMessage ? <b className="green-text">사용 가능 쿠폰 {availableCouponCount}장</b> : undefined}><Breadcrumbs items={[{ label: '홈', to: '/' }, { label: '쿠폰 지갑' }]} /></PageHeader>
    <h2 className="content-title">보유 쿠폰</h2>{isLoading && <p className="empty-page">쿠폰을 불러오는 중입니다.</p>}{!isLoading && errorMessage && <div className="empty-page"><p>{errorMessage}</p><button className="text-link-button" type="button" onClick={() => setRequestVersion((version) => version + 1)}>다시 시도</button></div>}{!isLoading && !errorMessage && coupons.length === 0 && <p className="empty-page">보유한 쿠폰이 없습니다.</p>}{!isLoading && !errorMessage && coupons.length > 0 && <><div className="coupon-list">{coupons.map((coupon) => <Coupon key={coupon.couponId} coupon={coupon} isHistoryOpen={openCouponId === coupon.couponId} history={usageHistories[coupon.couponId]} historyErrorMessage={usageHistoryErrors[coupon.couponId]} isHistoryLoading={Boolean(loadingUsageHistoryCouponIds[coupon.couponId])} onToggleHistory={() => toggleUsageHistory(coupon.couponId)} onRetryHistory={() => loadUsageHistory(coupon.couponId)} />)}</div><p className="coupon-note">쿠폰 적용 가능 여부와 최종 할인 금액은 예약 결제 단계에서 현재 회차와 결제 금액을 기준으로 다시 확인됩니다. 사용·복구 이력은 쿠폰별로 확인할 수 있습니다.</p></>}
  </section>
}

function Coupon({ coupon, history, isHistoryOpen, isHistoryLoading, historyErrorMessage, onToggleHistory, onRetryHistory }: { coupon: MyCoupon; history?: MyCouponUsageHistoryItem[]; isHistoryOpen: boolean; isHistoryLoading: boolean; historyErrorMessage?: string; onToggleHistory: () => void; onRetryHistory: () => void }) { return <article className="coupon"><div><StatusPill tone={couponStatusTone(coupon.status)}>{couponStatusLabel(coupon.status)}</StatusPill><b>{couponCurrencyFormatter.format(coupon.discountAmount)}<small>원 할인</small></b></div><div><p>{coupon.policyName}</p><small>{coupon.minimumPaymentAmount > 0 ? `${couponCurrencyFormatter.format(coupon.minimumPaymentAmount)}원 이상 결제 시` : '결제 금액 제한 없음'} · {couponIssueSourceLabel(coupon.issueSourceType)} 발급</small><button className="coupon-history-toggle" type="button" aria-expanded={isHistoryOpen} aria-controls={`coupon-history-${coupon.couponId}`} onClick={onToggleHistory}>사용 이력 {isHistoryOpen ? '접기' : '보기'}</button></div><time>{couponDateFormatter.format(new Date(coupon.expiresAt))}까지<small>발급일 {couponDateFormatter.format(new Date(coupon.issuedAt))}</small></time>{isHistoryOpen && <div className="coupon-usage-history" id={`coupon-history-${coupon.couponId}`}><h3>사용 · 복구 이력</h3>{isHistoryLoading && <p>사용 이력을 불러오는 중입니다.</p>}{!isHistoryLoading && historyErrorMessage && <><Notice tone="red">{historyErrorMessage}</Notice><button className="text-link-button" type="button" onClick={onRetryHistory}>다시 시도</button></>}{!isHistoryLoading && !historyErrorMessage && history && (history.length ? history.map((item) => <HistoryItem key={item.couponRedemptionId} symbol={item.status === 'REVERSED' ? '↶' : '✓'} title={usageHistoryTitle(item)} sub={`예약 ID ${item.reservationId} · 가격 스냅샷 ID ${item.priceSnapshotId}`} date={usageHistoryDate(item)} />) : <p>사용·복구 이력이 없습니다.</p>)}</div>}</article> }
function HistoryItem({ symbol, title, sub, date }: { symbol: string; title: string; sub: string; date: string }) { return <article className="history-item"><span>{symbol}</span><div><b>{title}</b><small>{sub}</small></div><time>{date}</time></article> }

export function MissionsPage() {
  const { region, openRegionDialog } = useAppState()
  return <section className="page-container narrow-page"><PageHeader title="내 지역 미션" description="참여한 미션의 진행도와 완료 보상을 확인하세요." action={<button className="region-button" onClick={openRegionDialog}>✦ {region} · 지역 변경</button>}><Breadcrumbs items={[{ label: '홈', to: '/' }, { label: '내 지역 미션' }]} /></PageHeader>
    <div className="tab-row"><button className="active">진행 중 <b>2</b></button><button>완료 <b>1</b></button></div><div className="mission-list"><Mission count="2 / 3" title="김해 문화 한 바퀴" details="김해 가야문화 체험 · 대성동고분박물관 해설 · 낙동강 생태 탐방" date="8. 31. 종료" /><Mission count="1 / 3" title="김해에서 세 번 만나기" details="김해시의 행사·체험을 서로 다른 유형 방문으로 채워 보세요." date="9. 15. 종료" /></div><Notice>안내&nbsp; 완료 보상은 미션이 종료되기 전까지만 수령할 수 있습니다.</Notice>
  </section>
}

function Mission({ count, title, details, date }: { count: string; title: string; details: string; date: string }) { return <article className="mission-card"><div className="mission-count"><small>CONTENT_SET</small><b>{count}</b><span>콘텐츠 방문</span></div><div><StatusPill>참여 중</StatusPill><h2>{title}</h2><p>{details}</p><small>참여일 2026. 08. 07.</small><b className="mission-end">{date}</b></div><Link className="button-outline" to="/stampbook">미션 상세</Link></article> }

export function StampbookPage() {
  const { region, openRegionDialog } = useAppState()
  const [selected, setSelected] = useState('김해 문화 한 바퀴')
  const books = [['김해 문화 한 바퀴', '진행 중', '3 / 4개 적립'], ['김해 로컬 산책', '시작 전', '0 / 3개 적립'], ['가야 역사 산책', '종료', '2 / 4개 적립']]
  return <section className="page-container narrow-page"><PageHeader title="내 스탬프북" description="방문으로 적립한 스탬프와 대상 콘텐츠를 확인하세요." action={<button className="region-button" onClick={openRegionDialog}>✦ {region} · 지역 변경</button>}><Breadcrumbs items={[{ label: '홈', to: '/' }, { label: '내 스탬프북' }]} /></PageHeader>
    <div className="stamp-layout"><aside><h3>내 스탬프북 3개</h3>{books.map(([title, status, count]) => <button key={title} onClick={() => setSelected(title)} className={selected === title ? 'selected' : ''}><span>{title}<small>스탬프북 #101 · 공개 중</small><b>{count}</b></span><StatusPill tone={status === '진행 중' ? 'green' : 'gray'}>{status}</StatusPill></button>)}</aside><section className="stamp-detail"><div className="stamp-title"><div><small>스탬프북 #101 · 김해시</small><h2>{selected}</h2></div><StatusPill>진행 중</StatusPill></div><div className="stamp-progress"><span>현재 적립</span><b>3 / 4</b></div><div className="stamp-circles">{['가야문화', '대성동', '낙동강', '다음 방문'].map((item, index) => <div key={item} className={index < 3 ? 'complete' : ''}><b>{index < 3 ? '✓' : '+'}</b><span>{item}</span></div>)}</div><div className="stamp-items">{[['김해 가야문화 체험', '적립 완료 · 8. 06.'], ['대성동고분박물관 해설', '적립 완료 · 8. 09.'], ['낙동강 생태 탐방', '적립 완료 · 8. 12.'], ['봉리단길 로컬 산책', '방문하면 적립']].map(([title, status]) => <p key={title}><span>{title}</span><b>{status}</b></p>)}</div><Notice>안내&nbsp; 대상 콘텐츠마다 유효한 방문 기록으로 스탬프가 한 번만 적립됩니다.</Notice></section></div><section className="recent-stamps"><h2>최근 스탬프 적립 이력</h2><div><HistoryItem symbol="✓" title="낙동강 생태 탐방" sub="방문 8. 12. 13:48 · 적립 14:02" date="" /><HistoryItem symbol="✓" title="대성동고분박물관 해설" sub="방문 8. 09. 10:51 · 적립 11:03" date="" /></div></section>
  </section>
}
