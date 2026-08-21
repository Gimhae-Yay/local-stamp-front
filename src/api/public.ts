import { ApiError, apiRequest, withQuery } from "./client";

export { ApiError as PublicApiError };

export interface PresignedImageFields {
  representativeImageUrl: string | null;
  representativeImageUrlExpiresAt: string | null;
}

export interface PublicRegion {
  regionId: string;
  regionCode: string;
  name: string;
}

export interface RegionHomeContent extends PresignedImageFields {
  contentId: string;
  contentType: "EVENT_EXPERIENCE";
  title: string;
  locationText: string;
  reservationAvailable: boolean;
  displaySession: {
    sessionId: string;
    startsAt: string;
    endsAt: string;
    remainingCapacity: number;
  };
}

export interface PublicContent extends PresignedImageFields {
  contentId: string;
  contentType: "EVENT_EXPERIENCE";
  title: string;
  locationText: string;
  reservationAvailable: boolean;
}

export interface PublicContentDetail extends PresignedImageFields {
  contentId: string;
  contentType: "EVENT_EXPERIENCE";
  title: string;
  description: string;
  locationText: string;
  operatingHoursText: string;
  contactText: string;
  precautions: string;
  ageRequirement: string;
  materials: string;
  cancellationPolicyText: string;
}

export interface PublicContentReview {
  reviewId: string;
  authorDisplayName: string;
  rating: number;
  reviewText: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicContentReviewPage {
  content: PublicContentReview[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface PublicContentSession {
  sessionId: string;
  startsAt: string;
  endsAt: string;
}

export interface PublicSessionDetail extends PublicContentSession {
  contentId: string;
  price: number;
  remainingCapacity: number;
  reservable: boolean;
}

export function getPublicRegions(signal?: AbortSignal) {
  return apiRequest<{ regions: PublicRegion[] }>("/api/v1/regions", {
    auth: "none",
    signal,
  });
}

export function getRegionHome(regionId: string, signal?: AbortSignal) {
  return apiRequest<{
    region: PublicRegion;
    ongoingContents: RegionHomeContent[];
    upcomingContents: RegionHomeContent[];
  }>(`/api/v1/regions/${encodeURIComponent(regionId)}/home`, {
    auth: "none",
    signal,
  });
}

export function getPublicContents(
  regionId: string,
  reservationAvailable?: boolean,
  signal?: AbortSignal,
) {
  const path = withQuery("/api/v1/contents", {
    regionId,
    contentType: "EVENT_EXPERIENCE",
    reservationAvailable,
  });
  return apiRequest<{ contents: PublicContent[] }>(path, {
    auth: "none",
    signal,
  });
}

export function getPublicContent(contentId: string, signal?: AbortSignal) {
  return apiRequest<PublicContentDetail>(`/api/v1/contents/${encodeURIComponent(contentId)}`, {
    auth: "none",
    signal,
  });
}

export function getPublicContentReviews(
  contentId: string,
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
  return apiRequest<PublicContentReviewPage>(
    withQuery(`/api/v1/contents/${encodeURIComponent(contentId)}/reviews`, {
      page,
      size,
    }),
    { auth: "none", signal },
  );
}

export function getPublicContentSessions(contentId: string, signal?: AbortSignal) {
  return apiRequest<{
    contentId: string;
    sessions: PublicContentSession[];
  }>(`/api/v1/contents/${encodeURIComponent(contentId)}/sessions`, {
    auth: "none",
    signal,
  });
}

export function getPublicSession(sessionId: string, signal?: AbortSignal) {
  return apiRequest<PublicSessionDetail>(`/api/v1/sessions/${encodeURIComponent(sessionId)}`, {
    auth: "none",
    signal,
  });
}
