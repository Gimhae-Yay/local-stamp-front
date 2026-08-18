export interface PublicRegion {
  regionId: string
  regionCode: string
  name: string
}

export interface RegionHomeContent {
  contentId: string
  contentType: 'EVENT_EXPERIENCE'
  title: string
  locationText: string
  representativeImageUrl: string | null
  representativeImageUrlExpiresAt: string | null
  reservationAvailable: boolean
  displaySession: {
    sessionId: string
    startsAt: string
    endsAt: string
    remainingCapacity: number
  }
}

export interface PublicContent {
  contentId: string
  contentType: 'EVENT_EXPERIENCE'
  title: string
  locationText: string
  representativeImageUrl: string | null
  representativeImageUrlExpiresAt: string | null
  reservationAvailable: boolean
}

export interface PublicContentDetail {
  contentId: string
  contentType: 'EVENT_EXPERIENCE'
  title: string
  description: string
  representativeImageUrl: string | null
  representativeImageUrlExpiresAt: string | null
  locationText: string
  operatingHoursText: string
  contactText: string
  precautions: string
  ageRequirement: string
  materials: string
  cancellationPolicyText: string
}

export interface PublicContentReview {
  reviewId: string
  authorDisplayName: string
  rating: number
  reviewText: string
  createdAt: string
  updatedAt: string
}

export interface PublicContentReviewPage {
  content: PublicContentReview[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

interface ApiResponse<T> {
  statusCode: number
  code: string
  message: string
  data: T
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '')

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  if (!apiBaseUrl) {
    throw new Error('VITE_API_BASE_URL 환경 변수를 설정해 주세요.')
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: { Accept: 'application/json' },
    signal,
  })
  const body = await response.json().catch(() => null) as ApiResponse<T> | null

  if (!response.ok || !body) {
    throw new Error(body?.message ?? '요청을 처리하지 못했습니다.')
  }

  return body.data
}

export function getPublicRegions(signal?: AbortSignal) {
  return get<{ regions: PublicRegion[] }>('/api/v1/regions', signal)
}

export function getRegionHome(regionId: string, signal?: AbortSignal) {
  return get<{
    region: PublicRegion
    ongoingContents: RegionHomeContent[]
    upcomingContents: RegionHomeContent[]
  }>(`/api/v1/regions/${regionId}/home`, signal)
}

export function getPublicContents(regionId: string, reservationAvailable?: boolean, signal?: AbortSignal) {
  const query = new URLSearchParams({
    regionId,
    contentType: 'EVENT_EXPERIENCE',
  })

  if (reservationAvailable !== undefined) {
    query.set('reservationAvailable', String(reservationAvailable))
  }

  return get<{ contents: PublicContent[] }>(`/api/v1/contents?${query.toString()}`, signal)
}

export function getPublicContent(contentId: string, signal?: AbortSignal) {
  return get<PublicContentDetail>(`/api/v1/contents/${contentId}`, signal)
}

export function getPublicContentReviews(contentId: string, signal?: AbortSignal) {
  return get<PublicContentReviewPage>(`/api/v1/contents/${contentId}/reviews?page=0&size=2`, signal)
}
