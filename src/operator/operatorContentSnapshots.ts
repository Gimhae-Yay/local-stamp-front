import type {
  ContentInput,
  ContentSessionSummary,
  CreatedContentSession,
  SessionInput,
} from "./types";
import { readOperatorCompatValue, writeOperatorCompatValue } from "./operatorCompatStorage";

export interface ContentRevisionSnapshot {
  revisionId: string;
  contentId: string;
  status: string;
  candidate: ContentInput;
  submittedAt?: string;
  updatedAt?: string;
  withdrawalReason?: string;
  withdrawnAt?: string;
  locallySavedAt?: string;
}

export interface ContentSessionSnapshot extends CreatedContentSession {
  changeRequestId?: string;
  changeRequestStatus?: string;
  changeCandidate?: SessionInput;
  changeRequestedAt?: string;
  localStatusRecordedAt?: string;
}

export const LOCAL_REVIEW_GUARD_MS = 60 * 60 * 1000;

function isFresh(timestamp: string | undefined, now: number) {
  if (!timestamp) return false;
  const recordedAt = Date.parse(timestamp);
  if (Number.isNaN(recordedAt)) return false;

  const age = now - recordedAt;
  return age >= -5 * 60 * 1000 && age <= LOCAL_REVIEW_GUARD_MS;
}

export function isContentRevisionReviewFresh(
  snapshot: ContentRevisionSnapshot | null | undefined,
  now = Date.now(),
) {
  return (
    snapshot?.status === "EDIT_REQUESTED" &&
    isFresh(snapshot.submittedAt ?? snapshot.updatedAt ?? snapshot.locallySavedAt, now)
  );
}

export function readContentRevisionSnapshot(userId: string, revisionId: string) {
  return readOperatorCompatValue<ContentRevisionSnapshot>(userId, "content-revision", revisionId)
    ?.value;
}

export function readLatestContentRevisionSnapshot(userId: string, contentId: string) {
  return readOperatorCompatValue<ContentRevisionSnapshot>(
    userId,
    "content-revision-latest",
    contentId,
  )?.value;
}

export function writeContentRevisionSnapshot(userId: string, snapshot: ContentRevisionSnapshot) {
  const storedSnapshot = {
    ...snapshot,
    locallySavedAt: snapshot.locallySavedAt ?? new Date().toISOString(),
  };
  writeOperatorCompatValue(userId, "content-revision", snapshot.revisionId, storedSnapshot);
  writeOperatorCompatValue(userId, "content-revision-latest", snapshot.contentId, storedSnapshot);
}

export function readContentSessionSnapshots(userId: string, contentId: string) {
  return (
    readOperatorCompatValue<ContentSessionSnapshot[]>(userId, "content-sessions", contentId)
      ?.value ?? []
  );
}

export function writeContentSessionSnapshots(
  userId: string,
  contentId: string,
  sessions: ContentSessionSnapshot[],
) {
  const recordedAt = new Date().toISOString();
  writeOperatorCompatValue(
    userId,
    "content-sessions",
    contentId,
    sessions.map((session) => ({
      ...session,
      localStatusRecordedAt: session.localStatusRecordedAt ?? recordedAt,
    })),
  );
}

function sameInstant(left: string, right: string) {
  return Date.parse(left) === Date.parse(right);
}

function approvedChangeIsPublic(
  session: ContentSessionSummary,
  candidate: SessionInput | undefined,
) {
  return (
    candidate !== undefined &&
    sameInstant(session.startsAt, candidate.startsAt) &&
    sameInstant(session.endsAt, candidate.endsAt)
  );
}

export function mergeContentSessionSnapshots(
  publicSessions: ContentSessionSummary[],
  storedSessions: ContentSessionSnapshot[],
  now = Date.now(),
) {
  const storedById = new Map(storedSessions.map((session) => [session.sessionId, session]));
  const merged = publicSessions.map<ContentSessionSnapshot>((session) => {
    const stored = storedById.get(session.sessionId);
    storedById.delete(session.sessionId);
    if (!stored) {
      return {
        ...session,
        contentId: "",
        status: "SCHEDULED",
        checkinOpenAt: "",
        checkinCloseAt: "",
        capacity: 0,
      };
    }
    if (stored.status === "CANCELLED") return stored;
    if (approvedChangeIsPublic(session, stored.changeCandidate)) {
      return {
        ...stored,
        ...session,
        status: "SCHEDULED",
        changeRequestId: undefined,
        changeRequestStatus: undefined,
        changeCandidate: undefined,
        changeRequestedAt: undefined,
      };
    }
    const changeRequestStatus =
      stored.changeRequestStatus === "PENDING" &&
      !isFresh(stored.changeRequestedAt ?? stored.localStatusRecordedAt, now)
        ? "UNKNOWN"
        : stored.changeRequestStatus;
    return {
      ...stored,
      ...session,
      status: "SCHEDULED",
      changeRequestStatus,
    };
  });
  const remaining = [...storedById.values()].map((session) => {
    if (session.status === "PENDING" && !isFresh(session.localStatusRecordedAt, now)) {
      return { ...session, status: "REVIEW_UNKNOWN" };
    }
    return session;
  });

  return [...merged, ...remaining];
}
