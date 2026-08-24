import {
  apiRequest,
  clearAuthentication,
  refreshAuthentication,
  saveAuthentication,
  serializeAuthTransition,
  storedUserId,
} from "./client";

interface SignupBaseRequest {
  email: string;
  password: string;
  name: string;
  phone: string;
}

export type SignupRequest = SignupBaseRequest &
  (
    | {
        requestedRole: "VISITOR";
        requestedRegionId?: never;
        businessInformation?: never;
      }
    | {
        requestedRole: "OPERATOR";
        requestedRegionId: string;
        businessInformation: string;
      }
  );

export type SignupResponse = {
  userId: string;
} & (
  | {
      requestedRole: "VISITOR";
      assignedRole: "VISITOR";
      operatorApplicationStatus: null;
    }
  | {
      requestedRole: "OPERATOR";
      assignedRole: null;
      operatorApplicationStatus: "PENDING";
    }
);

export interface LoginResponse {
  userId: string;
  roles: string[];
  accessToken: string;
}

export interface RoleAssignment {
  role: string;
  regionId: string | null;
  regionName: string | null;
}

export interface MeResponse {
  roleAssignments: RoleAssignment[];
}

export interface AuthenticatedUser extends MeResponse {
  userId: string | null;
}

export function signup(request: SignupRequest) {
  return apiRequest<SignupResponse>("/api/v1/auth/signup", {
    auth: "none",
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function login(email: string, password: string) {
  return serializeAuthTransition(async () => {
    const result = await apiRequest<LoginResponse>("/api/v1/auth/login", {
      auth: "none",
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    saveAuthentication(result.accessToken, result.userId);
    return result;
  });
}

export function getMe(signal?: AbortSignal) {
  return apiRequest<MeResponse>("/api/v1/me", { signal });
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser> {
  const me = await getMe();
  return { userId: storedUserId(), ...me };
}

export async function restoreAuthentication() {
  if (!(await refreshAuthentication())) return null;
  try {
    return await getAuthenticatedUser();
  } catch {
    clearAuthentication();
    return null;
  }
}

export function logout() {
  return serializeAuthTransition(async () => {
    try {
      await apiRequest<null>("/api/v1/auth/logout", {
        auth: "none",
        method: "POST",
      });
    } finally {
      clearAuthentication();
    }
  });
}

export function deleteAccount() {
  return serializeAuthTransition(async () => {
    try {
      await apiRequest<null>("/api/v1/auth/delete", { method: "DELETE" });
    } finally {
      clearAuthentication();
    }
  });
}
