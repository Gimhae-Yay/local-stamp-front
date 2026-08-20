export interface ApiEnvelope<T> {
  statusCode: number
  code: string
  message: string
  data: T
}

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(
    /\/$/,
    "",
  ) ?? ""
const USER_ID_KEY = "local-stamp:visitor-user-id"
const AUTH_TRANSITION_LOCK = "local-stamp:visitor-auth-transition"

let accessToken: string | null = null
let refreshRequest: Promise<boolean> | null = null
let authTransitionQueue: Promise<void> = Promise.resolve()

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export function isAbortError(error: unknown, signal?: AbortSignal) {
  return (
    signal?.aborted === true ||
    (error instanceof DOMException && error.name === "AbortError")
  )
}

export function hasAccessToken() {
  return accessToken !== null
}

export function storedUserId() {
  return window.localStorage.getItem(USER_ID_KEY)
}

export function saveAuthentication(token: string, userId?: string) {
  accessToken = token
  if (userId) window.localStorage.setItem(USER_ID_KEY, userId)
}

export function clearAuthentication() {
  accessToken = null
  window.localStorage.removeItem(USER_ID_KEY)
}

async function withCrossTabAuthLock<T>(operation: () => Promise<T>) {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request(AUTH_TRANSITION_LOCK, operation)
  }
  return operation()
}

export function serializeAuthTransition<T>(
  operation: () => Promise<T>,
): Promise<T> {
  const result = authTransitionQueue.then(
    () => withCrossTabAuthLock(operation),
    () => withCrossTabAuthLock(operation),
  )
  authTransitionQueue = result.then(
    () => undefined,
    () => undefined,
  )
  return result
}

async function parseEnvelope<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T

  const payload = (await response
    .json()
    .catch(() => null)) as ApiEnvelope<T> | null
  if (!response.ok || !payload || payload.code !== "SUCCESS") {
    throw new ApiError(
      payload?.message ?? "요청을 처리하지 못했습니다.",
      response.status,
      payload?.code ?? "NETWORK_ERROR",
    )
  }
  return payload.data
}

export async function refreshAuthentication(): Promise<boolean> {
  if (refreshRequest) return refreshRequest

  refreshRequest = serializeAuthTransition(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { Accept: "application/json" },
        credentials: "include",
      })
      if (!response.ok) {
        clearAuthentication()
        return false
      }
      const result = await parseEnvelope<{ accessToken: string }>(response)
      saveAuthentication(result.accessToken)
      return true
    } catch {
      clearAuthentication()
      return false
    }
  }).finally(() => {
    refreshRequest = null
  })

  return refreshRequest
}

type AuthMode = "none" | "optional" | "required"

export interface ApiRequestOptions extends RequestInit {
  auth?: AuthMode
  retryAuth?: boolean
}

export async function apiRequest<T>(
  path: string,
  { auth = "required", retryAuth = true, ...init }: ApiRequestOptions = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  if (!headers.has("Accept")) headers.set("Accept", "application/json")
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }
  if (auth !== "none" && accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
  })

  const canRefresh =
    response.status === 401 &&
    retryAuth &&
    auth !== "none" &&
    !path.startsWith("/api/v1/auth/")
  if (canRefresh && (await refreshAuthentication())) {
    return apiRequest<T>(path, { ...init, auth, retryAuth: false })
  }
  if (response.status === 401 && auth === "required") {
    clearAuthentication()
  }

  return parseEnvelope<T>(response)
}

export function withQuery(
  path: string,
  params: Record<string, string | number | boolean | null | undefined>,
) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      query.set(key, String(value))
    }
  })
  const suffix = query.toString()
  return suffix ? `${path}?${suffix}` : path
}

export function createIdempotencyKey() {
  return crypto.randomUUID()
}
