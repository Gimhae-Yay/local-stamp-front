import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createVisitReview, getMyCouponUsageHistory, getMyCoupons, getMyMissionParticipations, getMyReservations, getMyStampbookDetail, getMyStampbookEarnings, getMyStampbooks, type CouponIssueSourceType, type CouponStatus, type MissionParticipationStatus, type MyCoupon, type MyCouponUsageHistoryItem, type MyMissionParticipation, type MyReservationSummary, type MyStampbook, type MyStampbookDetail, type MyStampbookEarning, type MyStampbookProgressStatus } from '../api/public'
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

const missionDateFormatter = new Intl.DateTimeFormat('ko-KR', {
  month: 'long',
  day: 'numeric',
  timeZone: 'Asia/Seoul',
})

function missionParticipationStatusLabel(status: MissionParticipationStatus) {
  return ({ IN_PROGRESS: '참여 중', COMPLETED: '완료', ENDED_INCOMPLETE: '미완료 종료' })[status]
}

function missionParticipationStatusTone(status: MissionParticipationStatus) {
  return ({ IN_PROGRESS: 'green', COMPLETED: 'blue', ENDED_INCOMPLETE: 'gray' })[status] as const
}

function missionProgressDescription(mission: MyMissionParticipation) {
  if (mission.status === 'COMPLETED') return '미션 조건을 모두 달성했습니다.'
  if (mission.status === 'ENDED_INCOMPLETE') return '미션이 완료되지 않은 채 종료되었습니다.'
  return `완료까지 ${Math.max(mission.requiredCount - mission.progressCount, 0)}개 남았어요.`
}

function missionParticipationDate(mission: MyMissionParticipation) {
  if (mission.status === 'COMPLETED' && mission.completedAt) {
    return `완료 ${missionDateFormatter.format(new Date(mission.completedAt))}`
  }
  return `참여 ${missionDateFormatter.format(new Date(mission.joinedAt))}`
}

const MISSION_PAGE_SIZE = 5

const stampbookDateFormatter = new Intl.DateTimeFormat('ko-KR', {
  month: 'numeric',
  day: 'numeric',
  timeZone: 'Asia/Seoul',
})
const stampbookDateTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Seoul',
})

function stampbookProgressStatusLabel(status: MyStampbookProgressStatus) {
  return ({ NOT_STARTED: '시작 전', IN_PROGRESS: '진행 중', COMPLETED: '완료', ENDED_INCOMPLETE: '미완료 종료' })[status]
}

function stampbookProgressStatusTone(status: MyStampbookProgressStatus) {
  return ({ NOT_STARTED: 'gray', IN_PROGRESS: 'green', COMPLETED: 'blue', ENDED_INCOMPLETE: 'gray' })[status] as const
}

function stampbookPublicationLabel(status: MyStampbook['status']) {
  return status === 'PUBLISHED' ? '공개 중' : '종료'
}

function stampbookTargetStatus(earned: boolean, earnedAt: string | null) {
  return earned ? `적립 완료${earnedAt ? ` · ${stampbookDateFormatter.format(new Date(earnedAt))}` : ''}` : '방문하면 적립'
}

