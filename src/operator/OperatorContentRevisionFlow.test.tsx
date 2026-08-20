import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { clearAuthentication, saveAuthentication } from "../api/client";
import { writeOperatorCompatValue } from "./operatorCompatStorage";
import { writeContentRevisionSnapshot } from "./operatorContentSnapshots";

function success(data: unknown) {
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

const content = {
  contentId: "104",
  contentType: "EVENT_EXPERIENCE",
  status: "PUBLISHED",
  title: "김해 가야문화 체험",
  description: "가야 문화를 체험합니다.",
  representativeImageUrl: null,
  representativeImageUrlExpiresAt: null,
  locationText: "김해시 가야의길 190",
  operatingHoursText: "매주 토요일",
  contactText: "055-000-0000",
  precautions: "편한 복장",
  ageRequirement: "초등학생 이상",
  materials: "필기도구",
  cancellationPolicyText: "시작 전까지 취소 가능",
  publishAt: "2026-08-21T00:00:00Z",
  rejectionReason: null,
  createdAt: "2026-08-12T01:20:00Z",
  updatedAt: "2026-08-12T01:20:00Z",
};

describe("운영자 콘텐츠 수정본 생성·철회 흐름", () => {
  beforeEach(() => {
    clearAuthentication();
    window.localStorage.clear();
    window.history.replaceState({}, "", "/operator/contents/104/edit");
    saveAuthentication("stale-test-token", "44");
    writeOperatorCompatValue("44", "content-price", "104", 20000);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    clearAuthentication();
  });

  it("확인 후 수정본을 생성하고 전용 화면에서 철회한다", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/v1/auth/refresh")) {
        return success({ accessToken: "test-token" });
      }
      if (url.endsWith("/api/v1/me")) {
        return success({
          userId: "44",
          roleAssignments: [{ role: "OPERATOR", regionId: "11", regionName: "김해시" }],
        });
      }
      if (url.endsWith("/api/v1/operator/contents/104") && !init?.method) {
        return success(content);
      }
      if (url.endsWith("/api/v1/operator/contents/104/revisions") && init?.method === "POST") {
        return success({
          revisionId: "501",
          contentId: "104",
          status: "EDIT_REQUESTED",
          submittedAt: "2026-08-20T12:00:00Z",
        });
      }
      if (
        url.endsWith("/api/v1/operator/content-revisions/501/withdraw") &&
        init?.method === "POST"
      ) {
        return success({
          revisionId: "501",
          contentId: "104",
          status: "EDIT_WITHDRAWN",
          withdrawalReason: "일정 변경",
          withdrawnAt: "2026-08-20T12:10:00Z",
        });
      }
      throw new Error(`예상하지 못한 요청: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    fireEvent.click(
      await screen.findByRole("button", {
        name: "수정본 생성 및 심사 요청",
      }),
    );
    const submitDialog = screen.getByRole("dialog");
    expect(within(submitDialog).getByText("수정본을 생성해 심사 요청할까요?")).toBeInTheDocument();
    fireEvent.click(within(submitDialog).getByRole("button", { name: "심사 요청" }));

    expect(await screen.findByRole("heading", { name: "콘텐츠 수정본 501" })).toBeInTheDocument();
    expect(screen.getByText("가야 문화를 체험합니다.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "수정본 철회" }));
    const withdrawDialog = screen.getByRole("dialog");
    fireEvent.change(within(withdrawDialog).getByRole("textbox"), {
      target: { value: "일정 변경" },
    });
    fireEvent.click(within(withdrawDialog).getByRole("button", { name: "수정본 철회" }));

    expect(await screen.findByText("수정본이 철회되었습니다.")).toBeInTheDocument();
    expect(screen.getByText("이미 철회된 수정본입니다.")).toBeInTheDocument();
  });

  it("반려 수정본 데이터를 표시하고 PUT 저장 결과를 반영한다", async () => {
    window.history.replaceState({}, "", "/operator/content-revisions/501");
    writeContentRevisionSnapshot("44", {
      revisionId: "501",
      contentId: "104",
      status: "EDIT_REJECTED",
      candidate: {
        title: content.title,
        description: content.description,
        locationText: content.locationText,
        operatingHoursText: content.operatingHoursText,
        contactText: content.contactText,
        precautions: content.precautions,
        ageRequirement: content.ageRequirement,
        materials: content.materials,
        cancellationPolicyText: content.cancellationPolicyText,
        reservationPrice: 20000,
        publishAt: null,
      },
    });
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/v1/auth/refresh")) {
        return success({ accessToken: "test-token" });
      }
      if (url.endsWith("/api/v1/me")) {
        return success({
          userId: "44",
          roleAssignments: [{ role: "OPERATOR", regionId: "11", regionName: "김해시" }],
        });
      }
      if (url.endsWith("/api/v1/operator/content-revisions/501") && init?.method === "PUT") {
        return success({
          revisionId: "501",
          contentId: "104",
          status: "EDIT_REJECTED",
          updatedAt: "2026-08-20T12:20:00Z",
        });
      }
      throw new Error(`예상하지 못한 요청: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    const title = await screen.findByLabelText("콘텐츠 제목");
    fireEvent.change(title, { target: { value: "수정된 가야문화 체험" } });
    fireEvent.click(screen.getByRole("button", { name: "수정본 저장" }));

    expect(await screen.findByText("수정본 데이터가 저장되었습니다.")).toBeInTheDocument();
    expect(screen.getByText("수정된 가야문화 체험")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/operator/content-revisions/501"),
      expect.objectContaining({ method: "PUT" }),
    );
  });
});
