import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Hero from "./Hero";

describe("Hero", () => {
  it("allows the visitor how-to card to shrink on a 320px viewport", () => {
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
      flex: "1 1 340px",
      minWidth: "0",
    });
  });
});
