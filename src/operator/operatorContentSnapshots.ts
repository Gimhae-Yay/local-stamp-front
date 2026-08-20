import type {
  ContentInput,
  ContentSessionSummary,
  CreatedContentSession,
  SessionInput,
} from "./types"
import {
  readOperatorCompatValue,
  writeOperatorCompatValue,
} from "./operatorCompatStorage"

export interface ContentRevisionSnapshot {
  revisionId: string
  contentId: string
  status: string
  candidate: ContentInput
  submittedAt?: string
  updatedAt?: string
  withdrawalReason?: string
  withdrawnAt?: string
}

export interface ContentSessionSnapshot extends CreatedContentSession {
  changeRequestId?: string
  changeRequestStatus?: string
  changeCandidate?: SessionInput
}

export function readContentRevisionSnapshot(
  userId: string,
  revisionId: string,
) {
  return readOperatorCompatValue<ContentRevisionSnapshot>(
    userId,
    "content-revision",
    revisionId,
  )?.value
}

export function readLatestContentRevisionSnapshot(
  userId: string,
  contentId: string,
) {
  return readOperatorCompatValue<ContentRevisionSnapshot>(
    userId,
    "content-revision-latest",
    contentId,
  )?.value
}

export function writeContentRevisionSnapshot(
  userId: string,
  snapshot: ContentRevisionSnapshot,
) {
  writeOperatorCompatValue(
    userId,
    "content-revision",
    snapshot.revisionId,
    snapshot,
  )
  writeOperatorCompatValue(
    userId,
    "content-revision-latest",
    snapshot.contentId,
    snapshot,
  )
}

export function readContentSessionSnapshots(userId: string, contentId: string) {
  return (
    readOperatorCompatValue<ContentSessionSnapshot[]>(
      userId,
      "content-sessions",
      contentId,
    )?.value ?? []
  )
}

export function writeContentSessionSnapshots(
  userId: string,
  contentId: string,
  sessions: ContentSessionSnapshot[],
) {
  writeOperatorCompatValue(userId, "content-sessions", contentId, sessions)
}

export function mergeContentSessionSnapshots(
  publicSessions: ContentSessionSummary[],
  storedSessions: ContentSessionSnapshot[],
) {
  const storedById = new Map(
    storedSessions.map((session) => [session.sessionId, session]),
  )
  const merged = publicSessions.map<ContentSessionSnapshot>((session) => {
    const stored = storedById.get(session.sessionId)
    storedById.delete(session.sessionId)
    if (!stored) {
      return {
        ...session,
        contentId: "",
        status: "SCHEDULED",
        checkinOpenAt: "",
        checkinCloseAt: "",
        capacity: 0,
      }
    }
    if (stored.status === "CANCELLED") return stored
    return { ...stored, ...session, status: "SCHEDULED" }
  })

  return [...merged, ...storedById.values()]
}
