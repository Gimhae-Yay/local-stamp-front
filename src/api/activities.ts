import { apiRequest, withQuery } from "./client";

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface PublicMission {
  missionId: string;
  regionId: string;
  title: string;
  conditionType: string;
  requiredVisitCount: number | null;
  targetContentCount: number;
  endsAt: string;
  participationStatus: string | null;
}

export interface PublicMissionDetail {
  missionId: string;
  regionId: string;
  conditionType: string;
  requiredVisitCount: number | null;
  targetContents: Array<{ contentId: string; title: string }>;
  rewardCouponPolicyId: string;
  endsAt: string;
  participation: {
    participationId: string;
    status: string;
    progressCount: number;
    requiredCount: number;
    rewardClaimed: boolean;
  } | null;
}

export interface MissionParticipationSummary {
  participationId: string;
  missionId: string;
  title: string;
  status: string;
  progressCount: number;
  requiredCount: number;
  rewardClaimed: boolean;
  joinedAt: string;
  completedAt: string | null;
}

export interface MissionParticipationDetail extends MissionParticipationSummary {
  conditionType: string;
  progresses: Array<{
    visitId: string;
    contentId: string;
    contentTitle: string;
    recordedAt: string;
  }>;
}

export interface StampbookSummary {
  stampbookId: string;
  title: string;
  regionId: string;
  status: string;
  publishedAt: string;
  progress: {
    status: string;
    earnedCount: number;
    targetCount: number;
    completedAt: string | null;
    lastEarnedAt: string | null;
    completionReward: {
      couponPolicyId: string;
      stampbookRewardGrantId: string;
    } | null;
  };
}

export interface StampbookDetail {
  stampbook: {
    stampbookId: string;
    title: string;
    regionId: string;
    status: string;
    publishedAt: string;
    endedAt: string | null;
    targetContents: Array<{
      contentId: string;
      title: string;
      earned: boolean;
      earnedAt: string | null;
    }>;
  };
  progress: {
    status: string;
    earnedCount: number;
    targetCount: number;
    completedAt: string | null;
    completionReward: {
      couponPolicyId: string;
      stampbookRewardGrantId: string;
    } | null;
  };
}

export interface StampbookEarnings {
  stampbookId: string;
  earnings: Array<{
    stampEarnId: string;
    visitId: string;
    content: { contentId: string; title: string };
    visitedAt: string;
    earnedAt: string;
  }>;
}

export interface CouponSummary {
  couponId: string;
  couponPolicyId: string;
  contentId: string;
  regionId: string;
  policyName: string;
  issueSourceType: string;
  status: string;
  discountAmount: number;
  minimumPaymentAmount: number;
  issuedAt: string;
  expiresAt: string;
}

export interface AvailableCoupon extends CouponSummary {
  discountPreview: {
    baseAmount: number;
    discountAmount: number;
    payableAmount: number;
  };
}

export interface CouponDetail {
  coupon: {
    couponId: string;
    couponPolicyId: string;
    policyName: string;
    issueSourceType: string;
    sourceId: string;
    status: string;
    discountAmount: number;
    minimumPaymentAmount: number;
    issuedAt: string;
    expiresAt: string;
  };
  policy: {
    contentId: string;
    regionId: string;
    status: string;
    validDaysAfterIssue: number;
  };
}

export interface CouponUsageHistory {
  couponId: string;
  usageHistory: Array<{
    couponRedemptionId: string;
    reservationId: string;
    priceSnapshotId: string;
    status: string;
    discountAmount: number;
    confirmedAt: string;
    reversedAt: string | null;
  }>;
}

export interface ReviewMutationResponse {
  reviewId: string;
  rating: number;
  reviewText: string;
  createdAt: string;
  updatedAt?: string;
}

export function getPublicRegionMissions(
  regionId: string,
  {
    page = 0,
    size = 20,
    signal,
  }: {
    page?: number;
    size?: number;
    signal?: AbortSignal;
  } = {},
) {
  return apiRequest<PageResponse<PublicMission>>(
    withQuery(`/api/v1/regions/${encodeURIComponent(regionId)}/missions`, {
      page,
      size,
    }),
    { auth: "optional", signal },
  );
}

