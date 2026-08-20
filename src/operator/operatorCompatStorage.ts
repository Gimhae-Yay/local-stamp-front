const STORAGE_PREFIX = "local-stamp:operator-compat:v1"

export type OperatorCompatResource = "content-price" | "content-revision" | "content-revision-latest" | "content-sessions" | "mission-title" | "stampbook-workspace"

export interface StoredOperatorCompatValue<T> {
  value: T

  savedAt: string
}

function storageKey(
  userId: string,

  resource: OperatorCompatResource,

  resourceId: string,
) {
  return `${STORAGE_PREFIX}:${encodeURIComponent(userId)}:${resource}:${encodeURIComponent(resourceId)}`
}

export function readOperatorCompatValue<T>(
  userId: string,

  resource: OperatorCompatResource,

  resourceId: string,
): StoredOperatorCompatValue<T> | null {
  if (typeof window === "undefined") return null

  try {
    const raw = window.localStorage.getItem(
      storageKey(userId, resource, resourceId),
    )

    if (!raw) return null

    const parsed = JSON.parse(raw) as StoredOperatorCompatValue<T>

    if (!parsed || typeof parsed.savedAt !== "string" || !("value" in parsed))
      return null

    return parsed
  } catch {
    return null
  }
}

export function writeOperatorCompatValue<T>(
  userId: string,

  resource: OperatorCompatResource,

  resourceId: string,

  value: T,
) {
  if (typeof window === "undefined") return

  try {
    window.localStorage.setItem(
      storageKey(userId, resource, resourceId),

      JSON.stringify({ value, savedAt: new Date().toISOString() }),
    )
  } catch {
    // 임시 호환 저장소 오류는 실제 API 흐름을 막지 않는다.
  }
}

export function removeOperatorCompatValue(
  userId: string,

  resource: OperatorCompatResource,

  resourceId: string,
) {
  if (typeof window === "undefined") return

  try {
    window.localStorage.removeItem(storageKey(userId, resource, resourceId))
  } catch {
    // 임시 호환 저장소 오류는 실제 API 흐름을 막지 않는다.
  }
}
