import { render, screen } from "@testing-library/react";
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

afterEach(() => {
  clearAuthentication();
  window.localStorage.clear();
  vi.unstubAllGlobals();
  window.history.replaceState({}, "", "/");
});

describe("operator reapplication integration", () => {
  it("submits the selected public region and business information", async () => {
    window.history.replaceState({}, "", "/operator-request");
    const fetchMock = vi.fn().mockImplementation((input: string) => {
      if (input === "/api/v1/auth/refresh") {
        return Promise.resolve(response({ accessToken: "token-1" }));
      }
      if (input === "/api/v1/me") {
        return Promise.resolve(
          response({
            roleAssignments: [{ role: "VISITOR", regionId: null, regionName: null }],
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

    await user.selectOptions(await screen.findByLabelText("신청 지역"), "2");
    await user.type(
      screen.getByLabelText("사업자 정보"),
      "상호명 지역행사, 사업자등록번호 123-45-67890",
    );
    await user.click(screen.getByRole("button", { name: "운영자 재신청 제출" }));

    expect(await screen.findByText("운영자 신청이 접수되었습니다.")).toBeInTheDocument();
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
});
