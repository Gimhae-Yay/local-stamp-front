export interface OperatorAssignment {
  role: "OPERATOR"

  regionId: string

  regionName: string | null
}

export interface OperatorSession {
  userId: string

  assignment: OperatorAssignment
}

export interface ContentSummary {
  contentId: string

  contentType: string

  title: string

  status: string

  createdAt: string
}

export interface ContentDetail {
  contentId: string

  contentType: string

  status: string

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

  publishAt: string

  rejectionReason: string | null

  createdAt: string

  updatedAt: string
}

export interface ContentSessionSummary {
  sessionId: string

  startsAt: string

  endsAt: string
}

export interface CreatedContentSession extends ContentSessionSummary {
  contentId: string

  status: string

  checkinOpenAt: string

  checkinCloseAt: string

  capacity: number
}

export interface SessionChangeRequestResult {
  revisionId: string

  status: string
}

export interface ContentRevisionResult {
  revisionId: string
  contentId: string
  status: string
  submittedAt?: string
  updatedAt?: string
}

export interface WithdrawContentRevisionResult {
  revisionId: string
  contentId: string
  status: string
  withdrawalReason: string
  withdrawnAt: string
}

export interface SessionInput {
  startsAt: string

  endsAt: string

  checkinOpenAt: string

  checkinCloseAt: string

  capacity: number
}

export interface ContentInput {
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

  publishAt: string | null

  representativeImageObjectId?: string
}

export interface SessionReservations {
  contentId: string

  session: {
    sessionId: string

    status: string

    startsAt: string

    endsAt: string

    checkinOpenAt: string

    checkinCloseAt: string
  }

  reservations: Array<{
    reservationId: string

    reservationNo: string

    status: string

    quantity: number

    confirmedAt: string | null

    participant: { name: string, phone: string | null }

    checkIn: { checkedIn: boolean, checkedAt: string | null }
  }>
}

export interface ReservationSearchResult {
  reservationId: string

  reservationNo: string

  status: string

  content: { contentId: string, title: string }

  session: {
    sessionId: string

    status: string

    startsAt: string

    endsAt: string

    checkinOpenAt: string

    checkinCloseAt: string
  }

  participant: { name: string, phone: string | null }

  checkIn: {
    checkedIn: boolean

    canCheckIn: boolean

    checkedAt: string | null
  }
}

export interface ReservationPayment {
  reservationId: string

  reservationNo: string

  contentId: string

  sessionId: string

  payment: null | {
    paymentId: string

    status: string

    finalAmount: number

    currency: string

    discrepancy: null | { discrepancyId: string, status: string }
  }

  refund: null | {
    refundId: string

    status: string

    amount: number

    requestedAt: string

    completedAt: string | null
  }

  updatedAt: string
}

export interface CheckInResult {
  visitId: string

  reservationId: string

  sessionId: string

  reservationStatus: string

  checkInMethod: string

  checkedAt: string
}

export interface CouponPolicySummary {
  couponPolicyId: string

  contentId: string

  name: string

  status: string
}

export interface CouponPolicyDetail extends CouponPolicySummary {
  regionId: string

  description: string | null

  issueSourceType: string

  discountAmount: number

  minimumPaymentAmount: number

  validDaysAfterIssue: number

  issueStartsAt: string

  issueEndsAt: string

  totalIssueLimit: number | null

  issuedCount: number

  publishedAt: string | null

  endedAt: string | null
}

export interface CreatedCouponPolicy extends CouponPolicySummary {
  regionId: string

  issueSourceType: string

  discountAmount: number

  minimumPaymentAmount: number

  validDaysAfterIssue: number

  issueStartsAt: string

  issueEndsAt: string

  totalIssueLimit: number | null

  createdAt: string
}

export interface CouponPolicyInput {
  contentId: string

  name: string

  description: string

  issueSourceType: string

  discountAmount: number

  minimumPaymentAmount: number

  validDaysAfterIssue: number

  issueStartsAt: string

  issueEndsAt: string

  totalIssueLimit: number | null
}

export interface MissionSummary {
  missionId: string

  status: string

  conditionType: string

  endsAt: string
}

export interface MissionDetail extends MissionSummary {
  regionId: string

  requiredVisitCount: number | null

  targetContents: Array<{ contentId: string, title: string }>

  rewardCouponPolicyId: string

  publishedAt: string | null

  endedAt: string | null
}

export interface MissionInput {
  title: string

  conditionType: string

  requiredVisitCount: number | null

  targetContentIds: string[]

  rewardCouponPolicyId: string

  endsAt: string
}

export interface PageData<T> {
  content: T[]

  page: number

  size: number

  totalElements: number

  totalPages: number
}

export interface StampbookDraft {
  stampbookId: string

  status: string

  targetCount: number

  createdAt: string
}

export interface StampbookInput {
  title: string

  regionId: string

  contentIds: string[]

  rewardCouponPolicyId: string

  reason: string
}
