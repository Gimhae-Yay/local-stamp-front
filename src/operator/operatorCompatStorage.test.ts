import { beforeEach, describe, expect, it } from "vitest";
import {
  readOperatorCompatValue,
  removeOperatorCompatValue,
  writeOperatorCompatValue,
} from "./operatorCompatStorage";

describe("운영자 Backend 계약 임시 저장소", () => {
  beforeEach(() => window.localStorage.clear());

  it("사용자와 리소스별로 값을 분리해 저장하고 복원한다", () => {
    writeOperatorCompatValue("operator-a", "content-price", "content-1", 12000);
    writeOperatorCompatValue("operator-b", "content-price", "content-1", 9000);

    expect(readOperatorCompatValue<number>("operator-a", "content-price", "content-1")?.value).toBe(
      12000,
    );
    expect(readOperatorCompatValue<number>("operator-b", "content-price", "content-1")?.value).toBe(
      9000,
    );
  });

  it("손상된 값은 무시하고 명시적으로 제거할 수 있다", () => {
    writeOperatorCompatValue("operator-a", "mission-title", "mission-1", "걷기");
    const key = window.localStorage.key(0);
    expect(key).not.toBeNull();
    window.localStorage.setItem(key!, "{broken");

    expect(readOperatorCompatValue<string>("operator-a", "mission-title", "mission-1")).toBeNull();

    writeOperatorCompatValue("operator-a", "mission-title", "mission-1", "걷기");
    removeOperatorCompatValue("operator-a", "mission-title", "mission-1");

    expect(readOperatorCompatValue<string>("operator-a", "mission-title", "mission-1")).toBeNull();
  });
});
