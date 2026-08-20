import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"
import {
  getPublicContent,
  getPublicContentReviews,
  getPublicContents,
  type PublicContent,
  type PublicContentDetail,
  type PublicContentReviewPage,
} from "../api/public"
import EventCard from "../components/EventCard"
import { Breadcrumbs, Notice, PageHeader } from "../components/PageElements"
import PresignedImage, {
  usePresignedImageRefresh,
} from "../components/PresignedImage"
import { useAppState } from "../components/AppLayout"

const filters = ["전체", "예약 가능만"] as const
const pageSize = 6
const reviewDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Seoul",
})

function isFilter(value: string | null): value is typeof filters[number] {
  return filters.some((filter) => filter === value)
}

function toStars(rating: number) {
  const clampedRating = Math.min(5, Math.max(0, Math.round(rating)))
  return `${"★".repeat(clampedRating)}${"☆".repeat(5 - clampedRating)}`
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function EventsPage() {
  const { region, regionId, openRegionDialog } = useAppState()
  const [params, setParams] = useSearchParams()
  const filterParam = params.get("filter")
  const filter = isFilter(filterParam) ? filterParam : "전체"
  const requestedPage = Number(params.get("page") ?? "1")
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const [contents, setContents] = useState<PublicContent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)
  const failedImageUrls = useRef(new Set<string>())
  const refreshImages = useCallback((failedUrl?: string) => {
    if (failedUrl) {
      if (failedImageUrls.current.has(failedUrl)) return
      failedImageUrls.current.add(failedUrl)
    }
    setRequestVersion((version) => version + 1)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setIsLoading(true)
    setLoadError(null)

    getPublicContents(
      regionId,
      filter === "예약 가능만" ? true : undefined,
      controller.signal,
    )
      .then(({ contents: nextContents }) => setContents(nextContents))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return
        setContents([])
        setLoadError(errorMessage(error, "행사·체험을 불러오지 못했습니다."))
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [filter, regionId, requestVersion])

  usePresignedImageRefresh(
    contents.map((content) => content.representativeImageUrlExpiresAt),
    refreshImages,
  )

  const totalPages = Math.max(1, Math.ceil(contents.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageContents = useMemo(
    () => contents.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [contents, currentPage],
  )
  const changeFilter = (nextFilter: typeof filters[number]) => {
    setParams(nextFilter === "전체" ? {} : { filter: nextFilter })
  }
  const moveToPage = (nextPage: number) => {
    setParams({
      ...(filter === "전체" ? {} : { filter }),
      ...(nextPage === 1 ? {} : { page: String(nextPage) }),
    })
  }

  return (
    <section className="page-container">
      <PageHeader
        title={`${region} 전체 행사·체험`}
        description="행사·체험의 기본 정보와 예약 가능 여부를 확인해 보세요."
        action={
          <button className="region-button" onClick={openRegionDialog}>
            ✦ {region} · 지역 변경
          </button>
        }
      >
        <Breadcrumbs
          items={[{ label: "홈", to: "/" }, { label: `${region} 행사·체험` }]}
        />
      </PageHeader>
      <div className="filter-row">
        <div className="filter-chips">
          {filters.map((item) => (
            <button
              key={item}
              className={filter === item ? "selected" : ""}
              onClick={() => changeFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>
        {!isLoading && !loadError && (
          <span>
            <b>{contents.length}개</b> 행사·체험
          </span>
        )}
      </div>
      {isLoading && (
        <p className="visitor-page-state">행사·체험을 불러오는 중입니다.</p>
      )}
      {!isLoading && loadError && (
        <div className="visitor-page-state">
          <p>{loadError}</p>
          <button
            className="text-link-button"
            type="button"
            onClick={refreshImages}
          >
            다시 시도
          </button>
        </div>
      )}
      {!isLoading && !loadError && pageContents.length > 0 && (
        <div className="event-grid">
          {pageContents.map((content) => (
            <EventCard
              key={content.contentId}
              content={content}
              onImageRefresh={refreshImages}
            />
          ))}
        </div>
      )}
      {!isLoading && !loadError && contents.length === 0 && (
        <p className="visitor-page-state">조건에 맞는 행사·체험이 없습니다.</p>
      )}
      {!isLoading && !loadError && totalPages > 1 && (
        <div className="pagination" aria-label="행사 목록 페이지">
          {Array.from({ length: totalPages }, (_, index) => index + 1).map(
            (item) => (
              <button
                key={item}
                onClick={() => moveToPage(item)}
                className={item === currentPage ? "current" : ""}
              >
                {item}
              </button>
            ),
          )}
        </div>
      )}
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
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reviewsError, setReviewsError] = useState<string | null>(null)
  const [contentRequestVersion, setContentRequestVersion] = useState(0)
  const failedImageUrls = useRef(new Set<string>())
  const refreshContent = useCallback((failedUrl?: string) => {
    if (failedUrl) {
      if (failedImageUrls.current.has(failedUrl)) return
      failedImageUrls.current.add(failedUrl)
    }
    setContentRequestVersion((version) => version + 1)
  }, [])

  useEffect(() => {
    if (!eventId) {
      setLoadError("행사·체험 정보를 찾을 수 없습니다.")
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    setIsLoading(true)
    setLoadError(null)
    getPublicContent(eventId, controller.signal)
      .then(setContent)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return
        setLoadError(
          errorMessage(error, "행사·체험 정보를 불러오지 못했습니다."),
        )
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [eventId, contentRequestVersion])

  useEffect(() => {
    if (!eventId) {
      setIsReviewsLoading(false)
      return
    }

    const controller = new AbortController()
    setIsReviewsLoading(true)
    setReviewsError(null)
    getPublicContentReviews(eventId, { size: 2, signal: controller.signal })
      .then(setReviews)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return
        setReviewsError(errorMessage(error, "후기를 불러오지 못했습니다."))
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsReviewsLoading(false)
      })

    return () => controller.abort()
  }, [eventId])

  usePresignedImageRefresh(
    [content?.representativeImageUrlExpiresAt],
    refreshContent,
  )

  if (isLoading) {
    return (
      <section className="page-container visitor-page-state">
        행사·체험 정보를 불러오는 중입니다.
      </section>
    )
  }
  if (loadError || !content) {
    return (
      <section className="page-container visitor-page-state">
        <p>{loadError ?? "행사·체험 정보를 찾을 수 없습니다."}</p>
        <button
          className="text-link-button"
          type="button"
          onClick={refreshContent}
        >
          다시 시도
        </button>
      </section>
    )
  }

  return (
    <section className="page-container detail-page">
      <Breadcrumbs
        items={[
          { label: "홈", to: "/" },
          { label: "행사·체험", to: "/events" },
          { label: content.title },
        ]}
      />
      <PresignedImage
        src={content.representativeImageUrl}
        expiresAt={content.representativeImageUrlExpiresAt}
        alt={`${content.title} 대표 이미지`}
        onRefresh={refreshContent}
        fallbackTall
        style={{
          width: "100%",
          height: 214,
          objectFit: "cover",
          display: "block",
          border: "1px solid #c8ddc6",
          borderRadius: "var(--radius)",
        }}
      />
      <h1>{content.title}</h1>
      <p className="detail-lede">{content.description}</p>
      <section className="detail-section">
        <h2>행사·체험 소개</h2>
        <p>{content.description}</p>
      </section>
      <section className="detail-section">
        <h2>이용 안내</h2>
        <div className="info-grid">
          <div>
            <span>위치</span>
            <b>{content.locationText}</b>
          </div>
          <div>
            <span>운영 시간</span>
            <b>{content.operatingHoursText}</b>
          </div>
          <div>
            <span>연령</span>
            <b>{content.ageRequirement}</b>
          </div>
          <div>
            <span>준비물</span>
            <b>{content.materials}</b>
          </div>
          <div>
            <span>문의</span>
            <b>{content.contactText}</b>
          </div>
          <div>
            <span>예약 취소</span>
            <b>{content.cancellationPolicyText}</b>
          </div>
        </div>
      </section>
      <Notice>유의사항&nbsp; {content.precautions}</Notice>
      <section className="detail-section reviews-heading">
        <h2>방문 후기</h2>
        <Link to={`/events/${content.contentId}/reviews`}>
          {!isReviewsLoading && !reviewsError
            ? `후기 ${reviews?.totalElements ?? 0}개 모두 보기 ›`
            : "후기 모두 보기 ›"}
        </Link>
      </section>
      {isReviewsLoading && <p>후기를 불러오는 중입니다.</p>}
      {!isReviewsLoading && reviewsError && <p>{reviewsError}</p>}
      {!isReviewsLoading && !reviewsError && reviews?.content.length === 0 && (
        <p>아직 등록된 후기가 없습니다.</p>
      )}
      {!isReviewsLoading &&
        !reviewsError &&
        reviews &&
        reviews.content.length > 0 && (
          <div className="review-preview">
            {reviews.content.map((review) => (
              <article key={review.reviewId}>
                <b>{review.authorDisplayName}</b>
                <span>{toStars(review.rating)}</span>
                <p>{review.reviewText}</p>
              </article>
            ))}
          </div>
        )}
      <button
        className="button-primary detail-cta"
        onClick={() =>
          navigate(loggedIn ? `/events/${content.contentId}/reserve` : "/login")
        }
      >
        {loggedIn ? "예약하기" : "로그인하고 예약하기"}
      </button>
    </section>
  )
}

export function ReviewsPage() {
  const { eventId } = useParams()
  const { loggedIn } = useAppState()
  const [params, setParams] = useSearchParams()
  const requestedPage = Number(params.get("page") ?? "1")
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage - 1 : 0
  const [content, setContent] = useState<PublicContentDetail | null>(null)
  const [reviews, setReviews] = useState<PublicContentReviewPage | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)
  const retry = useCallback(
    () => setRequestVersion((version) => version + 1),
    [],
  )

  useEffect(() => {
    if (!eventId) {
      setLoadError("후기를 불러올 행사·체험을 찾을 수 없습니다.")
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    setIsLoading(true)
    setLoadError(null)
    Promise.all([
      getPublicContent(eventId, controller.signal),
      getPublicContentReviews(eventId, {
        page,
        size: 10,
        signal: controller.signal,
      }),
    ])
      .then(([nextContent, nextReviews]) => {
        setContent(nextContent)
        setReviews(nextReviews)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return
        setLoadError(errorMessage(error, "후기를 불러오지 못했습니다."))
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [eventId, page, requestVersion])

  if (isLoading) {
    return (
      <section className="page-container visitor-page-state">
        후기를 불러오는 중입니다.
      </section>
    )
  }
  if (loadError || !content || !reviews) {
    return (
      <section className="page-container visitor-page-state">
        <p>{loadError ?? "후기를 불러오지 못했습니다."}</p>
        <button className="text-link-button" type="button" onClick={retry}>
          다시 시도
        </button>
      </section>
    )
  }

  return (
    <section className="page-container narrow-page review-list-page">
      <PageHeader
        title={`${content.title} 후기`}
        description="체험에 참여한 인증 방문자의 후기를 확인하세요."
        action={
          <Link
            className="button-outline"
            to={loggedIn ? "/reservations?tab=past" : "/login"}
          >
            후기 작성하기
          </Link>
        }
      >
        <Breadcrumbs
          items={[
            { label: "홈", to: "/" },
            { label: "행사·체험", to: "/events" },
            { label: content.title, to: `/events/${content.contentId}` },
            { label: "방문 후기" },
          ]}
        />
      </PageHeader>
      <div className="review-summary">
        <b>방문 후기 {reviews.totalElements}개</b>
      </div>
      {reviews.content.length === 0 && (
        <p className="visitor-page-state">아직 등록된 후기가 없습니다.</p>
      )}
      {reviews.content.length > 0 && (
        <div className="review-list">
          {reviews.content.map((review) => (
            <article key={review.reviewId}>
              <div>
                <b>{review.authorDisplayName}</b>
                <span>{toStars(review.rating)}</span>
              </div>
              <p>{review.reviewText}</p>
              <time>
                {reviewDateFormatter.format(new Date(review.createdAt))}
              </time>
            </article>
          ))}
        </div>
      )}
      {reviews.totalPages > 1 && (
        <div className="pagination" aria-label="후기 목록 페이지">
          {Array.from({ length: reviews.totalPages }, (_, index) => index).map(
            (item) => (
              <button
                key={item}
                onClick={() =>
                  setParams(item === 0 ? {} : { page: String(item + 1) })
                }
                className={item === reviews.page ? "current" : ""}
              >
                {item + 1}
              </button>
            ),
          )}
        </div>
      )}
    </section>
  )
}

export function NotFoundPage() {
  return (
    <section className="page-container empty-page">
      <h1>찾으시는 페이지가 없어요.</h1>
      <p>주소가 변경되었거나 존재하지 않는 페이지입니다.</p>
      <Link className="button-primary" to="/">
        홈으로 돌아가기
      </Link>
    </section>
  )
}
