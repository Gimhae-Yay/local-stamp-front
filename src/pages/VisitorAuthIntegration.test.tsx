import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { clearAuthentication } from "../api/client";

function response(data: unknown, status = 200, code = "SUCCESS") {
  return new Response(JSON.stringify({ statusCode: status, code, message: "success", data }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  clearAuthentication();
  window.localStorage.clear();
  vi.unstubAllGlobals();
  window.history.replaceState({}, "", "/");
});

describe("visitor authentication integration", () => {
  it("signs up, logs in, and renders the authenticated account state", async () => {
    window.history.replaceState({}, "", "/signup");
    const fetchMock = vi.fn().mockImplementation((input: string) => {
      if (input === "/api/v1/auth/refresh") {
        return Promise.resolve(response(null, 401, "UNAUTHENTICATED"));
      }
      if (input === "/api/v1/regions") {
        return Promise.resolve(
          response({
            regions: [{ regionId: "1", regionCode: "GIMHAE", name: "김해시" }],
          }),
        );
      }
      if (input === "/api/v1/auth/signup") {
        return Promise.resolve(
          response(
            {
              userId: "7",
              requestedRole: "VISITOR",
              assignedRole: "VISITOR",
              operatorApplicationStatus: null,
            },
            201,
          ),
        );
      }
      if (input === "/api/v1/auth/login") {
        return Promise.resolve(
          response({ userId: "7", roles: ["VISITOR"], accessToken: "token-1" }),
        );
      }
      if (input === "/api/v1/me") {
        return Promise.resolve(
          response({
            roleAssignments: [{ role: "VISITOR", regionId: null, regionName: null }],
          }),
        );
      }
      return Promise.reject(new Error(`unexpected request: ${input}`));
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<App />);

    await user.type(await screen.findByLabelText("이름"), "홍길동");
    await user.type(screen.getByLabelText("전화번호"), "01012345678");
    await user.type(screen.getByLabelText("이메일"), "visitor@example.com");
    await user.type(screen.getByLabelText("비밀번호"), "Password!1");
    await user.type(screen.getByLabelText("비밀번호 확인"), "Password!1");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "회원가입" }));

    expect(await screen.findByRole("button", { name: /내 예약 · 내 계정/ })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/me",
      expect.objectContaining({ credentials: "include" }),
    );
  });
});
