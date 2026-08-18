import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getPublicContents, type PublicContent } from '../api/public'
import EventCard from '../components/EventCard'
import { Breadcrumbs, Notice, PageHeader, PlaceholderImage, StatusPill } from '../components/PageElements'
import { getEvent } from '../data/events'
import { useAppState } from '../components/AppLayout'

const filters = ['전체', '예약 가능만'] as const

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
  const event = getEvent(useParams().eventId)
  const { loggedIn } = useAppState()
  const navigate = useNavigate()
  return (
    <section className="page-container detail-page">
      <Breadcrumbs items={[{ label: '홈', to: '/' }, { label: '김해시 행사·체험', to: '/events' }, { label: event.title }]} />
      <PlaceholderImage tall />
      <div className="detail-status"><StatusPill tone={event.reservationStatus === '예약 가능' ? 'green' : 'gray'}>{event.reservationStatus}</StatusPill></div>
      <h1>{event.title}</h1>
      <p className="detail-lede">{event.description}</p>
      <div className="event-summary"><b>남은 회차</b> 6회</div>
      <section className="detail-section"><h2>행사·체험 소개</h2><p>가야 왕국의 역사와 문화를 쉽고 재미있게 만나보세요. 전시 해설을 듣고 유물 모형을 활용한 체험을 진행합니다. 가족과 친구, 혼자 방문한 분도 편안하게 참여할 수 있습니다.</p></section>
      <section className="detail-section"><h2>이용 안내</h2><div className="info-grid">
        <div><span>위치</span><b>{event.location}<br />{event.address}</b></div><div><span>운영 시간</span><b>매주 토·일<br />10:00–16:00</b></div>
        <div><span>연령</span><b>초등학생 이상<br />보호자 동반 시 미취학 아동 가능</b></div><div><span>준비물</span><b>편한 복장, 개인 물병<br />필기도구는 현장에서 제공</b></div>
      </div></section>
      <Notice>유의사항&nbsp; 체험 시작 10분 전까지 도착해 주세요. 예약 회차가 시작된 뒤에는 참여가 어려울 수 있습니다.</Notice>
      <section className="detail-section reviews-heading"><h2>방문 후기</h2><Link to={`/events/${event.id}/reviews`}>후기 16개 모두 보기 ›</Link></section>
      <div className="review-preview"><article><b>인증 방문자</b><span>★★★★★</span><p>아이와 함께 참여했는데 해설이 알기 쉽고 체험 시간도 알찼어요.</p></article><article><b>인증 방문자</b><span>★★★★★</span><p>가야 문화를 처음 접하는데도 재미있게 이해할 수 있었습니다.</p></article></div>
      <button className="button-primary detail-cta" onClick={() => navigate(loggedIn ? `/events/${event.id}/reserve` : '/login')}>{loggedIn ? '예약하기' : '로그인하고 예약하기'}</button>
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
