import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { MemoryRouter } from "react-router-dom"
import { ActionModal, PageHeader } from "./AdminComponents"

vi.mock("./api", () => ({
  apiRequest: vi.fn(),
  ApiError: class ApiError extends Error {},
}))

describe("ActionModal", () => {
  it("shows the operation summary and traps reverse focus navigation", async () => {
    const user = userEvent.setup()
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
    )

    expect(screen.getByText("공개 콘텐츠 100")).toBeInTheDocument()
    expect(screen.getByText("처리 결과")).toBeInTheDocument()
    const dialog = screen.getByRole("dialog")
    await waitFor(() => expect(dialog).toHaveFocus())

    await user.tab({ shift: true })
    expect(screen.getByRole("button", { name: "운영 중단" })).toHaveFocus()
  })
})

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
    )

    expect(screen.getByRole("status")).toHaveTextContent(
      "콘텐츠 승인이 완료되었습니다.",
    )
  })
})
