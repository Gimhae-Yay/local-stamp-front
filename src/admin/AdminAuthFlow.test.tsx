import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { AdminAuthProvider, AdminLoginPage } from "./AdminAuth";

vi.mock("./api", () => ({
  ApiError: class ApiError extends Error {},
  clearLogin: vi.fn(),
  getRegionAdminAssignment: vi.fn().mockResolvedValue({
    role: "REGION_ADMIN",
    regionId: "920001",
    regionName: "지역 A",
  }),
  login: vi.fn().mockResolvedValue({
    accessToken: "test-access-token",
    userId: "920001",
  }),
  logout: vi.fn().mockResolvedValue(undefined),
  storedUserId: vi.fn().mockReturnValue(null),
}));

afterEach(cleanup);

function CurrentLocation() {
  const location = useLocation();
  return (
    <div data-testid="current-location">{`${location.pathname}${location.search}${location.hash}`}</div>
  );
}

describe("AdminLoginPage", () => {
  it("returns to the originally requested protected URL after login", async () => {
    const user = userEvent.setup();
    const destination = "/region-admin/missions?status=PENDING_REVIEW&page=1&size=20#review";

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/region-admin/login",
            state: { from: destination },
          },
        ]}
      >
        <AdminAuthProvider>
          <Routes>
            <Route path="/region-admin/login" element={<AdminLoginPage />} />
            <Route path="*" element={<CurrentLocation />} />
          </Routes>
        </AdminAuthProvider>
      </MemoryRouter>,
    );

    await user.type(screen.getByRole("textbox", { name: "이메일" }), "admin@example.com");
    await user.type(screen.getByLabelText("비밀번호"), "Password1!");
    await user.click(screen.getByRole("button", { name: "로그인" }));

    await waitFor(() =>
      expect(screen.getByTestId("current-location")).toHaveTextContent(destination),
    );
  });
});
