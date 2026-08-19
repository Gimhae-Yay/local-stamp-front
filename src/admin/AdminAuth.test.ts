import { describe, expect, it } from "vitest"
import { adminReturnPath } from "./AdminAuth"

describe("adminReturnPath", () => {
  it("preserves filters and fragments across login", () => {
    expect(
      adminReturnPath({
        pathname: "/region-admin/contents/review",
        search: "?status=APPROVED",
        hash: "#result",
      }),
    ).toBe("/region-admin/contents/review?status=APPROVED#result")
  })
})
