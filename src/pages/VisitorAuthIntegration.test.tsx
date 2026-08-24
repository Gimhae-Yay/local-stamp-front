import { cleanup, render, screen } from "@testing-library/react";
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
  cleanup();
  clearAuthentication();
  window.localStorage.clear();
  vi.unstubAllGlobals();
  window.history.replaceState({}, "", "/");
});

describe("visitor authentication integration", () => {
  it("signs up, logs in, and renders the authenticated account state", async () => {
    window.history.replaceState({}, "", "/signup");
    const fetchMock = vi.fn().mockImplementation((input: string, _init?: RequestInit) => {
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
    await user.click(screen.getByRole("button", { name: "회원가입" }));

    expect(await screen.findByRole("button", { name: /내 예약 · 내 계정/ })).toBeInTheDocument();
    const signupCall = fetchMock.mock.calls.find(([input]) => input === "/api/v1/auth/signup");
    expect(JSON.parse(String(signupCall?.[1]?.body))).toEqual({
      email: "visitor@example.com",
      password: "Password!1",
      name: "홍길동",
      phone: "01012345678",
      requestedRole: "VISITOR",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/me",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("submits an initial operator application and renders its pending state", async () => {
    window.history.replaceState({}, "", "/signup");
    const fetchMock = vi.fn().mockImplementation((input: string, _init?: RequestInit) => {
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
              userId: "8",
              requestedRole: "OPERATOR",
              assignedRole: null,
              operatorApplicationStatus: "PENDING",
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

    await user.click(await screen.findByRole("radio", { name: /운영자 가입 신청/ }));
    await user.type(screen.getByLabelText("이름"), "김운영");
    await user.type(screen.getByLabelText("전화번호"), "01098765432");
    await user.type(screen.getByLabelText("이메일"), "operator@example.com");
    await user.type(screen.getByLabelText("비밀번호"), "Password!1");
    await user.type(screen.getByLabelText("비밀번호 확인"), "Password!1");
    await user.type(
      screen.getByLabelText("사업자 정보"),
      "상호명: 지역행사, 사업자등록번호: 123-45-67890",
    );
    await user.click(screen.getByRole("button", { name: "운영자 가입 신청" }));

    expect(
      await screen.findByRole("heading", { name: "운영자 신청이 접수되었습니다." }),
    ).toBeInTheDocument();
    expect(screen.getByText(/김해시 담당 관리자가/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith("/api/v1/auth/login", expect.anything());
    const signupCall = fetchMock.mock.calls.find(([input]) => input === "/api/v1/auth/signup");
    expect(JSON.parse(String(signupCall?.[1]?.body))).toEqual({
      email: "operator@example.com",
      password: "Password!1",
      name: "김운영",
      phone: "01098765432",
      requestedRole: "OPERATOR",
      requestedRegionId: "1",
      businessInformation: "상호명: 지역행사, 사업자등록번호: 123-45-67890",
    });
  });

  it("returns to the protected page after a successful login", async () => {
    window.history.replaceState({}, "", "/reservations");
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
      if (input === "/api/v1/me/reservations") {
        return Promise.resolve(response({ reservations: [] }));
      }
      if (input === "/api/v1/me/refunds") {
        return Promise.resolve(response({ refunds: [] }));
      }
      return Promise.reject(new Error(`unexpected request: ${input}`));
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<App />);

    await user.type(await screen.findByLabelText("이메일"), "visitor@example.com");
    await user.type(screen.getByLabelText("비밀번호"), "Password!1");
    await user.click(screen.getByRole("button", { name: "로그인" }));

    expect(await screen.findByRole("heading", { name: "내 예약" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/reservations");
  });
});
