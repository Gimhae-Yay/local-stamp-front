import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useAdminAuth } from "./AdminAuth"
import AdminLayout from "./AdminLayout"

vi.mock("./AdminAuth", () => ({ useAdminAuth: vi.fn() }))

describe("AdminLayout account menu", () => {
  const logout = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    logout.mockClear()
    vi.mocked(useAdminAuth).mockReturnValue({
      session: {
        userId: "42",
        assignment: {
          role: "REGION_ADMIN",
          regionId: "1",
          regionName: "테스트 지역",
        },
      },
      restoring: false,
      login: vi.fn(),
      logout,
    })
  })

  afterEach(cleanup)

  function renderLayout() {
    return render(
      <MemoryRouter initialEntries={["/region-admin"]}>
        <Routes>
          <Route path="/region-admin" element={<AdminLayout />}>
            <Route index element={<div>운영 홈 본문</div>} />
            <Route path="missions" element={<div>미션 본문</div>} />
          </Route>
          <Route path="/region-admin/login" element={<div>로그인</div>} />
        </Routes>
      </MemoryRouter>,
    )
  }

  it("shows the assigned region and all available feature shortcuts", async () => {
    const user = userEvent.setup()
    renderLayout()

    await user.click(screen.getByRole("button", { name: /사용자 42/ }))

    const menu = screen.getByRole("complementary", {
      name: "지역 관리자 계정 메뉴",
    })
    expect(menu).toBeInTheDocument()
    expect(within(menu).getByText("테스트 지역")).toBeInTheDocument()
    expect(within(menu).getByText("지역 ID 1")).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "콘텐츠 수정본 심사" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "미션 심사" })).toBeInTheDocument()
  })

  it("closes after navigation and logs out from the menu", async () => {
    const user = userEvent.setup()
    renderLayout()
    const trigger = screen.getByRole("button", { name: /사용자 42/ })

    await user.click(trigger)
    await user.click(screen.getByRole("link", { name: "미션 심사" }))
    expect(
      screen.queryByRole("complementary", { name: "지역 관리자 계정 메뉴" }),
    ).not.toBeInTheDocument()

    await user.click(trigger)
    await user.click(screen.getByRole("button", { name: "로그아웃" }))
    expect(logout).toHaveBeenCalledOnce()
    expect(await screen.findByText("로그인")).toBeInTheDocument()
  })

  it("closes on Escape", async () => {
    const user = userEvent.setup()
    renderLayout()

    await user.click(screen.getByRole("button", { name: /사용자 42/ }))
    await user.keyboard("{Escape}")

    expect(
      screen.queryByRole("complementary", { name: "지역 관리자 계정 메뉴" }),
    ).not.toBeInTheDocument()
  })
})
