import { describe, expect, it } from "vitest";
import { formatQrReason, readCursorHistory } from "./QrPages";

describe("QR exception presentation", () => {
  it("formats fixed and generated backend reason codes", () => {
    expect(formatQrReason("QR_CHECK_IN_EXPIRED")).toBe("만료된 QR");
    expect(formatQrReason("MANUAL_CHECK_IN_QR_NOT_AVAILABLE_WINDOW_NOT_OPEN")).toBe(
      "QR 사용 불가 · 체크인 시작 전",
    );
  });

  it("accepts only a string cursor history array", () => {
    expect(readCursorHistory('["","cursor-2"]')).toEqual(["", "cursor-2"]);
    expect(readCursorHistory('{"cursor":"invalid"}')).toEqual([]);
    expect(readCursorHistory("not-json")).toEqual([]);
  });
});
