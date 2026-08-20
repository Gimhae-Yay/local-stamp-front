import { describe, expect, it } from "vitest"
import { isLocalFakeImageStorageUrl } from "./api"

describe("운영자 대표 이미지 업로드 환경 판별", () => {
  it("로컬 Backend fake 저장소 URL만 실제 PUT 생략 대상으로 판별한다", () => {
    expect(
      isLocalFakeImageStorageUrl(
        "http://localhost:8080/local-image-storage/contents%2Fdemo.webp",
      ),
    ).toBe(true)
    expect(
      isLocalFakeImageStorageUrl(
        "http://127.0.0.1:8080/local-image-storage/contents%2Fdemo.webp",
      ),
    ).toBe(true)
  })

  it("운영 S3와 외부 유사 경로는 실제 업로드 대상으로 유지한다", () => {
    expect(
      isLocalFakeImageStorageUrl(
        "https://bucket.s3.ap-northeast-2.amazonaws.com/contents/demo.webp?signature=test",
      ),
    ).toBe(false)
    expect(
      isLocalFakeImageStorageUrl(
        "https://example.com/local-image-storage/contents/demo.webp",
      ),
    ).toBe(false)
  })
})
