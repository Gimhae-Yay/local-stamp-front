import { apiRequest, withQuery } from "../api/client"
import type {
  CheckInResult,
  ContentDetail,
  ContentInput,
  ContentSessionSummary,
  ContentSummary,
  CouponPolicyDetail,
  CouponPolicyInput,
  CouponPolicySummary,
  CreatedCouponPolicy,
  MissionDetail,
  MissionInput,
  MissionSummary,
  PageData,
  ReservationPayment,
  ReservationSearchResult,
  SessionInput,
  SessionReservations,
  StampbookDraft,
  StampbookInput,
} from "./types"

const jsonBody = (body: unknown) => JSON.stringify(body)

export function listMyContents(signal?: AbortSignal) {
  return apiRequest<{ contents: ContentSummary[] }>(
    "/api/v1/operator/contents",
    {
      signal,
    },
  )
}

export function getMyContent(contentId: string, signal?: AbortSignal) {
  return apiRequest<ContentDetail>(
    `/api/v1/operator/contents/${encodeURIComponent(contentId)}`,
    { signal },
  )
}

export function listPublicContentSessions(
  contentId: string,
  signal?: AbortSignal,
) {
  return apiRequest<{ contentId: string; sessions: ContentSessionSummary[] }>(
    `/api/v1/contents/${encodeURIComponent(contentId)}/sessions`,
    { auth: "none", signal },
  )
}

async function sha256Base64(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer())
  const bytes = new Uint8Array(digest)
  let binary = ""
  bytes.forEach((value) => {
    binary += String.fromCharCode(value)
  })
  return btoa(binary)
}

export function isLocalFakeImageStorageUrl(uploadUrl: string) {
  try {
    const url = new URL(uploadUrl)
    return (
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
      url.pathname.startsWith("/local-image-storage/")
    )
  } catch {
    return false
  }
}

export async function uploadRepresentativeImage(file: File) {
  const presigned = await apiRequest<{
    imageObjectId: string
    uploadUrl: string
    expiresAt: string
    uploadHeaders: Record<string, string>
  }>("/api/v1/operator/uploads/presigned-url", {
    method: "POST",
    body: jsonBody({
      mediaType: file.type,
      byteSize: file.size,
      checksum: await sha256Base64(file),
      usage: "CONTENT_REPRESENTATIVE",
    }),
  })

  // 로컬 Backend의 fake 저장소는 presigned 응답 시 메타데이터만 등록하고
  // 실제 PUT 엔드포인트를 제공하지 않는다. 운영 S3 URL은 아래에서 정상 업로드한다.
  if (isLocalFakeImageStorageUrl(presigned.uploadUrl))
    return presigned.imageObjectId

  const uploadHeaders = new Headers(presigned.uploadHeaders)
  uploadHeaders.delete("Content-Length")

  const response = await fetch(presigned.uploadUrl, {
    method: "PUT",
    headers: uploadHeaders,
    body: file,
  })
  if (!response.ok)
    throw new Error("대표 이미지를 저장소에 업로드하지 못했습니다.")
  return presigned.imageObjectId
}

export function createContent(input: ContentInput, sessions: SessionInput[]) {
  return apiRequest<{
    contentId: string
    status: string
    submittedAt: string
  }>("/api/v1/operator/contents", {
    method: "POST",
    body: jsonBody({ ...input, sessions }),
  })
}

export function updateRejectedContent(contentId: string, input: ContentInput) {
  return apiRequest<{ contentId: string; status: string }>(
    `/api/v1/operator/contents/${encodeURIComponent(contentId)}`,
    { method: "PUT", body: jsonBody(input) },
  )
}

export function submitContent(contentId: string) {
  return apiRequest<{ contentId: string; status: string }>(
    `/api/v1/operator/contents/${encodeURIComponent(contentId)}/submit`,
    { method: "POST" },
  )
}

export function createContentRevision(contentId: string, input: ContentInput) {
  return apiRequest<{
    revisionId: string
    contentId: string
    status: string
  }>(`/api/v1/operator/contents/${encodeURIComponent(contentId)}/revisions`, {
    method: "POST",
    body: jsonBody(input),
  })
}

export function createContentSession(contentId: string, input: SessionInput) {
  return apiRequest<{
    sessionId: string
    contentId: string
    status: string
  }>(`/api/v1/operator/contents/${encodeURIComponent(contentId)}/sessions`, {
    method: "POST",
    body: jsonBody(input),
  })
}

export function requestSessionChange(sessionId: string, input: SessionInput) {
  return apiRequest<{ revisionId: string; status: string }>(
    `/api/v1/operator/sessions/${encodeURIComponent(sessionId)}/change-requests`,
    { method: "POST", body: jsonBody(input) },
  )
}

export function cancelSession(sessionId: string, cancellationReason: string) {
  return apiRequest<{ sessionId: string; status: string }>(
    `/api/v1/operator/sessions/${encodeURIComponent(sessionId)}/cancel`,
    { method: "POST", body: jsonBody({ cancellationReason }) },
  )
}

export function requestContentWithdrawal(contentId: string, reason: string) {
  return apiRequest<{ withdrawalRequestId: string; status: string }>(
    `/api/v1/operator/contents/${encodeURIComponent(contentId)}/withdrawal-requests`,
    { method: "POST", body: jsonBody({ reason }) },
  )
}

