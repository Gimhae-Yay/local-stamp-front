import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ActionModal, PageHeader, StatusBadge, useApiData } from "./AdminComponents";
import { ApiError, apiRequest } from "./api";

vi.mock("./api", () => ({
  apiRequest: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(
      message: string,
      public readonly status: number,
      public readonly code: string,
    ) {
      super(message);
    }
  },
}));

describe("ActionModal", () => {
  beforeEach(() => {
    vi.mocked(apiRequest).mockReset();
  });

  it("shows the operation summary and traps reverse focus navigation", async () => {
    const user = userEvent.setup();
    render(
      <ActionModal
        config={{
          title: "콘텐츠 운영 중단",
          description: "운영 중단을 확인합니다.",
          confirmLabel: "운영 중단",
          endpoint: "/api/v1/example",
          target: "공개 콘텐츠 100",
          result: "콘텐츠 운영 중단",
        }}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    expect(screen.getByText("공개 콘텐츠 100")).toBeInTheDocument();
    expect(screen.getByText("처리 결과")).toBeInTheDocument();
    const dialog = screen.getByRole("dialog");
    await waitFor(() => expect(dialog).toHaveFocus());

    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "운영 중단" })).toHaveFocus();
  });

  it("replaces a backend conflict with the configured actionable message", async () => {
    const user = userEvent.setup();
    vi.mocked(apiRequest).mockRejectedValue(
      new ApiError("미션 상태가 요청을 처리할 수 없습니다.", 409, "MISSION_STATE_CONFLICT"),
    );
    render(
      <ActionModal
        config={{
          title: "미션 승인",
          description: "승인 조건을 확인합니다.",
          confirmLabel: "미션 승인",
          endpoint: "/api/v1/region-admin/missions/1/approve",
          errorMessages: {
            MISSION_STATE_CONFLICT: "대상 콘텐츠와 보상 정책의 공개 상태를 확인해 주세요.",
          },
        }}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "미션 승인" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "대상 콘텐츠와 보상 정책의 공개 상태를 확인해 주세요.",
    );
  });
});

describe("PageHeader", () => {
  it("announces a completed route action", () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/region-admin/example",
            state: {
              completed: true,
              successMessage: "콘텐츠 승인이 완료되었습니다.",
            },
          },
        ]}
      >
        <PageHeader title="목록" description="업무 목록입니다." />
      </MemoryRouter>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("콘텐츠 승인이 완료되었습니다.");
  });
});

describe("StatusBadge", () => {
  it("renders withdrawn status as a compact Korean label", () => {
    render(<StatusBadge value="WITHDRAWN" />);

    expect(screen.getByText("전체 철회")).toHaveClass("ra-badge-withdrawn");
  });
});

function ApiDataProbe({ path }: { path: string }) {
  useApiData(path);
  return null;
}

describe("useApiData", () => {
  beforeEach(() => {
    vi.mocked(apiRequest).mockReset();
  });

  it("aborts the previous HTTP request when the path changes", async () => {
    vi.mocked(apiRequest).mockImplementation(() => new Promise(() => {}));
    const { rerender, unmount } = render(<ApiDataProbe path="/first" />);

    await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(1));
    const firstSignal = vi.mocked(apiRequest).mock.calls[0][1]?.signal;
    expect(firstSignal?.aborted).toBe(false);

    rerender(<ApiDataProbe path="/second" />);

    await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(2));
    expect(firstSignal?.aborted).toBe(true);
    const secondSignal = vi.mocked(apiRequest).mock.calls[1][1]?.signal;
    expect(secondSignal?.aborted).toBe(false);

    unmount();
    expect(secondSignal?.aborted).toBe(true);
  });
});
