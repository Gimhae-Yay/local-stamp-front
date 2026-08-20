import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { clearAuthentication } from "../api/client";

function response(data: unknown) {
  return Promise.resolve(
    new Response(
      JSON.stringify({
        statusCode: 200,
        code: "SUCCESS",
        message: "성공",
        data,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ),
  );
}

describe("운영자 콘솔 실제 라우팅", () => {
  beforeEach(() => {
    clearAuthentication();
    window.localStorage.clear();
    window.history.replaceState({}, "", "/operator/login");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearAuthentication();
  });

  it("운영자 로그인 후 Backend 목록 응답을 내 콘텐츠 화면에 표시한다", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/v1/auth/login")) {
        return response({
          userId: "44",
          roles: ["OPERATOR"],
          accessToken: "test-token",
        });
      }
      if (url.endsWith("/api/v1/me")) {
        return response({
          roleAssignments: [{ role: "OPERATOR", regionId: "11", regionName: "경상남도 김해시" }],
        });
      }
      if (url.endsWith("/api/v1/operator/contents")) {
        return response({
          contents: [
            {
              contentId: "104",
              contentType: "EVENT_EXPERIENCE",
              title: "김해 가야문화 체험",
              status: "PUBLISHED",
              createdAt: "2026-08-12T01:20:00Z",
            },
          ],
        });
      }
      throw new Error(`예상하지 못한 요청: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    fireEvent.change(await screen.findByLabelText("이메일"), {
      target: { value: "operator@example.test" },
    });
    fireEvent.change(screen.getByLabelText("비밀번호"), {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "운영자 콘솔 로그인" }));

    expect(await screen.findByRole("heading", { name: "내 콘텐츠" })).toBeInTheDocument();
    expect(await screen.findByText("김해 가야문화 체험")).toBeInTheDocument();
    expect(screen.getAllByText("경상남도 김해시").length).toBeGreaterThan(0);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  });
});
