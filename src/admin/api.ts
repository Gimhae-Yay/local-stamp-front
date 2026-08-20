import type { ApiEnvelope, LoginResult, RoleAssignment } from "./types";

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";
const USER_KEY = "local-stamp:user-id";
const LEGACY_TOKEN_KEY = "local-stamp:access-token";
const AUTH_TRANSITION_LOCK = "local-stamp:auth-transition";
let accessToken: string | null = null;
let refreshRequest: Promise<boolean> | null = null;
let authTransitionQueue: Promise<void> = Promise.resolve();

window.localStorage.removeItem(LEGACY_TOKEN_KEY);

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
  }
}

function token() {
  return accessToken;
}

function saveLogin(result: LoginResult) {
  accessToken = result.accessToken;
  window.localStorage.setItem(USER_KEY, result.userId);
}

export function clearLogin() {
  accessToken = null;
  window.localStorage.removeItem(LEGACY_TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export function storedUserId() {
  return window.localStorage.getItem(USER_KEY);
}

async function withCrossTabAuthLock<T>(operation: () => Promise<T>) {
  if (typeof navigator !== "undefined" && navigator.locks)
    return navigator.locks.request(AUTH_TRANSITION_LOCK, operation);
  return operation();
}

function serializeAuthTransition<T>(operation: () => Promise<T>): Promise<T> {
  const result = authTransitionQueue.then(
    () => withCrossTabAuthLock(operation),
    () => withCrossTabAuthLock(operation),
  );
  authTransitionQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

async function parseEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !payload || payload.code !== "SUCCESS") {
    throw new ApiError(
      payload?.message ?? "요청을 처리하지 못했습니다.",
      response.status,
      payload?.code ?? "NETWORK_ERROR",
    );
  }
  return payload;
}

async function refreshToken(): Promise<boolean> {
  if (refreshRequest) return refreshRequest;

  refreshRequest = serializeAuthTransition(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) return false;
      const payload = await parseEnvelope<{ accessToken: string }>(response);
      accessToken = payload.data.accessToken;
      return true;
    } catch {
      return false;
    }
  }).finally(() => {
    refreshRequest = null;
  });

  return refreshRequest;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token()) headers.set("Authorization", `Bearer ${token()}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (response.status === 401 && retry && !path.includes("/auth/")) {
    if (await refreshToken()) return apiRequest<T>(path, init, false);
    clearLogin();
  }

  return (await parseEnvelope<T>(response)).data;
}

export async function login(email: string, password: string): Promise<LoginResult> {
  return serializeAuthTransition(async () => {
    const result = await apiRequest<LoginResult>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    saveLogin(result);
    return result;
  });
}

export async function logout() {
  return serializeAuthTransition(async () => {
    try {
      await apiRequest<null>("/api/v1/auth/logout", { method: "POST" });
    } finally {
      clearLogin();
    }
  });
}

export async function getRegionAdminAssignment(): Promise<RoleAssignment> {
  const result = await apiRequest<{ roleAssignments: RoleAssignment[] }>("/api/v1/me");
  const assignment = result.roleAssignments.find((item) => item.role === "REGION_ADMIN");
  if (!assignment?.regionId)
    throw new ApiError("활성 지역 관리자 권한을 확인할 수 없습니다.", 403, "REGION_ADMIN_REQUIRED");
  return assignment;
}

export function withQuery(
  path: string,
  params: Record<string, string | number | boolean | null | undefined>,
) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") query.set(key, String(value));
  });
  const suffix = query.toString();
  return suffix ? `${path}?${suffix}` : path;
}
