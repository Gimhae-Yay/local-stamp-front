import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import AdminNotFoundPage from "./AdminNotFoundPage";

describe("AdminNotFoundPage", () => {
  it("explains the invalid route and links back to the admin home", () => {
    render(
      <MemoryRouter>
        <AdminNotFoundPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "페이지를 찾을 수 없습니다" })).toBeInTheDocument();
    expect(screen.getByText("존재하지 않는 관리 페이지입니다.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "운영 홈으로 이동" })).toHaveAttribute(
      "href",
      "/region-admin",
    );
  });
});
