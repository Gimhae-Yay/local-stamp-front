import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import PresignedImage, {
  getPresignedImageRefreshDelay,
  usePresignedImageRefresh,
} from "./PresignedImage"

function RefreshProbe({
  expiresAt,
  onRefresh,
}: {
  expiresAt: string
  onRefresh: () => void
}) {
  usePresignedImageRefresh([expiresAt], onRefresh)
  return null
}

describe("PresignedImage", () => {
  it("replaces a failed S3 image with the fallback and requests fresh data once", () => {
    const onRefresh = vi.fn()
    render(
      <PresignedImage
        src="https://s3.example/image?signature=expired"
        expiresAt="2026-08-19T00:05:00Z"
        alt="행사 대표 이미지"
        onRefresh={onRefresh}
        fallback={<span>대표 이미지 없음</span>}
      />,
    )

    fireEvent.error(screen.getByRole("img", { name: "행사 대표 이미지" }))

    expect(screen.getByText("대표 이미지 없음")).toBeInTheDocument()
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it("refreshes ten seconds before the earliest valid expiration", () => {
    const now = Date.parse("2026-08-19T00:00:00Z")
    expect(
      getPresignedImageRefreshDelay(
        ["2026-08-19T00:05:00Z", "2026-08-19T00:03:00Z", null],
        now,
      ),
    ).toBe(170_000)
  })

  it("requests an immediate refresh for an expired URL", () => {
    const now = Date.parse("2026-08-19T00:06:00Z")
    expect(getPresignedImageRefreshDelay(["2026-08-19T00:05:00Z"], now)).toBe(0)
  })

  it("invokes the refresh callback shortly before expiration", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-19T00:00:00Z"))
    const onRefresh = vi.fn()
    render(
      <RefreshProbe expiresAt="2026-08-19T00:03:00Z" onRefresh={onRefresh} />,
    )

    vi.advanceTimersByTime(169_999)
    expect(onRefresh).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onRefresh).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})