export function listSessionReservations(
  contentId: string,
  sessionId: string,
  signal?: AbortSignal,
) {
  return apiRequest<SessionReservations>(
    withQuery(
      `/api/v1/operator/contents/${encodeURIComponent(contentId)}/reservations`,
      { sessionId },
    ),
    { signal },
  )
}

export function getReservationPayment(
  reservationId: string,
  signal?: AbortSignal,
) {
  return apiRequest<ReservationPayment>(
    `/api/v1/operator/reservations/${encodeURIComponent(reservationId)}/payment`,
    { signal },
  )
}

export function searchReservation(reservationNo: string) {
  return apiRequest<ReservationSearchResult>(
    withQuery("/api/v1/operator/reservations/search", { reservationNo }),
  )
}

export function checkInByQr(qrToken: string, idempotencyKey: string) {
  return apiRequest<CheckInResult>("/api/v1/operator/check-ins", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: jsonBody({ qrToken }),
  })
}

export function checkInManually(
  reservationNo: string,
  reason: string,
  idempotencyKey: string,
) {
  return apiRequest<CheckInResult>("/api/v1/operator/check-ins/manual", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: jsonBody({ reservationNo, reason }),
  })
}

export function listCouponPolicies(signal?: AbortSignal) {
  return apiRequest<{ couponPolicies: CouponPolicySummary[] }>(
    "/api/v1/operator/coupon-policies",
    { signal },
  )
}

export function getCouponPolicy(id: string, signal?: AbortSignal) {
  return apiRequest<CouponPolicyDetail>(
    `/api/v1/operator/coupon-policies/${encodeURIComponent(id)}`,
    { signal },
  )
}

export function createCouponPolicy(input: CouponPolicyInput) {
  return apiRequest<CreatedCouponPolicy>("/api/v1/operator/coupon-policies", {
    method: "POST",
    body: jsonBody(input),
  })
}

export function updateCouponPolicy(
  id: string,
  input: Omit<CouponPolicyInput, "contentId" | "issueSourceType"> & {
    reason: string
  },
) {
  return apiRequest<{ couponPolicyId: string; status: string }>(
    `/api/v1/operator/coupon-policies/${encodeURIComponent(id)}`,
    { method: "PATCH", body: jsonBody(input) },
  )
}

export function publishCouponPolicy(id: string, reason: string) {
  return apiRequest<{ couponPolicyId: string; status: string }>(
    `/api/v1/operator/coupon-policies/${encodeURIComponent(id)}/publish`,
    { method: "POST", body: jsonBody({ reason }) },
  )
}

export function endCouponPolicy(id: string, reason: string) {
  return apiRequest<{ couponPolicyId: string; status: string }>(
    `/api/v1/operator/coupon-policies/${encodeURIComponent(id)}/end`,
    { method: "POST", body: jsonBody({ reason }) },
  )
}

export function listMissions(
  status: string,
  page: number,
  size: number,
  signal?: AbortSignal,
) {
  return apiRequest<PageData<MissionSummary>>(
    withQuery("/api/v1/operator/missions", { status, page, size }),
    { signal },
  )
}

export function getMission(id: string, signal?: AbortSignal) {
  return apiRequest<MissionDetail>(
    `/api/v1/operator/missions/${encodeURIComponent(id)}`,
    { signal },
  )
}

export function createMission(input: MissionInput) {
  return apiRequest<{ missionId: string; status: string }>(
    "/api/v1/operator/missions",
    { method: "POST", body: jsonBody(input) },
  )
}

export function updateMission(id: string, input: MissionInput) {
  return apiRequest<{ missionId: string; status: string }>(
    `/api/v1/operator/missions/${encodeURIComponent(id)}`,
    { method: "PATCH", body: jsonBody(input) },
  )
}

export function submitMission(id: string) {
  return apiRequest<{ missionId: string; status: string }>(
    `/api/v1/operator/missions/${encodeURIComponent(id)}/submit`,
    { method: "POST" },
  )
}

export function endMission(id: string, reasonCode: string) {
  return apiRequest<{ missionId: string; status: string }>(
    `/api/v1/operator/missions/${encodeURIComponent(id)}/end`,
    { method: "POST", body: jsonBody({ reasonCode }) },
  )
}

export function createStampbook(input: StampbookInput) {
  return apiRequest<StampbookDraft>("/api/v1/operator/stampbooks", {
    method: "POST",
    body: jsonBody(input),
  })
}

export function updateStampbook(id: string, input: StampbookInput) {
  return apiRequest<{
    stampbookId: string
    status: string
    targetCount: number
  }>(`/api/v1/operator/stampbooks/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: jsonBody({
      title: input.title,
      contentIds: input.contentIds,
      rewardCouponPolicyId: input.rewardCouponPolicyId,
      reason: input.reason,
    }),
  })
}

export function publishStampbook(id: string, reason: string) {
  return apiRequest<{ stampbookId: string; status: string }>(
    `/api/v1/operator/stampbooks/${encodeURIComponent(id)}/publish`,
    { method: "POST", body: jsonBody({ reason }) },
  )
}

export function endStampbook(id: string, reason: string) {
  return apiRequest<{ stampbookId: string; status: string }>(
    `/api/v1/operator/stampbooks/${encodeURIComponent(id)}/end`,
    { method: "POST", body: jsonBody({ reason }) },
  )
}
