export interface PlatformRegion {
  regionId: string
  regionCode: string
  name: string
  isPublic: boolean
  regionAdminCount: number
  createdAt: string
  updatedAt: string
}

export interface PlatformUser {
  userId: string
  loginIdentifier: string
  name: string
  roleAssignments: Array<{
    role: string
    regionId: string | null
    regionName: string | null
  }>
  createdAt: string
}

export type PlatformAdminGrade = "SUPER_ADMIN" | "PLATFORM_ADMIN"

export interface PlatformAdminAccount {
  userId: string
  loginIdentifier: string
  name: string
  grade: PlatformAdminGrade
  status: "ACTIVE" | "INACTIVE"
  createdAt: string
  inactivatedAt: string | null
}

export interface PaymentDiscrepancy {
  discrepancyId: string
  paymentId: string
  discrepancyType: string
  status: string
  finalAmount: number
  currency: string
  detectedAt: string
}

export interface PaymentDiscrepancyDetail {
  discrepancy: {
    discrepancyId: string
    discrepancyType: string
    status: string
    detectedAt: string
  }
  payment: {
    paymentId: string
    holdId: string
    orderId: string
    portonePaymentId: string
    status: string
    finalAmount: number
    currency: string
  }
  verifications: Array<{
    paymentVerificationId: string
    reason: string
    externalStatus: string
    observedAmount: number
    matched: boolean
    verifiedAt: string
  }>
  actions: Array<{
    actionId: string
    action: string
    evidenceReference: string
    reason: string
    actedAt: string
  }>
}

export interface RefundFailure {
  refundId: string
  paymentId: string
  reservationId: string
  amount: number
  currency: string
  status: string
  attemptCount: number
  requestedAt: string
  updatedAt: string
}

export interface RefundFailureDetail {
  refund: {
    refundId: string
    paymentId: string
    reservationId: string
    amount: number
    currency: string
    status: string
    requestedAt: string
    completedAt: string | null
  }
  payment: {
    paymentId: string
    orderId: string
    portonePaymentId: string
    finalAmount: number
    currency: string
  }
  attempts: Array<{
    refundAttemptId: string
    attemptNo: number
    initiatorKind: string
    portoneCancellationId: string | null
    outcomeKind: string
    failureReasonCode: string | null
    externalStatus: string | null
    attemptedAt: string
  }>
}
