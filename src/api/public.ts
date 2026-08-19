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

export type CouponStatus = 'AVAILABLE' | 'RESERVED' | 'USED' | 'EXPIRED' | 'INVALIDATED'
export type CouponIssueSourceType = 'VISIT' | 'MISSION_REWARD' | 'STAMPBOOK_COMPLETION'

export interface MyCoupon {
  couponId: string
  couponPolicyId: string
  contentId: string
  regionId: string
  policyName: string
  issueSourceType: CouponIssueSourceType
  status: CouponStatus
  discountAmount: number
  minimumPaymentAmount: number
  issuedAt: string
  expiresAt: string
}

export interface MyCouponUsageHistoryItem {
  couponRedemptionId: string
  reservationId: string
  priceSnapshotId: string
  status: 'CONFIRMED' | 'REVERSED'
  discountAmount: number
  confirmedAt: string
  reversedAt: string | null
}

export type MissionParticipationStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ENDED_INCOMPLETE'

export interface MyMissionParticipation {
  participationId: string
  missionId: string
  title: string
  status: MissionParticipationStatus
  progressCount: number
  requiredCount: number
  rewardClaimed: boolean
  joinedAt: string
  completedAt: string | null
}

export interface MyMissionParticipationPage {
  content: MyMissionParticipation[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type StampbookStatus = 'PUBLISHED' | 'ENDED'
export type MyStampbookProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ENDED_INCOMPLETE'

export interface MyStampbookCompletionReward {
  couponPolicyId: string
  stampbookRewardGrantId: string
}

export interface MyStampbookProgress {
  status: MyStampbookProgressStatus
  earnedCount: number
  targetCount: number
  completedAt: string | null
  lastEarnedAt?: string | null
  completionReward: MyStampbookCompletionReward | null
}

export interface MyStampbook {
  stampbookId: string
  title: string
  regionId: string
  status: StampbookStatus
  publishedAt: string
  progress: MyStampbookProgress
}

export interface MyStampbookDetail {
  stampbook: Omit<MyStampbook, 'progress'> & {
    endedAt: string | null
    targetContents: Array<{
      contentId: string
      title: string
      earned: boolean
      earnedAt: string | null
    }>
  }
  progress: MyStampbookProgress
}

export interface MyStampbookEarning {
  stampEarnId: string
  visitId: string
  content: {
    contentId: string
    title: string
  }
  visitedAt: string
  earnedAt: string
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

export interface LoginResult {
  userId: string
  roles: string[]
  accessToken: string
}

export type UserRole = 'VISITOR' | 'OPERATOR' | 'REGION_ADMIN'

export interface MyRoleAssignment {
  role: UserRole
  regionId: string | null
  regionName: string | null
}

export interface MyProfile {
  roleAssignments: MyRoleAssignment[]
}

export interface SignupResult {
  userId: string
  requestedRole: 'VISITOR' | 'OPERATOR'
  assignedRole: 'VISITOR' | null
  operatorApplicationStatus: 'PENDING' | null
}

interface ApiResponse<T> {
  statusCode: number
  code: string
  message: string
  data: T
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '')
const accessTokenStorageKey = 'accessToken'
let refreshAccessTokenPromise: Promise<string> | null = null

class ApiRequestError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

function requireApiBaseUrl() {
  if (!apiBaseUrl) {
    throw new Error('VITE_API_BASE_URL 환경 변수를 설정해 주세요.')
  }
  return apiBaseUrl
}

export function storeAccessToken(accessToken: string) {
  window.sessionStorage.setItem(accessTokenStorageKey, accessToken)
}

export function clearAccessToken() {
  window.sessionStorage.removeItem(accessTokenStorageKey)
}

export function hasAccessToken() {
  return Boolean(window.sessionStorage.getItem(accessTokenStorageKey))
}

function redirectToLogin() {
  clearAccessToken()
  if (window.location.pathname !== '/login') {
    window.location.assign('/login')
  }
}

async function refreshAccessToken() {
  if (!refreshAccessTokenPromise) {
    refreshAccessTokenPromise = (async () => {
      const response = await fetch(`${requireApiBaseUrl()}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        credentials: 'include',
      })
      const body = await response.json().catch(() => null) as ApiResponse<{ accessToken: string }> | null

      if (!response.ok || !body) {
        const error = new ApiRequestError(body?.message ?? '토큰을 갱신하지 못했습니다.', response.status, body?.code)
        if (response.status === 401) redirectToLogin()
        throw error
      }

      storeAccessToken(body.data.accessToken)
      return body.data.accessToken
    })().finally(() => {
      refreshAccessTokenPromise = null
    })
  }

  return refreshAccessTokenPromise
}

async function request<T>(
  path: string,
  {
    method = 'GET',
    requestBody,
    signal,
    accessToken,
    headers = {},
    retryAfterRefresh = true,
  }: {
    method?: 'GET' | 'POST'
    requestBody?: unknown
    signal?: AbortSignal
    accessToken?: string
    headers?: Record<string, string>
    retryAfterRefresh?: boolean
  } = {},
): Promise<T> {
  const response = await fetch(`${requireApiBaseUrl()}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(requestBody !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: requestBody === undefined ? undefined : JSON.stringify(requestBody),
    credentials: 'include',
    signal,
  })
  const body = await response.json().catch(() => null) as ApiResponse<T> | null

  if (response.status === 401 && accessToken && retryAfterRefresh) {
    const refreshedAccessToken = await refreshAccessToken()
    return request<T>(path, { method, requestBody, signal, accessToken: refreshedAccessToken, headers, retryAfterRefresh: false })
  }

  if (!response.ok || !body) {
    throw new ApiRequestError(body?.message ?? '요청을 처리하지 못했습니다.', response.status, body?.code)
  }

  return body.data
}

async function get<T>(path: string, signal?: AbortSignal, accessToken?: string): Promise<T> {
  return request<T>(path, { signal, accessToken })
}

async function post<T>(
  path: string,
  { requestBody, accessToken, headers = {} }: { requestBody?: unknown; accessToken?: string; headers?: Record<string, string> } = {},
): Promise<T> {
  return request<T>(path, { method: 'POST', requestBody, accessToken, headers })
}

export function loginWithEmail({ email, password }: { email: string; password: string }) {
  return post<LoginResult>('/api/v1/auth/login', { requestBody: { email, password } })
}

export function getMyProfile(accessToken: string, signal?: AbortSignal) {
  return get<MyProfile>('/api/v1/me', signal, accessToken)
}

export function signupVisitor({
  email,
  password,
  name,
  phone,
}: {
  email: string
  password: string
  name: string
  phone: string
}) {
  return post<SignupResult>('/api/v1/auth/signup', {
    requestBody: { email, password, name, phone, requestedRole: 'VISITOR' },
  })
}

export async function logoutFromServer() {
  const pendingRefresh = refreshAccessTokenPromise
  if (pendingRefresh) {
    try {
      await pendingRefresh
    } catch {
      // Refresh failure already clears an invalid Refresh Token cookie on the server.
    }
  }

  try {
    await post<void>('/api/v1/auth/logout')
  } finally {
    clearAccessToken()
  }
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

export function getMyCoupons(accessToken: string, signal?: AbortSignal) {
  return get<{ coupons: MyCoupon[] }>('/api/v1/me/coupons', signal, accessToken)
}

export function getMyCouponUsageHistory(couponId: string, accessToken: string, signal?: AbortSignal) {
  return get<{ couponId: string; usageHistory: MyCouponUsageHistoryItem[] }>(
    `/api/v1/me/coupons/${couponId}/usage-history`,
    signal,
    accessToken,
  )
}

export function getMyMissionParticipations(
  status: MissionParticipationStatus,
  accessToken: string,
  { page = 0, size = 5, signal }: { page?: number; size?: number; signal?: AbortSignal } = {},
) {
  const query = new URLSearchParams({
    status,
    page: String(page),
    size: String(size),
  })

  return get<MyMissionParticipationPage>(`/api/v1/me/mission-participations?${query.toString()}`, signal, accessToken)
}

export function getMyStampbooks(accessToken: string, signal?: AbortSignal) {
  return get<{ stampbooks: MyStampbook[] }>('/api/v1/me/stampbooks', signal, accessToken)
}

export function getMyStampbookDetail(stampbookId: string, accessToken: string, signal?: AbortSignal) {
  return get<MyStampbookDetail>(`/api/v1/me/stampbooks/${stampbookId}`, signal, accessToken)
}

export function getMyStampbookEarnings(stampbookId: string, accessToken: string, signal?: AbortSignal) {
  return get<{ stampbookId: string; earnings: MyStampbookEarning[] }>(`/api/v1/me/stampbooks/${stampbookId}/earnings`, signal, accessToken)
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