function stampbookEarningSub(earning: MyStampbookEarning) {
  return `방문 ${stampbookDateTimeFormatter.format(new Date(earning.visitedAt))} · 적립 ${stampbookDateTimeFormatter.format(new Date(earning.earnedAt))}`
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
  const [activeTab, setActiveTab] = useState<'inProgress' | 'completed'>('inProgress')
  const [inProgressMissions, setInProgressMissions] = useState<MyMissionParticipation[]>([])
  const [completedMissions, setCompletedMissions] = useState<MyMissionParticipation[]>([])
  const [inProgressMissionCount, setInProgressMissionCount] = useState(0)
  const [completedMissionCount, setCompletedMissionCount] = useState(0)
  const [inProgressMissionPage, setInProgressMissionPage] = useState(0)
  const [completedMissionPage, setCompletedMissionPage] = useState(0)
  const [inProgressMissionTotalPages, setInProgressMissionTotalPages] = useState(0)
  const [completedMissionTotalPages, setCompletedMissionTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)

  useEffect(() => {
    const accessToken = window.sessionStorage.getItem('accessToken')
    if (!accessToken) {
      setInProgressMissions([])
      setCompletedMissions([])
      setInProgressMissionCount(0)
      setCompletedMissionCount(0)
      setInProgressMissionTotalPages(0)
      setCompletedMissionTotalPages(0)
      setErrorMessage('로그인 정보가 없어 내 미션을 조회할 수 없습니다. 다시 로그인해 주세요.')
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    setIsLoading(true)
    setErrorMessage(null)
    Promise.all([
      getMyMissionParticipations('IN_PROGRESS', accessToken, { page: inProgressMissionPage, size: MISSION_PAGE_SIZE, signal: controller.signal }),
      getMyMissionParticipations('COMPLETED', accessToken, { page: completedMissionPage, size: MISSION_PAGE_SIZE, signal: controller.signal }),
    ])
      .then(([inProgressPage, completedPage]) => {
        if (controller.signal.aborted) return
        setInProgressMissions(inProgressPage.content)
        setCompletedMissions(completedPage.content)
        setInProgressMissionCount(inProgressPage.totalElements)
        setCompletedMissionCount(completedPage.totalElements)
        setInProgressMissionTotalPages(inProgressPage.totalPages)
        setCompletedMissionTotalPages(completedPage.totalPages)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setErrorMessage(error instanceof Error ? error.message : '내 미션을 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [completedMissionPage, inProgressMissionPage, requestVersion])

  const missions = activeTab === 'inProgress' ? inProgressMissions : completedMissions
  const currentMissionPage = activeTab === 'inProgress' ? inProgressMissionPage : completedMissionPage
  const missionTotalPages = activeTab === 'inProgress' ? inProgressMissionTotalPages : completedMissionTotalPages

  const moveMissionPage = (nextPage: number) => {
    if (nextPage < 0 || nextPage >= missionTotalPages) return
    if (activeTab === 'inProgress') setInProgressMissionPage(nextPage)
    else setCompletedMissionPage(nextPage)
  }

  return <section className="page-container narrow-page"><PageHeader title="내 지역 미션" description="참여한 미션의 진행도와 완료 보상을 확인하세요." action={<button className="region-button" onClick={openRegionDialog}>✦ {region} · 지역 변경</button>}><Breadcrumbs items={[{ label: '홈', to: '/' }, { label: '내 지역 미션' }]} /></PageHeader>
    <div className="tab-row"><button className={activeTab === 'inProgress' ? 'active' : ''} type="button" onClick={() => setActiveTab('inProgress')}>진행 중 <b>{inProgressMissionCount}</b></button><button className={activeTab === 'completed' ? 'active' : ''} type="button" onClick={() => setActiveTab('completed')}>완료 <b>{completedMissionCount}</b></button></div>{isLoading && <p className="empty-page">내 미션을 불러오는 중입니다.</p>}{!isLoading && errorMessage && <div className="empty-page"><p>{errorMessage}</p><button className="text-link-button" type="button" onClick={() => setRequestVersion((version) => version + 1)}>다시 시도</button></div>}{!isLoading && !errorMessage && <>{missions.length > 0 ? <div className="mission-list">{missions.map((mission) => <Mission key={mission.participationId} mission={mission} />)}</div> : <p className="empty-page">{activeTab === 'inProgress' ? '진행 중인 미션이 없습니다.' : '완료한 미션이 없습니다.'}</p>}{missionTotalPages > 1 && <div className="pagination" aria-label="내 미션 목록 페이지"><button type="button" onClick={() => moveMissionPage(currentMissionPage - 1)} disabled={currentMissionPage === 0}>이전</button><button type="button" className="current" disabled>{currentMissionPage + 1} / {missionTotalPages}</button><button type="button" onClick={() => moveMissionPage(currentMissionPage + 1)} disabled={currentMissionPage + 1 >= missionTotalPages}>다음</button></div>}</>}<Notice>안내&nbsp; 완료 보상은 미션이 종료되기 전까지만 수령할 수 있습니다.</Notice>
  </section>
}

function Mission({ mission }: { mission: MyMissionParticipation }) { return <article className="mission-card"><div className="mission-count"><small>진행도</small><b>{mission.progressCount} / {mission.requiredCount}</b><span>미션 조건</span></div><div><StatusPill tone={missionParticipationStatusTone(mission.status)}>{missionParticipationStatusLabel(mission.status)}</StatusPill><h2>{mission.title}</h2><p>{missionProgressDescription(mission)}</p><small>{missionParticipationDate(mission)}</small><b className="mission-end">{mission.rewardClaimed ? '보상 수령 완료' : mission.status === 'COMPLETED' ? '보상 미수령' : '진행 중'}</b></div></article> }

export function StampbookPage() {
  const [stampbooks, setStampbooks] = useState<MyStampbook[]>([])
  const [selectedStampbookId, setSelectedStampbookId] = useState<string | null>(null)
  const [selectedStampbook, setSelectedStampbook] = useState<MyStampbookDetail | null>(null)
  const [earnings, setEarnings] = useState<MyStampbookEarning[]>([])
  const [isListLoading, setIsListLoading] = useState(true)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [listErrorMessage, setListErrorMessage] = useState<string | null>(null)
  const [detailErrorMessage, setDetailErrorMessage] = useState<string | null>(null)
  const [listRequestVersion, setListRequestVersion] = useState(0)
  const [detailRequestVersion, setDetailRequestVersion] = useState(0)

  useEffect(() => {
    const accessToken = window.sessionStorage.getItem('accessToken')
    if (!accessToken) {
      setStampbooks([])
      setSelectedStampbookId(null)
      setListErrorMessage('로그인 정보가 없어 내 스탬프북을 조회할 수 없습니다. 다시 로그인해 주세요.')
      setIsListLoading(false)
      return
    }

    const controller = new AbortController()
    setIsListLoading(true)
    setListErrorMessage(null)
    getMyStampbooks(accessToken, controller.signal)
      .then(({ stampbooks: myStampbooks }) => {
        if (controller.signal.aborted) return
        setStampbooks(myStampbooks)
        setSelectedStampbookId((currentStampbookId) => currentStampbookId && myStampbooks.some((stampbook) => stampbook.stampbookId === currentStampbookId)
          ? currentStampbookId
          : myStampbooks[0]?.stampbookId ?? null)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setListErrorMessage(error instanceof Error ? error.message : '내 스탬프북을 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsListLoading(false)
      })

    return () => controller.abort()
  }, [listRequestVersion])

  useEffect(() => {
    if (!selectedStampbookId) {
      setSelectedStampbook(null)
      setEarnings([])
      setDetailErrorMessage(null)
      setIsDetailLoading(false)
      return
    }

    const accessToken = window.sessionStorage.getItem('accessToken')
    if (!accessToken) {
      setSelectedStampbook(null)
      setEarnings([])
      setDetailErrorMessage('로그인 정보가 없어 스탬프북 상세를 조회할 수 없습니다. 다시 로그인해 주세요.')
      setIsDetailLoading(false)
      return
    }

    const controller = new AbortController()
    setSelectedStampbook(null)
    setEarnings([])
    setIsDetailLoading(true)
    setDetailErrorMessage(null)
    Promise.all([
      getMyStampbookDetail(selectedStampbookId, accessToken, controller.signal),
      getMyStampbookEarnings(selectedStampbookId, accessToken, controller.signal),
    ])
      .then(([stampbookDetail, stampbookEarnings]) => {
        if (controller.signal.aborted) return
        setSelectedStampbook(stampbookDetail)
        setEarnings(stampbookEarnings.earnings)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setDetailErrorMessage(error instanceof Error ? error.message : '스탬프북 상세를 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsDetailLoading(false)
      })

    return () => controller.abort()
  }, [detailRequestVersion, selectedStampbookId])

  return <section className="page-container narrow-page"><PageHeader title="내 스탬프북" description="방문으로 적립한 스탬프와 대상 콘텐츠를 확인하세요."><Breadcrumbs items={[{ label: '홈', to: '/' }, { label: '내 스탬프북' }]} /></PageHeader>
    {isListLoading && <p className="empty-page">내 스탬프북을 불러오는 중입니다.</p>}{!isListLoading && listErrorMessage && <div className="empty-page"><p>{listErrorMessage}</p><button className="text-link-button" type="button" onClick={() => setListRequestVersion((version) => version + 1)}>다시 시도</button></div>}{!isListLoading && !listErrorMessage && stampbooks.length === 0 && <p className="empty-page">참여 중인 스탬프북이 없습니다.</p>}{!isListLoading && !listErrorMessage && stampbooks.length > 0 && <><div className="stamp-layout"><aside><h3>내 스탬프북 {stampbooks.length}개</h3>{stampbooks.map((stampbook) => <button key={stampbook.stampbookId} type="button" onClick={() => setSelectedStampbookId(stampbook.stampbookId)} className={selectedStampbookId === stampbook.stampbookId ? 'selected' : ''}><span>{stampbook.title}<small>스탬프북 #{stampbook.stampbookId} · {stampbookPublicationLabel(stampbook.status)}</small><b>{stampbook.progress.earnedCount} / {stampbook.progress.targetCount}개 적립</b></span><StatusPill tone={stampbookProgressStatusTone(stampbook.progress.status)}>{stampbookProgressStatusLabel(stampbook.progress.status)}</StatusPill></button>)}</aside><section className="stamp-detail">{isDetailLoading && <p className="stamp-detail-state">스탬프북 상세를 불러오는 중입니다.</p>}{!isDetailLoading && detailErrorMessage && <div className="stamp-detail-state"><p>{detailErrorMessage}</p><button className="text-link-button" type="button" onClick={() => setDetailRequestVersion((version) => version + 1)}>다시 시도</button></div>}{!isDetailLoading && !detailErrorMessage && selectedStampbook && <><div className="stamp-title"><div><small>스탬프북 #{selectedStampbook.stampbook.stampbookId}</small><h2>{selectedStampbook.stampbook.title}</h2></div><StatusPill tone={stampbookProgressStatusTone(selectedStampbook.progress.status)}>{stampbookProgressStatusLabel(selectedStampbook.progress.status)}</StatusPill></div><div className="stamp-progress"><span>현재 적립</span><b>{selectedStampbook.progress.earnedCount} / {selectedStampbook.progress.targetCount}</b></div><div className="stamp-circles">{selectedStampbook.stampbook.targetContents.map((content) => <div key={content.contentId} className={content.earned ? 'complete' : ''}><b>{content.earned ? '✓' : '+'}</b><span>{content.title}</span></div>)}</div><div className="stamp-items">{selectedStampbook.stampbook.targetContents.map((content) => <p key={content.contentId}><span>{content.title}</span><b>{stampbookTargetStatus(content.earned, content.earnedAt)}</b></p>)}</div><Notice>안내&nbsp; 대상 콘텐츠마다 유효한 방문 기록으로 스탬프가 한 번만 적립됩니다.</Notice></>}</section></div>{!isDetailLoading && !detailErrorMessage && selectedStampbook && <section className="recent-stamps"><h2>최근 스탬프 적립 이력</h2>{earnings.length > 0 ? <div>{earnings.map((earning) => <HistoryItem key={earning.stampEarnId} symbol="✓" title={earning.content.title} sub={stampbookEarningSub(earning)} date="" />)}</div> : <p className="stamp-earnings-empty">아직 적립된 스탬프가 없습니다.</p>}</section>}</>}
  </section>
}
