import { apiRequest } from "./client"

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

export type OperatorContentStatus =
  | "PENDING"
  | "REJECTED"
  | "APPROVED"
  | "PUBLISHED"
  | "SUSPENDED"
  | "WITHDRAWN"
  | "ENDED"

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

export type ContentRevisionStatus =
  | "EDIT_REQUESTED"
  | "EDIT_REJECTED"
  | "EDIT_APPROVED"
  | "EDIT_WITHDRAWN"
  | "EDIT_INVALIDATED"

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

export interface OperatorSession extends SessionFields {
  sessionId: string
  contentId: string
  status: "PENDING" | "SCHEDULED" | "CANCELLED"
  remainingCapacity: number
  createdAt?: string
  price?: number
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
  return apiRequest<OperatorSession>(
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
