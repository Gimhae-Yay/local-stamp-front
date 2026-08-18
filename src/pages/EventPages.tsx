import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getPublicContent, getPublicContentReviews, getPublicContents, type PublicContent, type PublicContentDetail, type PublicContentReviewPage } from '../api/public'
import EventCard from '../components/EventCard'
import { Breadcrumbs, Notice, PageHeader, PlaceholderImage } from '../components/PageElements'
import { useAppState } from '../components/AppLayout'

const filters = ['전체', '예약 가능만'] as const
const reviewDateFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'Asia/Seoul',
})

function toStars(rating: number) {
  const clampedRating = Math.min(5, Math.max(0, rating))
  return `${'★'.repeat(clampedRating)}${'☆'.repeat(5 - clampedRating)}`
}

export function EventsPage() {
  const { region, regionId, openRegionDialog } = useAppState()
  const [filter, setFilter] = useState<(typeof filters)[number]>('전체')
  const [contents, setContents] = useState<PublicContent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)

  useEffect(() => {
    if (!regionId) {
      setContents([])
      return
    }

    const controller = new AbortController()
    setIsLoading(true)
    setErrorMessage(null)
    getPublicContents(regionId, filter === '예약 가능만' ? true : undefined, controller.signal)
      .then(({ contents: publicContents }) => setContents(publicContents))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setContents([])
        setErrorMessage(error instanceof Error ? error.message : '행사·체험을 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [regionId, filter, requestVersion])

  return (
    <section className="page-container">
      <PageHeader title={`${region} 전체 행사·체험`} description="행사·체험의 기본 정보와 예약 가능 여부를 확인해 보세요." action={<button className="region-button" onClick={openRegionDialog}>✦ {region} · 지역 변경</button>}>
        <Breadcrumbs items={[{ label: '홈', to: '/' }, { label: `${region} 행사·체험` }]} />
      </PageHeader>
      <div className="filter-row">
        <div className="filter-chips">{filters.map((item) => <button key={item} className={filter === item ? 'selected' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div>
        {!isLoading && !errorMessage && <span><b>{contents.length}개</b> 행사·체험</span>}
      </div>
      {isLoading && <p className="empty-page">행사·체험을 불러오는 중입니다.</p>}
      {!isLoading && errorMessage && <div className="empty-page"><p>{errorMessage}</p><button className="text-link-button" type="button" onClick={() => setRequestVersion((version) => version + 1)}>다시 시도</button></div>}
      {!isLoading && !errorMessage && <div className="event-grid">{contents.map((content) => <EventCard key={content.contentId} content={content} />)}</div>}
      {!isLoading && !errorMessage && contents.length === 0 && <p className="empty-page">조건에 맞는 행사·체험이 없습니다.</p>}
    </section>
  )
}

export function EventDetailPage() {
  const { eventId } = useParams()
  const { loggedIn } = useAppState()
  const navigate = useNavigate()
  const [content, setContent] = useState<PublicContentDetail | null>(null)
  const [reviews, setReviews] = useState<PublicContentReviewPage | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isReviewsLoading, setIsReviewsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [reviewsErrorMessage, setReviewsErrorMessage] = useState<string | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)

  useEffect(() => {
    if (!eventId) {
      setContent(null)
      setErrorMessage('행사·체험 정보를 찾을 수 없습니다.')
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    setContent(null)
    setReviews(null)
    setIsLoading(true)
    setIsReviewsLoading(true)
    setErrorMessage(null)
    setReviewsErrorMessage(null)

    getPublicContent(eventId, controller.signal)
      .then(setContent)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setErrorMessage(error instanceof Error ? error.message : '행사·체험 정보를 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    getPublicContentReviews(eventId, { size: 2, signal: controller.signal })
      .then(setReviews)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setReviewsErrorMessage(error instanceof Error ? error.message : '후기를 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsReviewsLoading(false)
      })

    return () => controller.abort()
  }, [eventId, requestVersion])

  if (isLoading) {
    return <section className="page-container empty-page"><p>행사·체험 정보를 불러오는 중입니다.</p></section>
  }

  if (errorMessage || !content) {
    return <section className="page-container empty-page"><p>{errorMessage ?? '행사·체험 정보를 찾을 수 없습니다.'}</p><button className="text-link-button" type="button" onClick={() => setRequestVersion((version) => version + 1)}>다시 시도</button></section>
  }

  return (
    <section className="page-container detail-page">
      <Breadcrumbs items={[{ label: '홈', to: '/' }, { label: '행사·체험', to: '/events' }, { label: content.title }]} />
      {content.representativeImageUrl
        ? <img src={content.representativeImageUrl} alt={`${content.title} 대표 이미지`} style={{ width: '100%', height: 214, objectFit: 'cover', border: '1px solid #c8ddc6', borderRadius: 'var(--radius)' }} />
        : <PlaceholderImage tall />}
      <h1>{content.title}</h1>
      <section className="detail-section"><h2>행사·체험 소개</h2><p>{content.description}</p></section>
      <section className="detail-section"><h2>이용 안내</h2><div className="info-grid">
        <div><span>위치</span><b>{content.locationText}</b></div><div><span>운영 시간</span><b>{content.operatingHoursText}</b></div>
        <div><span>연령</span><b>{content.ageRequirement}</b></div><div><span>준비물</span><b>{content.materials}</b></div>
        <div><span>문의</span><b>{content.contactText}</b></div><div><span>예약 취소</span><b>{content.cancellationPolicyText}</b></div>
      </div></section>
      <Notice>유의사항&nbsp; {content.precautions}</Notice>
      <section className="detail-section reviews-heading"><h2>방문 후기</h2><Link to={`/events/${content.contentId}/reviews`}>{!isReviewsLoading && !reviewsErrorMessage ? `후기 ${reviews?.totalElements ?? 0}개 모두 보기 ›` : '후기 모두 보기 ›'}</Link></section>
      {isReviewsLoading && <p>후기를 불러오는 중입니다.</p>}
      {!isReviewsLoading && reviewsErrorMessage && <p>{reviewsErrorMessage}</p>}
      {!isReviewsLoading && !reviewsErrorMessage && reviews?.content.length === 0 && <p>아직 등록된 후기가 없습니다.</p>}
      {!isReviewsLoading && !reviewsErrorMessage && reviews && reviews.content.length > 0 && <div className="review-preview">{reviews.content.map((review) => <article key={review.reviewId}><b>{review.authorDisplayName}</b><span>{toStars(review.rating)}</span><p>{review.reviewText}</p></article>)}</div>}
      <button className="button-primary detail-cta" onClick={() => navigate(loggedIn ? `/events/${content.contentId}/reserve` : '/login')}>{loggedIn ? '예약하기' : '로그인하고 예약하기'}</button>
    </section>
  )
}

export function ReviewsPage() {
  const { eventId } = useParams()
  const { loggedIn } = useAppState()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedPage = Number(searchParams.get('page') ?? '1')
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage - 1 : 0
  const [content, setContent] = useState<PublicContentDetail | null>(null)
  const [reviews, setReviews] = useState<PublicContentReviewPage | null>(null)
  const [isContentLoading, setIsContentLoading] = useState(true)
  const [isReviewsLoading, setIsReviewsLoading] = useState(true)
  const [contentErrorMessage, setContentErrorMessage] = useState<string | null>(null)
  const [reviewsErrorMessage, setReviewsErrorMessage] = useState<string | null>(null)
  const [contentRequestVersion, setContentRequestVersion] = useState(0)
  const [reviewsRequestVersion, setReviewsRequestVersion] = useState(0)

  useEffect(() => {
    if (!eventId) {
      setContent(null)
      setContentErrorMessage('행사·체험 정보를 찾을 수 없습니다.')
      setIsContentLoading(false)
      return
    }

    const controller = new AbortController()
    setContent(null)
    setIsContentLoading(true)
    setContentErrorMessage(null)
    getPublicContent(eventId, controller.signal)
      .then(setContent)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setContentErrorMessage(error instanceof Error ? error.message : '행사·체험 정보를 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsContentLoading(false)
      })

    return () => controller.abort()
  }, [eventId, contentRequestVersion])

  useEffect(() => {
    if (!eventId) {
      setReviews(null)
      setReviewsErrorMessage('후기를 불러올 콘텐츠를 찾을 수 없습니다.')
      setIsReviewsLoading(false)
      return
    }

    const controller = new AbortController()
    setReviews(null)
    setIsReviewsLoading(true)
    setReviewsErrorMessage(null)
    getPublicContentReviews(eventId, { page, size: 10, signal: controller.signal })
      .then(setReviews)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setReviewsErrorMessage(error instanceof Error ? error.message : '후기를 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsReviewsLoading(false)
      })

    return () => controller.abort()
  }, [eventId, page, reviewsRequestVersion])

  const moveToPage = (nextPage: number) => {
    setSearchParams(nextPage === 0 ? {} : { page: String(nextPage + 1) })
  }

  if (isContentLoading) {
    return <section className="page-container empty-page"><p>행사·체험 정보를 불러오는 중입니다.</p></section>
  }

  if (contentErrorMessage || !content) {
    return <section className="page-container empty-page"><p>{contentErrorMessage ?? '행사·체험 정보를 찾을 수 없습니다.'}</p><button className="text-link-button" type="button" onClick={() => setContentRequestVersion((version) => version + 1)}>다시 시도</button></section>
  }

  return <section className="page-container narrow-page review-list-page">
    <PageHeader title={`${content.title} 후기`} description="체험에 참여한 인증 방문자의 후기를 확인하세요." action={<Link className="button-outline" to={loggedIn ? '/reviews/new' : '/login'}>후기 작성하기</Link>}>
      <Breadcrumbs items={[{ label: '홈', to: '/' }, { label: '행사·체험', to: '/events' }, { label: content.title, to: `/events/${content.contentId}` }, { label: '방문 후기' }]} />
    </PageHeader>
    {isReviewsLoading && <p className="empty-page">후기를 불러오는 중입니다.</p>}
    {!isReviewsLoading && reviewsErrorMessage && <div className="empty-page"><p>{reviewsErrorMessage}</p><button className="text-link-button" type="button" onClick={() => setReviewsRequestVersion((version) => version + 1)}>다시 시도</button></div>}
    {!isReviewsLoading && !reviewsErrorMessage && reviews && <>
      <div className="review-summary"><b>방문 후기 {reviews.totalElements}개</b></div>
      {reviews.content.length > 0
        ? <div className="review-list">{reviews.content.map((review) => <article key={review.reviewId}><div><b>{review.authorDisplayName}</b><span>{toStars(review.rating)}</span></div><p>{review.reviewText}</p><time dateTime={review.createdAt}>{reviewDateFormatter.format(new Date(review.createdAt))}</time></article>)}</div>
        : <p className="empty-page">아직 등록된 후기가 없습니다.</p>}
      {reviews.totalPages > 1 && <div className="pagination" aria-label="후기 목록 페이지"><button type="button" onClick={() => moveToPage(reviews.page - 1)} disabled={reviews.page === 0}>이전</button><button type="button" className="current" disabled>{reviews.page + 1} / {reviews.totalPages}</button><button type="button" onClick={() => moveToPage(reviews.page + 1)} disabled={reviews.page + 1 >= reviews.totalPages}>다음</button></div>}
    </>}
  </section>
}

export function NotFoundPage() {
  return <section className="page-container empty-page"><h1>찾으시는 페이지가 없어요.</h1><p>주소가 변경되었거나 존재하지 않는 페이지입니다.</p><Link className="button-primary" to="/">홈으로 돌아가기</Link></section>
}
