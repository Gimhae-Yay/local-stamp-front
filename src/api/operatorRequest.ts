import { apiRequest } from "./client";

export type OperatorApplicationStatus = "PENDING" | "REJECTED" | "APPROVED";

export interface OperatorApplication {
  operatorApplicationId: string;
  status: OperatorApplicationStatus;
  requestedRegionId: string;
  requestedRegionName: string;
  createdAt: string;
  reviewedAt: string | null;
  rejectedReason: string | null;
}

export interface MyOperatorApplicationResponse {
  operatorApplication: OperatorApplication | null;
}

export interface CreateOperatorRequest {
  requestedRegionId: number;
  businessInformation: string;
}

export interface CreateOperatorResponse {
  operatorApplicationId: number;
  requestedRegionId: number;
  status: "PENDING";
}

export function reapplyForOperator(request: CreateOperatorRequest) {
  return apiRequest<CreateOperatorResponse>("/api/v1/operator/operator-requests", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function getMyOperatorApplication(signal?: AbortSignal) {
  return apiRequest<MyOperatorApplicationResponse>("/api/v1/me/operator-application", { signal });
}
