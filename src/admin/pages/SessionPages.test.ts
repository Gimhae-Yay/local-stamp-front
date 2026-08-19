import { describe, expect, it } from "vitest"
import { isSessionRevisionApprovalAvailable } from "./SessionPages"

describe("session revision approval availability", () => {
  it.each(["APPROVED", "PUBLISHED"])(
    "allows approval when the content is %s",
    (contentStatus) => {
      expect(isSessionRevisionApprovalAvailable(contentStatus)).toBe(true)
    },
  )

  it.each(["PENDING", "PENDING_REVIEW", "REJECTED", "WITHDRAWN"])(
    "blocks approval when the content is %s",
    (contentStatus) => {
      expect(isSessionRevisionApprovalAvailable(contentStatus)).toBe(false)
    },
  )
})
