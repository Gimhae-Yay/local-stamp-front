import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Hero from "./Hero";

describe("Hero", () => {
  it("keeps the how-to card compact and the hero title in two intentional lines", () => {
    render(
      <MemoryRouter>
        <Hero
          region="테스트 지역"
          loggedIn={false}
          filter="전체"
          setFilter={vi.fn()}
          onOpenRegion={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("visitor-how-to-card")).toHaveStyle({
      flex: "0 1 320px",
      maxWidth: "320px",
      minWidth: "0",
    });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "테스트 지역에서 할 일을찾아보세요.",
    );
  });
});
