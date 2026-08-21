import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import OperatorNotFoundPage from "./OperatorNotFoundPage";

describe("OperatorNotFoundPage", () => {
  it("explains the invalid route and links back to the operator home", () => {
    render(
      <MemoryRouter>
        <OperatorNotFoundPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "페이지를 찾을 수 없습니다" })).toBeInTheDocument();
    expect(screen.getByText("존재하지 않는 운영자 페이지입니다.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "내 콘텐츠로 이동" })).toHaveAttribute(
      "href",
      "/operator",
    );
  });
});
