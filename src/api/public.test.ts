import { afterEach, describe, expect, it, vi } from "vitest";
import { getPublicContent, getPublicContents, PublicApiError } from "./public";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("public content API", () => {
  it("requests published event contents for the selected region", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 200,
          code: "SUCCESS",
          message: "success",
          data: { contents: [] },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await getPublicContents("region 1", true);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/contents?regionId=region+1&contentType=EVENT_EXPERIENCE&reservationAvailable=true",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("encodes a content id before requesting its detail", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 200,
          code: "SUCCESS",
          message: "success",
          data: { contentId: "content/1" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await getPublicContent("content/1");

    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/v1/contents/content%2F1");
  });

  it("exposes the backend error message when image-bearing content cannot load", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            statusCode: 503,
            code: "IMAGE_STORAGE_UNAVAILABLE",
            message: "이미지 저장소를 사용할 수 없습니다.",
            data: null,
          }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(getPublicContent("100")).rejects.toEqual(
      expect.objectContaining<Partial<PublicApiError>>({
        message: "이미지 저장소를 사용할 수 없습니다.",
        status: 503,
        code: "IMAGE_STORAGE_UNAVAILABLE",
      }),
    );
  });
});
