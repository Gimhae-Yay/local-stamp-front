import { apiRequest } from "./client"

export interface ReservationHold {
  holdId: string
  sessionId: string
  quantity: number
  status: "ACTIVE"
  expiresAt: string
  createdAt: string
}

export interface ConfirmedReservation {
  reservationId: string
  reservationNo: string
  holdId: string
  sessionId?: string
  status: string
  confirmedAt: string
}

export interface ReservationSummary {
  reservationId: string
  reservationNo: string
  status: string
  quantity: number
  confirmedAt: string
  content: {
    contentId: string
    title: string
    locationText: string
  }
  session: {
    sessionId: string
    status: string
    startsAt: string
    endsAt: string
  }
  checkIn: {
    checkedIn: boolean
    checkedAt: string | null
    visitId: string | null
  }
}

export interface ReservationDetail {
  reservation: {
    reservationId: string
    reservationNo: string
    status: string
    quantity: number
    confirmedAt: string
    cancelledAt: string | null
    cancellationReason: string | null
    expiredAt: string | null
  }
  session: {
    sessionId: string
    contentId: string
    status: string
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

export interface ReservationQr {
  reservationId: number
  sessionId: number
  qrToken: string
  issuedAt: string
  expiresAt: string
  checkinClosesAt: string
}

export interface Refund {
  refundId: string
  paymentId: string
  reservationId: string
  amount: number
  currency: string
  status: string
  requestedAt: string
  completedAt: string | null
}

export interface CancelReservationResponse {
  reservationId: string
  reservationStatus: string
  refund: {
    refundId: string
    paymentId: string
    amount: number
    currency: string
    status: string
    requestedAt: string
  } | null
  sessionId: string
  status: string
  cancellationReason: string
  cancelledAt: string
  capacityReleasedAt: string
}

export interface PaymentAmount {
  baseAmount: number
  discountAmount: number
  finalAmount: number
  currency: string
}

export interface CreatePaymentResponse {
  requiresPayment: boolean
  payment: {
    paymentId: string
    holdId: string
    orderId: string
    status: "PENDING"
    amount: PaymentAmount
    createdAt: string
  } | null
  reservation: ConfirmedReservation | null
}

export interface PaymentDetail {
  paymentId: string
  holdId: string
  orderId: string
  status: "PENDING" | "APPROVED" | "DECLINED" | "CANCELLED" | "EXPIRED" | "DISCREPANT"
  amount: PaymentAmount
  reservationId: string | null
  createdAt: string
  finalizedAt: string | null
}

export function createReservationHold(sessionId: string, quantity: number) {
  return apiRequest<ReservationHold>("/api/v1/reservations", {
    method: "POST",
    body: JSON.stringify({ sessionId, quantity }),
  })
}

export function confirmFreeReservation(holdId: string, idempotencyKey: string) {
  return apiRequest<ConfirmedReservation>(
    `/api/v1/reservation-holds/${encodeURIComponent(holdId)}/confirm`,
    {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
    },
  )
}

export function createPayment(
  holdId: string,
  couponId: string | null,
  idempotencyKey: string,
) {
  return apiRequest<CreatePaymentResponse>(
    `/api/v1/me/reservation-holds/${encodeURIComponent(holdId)}/payments`,
    {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ couponId }),
    },
  )
}

export function getMyReservations(signal?: AbortSignal) {
  return apiRequest<{ reservations: ReservationSummary[] }>(
    "/api/v1/me/reservations",
    { signal },
  )
}

export function getMyReservation(reservationId: string, signal?: AbortSignal) {
  return apiRequest<ReservationDetail>(
    `/api/v1/me/reservations/${encodeURIComponent(reservationId)}`,
    { signal },
  )
}

export function cancelMyReservation(reservationId: string) {
  return apiRequest<CancelReservationResponse>(
    `/api/v1/me/reservations/${encodeURIComponent(reservationId)}/cancel`,
    { method: "POST" },
  )
}

export function getMyReservationQr(reservationId: string) {
  return apiRequest<ReservationQr>(
    `/api/v1/me/reservations/${encodeURIComponent(reservationId)}/qr`,
  )
}

export function getMyPayment(paymentId: string, signal?: AbortSignal) {
  return apiRequest<PaymentDetail>(
    `/api/v1/me/payments/${encodeURIComponent(paymentId)}`,
    { signal },
  )
}

export function getMyRefunds(signal?: AbortSignal) {
  return apiRequest<{ refunds: Refund[] }>("/api/v1/me/refunds", { signal })
}

export function getMyRefund(refundId: string, signal?: AbortSignal) {
  return apiRequest<Refund>(
    `/api/v1/me/refunds/${encodeURIComponent(refundId)}`,
    { signal },
  )
}
