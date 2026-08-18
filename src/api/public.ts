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

export interface VisitReview {
  reviewId: string
  visitId: string
  contentId: string
  rating: number
  reviewText: string
  createdAt: string
}

export interface PublicContentSession {
  sessionId: string
  startsAt: string
  endsAt: string
}

export interface ReservationHold {
  holdId: string
  sessionId: string
  quantity: number
  status: 'ACTIVE'
  expiresAt: string
  createdAt: string
}

export interface PublicSessionReservationInfo {
  sessionId: string
  contentId: string
  startsAt: string
  endsAt: string
  price: number
  remainingCapacity: number
  reservable: boolean
}

export interface ReservationConfirmation {
  reservationId: string
  reservationNo: string
  holdId: string
  sessionId: string
  status: 'CONFIRMED' | 'CANCELLED' | 'CHECKED_IN' | 'EXPIRED'
  confirmedAt: string
}

export interface MyReservationDetail {
  reservation: {
    reservationId: string
    reservationNo: string
    status: 'CONFIRMED' | 'CHECKED_IN' | 'CANCELLED' | 'EXPIRED'
    quantity: number
    confirmedAt: string
    cancelledAt: string | null
    cancellationReason: string | null
    expiredAt: string | null
  }
  session: {
    sessionId: string
    contentId: string
    status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'
    startsAt: string
    endsAt: string
    checkinOpenAt: string
    checkinCloseAt: string
  }
  content: {
    contentId: string
    title: string
    locationText: string
  }
  checkIn: {
    checkedIn: boolean
    checkedAt: string | null
    visitId: string | null
  }
}

export interface MyReservationCancellation {
  reservationId: string
  reservationStatus: 'CANCELLED'
  sessionId: string
  status: 'CANCELLED'
  cancellationReason: string
  cancelledAt: string
  capacityReleasedAt: string | null
}

export interface MyReservationSummary {
  reservationId: string
  reservationNo: string
  status: 'CONFIRMED' | 'CHECKED_IN' | 'CANCELLED' | 'EXPIRED'
  quantity: number
  confirmedAt: string
  content: {
    contentId: string
    title: string
    locationText: string
  }
  session: {
    sessionId: string
    status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'
    startsAt: string
    endsAt: string
  }
  checkIn: {
    checkedIn: boolean
    checkedAt: string | null
    visitId: string | null
  }
}

export interface MyReservationQr {
  reservationId: number
  sessionId: number
  qrToken: string
  issuedAt: string
  expiresAt: string
  checkinClosesAt: string
}

interface ApiResponse<T> {
  statusCode: number
  code: string
  message: string
  data: T
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '')

async function get<T>(path: string, signal?: AbortSignal, accessToken?: string): Promise<T> {
  if (!apiBaseUrl) {
    throw new Error('VITE_API_BASE_URL 환경 변수를 설정해 주세요.')
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      Accept: 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    signal,
  })
  const body = await response.json().catch(() => null) as ApiResponse<T> | null

  if (!response.ok || !body) {
    throw new Error(body?.message ?? '요청을 처리하지 못했습니다.')
  }

  return body.data
}

async function post<T>(
  path: string,
  { requestBody, accessToken, headers = {} }: { requestBody?: unknown; accessToken: string; headers?: Record<string, string> },
): Promise<T> {
  if (!apiBaseUrl) {
    throw new Error('VITE_API_BASE_URL 환경 변수를 설정해 주세요.')
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(requestBody !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: requestBody === undefined ? undefined : JSON.stringify(requestBody),
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

export function getPublicContentSessions(contentId: string, signal?: AbortSignal) {
  return get<{ contentId: string; sessions: PublicContentSession[] }>(`/api/v1/contents/${contentId}/sessions`, signal)
}

export function createReservationHold({ sessionId, quantity }: { sessionId: string; quantity: number }, accessToken: string) {
  return post<ReservationHold>('/api/v1/reservations', { requestBody: { sessionId, quantity }, accessToken })
}

export function getPublicSessionReservationInfo(sessionId: string, signal?: AbortSignal) {
  return get<PublicSessionReservationInfo>(`/api/v1/sessions/${sessionId}`, signal)
}

export function confirmReservationHold(holdId: string, idempotencyKey: string, accessToken: string) {
  return post<ReservationConfirmation>(`/api/v1/reservation-holds/${holdId}/confirm`, {
    accessToken,
    headers: { 'Idempotency-Key': idempotencyKey },
  })
}

export function getMyReservation(reservationId: string, accessToken: string, signal?: AbortSignal) {
  return get<MyReservationDetail>(`/api/v1/me/reservations/${reservationId}`, signal, accessToken)
}

export function getMyReservations(accessToken: string, signal?: AbortSignal) {
  return get<{ reservations: MyReservationSummary[] }>('/api/v1/me/reservations', signal, accessToken)
}

export function getMyReservationQr(reservationId: string, accessToken: string, signal?: AbortSignal) {
  return get<MyReservationQr>(`/api/v1/me/reservations/${reservationId}/qr`, signal, accessToken)
}

export function cancelMyReservation(reservationId: string, accessToken: string) {
  return post<MyReservationCancellation>(`/api/v1/me/reservations/${reservationId}/cancel`, { accessToken })
}

export function createVisitReview(
  visitId: string,
  { rating, reviewText }: { rating: number; reviewText: string },
  accessToken: string,
) {
  return post<VisitReview>(`/api/v1/visits/${visitId}/reviews`, {
    requestBody: { rating, reviewText },
    accessToken,
  })
}

export function getPublicContentReviews(
  contentId: string,
  { page = 0, size = 20, signal }: { page?: number; size?: number; signal?: AbortSignal } = {},
) {
  const query = new URLSearchParams({
    page: String(page),
    size: String(size),
  })

  return get<PublicContentReviewPage>(`/api/v1/contents/${contentId}/reviews?${query.toString()}`, signal)
}
