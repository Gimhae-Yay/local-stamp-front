import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import App from "../App"

afterEach(() => {
  vi.unstubAllGlobals()
  window.history.replaceState({}, "", "/")
})

describe("visitor representative image integration", () => {
  it("renders the presigned S3 URL returned by the region home API", async () => {
    window.history.replaceState({}, "", "/")
    const imageUrl =
      "https://bucket.s3.ap-northeast-2.amazonaws.com/content.webp?X-Amz-Signature=fresh"
    const imageExpiresAt = new Date(Date.now() + 5 * 60_000).toISOString()
    const fetchMock = vi
      .fn()
      .mockImplementation((input: string | URL | Request) => {
        const path = String(input)
        if (path === "/api/v1/auth/refresh") {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                statusCode: 401,
                code: "UNAUTHENTICATED",
                message: "인증이 필요합니다.",
                data: null,
              }),
              {
                status: 401,
                headers: { "Content-Type": "application/json" },
              },
            ),
          )
        }
        const data =
          path === "/api/v1/regions"
            ? {
                regions: [
                  { regionId: "1", regionCode: "GIMHAE", name: "김해시" },
                ],
              }
            : {
                region: { regionId: "1", regionCode: "GIMHAE", name: "김해시" },
                ongoingContents: [
                  {
                    contentId: "101",
                    contentType: "EVENT_EXPERIENCE",
                    title: "김해 가야문화 체험",
                    locationText: "김해시 가야의길 190",
                    representativeImageUrl: imageUrl,
                    representativeImageUrlExpiresAt: imageExpiresAt,
                    reservationAvailable: true,
                    displaySession: {
                      sessionId: "201",
                      startsAt: "2099-08-19T01:00:00Z",
                      endsAt: "2099-08-19T02:00:00Z",
                      remainingCapacity: 4,
                    },
                  },
                ],
                upcomingContents: [],
              }
        return Promise.resolve(
          new Response(
            JSON.stringify({
              statusCode: 200,
              code: "SUCCESS",
              message: "success",
              data,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        )
      })
    vi.stubGlobal("fetch", fetchMock)

    render(<App />)

    const image = await screen.findByRole("img", {
      name: "김해 가야문화 체험 대표 이미지",
    })
    expect(image).toHaveAttribute("src", imageUrl)
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/regions/1/home",
      expect.objectContaining({ credentials: "include" }),
    )
  })
})
