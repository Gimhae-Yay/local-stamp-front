import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom"
import QRCode from "qrcode"
import { getMyAvailableCoupons, type AvailableCoupon } from "../api/activities"
import { createIdempotencyKey, isAbortError } from "../api/client"
import {
  getPublicContent,
  getPublicContentSessions,
  getPublicSession,
  type PublicContentDetail,
  type PublicSessionDetail,
} from "../api/public"
import {
  cancelMyReservation,
  confirmFreeReservation,
  createPayment,
  createReservationHold,
  getMyPayment,
  getMyRefund,
  getMyRefunds,
  getMyReservation,
  getMyReservationQr,
  getMyReservations,
  type CancelReservationResponse,
  type ConfirmedReservation,
  type PaymentDetail,
  type Refund,
  type ReservationDetail,
  type ReservationHold,
  type ReservationSummary,
} from "../api/reservations"
import {
  Breadcrumbs,
  InfoRow,
  Notice,
  PageHeader,
  StatusPill,
} from "../components/PageElements"

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
  timeZone: "Asia/Seoul",
})
const shortDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
  weekday: "short",
  timeZone: "Asia/Seoul",
})
const timeFormatter = new Intl.DateTimeFormat("ko-KR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Seoul",
})
const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Seoul",
})
const currencyFormatter = new Intl.NumberFormat("ko-KR")

function formatRange(startsAt: string, endsAt: string) {
  return `${shortDateFormatter.format(new Date(startsAt))} ${timeFormatter.format(new Date(startsAt))}–${timeFormatter.format(new Date(endsAt))}`
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function reservationStatus(status: string, checkedIn = false) {
  if (checkedIn || status === "CHECKED_IN") return "체크인 완료"
  const labels: Record<string, string> = {
    CONFIRMED: "예약 확정",
    CANCELLED: "예약 취소",
    EXPIRED: "예약 만료",
  }
  return labels[status] ?? status
}

interface BookingFlowState {
  content: PublicContentDetail
  session: PublicSessionDetail
  hold: ReservationHold
  quantity: number
  reservation?: ConfirmedReservation
}

function ReservationCrumbs({
  eventTitle,
  current,
}: {
  eventTitle?: string
  current: string
}) {
  return (
    <Breadcrumbs
      items={[
        { label: "홈", to: "/" },
        { label: "내 예약", to: "/reservations" },
        ...(eventTitle ? [{ label: eventTitle }] : []),
        { label: current },
      ]}
    />
  )
}

export function BookingPage() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const [content, setContent] = useState<PublicContentDetail | null>(null)
  const [sessions, setSessions] = useState<PublicSessionDetail[]>([])
  const [selected, setSelected] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!eventId) {
      setError("예약할 행사·체험을 찾을 수 없습니다.")
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    Promise.all([
      getPublicContent(eventId, controller.signal),
      getPublicContentSessions(eventId, controller.signal),
    ])
      .then(async ([nextContent, sessionList]) => {
        const details = await Promise.all(
          sessionList.sessions.map((session) =>
            getPublicSession(session.sessionId, controller.signal),
          ),
        )
        setContent(nextContent)
        setSessions(details)
        setSelected(
          details.find((session) => session.reservable)?.sessionId ?? "",
        )
      })
      .catch((requestError: unknown) => {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ) {
          return
        }
        setError(
          errorMessage(requestError, "예약 가능한 회차를 불러오지 못했습니다."),
        )
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [eventId])

  const selectedSession = sessions.find(
    (session) => session.sessionId === selected,
  )
  const adjustQuantity = (amount: number) => {
    const max = selectedSession?.remainingCapacity ?? 1
    setQuantity((current) => Math.min(max, Math.max(1, current + amount)))
  }

  const createHold = async () => {
    if (!content || !selectedSession || !eventId) return
    setSubmitting(true)
    setError(null)
    try {
      const hold = await createReservationHold(
        selectedSession.sessionId,
        quantity,
      )
      navigate(`/events/${eventId}/reserve/confirm`, {
        state: {
          content,
          session: selectedSession,
          hold,
          quantity,
        } satisfies BookingFlowState,
      })
    } catch (requestError) {
      setError(errorMessage(requestError, "예약 대기를 생성하지 못했습니다."))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <section className="visitor-page-state">
        회차를 불러오는 중입니다.
      </section>
    )
  }
  if (error && !content) {
    return (
      <section className="visitor-page-state">
        <p>{error}</p>
      </section>
    )
  }

  return (
    <section className="page-container booking-page">
      <PageHeader
        title="회차 선택 및 예약"
        description="참여할 회차와 인원을 선택해 주세요."
      >
        <Breadcrumbs
          items={[
            { label: "홈", to: "/" },
            {
              label: content?.title ?? "행사·체험",
              to: `/events/${eventId}`,
            },
            { label: "예약" },
          ]}
        />
      </PageHeader>
      <section className="booking-section">
        <div className="section-title">
          <h2>예약할 회차 선택</h2>
          <span>
            예약 가능 회차 {sessions.filter((item) => item.reservable).length}개
          </span>
        </div>
        <div className="session-list">
          {sessions.map((session) => (
            <button
              key={session.sessionId}
              disabled={!session.reservable}
              className={`session-row${
                selected === session.sessionId ? " selected" : ""
              }`}
              onClick={() => {
                setSelected(session.sessionId)
                setQuantity(1)
              }}
            >
              <span className="date-box">
                {new Date(session.startsAt).getDate()}
              </span>
              <span>
                <b>{formatRange(session.startsAt, session.endsAt)}</b>
                <small>
                  {content?.locationText} · 잔여 {session.remainingCapacity}명 ·{" "}
                  {currencyFormatter.format(session.price)}원
                </small>
              </span>
            </button>
          ))}
          {sessions.length === 0 && <p>예약 가능한 공개 회차가 없습니다.</p>}
        </div>
      </section>
      <section className="booking-section">
        <div className="section-title">
          <h2>예약 인원</h2>
        </div>
        <div className="counter-row">
          <div>
            <b>예약 인원</b>
            <small>참여할 인원 수를 선택해 주세요.</small>
          </div>
          <div className="counter">
            <button
              onClick={() => adjustQuantity(-1)}
              aria-label="예약 인원 감소"
            >
              −
            </button>
            <strong>{quantity}</strong>
            <button
              onClick={() => adjustQuantity(1)}
              aria-label="예약 인원 증가"
            >
              ＋
            </button>
          </div>
        </div>
        <div className="total-people">
          <span>총 예약 인원</span>
          <b>{quantity}명</b>
        </div>
      </section>
      {error && <p className="form-error">{error}</p>}
      <button
        className="button-primary booking-submit"
        disabled={!selectedSession || submitting}
        onClick={createHold}
      >
        {submitting ? "자리 확보 중…" : "예약하기"}
      </button>
    </section>
  )
}

