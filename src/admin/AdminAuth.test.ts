import { describe, expect, it } from "vitest";
import { adminLoginDestination, adminReturnPath } from "./AdminAuth";

describe("adminReturnPath", () => {
  it("preserves filters and fragments across login", () => {
    expect(
      adminReturnPath({
        pathname: "/region-admin/contents/review",
        search: "?status=APPROVED",
        hash: "#result",
      }),
    ).toBe("/region-admin/contents/review?status=APPROVED#result");
  });
});

describe("adminLoginDestination", () => {
  it("restores a protected regional admin URL", () => {
    expect(
      adminLoginDestination({
        from: "/region-admin/missions?status=PENDING_REVIEW&page=1#review",
      }),
    ).toBe("/region-admin/missions?status=PENDING_REVIEW&page=1#review");
  });

  it.each([
    null,
    {},
    { from: "https://example.com" },
    { from: "/operator" },
    { from: "/region-admin/login" },
  ])("falls back to the regional admin home for %o", (state) => {
    expect(adminLoginDestination(state)).toBe("/region-admin");
  });
});