export function getPublicMission(missionId: string, signal?: AbortSignal) {
  return apiRequest<PublicMissionDetail>(`/api/v1/missions/${encodeURIComponent(missionId)}`, {
    auth: "optional",
    signal,
  });
}

export function participateInMission(missionId: string) {
  return apiRequest<{
    participationId: string;
    missionId: string;
    status: string;
    joinedAt: string;
  }>(`/api/v1/missions/${encodeURIComponent(missionId)}/participations`, {
    method: "POST",
  });
}

export function getMyMissionParticipations({
  status,
  page = 0,
  size = 100,
  signal,
}: {
  status?: string;
  page?: number;
  size?: number;
  signal?: AbortSignal;
} = {}) {
  return apiRequest<PageResponse<MissionParticipationSummary>>(
    withQuery("/api/v1/me/mission-participations", { status, page, size }),
    { signal },
  );
}

export function getMyMissionParticipation(participationId: string, signal?: AbortSignal) {
  return apiRequest<MissionParticipationDetail>(
    `/api/v1/me/mission-participations/${encodeURIComponent(participationId)}`,
    { signal },
  );
}

export function claimMissionReward(participationId: string) {
  return apiRequest<{
    missionRewardClaimId: string;
    participationId: string;
    couponId: string;
    couponPolicyId: string;
    claimedAt: string;
  }>(`/api/v1/me/mission-participations/${encodeURIComponent(participationId)}/rewards/claim`, {
    method: "POST",
  });
}

export function getMyStampbooks(signal?: AbortSignal) {
  return apiRequest<{ stampbooks: StampbookSummary[] }>("/api/v1/me/stampbooks", { signal });
}

export function getMyStampbook(stampbookId: string, signal?: AbortSignal) {
  return apiRequest<StampbookDetail>(`/api/v1/me/stampbooks/${encodeURIComponent(stampbookId)}`, {
    signal,
  });
}

export function getMyStampbookEarnings(stampbookId: string, signal?: AbortSignal) {
  return apiRequest<StampbookEarnings>(
    `/api/v1/me/stampbooks/${encodeURIComponent(stampbookId)}/earnings`,
    { signal },
  );
}

export function issueCoupon(couponPolicyId: string, issueSourceType: string, sourceId: string) {
  return apiRequest<CouponSummary & { duplicate: boolean }>(
    `/api/v1/coupon-policies/${encodeURIComponent(couponPolicyId)}/coupons`,
    {
      method: "POST",
      body: JSON.stringify({ issueSourceType, sourceId }),
    },
  );
}

export function getMyCoupons(status?: string, signal?: AbortSignal) {
  return apiRequest<{ coupons: CouponSummary[] }>(withQuery("/api/v1/me/coupons", { status }), {
    signal,
  });
}

export function getMyAvailableCoupons(holdId: string, signal?: AbortSignal) {
  return apiRequest<{
    holdId: string;
    evaluatedAt: string;
    availableCoupons: AvailableCoupon[];
  }>(withQuery("/api/v1/me/coupons/available", { holdId }), { signal });
}

export function getMyCoupon(couponId: string, signal?: AbortSignal) {
  return apiRequest<CouponDetail>(`/api/v1/me/coupons/${encodeURIComponent(couponId)}`, { signal });
}

export function getMyCouponUsageHistory(couponId: string, signal?: AbortSignal) {
  return apiRequest<CouponUsageHistory>(
    `/api/v1/me/coupons/${encodeURIComponent(couponId)}/usage-history`,
    { signal },
  );
}

export function createVisitReview(visitId: string, rating: number, reviewText: string) {
  return apiRequest<
    ReviewMutationResponse & {
      visitId: string;
      contentId: string;
    }
  >(`/api/v1/visits/${encodeURIComponent(visitId)}/reviews`, {
    method: "POST",
    body: JSON.stringify({ rating, reviewText }),
  });
}

export function updateReview(reviewId: string, rating: number, reviewText: string) {
  return apiRequest<ReviewMutationResponse>(`/api/v1/reviews/${encodeURIComponent(reviewId)}`, {
    method: "PATCH",
    body: JSON.stringify({ rating, reviewText }),
  });
}

export function deleteReview(reviewId: string) {
  return apiRequest<void>(`/api/v1/reviews/${encodeURIComponent(reviewId)}`, {
    method: "DELETE",
  });
}