export function BookingConfirmPage() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const { state } = useLocation()
  const booking = state as BookingFlowState | null
  const [coupons, setCoupons] = useState<AvailableCoupon[]>([])
  const [couponId, setCouponId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const idempotencyKey = useRef(createIdempotencyKey())

  useEffect(() => {
    if (!booking || booking.session.price === 0) return
    const controller = new AbortController()
    getMyAvailableCoupons(booking.hold.holdId, controller.signal)
      .then((result) => setCoupons(result.availableCoupons))
      .catch((requestError) => {
        if (isAbortError(requestError, controller.signal)) return
        setError(
          errorMessage(requestError, "사용 가능한 쿠폰을 불러오지 못했습니다."),
        )
      })
    return () => controller.abort()
  }, [booking])

  if (!booking) {
    return (
      <section className="visitor-page-state">
        <p>예약 대기 정보를 찾을 수 없습니다. 회차를 다시 선택해 주세요.</p>
        <Link className="button-primary" to={`/events/${eventId}/reserve`}>
          회차 선택으로 돌아가기
        </Link>
      </section>
    )
  }

  const confirm = async () => {
    setSubmitting(true)
    setError(null)
    try {
      if (booking.session.price === 0) {
        const reservation = await confirmFreeReservation(
          booking.hold.holdId,
          idempotencyKey.current,
        )
        navigate(
          `/events/${eventId}/reserve/complete?reservationId=${reservation.reservationId}`,
          { state: { ...booking, reservation } satisfies BookingFlowState },
        )
        return
      }

      const result = await createPayment(
        booking.hold.holdId,
        couponId,
        idempotencyKey.current,
      )
      if (!result.requiresPayment && result.reservation) {
        navigate(
          `/events/${eventId}/reserve/complete?reservationId=${result.reservation.reservationId}`,
          {
            state: {
              ...booking,
              reservation: result.reservation,
            } satisfies BookingFlowState,
          },
        )
      } else if (result.payment) {
        navigate(`/payment/complete?paymentId=${result.payment.paymentId}`, {
          state: { ...booking, payment: result.payment },
        })
      }
    } catch (requestError) {
      setError(errorMessage(requestError, "예약을 확정하지 못했습니다."))
    } finally {
      setSubmitting(false)
    }
  }

  const selectedCoupon = coupons.find((coupon) => coupon.couponId === couponId)
  const finalAmount =
    selectedCoupon?.discountPreview.payableAmount ?? booking.session.price

  return (
    <section className="page-container narrow-page">
      <ReservationCrumbs
        eventTitle={booking.content.title}
        current="예약 확인"
      />
      <PageHeader title="예약을 확정하시겠어요?" />
      <Notice>
        선택한 회차와 자리를 확보했어요.{" "}
        <span>
          {dateTimeFormatter.format(new Date(booking.hold.expiresAt))}까지
          확정해 주세요.
        </span>
      </Notice>
      <div className="confirmation-grid">
        <section>
          <h2>예약 내용</h2>
          <h3>{booking.content.title}</h3>
          <InfoRow label="선택 회차">
            {formatRange(booking.session.startsAt, booking.session.endsAt)}
          </InfoRow>
          <InfoRow label="위치">{booking.content.locationText}</InfoRow>
          <InfoRow label="예약 인원">{booking.quantity}명</InfoRow>
        </section>
        <section>
          <h2>예약 확인</h2>
          <InfoRow label="예약 금액">
            {currencyFormatter.format(booking.session.price)}원
          </InfoRow>
          {booking.session.price > 0 && (
            <label className="field-label">
              적용 쿠폰
              <select
                value={couponId ?? ""}
                onChange={(event) => setCouponId(event.target.value || null)}
              >
                <option value="">쿠폰 사용 안 함</option>
                {coupons.map((coupon) => (
                  <option key={coupon.couponId} value={coupon.couponId}>
                    {coupon.policyName} (-
                    {currencyFormatter.format(
                      coupon.discountPreview.discountAmount,
                    )}
                    원)
                  </option>
                ))}
              </select>
            </label>
          )}
          <InfoRow label="최종 금액">
            {currencyFormatter.format(finalAmount)}원
          </InfoRow>
          {error && <p className="form-error">{error}</p>}
          <button
            className="button-primary"
            disabled={submitting}
            onClick={confirm}
          >
            {submitting
              ? "처리 중…"
              : booking.session.price === 0 || finalAmount === 0
                ? "예약 확정하기"
                : "결제 진행하기"}
          </button>
          <p className="summary-caption">
            현장 혹은 내 예약에서 예약 QR을 확인할 수 있습니다.
          </p>
        </section>
      </div>
    </section>
  )
}

