import { apiRequest } from "./client";

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
