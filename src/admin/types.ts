export interface ApiEnvelope<T> {
  statusCode: number
  code: string
  message: string
  data: T
}

export interface RoleAssignment {
  role: string
  regionId: string | null
  regionName: string | null
}

export interface LoginResult {
  userId: string
  roles: string[]
  accessToken: string
}

export interface AdminSession {
  userId: string
  assignment: RoleAssignment
}

export interface OperatorRequest {
  operatorApplicationId: number | string
  applicantUserId: number | string | null
  requestedRegionId: number | string
  requestedAt: string
}

export interface OperatorRequestDetail extends OperatorRequest {
  businessInformation: string | null
  status: string
  inspectedUserId: number | string | null
  rejectedReason: string | null
  updatedAt: string
}

export interface OperatorSummary {
  operatorId: string
  name: string
}

export interface ContentSummary {
  contentId: string
  contentType: string
  title: string
  status: string
  publishAt: string | null
  submittedAt: string | null
  approvedAt: string | null
  operator: OperatorSummary
  representativeImageUrl: string | null
  locationText?: string
  reservationAvailable?: boolean
}

export interface SessionSummary {
  sessionId: string
  status: string
  startsAt: string
  endsAt: string
  checkinOpenAt: string
  checkinCloseAt: string
  capacity: number
  remainingCapacity: number
}

export interface ContentDetail {
  contentId: string
  regionId: string
  operatorId: string
  contentType: string
  status: string
  title: string
  description: string
  representativeImageUrl: string | null
  locationText: string
  operatingHoursText: string
  contactText: string
  precautions: string
  ageRequirement: string
  materials: string
  cancellationPolicyText: string
  reservationPrice: number
  publishAt?: string | null
  candidatePublishAt?: string | null
  sessions: SessionSummary[]
  submittedAt?: string
  revisionId?: string
  reviewType?: string
  contentStatus?: string
}

export interface PublicContentDetail {
  contentId: string
  contentType: string
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

export interface PublicContentSessions {
  contentId: string
  sessions: Array<{
    sessionId: string
    startsAt: string
    endsAt: string
  }>
}

export interface ContentHistory {
  contentId: string | number
  histories: Array<{
    status: string
    reason: string | null
    processedAt: string
    actor: { userId: string | number; displayName: string } | null
  }>
}

export interface ContentRevisionSummary {
  revisionId: string
  contentId: string
  reviewType: string
  contentStatus: string
  title: string
  candidatePublishAt: string | null
  submittedAt: string
  operator: OperatorSummary
  representativeImageUrl: string | null
}

export interface PendingSession extends SessionSummary {
  contentId: string
  contentTitle: string
  createdAt: string
  operator: OperatorSummary
}

export interface SessionRevisionSummary {
  revisionId: string
  contentId: string
  contentTitle: string
  targetSessionId: string
  baseSessionVersion: number
  startsAt: string
  endsAt: string
  checkinOpenAt: string
  checkinCloseAt: string
  capacity: number
  submittedAt: string
  operator: OperatorSummary
}

export interface SessionRevisionDetail {
  revisionId: string
  contentId: string
  contentTitle: string
  contentStatus: string
  targetSession: SessionSummary & { version: number }
  baseSessionVersion: number
  candidate: Omit<SessionSummary, "sessionId" | "status" | "remainingCapacity">
  submittedAt: string
  operator: OperatorSummary
}

export interface WithdrawalSummary {
  withdrawalRequestId: string
  contentId: string
  contentType: string
  contentTitle: string
  contentStatus: string
  requester: { userId: string; name: string } | null
  requestedAt: string
}

export interface WithdrawalDetail {
  withdrawalRequestId: string
  status: string
  content: {
    contentId: string
    contentType: string
    title: string
    status: string
    publishAt: string
  }
  requester: { userId: string; name: string } | null
  requestReason: string
  requestedAt: string
}

export interface QrExceptionSummary {
  exceptionId: string
  exceptionType: string
  result: string
  reasonCode: string
  reservationResolved: boolean
  reservationId: string | null
  contentId: string | null
  sessionId: string | null
  occurredAt: string
}

export interface QrExceptionDetail extends QrExceptionSummary {
  reservation: null | {
    reservationId: number
    reservationNo: string
    status: string
    contentId: number
    contentTitle: string
    sessionId: number
    startsAt: string
    checkinOpenAt: string
    checkinCloseAt: string
    participant: { memberLinked: boolean; name: string; phone: string | null }
    checkIn: {
      checkedIn: boolean
      canCheckIn: boolean
      checkedAt: string | null
    }
  }
}

export interface ReservationSearchResult {
  reservationId: string
  reservationNo: string
  status: string
  content: {
    contentId: string
    title: string
  }
  session: {
    sessionId: string
    status: string
    startsAt: string
    endsAt: string
    checkinOpenAt: string
    checkinCloseAt: string
  }
  participant: {
    name: string
    phone: string | null
  }
  checkIn: {
    checkedIn: boolean
    canCheckIn: boolean
    checkedAt: string | null
  }
}

export interface StampbookSummary {
  stampbookId: string
  regionId: string
  status: string
  targetCount: number
  rewardCouponPolicyId: string
  requestedAt: string
}

export interface StampbookDetail {
  stampbookId: string
  regionId: string
  status: string
  targetContents: Array<{
    contentId: string
    regionId: string
    title: string
    status: string
  }>
  rewardCouponPolicy: {
    couponPolicyId: string
    regionId: string
    issuanceType: string
    status: string
  }
  requestedAt: string
  requestReason: string
}

export interface MissionSummary {
  missionId: string
  title?: string
  status: string
}

export interface MissionDetail {
  missionId: string
  title?: string
  regionId: string
  status: string
  conditionType: string
  requiredVisitCount: number | null
  targetContents: Array<{ contentId: string; title: string }>
  rewardCouponPolicyId: string
  endsAt: string
}

export interface MissionHistory {
  missionId: string
  histories: Array<{
    auditEventId: string
    action: string
    previousStatus: string | null
    nextStatus: string | null
    result: string
    reasonCode: string
    actorKind: string
    actorUserId: string | null
    recordedAt: string
  }>
}

export interface PageData<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}