export function BookingCompletePage() {
  const { state } = useLocation()
  const booking = state as BookingFlowState | null
  const [params] = useSearchParams()
  const reservationId =
    booking?.reservation?.reservationId ?? params.get("reservationId")
  const [detail, setDetail] = useState<ReservationDetail | null>(null)

  useEffect(() => {
    if (!reservationId || booking?.reservation) return
    const controller = new AbortController()
    getMyReservation(reservationId, controller.signal)
      .then(setDetail)
      .catch(() => undefined)
    return () => controller.abort()
  }, [booking?.reservation, reservationId])

  const title = booking?.content.title ?? detail?.content.title ?? "행사·체험"
  const startsAt = booking?.session.startsAt ?? detail?.session.startsAt
  const endsAt = booking?.session.endsAt ?? detail?.session.endsAt
  const location = booking?.content.locationText ?? detail?.content.locationText
  const quantity = booking?.quantity ?? detail?.reservation.quantity
  const reservationNo =
    booking?.reservation?.reservationNo ?? detail?.reservation.reservationNo

  if (!reservationId) {
    return (
      <section className="visitor-page-state">
        완료된 예약 정보를 찾을 수 없습니다.
      </section>
    )
  }

  return (
    <section className="page-container narrow-page">
      <ReservationCrumbs eventTitle={title} current="예약 완료" />
      <div className="complete-title">
        <span>✓</span>
        <div>
          <h1>예약이 완료되었습니다!</h1>
          <p>예약 내용을 확인해 주세요.</p>
        </div>
      </div>
      <div className="confirmation-grid">
        <section>
          <h2>예약 내용</h2>
          <h3>{title}</h3>
          {startsAt && endsAt && (
            <InfoRow label="선택 회차">{formatRange(startsAt, endsAt)}</InfoRow>
          )}
          <InfoRow label="위치">{location}</InfoRow>
          <InfoRow label="예약 인원">{quantity}명</InfoRow>
        </section>
        <section>
          <h2>예약 번호</h2>
          <div className="booking-number">{reservationNo ?? "조회 중…"}</div>
          <Link
            className="button-primary"
            to={`/reservations/${reservationId}`}
          >
            내 예약 확인하기
          </Link>
          <p className="summary-caption">
            체크인 가능 시간이 되면 내 예약에서 QR을 확인할 수 있습니다.
          </p>
        </section>
      </div>
    </section>
  )
}

