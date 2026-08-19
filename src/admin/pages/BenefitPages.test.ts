import { describe, expect, it } from "vitest"
import { readMissionListFilters } from "./BenefitPages"

describe("readMissionListFilters", () => {
  it("keeps supported mission list filters", () => {
    expect(
      readMissionListFilters(
        new URLSearchParams("status=PUBLISHED&page=2&size=50"),
      ),
    ).toEqual({ status: "PUBLISHED", page: 2, size: 50 })
  })

  it("replaces malformed URL values with safe defaults", () => {
    expect(
      readMissionListFilters(
        new URLSearchParams("status=UNKNOWN&page=NaN&size=999"),
      ),
    ).toEqual({ status: "PENDING_REVIEW", page: 0, size: 20 })
  })

  it("allows the empty status used by the all filter", () => {
    expect(readMissionListFilters(new URLSearchParams("status="))).toEqual({
      status: "",
      page: 0,
      size: 20,
    })
  })
})
