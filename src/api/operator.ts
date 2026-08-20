import { apiRequest, withQuery } from "./client"

export interface CreateOperatorRequest {
  requestedRegionId: number
  businessInformation: string
}

export interface CreateOperatorResponse {
  operatorApplicationId: number
  requestedRegionId: number
  status: "PENDING"
}

export function reapplyForOperator(request: CreateOperatorRequest) {
  return apiRequest<CreateOperatorResponse>(
    "/api/v1/operator/operator-requests",
    {
      method: "POST",
      body: JSON.stringify(request),
    },
  )
}

export type OperatorContentStatus = "PENDING" | "REJECTED" | "APPROVED" | "PUBLISHED" | "SUSPENDED" | "WITHDRAWN" | "ENDED"

export interface OperatorContentSummary {
  contentId: string
  contentType: "EVENT_EXPERIENCE"
  title: string
  status: OperatorContentStatus
  createdAt: string
}

export interface OperatorContentDetail extends OperatorContentSummary {
  description: string
  locationText: string
  operatingHoursText: string
  contactText: string
  precautions: string
  ageRequirement: string
  materials: string
  cancellationPolicyText: string
  publishAt: string | null
  reservationPrice?: number
  representativeImageUrl: string | null
  representativeImageUrlExpiresAt: string | null
  rejectionReason: string | null
  updatedAt: string
}

export interface ContentRevisionFields {
  title: string
  description: string
  locationText: string
  operatingHoursText: string
  contactText: string
  precautions: string
  ageRequirement: string
  materials: string
  cancellationPolicyText: string
  reservationPrice: number
  publishAt?: string
  representativeImageObjectId?: string
}

export type ContentRevisionStatus = "EDIT_REQUESTED" | "EDIT_REJECTED" | "EDIT_APPROVED" | "EDIT_WITHDRAWN" | "EDIT_INVALIDATED"

export interface CreateContentRevisionResponse {
  revisionId: string
  contentId: string
  status: "EDIT_REQUESTED"
  baseContentVersion: number
  submittedAt: string
}

export interface UpdateContentRevisionResponse {
  revisionId: string
  contentId: string
  status: "EDIT_REJECTED"
}

export interface WithdrawContentRevisionResponse {
  revisionId: string
  contentId: string
  status: "EDIT_WITHDRAWN"
  withdrawalReason: string
  withdrawnAt: string
}

export interface SessionFields {
  startsAt: string
  endsAt: string
  checkinOpenAt: string
  checkinCloseAt: string
  capacity: number
}

export type OperatorSessionStatus =
  | "PENDING"
  | "SCHEDULED"
  | "REJECTED"
  | "COMPLETED"
  | "CANCELLED"

export interface OperatorSessionPendingChangeRequest {
  revisionId: string
  status: "PENDING"
  baseSessionVersion: number
  candidate: SessionFields
  submittedAt: string
}

export interface OperatorSession extends SessionFields {
  sessionId: string
  status: OperatorSessionStatus
  version: number
  remainingCapacity: number
  rejectReason: string | null
  cancelledAt: string | null
  cancellationReason: string | null
  completedAt: string | null
  createdAt: string
  pendingChangeRequest: OperatorSessionPendingChangeRequest | null
}

export interface OperatorContentSessionsResponse {
  contentId: string
  sessions: OperatorSession[]
}

export interface CreateOperatorSessionResponse extends SessionFields {
  sessionId: string
  contentId: string
  status: "PENDING"
  remainingCapacity: number
  createdAt: string
}

export interface SessionChangeRequestResponse extends SessionFields {
  revisionId: string
  status: "PENDING"
  contentId: string
  targetSessionId: string
  baseSessionVersion: number
  requestedAt: string
}

export interface CancelSessionResponse {
  sessionId: string
  status: "CANCELLED"
  cancellationReason: string
  cancelledAt: string
}

export interface ContentWithdrawalRequestResponse {
  withdrawalRequestId: string
  contentId: string
  status: "PENDING"
  requestReason: string
  requestedAt: string
}

export type OperatorReservationStatus = "CONFIRMED" | "CHECKED_IN" | "CANCELLED" | "EXPIRED"

export type OperatorReservationSessionStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED"

export interface OperatorReservationParticipant {
  name: string
  phone: string | null
}

export interface OperatorReservationCheckIn {
  checkedIn: boolean
  checkedAt: string | null
}