export function ReservationsPage() {
  const [params, setParams] = useSearchParams()
  const activeTab = params.get("tab") === "past" ? "past" : "upcoming"
  const [reservations, setReservations] = useState<ReservationSummary[]>([])
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      getMyReservations(controller.signal),
      getMyRefunds(controller.signal),
    ])
      .then(([reservationResult, refundResult]) => {
        setReservations(reservationResult.reservations)
        setRefunds(refundResult.refunds)
      })
      .catch((requestError) => {
        if (isAbortError(requestError, controller.signal)) return
        setError(errorMessage(requestError, "내 예약을 불러오지 못했습니다."))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [])

  const now = Date.now()
  const upcomingReservations = reservations.filter(
    (item) =>
      item.status === "CONFIRMED" &&
      new Date(item.session.endsAt).getTime() >= now,
  )
  const pastReservations = reservations.filter(
    (item) => !upcomingReservations.includes(item),
  )
  const visible =
    activeTab === "upcoming" ? upcomingReservations : pastReservations

  return (
    <section className="page-container reservations-page">
      <PageHeader
        title="내 예약"
        description="예약한 행사·체험의 일정과 체크인 정보를 확인하세요."
      >
        <Breadcrumbs items={[{ label: "홈", to: "/" }, { label: "내 예약" }]} />
      </PageHeader>
      <div className="tab-row">
        <button
          className={activeTab === "upcoming" ? "active" : ""}
          onClick={() => setParams({})}
        >
          다가오는 예약 <b>{upcomingReservations.length}</b>
        </button>
        <button
          className={activeTab === "past" ? "active" : ""}
          onClick={() => setParams({ tab: "past" })}
        >
          지난 예약 <b>{pastReservations.length}</b>
        </button>
      </div>
      {loading && <p>예약을 불러오는 중입니다.</p>}
      {error && <p className="form-error">{error}</p>}
      {!loading && !error && visible.length === 0 && (
        <p className="visitor-page-state">해당하는 예약이 없습니다.</p>
      )}
      <div className="reservation-list">
        {visible.map((reservation) => (
          <ReservationCard
            key={reservation.reservationId}
            reservation={reservation}
            refund={refunds.find(
              (item) => item.reservationId === reservation.reservationId,
            )}
          />
        ))}
      </div>
    </section>
  )
}

function ReservationCard({
  reservation,
  refund,
}: {
  reservation: ReservationSummary
  refund?: Refund
}) {
  const label = reservationStatus(
    reservation.status,
    reservation.checkIn.checkedIn,
  )
  return (
    <article className="reservation-card">
      <div className="reservation-date">
        <b>
          {formatRange(
            reservation.session.startsAt,
            reservation.session.endsAt,
          )}
        </b>
        <span>
          {dateFormatter.format(new Date(reservation.session.startsAt))}
        </span>
      </div>
      <div className="reservation-info">
        <StatusPill
          tone={reservation.status === "CONFIRMED" ? "green" : "gray"}
        >
          {label}
        </StatusPill>
        <h2>
          <Link
            className="content-title-link"
            to={`/events/${reservation.content.contentId}`}
          >
            {reservation.content.title}
          </Link>
        </h2>
        <p>{reservation.content.locationText}</p>
        <small>예약 번호 {reservation.reservationNo}</small>
        {refund && <small> · 환불 {refund.status}</small>}
      </div>
      <div className="reservation-actions">
        {reservation.status === "CONFIRMED" && (
          <Link
            className="button-primary button-small"
            to={`/reservations/${reservation.reservationId}?showQr=true#check-in-qr`}
          >
            체크인 QR 보기
          </Link>
        )}
        {reservation.checkIn.checkedIn &&
          reservation.checkIn.visitId &&
          reservation.review?.status !== "DELETED" && (
            <Link
              className="button-primary button-small"
              to={`/reviews/new?visitId=${reservation.checkIn.visitId}&reservationId=${reservation.reservationId}`}
            >
              {reservation.review?.status === "PUBLISHED"
                ? "후기 수정"
                : "후기 작성"}
            </Link>
          )}
        <Link
          className="button-outline"
          to={`/reservations/${reservation.reservationId}`}
        >
          예약 상세
        </Link>
      </div>
    </article>
  )
}

