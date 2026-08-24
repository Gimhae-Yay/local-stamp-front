import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { clearAuthentication } from "../api/client";

function response(data: unknown, status = 200) {
  return new Response(
    JSON.stringify({
      statusCode: status,
      code: "SUCCESS",
      message: "success",
      data,
    }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

const rejectedApplication = {
  operatorApplicationId: "20",
  status: "REJECTED",
  requestedRegionId: "1",
  requestedRegionName: "김해시",
  createdAt: "2026-08-20T01:15:30Z",
  reviewedAt: "2026-08-21T03:20:10Z",
  rejectedReason: "사업자 정보를 확인할 수 없습니다.",
};

const pendingApplication = {
  operatorApplicationId: "21",
  status: "PENDING",
  requestedRegionId: "2",
  requestedRegionName: "부산시",
  createdAt: "2026-08-22T01:15:30Z",
  reviewedAt: null,
  rejectedReason: null,
};

afterEach(() => {
  cleanup();
  clearAuthentication();
  window.localStorage.clear();
  vi.unstubAllGlobals();
  window.history.replaceState({}, "", "/");
});

describe("operator application status integration", () => {
  it("shows an applicant-only menu and allows reapplication only after rejection", async () => {
    window.history.replaceState({}, "", "/operator-application");
    let reapplicationSubmitted = false;
    const fetchMock = vi.fn().mockImplementation((input: string) => {
      if (input === "/api/v1/auth/refresh") {
        return Promise.resolve(response({ accessToken: "token-1" }));
      }
      if (input === "/api/v1/me") {
        return Promise.resolve(response({ roleAssignments: [] }));
      }
      if (input === "/api/v1/me/operator-application") {
        return Promise.resolve(
          response({
            operatorApplication: reapplicationSubmitted ? pendingApplication : rejectedApplication,
          }),
        );
      }
      if (input === "/api/v1/regions") {
        return Promise.resolve(
          response({
            regions: [
              { regionId: "1", regionCode: "GIMHAE", name: "김해시" },
              { regionId: "2", regionCode: "BUSAN", name: "부산시" },
            ],
          }),
        );
      }
      if (input === "/api/v1/operator/operator-requests") {
        reapplicationSubmitted = true;
        return Promise.resolve(
          response(
            {
              operatorApplicationId: 21,
              requestedRegionId: 2,
              status: "PENDING",
            },
            201,
          ),
        );
      }
      return Promise.reject(new Error(`unexpected request: ${input}`));
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<App />);

    expect(await screen.findByRole("heading", { name: "운영자 신청 현황" })).toBeInTheDocument();
    expect(screen.getByText("사업자 정보를 확인할 수 없습니다.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /운영자 신청 · 내 계정/ }));
    expect(screen.getByText("운영자 신청 계정")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "운영자 신청 현황" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "쿠폰함" })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("신청 지역"), "2");
    await user.type(
      screen.getByLabelText("사업자 정보"),
      "상호명 지역행사, 사업자등록번호 123-45-67890",
    );
    await user.click(screen.getByRole("button", { name: "운영자 재신청 제출" }));

    expect(await screen.findByText("운영자 재신청이 접수되었습니다.")).toBeInTheDocument();
    const requestCall = fetchMock.mock.calls.find(
      ([input]) => input === "/api/v1/operator/operator-requests",
    );
    expect(requestCall?.[1]).toEqual(
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          requestedRegionId: 2,
          businessInformation: "상호명 지역행사, 사업자등록번호 123-45-67890",
        }),
      }),
    );
    expect(new Headers(requestCall?.[1]?.headers).get("Authorization")).toBe("Bearer token-1");
  });

  it("shows a pending application without a reapplication action", async () => {
    window.history.replaceState({}, "", "/operator-application");
    const fetchMock = vi.fn().mockImplementation((input: string) => {
      if (input === "/api/v1/auth/refresh") {
        return Promise.resolve(response({ accessToken: "token-1" }));
      }
      if (input === "/api/v1/me") {
        return Promise.resolve(response({ roleAssignments: [] }));
      }
      if (input === "/api/v1/me/operator-application") {
        return Promise.resolve(response({ operatorApplication: pendingApplication }));
      }
      if (input === "/api/v1/regions") {
        return Promise.resolve(
          response({
            regions: [{ regionId: "2", regionCode: "BUSAN", name: "부산시" }],
          }),
        );
      }
      return Promise.reject(new Error(`unexpected request: ${input}`));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(
      await screen.findByText("지역 관리자가 신청 내용을 검토하고 있습니다."),
    ).toBeInTheDocument();
    expect(screen.getByText("심사 중")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "운영자 재신청 제출" })).not.toBeInTheDocument();
  });
});