export interface OperatorSessionReservation {
  reservationId: string
  reservationNo: string
  status: OperatorReservationStatus
  quantity: number
  confirmedAt: string
  participant: OperatorReservationParticipant
  checkIn: OperatorReservationCheckIn
}

export interface OperatorSessionReservationsResponse {
  contentId: string
  session: {
    sessionId: string
    status: OperatorReservationSessionStatus
    startsAt: string
    endsAt: string
    checkinOpenAt: string
    checkinCloseAt: string
  }
  reservations: OperatorSessionReservation[]
}

export interface OperatorReservationSearchResponse {
  reservationId: string
  reservationNo: string
  status: OperatorReservationStatus
  content: {
    contentId: string
    title: string
  }
  session: {
    sessionId: string
    status: OperatorReservationSessionStatus
    startsAt: string
    endsAt: string
    checkinOpenAt: string
    checkinCloseAt: string
  }
  participant: OperatorReservationParticipant
  checkIn: OperatorReservationCheckIn & {
    canCheckIn: boolean
  }
}

export function getOperatorContents(signal?: AbortSignal) {
  return apiRequest<{ contents: OperatorContentSummary[] }>(
    "/api/v1/operator/contents",
    { signal },
  )
}

export function getOperatorContent(contentId: string, signal?: AbortSignal) {
  return apiRequest<OperatorContentDetail>(
    `/api/v1/operator/contents/${encodeURIComponent(contentId)}`,
    { signal },
  )
}

export function getOperatorContentSessions(
  contentId: string,
  signal?: AbortSignal,
) {
  return apiRequest<OperatorContentSessionsResponse>(
    `/api/v1/operator/contents/${encodeURIComponent(contentId)}/sessions`,
    { signal },
  )
}

export function requestContentWithdrawal(
  contentId: string,
  reason: string,
  idempotencyKey: string,
) {
  return apiRequest<ContentWithdrawalRequestResponse>(
    `/api/v1/operator/contents/${encodeURIComponent(contentId)}/withdrawal-requests`,
    {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ reason }),
    },
  )
}

export function getOperatorSessionReservations(
  contentId: string,
  sessionId: string,
  signal?: AbortSignal,
) {
  return apiRequest<OperatorSessionReservationsResponse>(
    withQuery(
      `/api/v1/operator/contents/${encodeURIComponent(contentId)}/reservations`,
      { sessionId },
    ),
    { signal },
  )
}

export function searchOperatorReservation(
  reservationNo: string,
  signal?: AbortSignal,
) {
  return apiRequest<OperatorReservationSearchResponse>(
    withQuery("/api/v1/operator/reservations/search", { reservationNo }),
    { signal },
  )
}

export function createContentRevision(
  contentId: string,
  request: ContentRevisionFields,
) {
  return apiRequest<CreateContentRevisionResponse>(
    `/api/v1/operator/contents/${encodeURIComponent(contentId)}/revisions`,
    { method: "POST", body: JSON.stringify(request) },
  )
}

export function updateContentRevision(
  revisionId: string,
  request: ContentRevisionFields,
) {
  return apiRequest<UpdateContentRevisionResponse>(
    `/api/v1/operator/content-revisions/${encodeURIComponent(revisionId)}`,
    { method: "PUT", body: JSON.stringify(request) },
  )
}

export function withdrawContentRevision(revisionId: string, reason: string) {
  return apiRequest<WithdrawContentRevisionResponse>(
    `/api/v1/operator/content-revisions/${encodeURIComponent(revisionId)}/withdraw`,
    { method: "POST", body: JSON.stringify({ reason }) },
  )
}

export function createOperatorSession(
  contentId: string,
  request: SessionFields,
) {
  return apiRequest<CreateOperatorSessionResponse>(
    `/api/v1/operator/contents/${encodeURIComponent(contentId)}/sessions`,
    { method: "POST", body: JSON.stringify(request) },
  )
}

export function requestSessionChange(
  sessionId: string,
  request: SessionFields,
) {
  return apiRequest<SessionChangeRequestResponse>(
    `/api/v1/operator/sessions/${encodeURIComponent(sessionId)}/change-requests`,
    { method: "POST", body: JSON.stringify(request) },
  )
}

export function cancelOperatorSession(
  sessionId: string,
  cancellationReason: string,
) {
  return apiRequest<CancelSessionResponse>(
    `/api/v1/operator/sessions/${encodeURIComponent(sessionId)}/cancel`,
    { method: "POST", body: JSON.stringify({ cancellationReason }) },
  )
}
