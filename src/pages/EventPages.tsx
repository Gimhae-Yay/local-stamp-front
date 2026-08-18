import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getPublicContent, getPublicContentReviews, getPublicContents, type PublicContent, type PublicContentDetail, type PublicContentReviewPage } from '../api/public'
import EventCard from '../components/EventCard'
import { Breadcrumbs, Notice, PageHeader, PlaceholderImage } from '../components/PageElements'
import { getEvent } from '../data/events'
import { useAppState } from '../components/AppLayout'

const filters = ['전체', '예약 가능만'] as const

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

    getPublicContentReviews(eventId, controller.signal)
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
  const event = getEvent(useParams().eventId)
  const { loggedIn } = useAppState()
  const reviewItems = [
    ['인증 방문자', '★★★★★', '아이와 함께 참여했는데 해설이 알기 쉽고 체험 시간도 알찼어요. 다음 프로그램도 예약하고 싶습니다.', '2026. 08. 13.'],
    ['인증 방문자', '★★★★★', '가야 문화를 처음 접하는데도 재미있게 이해할 수 있었습니다. 현장 안내도 친절했어요.', '2026. 08. 11.'],
    ['인증 방문자', '★★★★☆', '전시를 보고 체험까지 이어져서 아이가 특히 좋아했어요. 주말 가족 나들이로 추천합니다.', '2026. 08. 09.'],
    ['인증 방문자', '★★★★★', '설명과 만들기 활동의 균형이 좋았습니다. 다음 회차도 참여하고 싶어요.', '2026. 08. 04.'],
  ]
  return <section className="page-container narrow-page review-list-page">
    <PageHeader title={`${event.title} 후기`} description="체험에 참여한 인증 방문자의 후기를 확인하세요." action={<Link className="button-outline" to={loggedIn ? '/reviews/new' : '/login'}>후기 작성하기</Link>}>
      <Breadcrumbs items={[{ label: '홈', to: '/' }, { label: '김해시 행사·체험', to: '/events' }, { label: event.title, to: `/events/${event.id}` }, { label: '방문 후기' }]} />
    </PageHeader>
    <div className="review-summary"><b>방문 후기 16개</b></div>
    <div className="review-list">{reviewItems.map(([visitor, stars, content, date]) => <article key={date}><div><b>{visitor}</b><span>{stars}</span></div><p>{content}</p><time>{date}</time></article>)}</div>
    <div className="pagination" aria-label="후기 목록 페이지"><button className="current">1</button><button>2</button><button>3</button></div>
  </section>
}

export function NotFoundPage() {
  return <section className="page-container empty-page"><h1>찾으시는 페이지가 없어요.</h1><p>주소가 변경되었거나 존재하지 않는 페이지입니다.</p><Link className="button-primary" to="/">홈으로 돌아가기</Link></section>
}