export function ReservationDetailPage() {
  const { reservationId } = useParams()
  const [params] = useSearchParams()
  const showQr = params.get("showQr") === "true"
  const [detail, setDetail] = useState<ReservationDetail | null>(null)
  const [refund, setRefund] = useState<Refund | null>(null)
  const [qrImage, setQrImage] = useState<string | null>(null)
  const [qrExpiresAt, setQrExpiresAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(false)
  const qrAutoLoadedFor = useRef<string | null>(null)

  useEffect(() => {
    if (!reservationId) return
    const controller = new AbortController()
    Promise.all([
      getMyReservation(reservationId, controller.signal),
      getMyRefunds(controller.signal),
    ])
      .then(async ([nextDetail, refundResult]) => {
        setDetail(nextDetail)
        const summary = refundResult.refunds.find(
          (item) => item.reservationId === reservationId,
        )
        if (summary)
          setRefund(await getMyRefund(summary.refundId, controller.signal))
      })
      .catch((requestError) => {
        if (isAbortError(requestError, controller.signal)) return
        setError(errorMessage(requestError, "예약 상세를 불러오지 못했습니다."))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [reservationId])

  const loadQr = useCallback(async () => {
    if (!reservationId) return
    setQrLoading(true)
    setError(null)
    try {
      const qr = await getMyReservationQr(reservationId)
      setQrImage(await QRCode.toDataURL(qr.qrToken, { width: 220, margin: 1 }))
      setQrExpiresAt(qr.expiresAt)
    } catch (requestError) {
      setError(errorMessage(requestError, "체크인 QR을 불러오지 못했습니다."))
    } finally {
      setQrLoading(false)
    }
  }, [reservationId])

  useEffect(() => {
    if (
      !showQr ||
      !detail ||
      detail.reservation.status !== "CONFIRMED" ||
      qrAutoLoadedFor.current === reservationId
    ) {
      return
    }
    qrAutoLoadedFor.current = reservationId ?? null
    document
      .getElementById("check-in-qr")
      ?.scrollIntoView({ behavior: "smooth", block: "center" })
    void loadQr()
  }, [detail, loadQr, reservationId, showQr])

  if (loading)
    return (
      <section className="visitor-page-state">
        예약 상세를 불러오는 중입니다.
      </section>
    )
  if (error && !detail)
    return (
      <section className="visitor-page-state">
        <p>{error}</p>
      </section>
    )
  if (!detail)
    return (
      <section className="visitor-page-state">예약을 찾을 수 없습니다.</section>
    )

  return (
    <section className="page-container narrow-page">
      <ReservationCrumbs
        eventTitle={detail.content.title}
        current="예약 상세"
      />
      <div className="detail-heading">
        <h1>
          <Link
            className="content-title-link"
            to={`/events/${detail.content.contentId}`}
          >
            {detail.content.title}
          </Link>
        </h1>
        <StatusPill
          tone={detail.reservation.status === "CONFIRMED" ? "green" : "gray"}
        >
          {reservationStatus(
            detail.reservation.status,
            detail.checkIn.checkedIn,
          )}
        </StatusPill>
      </div>
      <div className="confirmation-grid">
        <section>
          <h2>예약 내용</h2>
          <h3>
            <Link
              className="content-title-link"
              to={`/events/${detail.content.contentId}`}
            >
              {detail.content.title}
            </Link>
          </h3>
          <InfoRow label="행사 일정">
            {formatRange(detail.session.startsAt, detail.session.endsAt)}
          </InfoRow>
          <InfoRow label="회차 상태">{detail.session.status}</InfoRow>
          <InfoRow label="체크인 시간">
            {formatRange(
              detail.session.checkinOpenAt,
              detail.session.checkinCloseAt,
            )}
          </InfoRow>
          <InfoRow label="체크인">
            {detail.checkIn.checkedIn
              ? `완료 (${dateTimeFormatter.format(new Date(detail.checkIn.checkedAt!))})`
              : "아직 안 함"}
          </InfoRow>
          <InfoRow label="예약 번호">
            {detail.reservation.reservationNo}
          </InfoRow>
          {refund && (
            <InfoRow label="환불 상태">
              {refund.status} · {currencyFormatter.format(refund.amount)}원
            </InfoRow>
          )}
          {detail.reservation.status === "CONFIRMED" && (
            <Link
              className="text-danger-link"
              to={`/reservations/${detail.reservation.reservationId}/cancel`}
            >
              예약 취소
            </Link>
          )}
        </section>
        <section id="check-in-qr">
          <h2>체크인 QR</h2>
          <div className="qr-panel">
            {qrImage ? (
              <>
                <img
                  src={qrImage}
                  width={220}
                  height={220}
                  alt="체크인 QR 코드"
                />
                {qrExpiresAt && (
                  <small>
                    {dateTimeFormatter.format(new Date(qrExpiresAt))}까지 유효
                  </small>
                )}
              </>
            ) : (
              <>
                <p>
                  체크인 가능 시간에 현장 담당자에게 제시할 QR을 불러오세요.
                </p>
                <button
                  className="button-primary"
                  disabled={
                    qrLoading || detail.reservation.status !== "CONFIRMED"
                  }
                  onClick={loadQr}
                >
                  {qrLoading ? "불러오는 중…" : "체크인 QR 불러오기"}
                </button>
              </>
            )}
          </div>
          {error && <p className="form-error">{error}</p>}
        </section>
      </div>
    </section>
  )
}

export function CancelReservationPage() {
  const { reservationId } = useParams()
  const [detail, setDetail] = useState<ReservationDetail | null>(null)
  const [result, setResult] = useState<CancelReservationResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!reservationId) return
    const controller = new AbortController()
    getMyReservation(reservationId, controller.signal)
      .then(setDetail)
      .catch((requestError) => {
        if (isAbortError(requestError, controller.signal)) return
        setError(errorMessage(requestError, "예약을 불러오지 못했습니다."))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [reservationId])

  const cancel = async () => {
    if (!reservationId) return
    setSubmitting(true)
    setError(null)
    try {
      setResult(await cancelMyReservation(reservationId))
    } catch (requestError) {
      setError(errorMessage(requestError, "예약을 취소하지 못했습니다."))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading)
    return (
      <section className="visitor-page-state">
        예약을 불러오는 중입니다.
      </section>
    )
  if (!detail)
    return (
      <section className="visitor-page-state">
        <p>{error ?? "예약을 찾을 수 없습니다."}</p>
      </section>
    )

  return (
    <section className="page-container narrow-page">
      <ReservationCrumbs
        eventTitle={detail.content.title}
        current="예약 취소"
      />
      <PageHeader
        title="예약을 취소하시겠어요?"
        description="취소한 예약은 되돌릴 수 없습니다."
      />
      <div className="confirmation-grid">
        <section>
          <h2>취소할 예약</h2>
          <h3>{detail.content.title}</h3>
          <InfoRow label="예약 상태">
            {reservationStatus(detail.reservation.status)}
          </InfoRow>
          <InfoRow label="행사 일정">
            {formatRange(detail.session.startsAt, detail.session.endsAt)}
          </InfoRow>
          <InfoRow label="예약 번호">
            {detail.reservation.reservationNo}
          </InfoRow>
        </section>
        <section>
          <h2>취소 전 확인</h2>
          {result ? (
            <div className="cancel-done">
              <span>✓</span>
              <h3>예약이 취소되었습니다.</h3>
              <p>취소한 예약은 내 예약에서 계속 확인할 수 있습니다.</p>
              <InfoRow label="예약 상태">
                {reservationStatus(result.reservationStatus)}
              </InfoRow>
              <InfoRow label="취소 사유">{result.cancellationReason}</InfoRow>
              <InfoRow label="정원 복구">
                {dateTimeFormatter.format(new Date(result.capacityReleasedAt))}
              </InfoRow>
              {result.refund && (
                <InfoRow label="환불">
                  {result.refund.status} ·{" "}
                  {currencyFormatter.format(result.refund.amount)}원
                </InfoRow>
              )}
              <Link className="button-primary" to="/reservations">
                내 예약으로 돌아가기
              </Link>
            </div>
          ) : (
            <>
              <Notice tone="red">
                <b>예약 전체가 취소됩니다.</b>
                <br />
                행사 시작 전의 확정 예약만 취소할 수 있습니다.
                <ul>
                  <li>일부 인원만 취소하거나 인원을 변경할 수 없습니다.</li>
                  <li>취소가 완료되면 확보한 자리가 한 번 복구됩니다.</li>
                </ul>
              </Notice>
              {error && <p className="form-error">{error}</p>}
              <div className="cancel-actions">
                <Link
                  className="button-outline"
                  to={`/reservations/${reservationId}`}
                >
                  예약 상세로 돌아가기
                </Link>
                <button
                  className="button-danger"
                  disabled={submitting}
                  onClick={cancel}
                >
                  {submitting ? "취소 처리 중…" : "예약 전체 취소하기"}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </section>
  )
}

export function PaymentCompletePage() {
  const [params] = useSearchParams()
  const paymentId = params.get("paymentId")
  const [payment, setPayment] = useState<PaymentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!paymentId) {
      setError("조회할 결제 식별자가 없습니다.")
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    getMyPayment(paymentId, controller.signal)
      .then(setPayment)
      .catch((requestError) => {
        if (isAbortError(requestError, controller.signal)) return
        setError(errorMessage(requestError, "결제 상태를 불러오지 못했습니다."))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [paymentId, version])

  if (loading)
    return (
      <section className="visitor-page-state">
        결제 상태를 확인하는 중입니다.
      </section>
    )
  if (!payment)
    return (
      <section className="visitor-page-state">
        <p>{error ?? "결제를 찾을 수 없습니다."}</p>
      </section>
    )
  const approved = payment.status === "APPROVED" && payment.reservationId

  return (
    <section className="payment-result">
      <Breadcrumbs
        items={[
          { label: "홈", to: "/" },
          { label: "예약" },
          { label: "결제 결과" },
        ]}
      />
      <div className="payment-success">
        <span>{approved ? "✓" : "…"}</span>
        <div>
          <h1>
            {approved
              ? "결제가 승인되어 예약이 완료되었어요."
              : "결제 승인을 기다리고 있어요."}
          </h1>
          <p>
            {approved
              ? "결제 승인과 예약 확정이 모두 완료되었습니다."
              : "현재 서버 결제 상태는 PENDING입니다. 외부 결제 승인 후 상태를 다시 확인해 주세요."}
          </p>
        </div>
      </div>
      <div className="payment-state">
        <div>
          {approved ? "✓" : "…"}{" "}
          <span>
            예약 상태<b>{approved ? "예약 확정" : "확정 대기"}</b>
          </span>
        </div>
        <div>
          {approved ? "✓" : "…"}{" "}
          <span>
            결제 상태<b>{payment.status}</b>
          </span>
        </div>
      </div>
      <div className="confirmation-grid">
        <section>
          <h2>결제 정보</h2>
          <InfoRow label="결제 ID">{payment.paymentId}</InfoRow>
          <InfoRow label="주문 번호">{payment.orderId}</InfoRow>
          <InfoRow label="생성 시각">
            {dateTimeFormatter.format(new Date(payment.createdAt))}
          </InfoRow>
        </section>
        <section>
          <h2>결제 내역</h2>
          <InfoRow label="기본 금액">
            {currencyFormatter.format(payment.amount.baseAmount)}원
          </InfoRow>
          <InfoRow label="쿠폰 할인">
            -{currencyFormatter.format(payment.amount.discountAmount)}원
          </InfoRow>
          <InfoRow label="최종 결제 금액">
            {currencyFormatter.format(payment.amount.finalAmount)}원
          </InfoRow>
        </section>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="payment-actions">
        <Link className="button-outline" to="/reservations">
          내 예약으로 이동
        </Link>
        {approved ? (
          <Link
            className="button-primary"
            to={`/reservations/${payment.reservationId}`}
          >
            예약 상세 보기
          </Link>
        ) : (
          <button
            className="button-primary"
            onClick={() => setVersion((value) => value + 1)}
          >
            결제 상태 다시 확인
          </button>
        )}
      </div>
    </section>
  )
}
