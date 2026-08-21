import { afterEach, describe, expect, it, vi } from "vitest";
import { getMe, login } from "./auth";
import { apiRequest, clearAuthentication, isAbortError, saveAuthentication } from "./client";
import { confirmFreeReservation, createPayment } from "./reservations";

function envelope<T>(data: T, status = 200) {
  return new Response(
    JSON.stringify({
      statusCode: status,
      code: "SUCCESS",
      message: "success",
      data,
    }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

afterEach(() => {
  clearAuthentication();
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe("visitor API client", () => {
  it("keeps the access token in memory and sends it to protected APIs", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(envelope({ userId: "7", roles: ["VISITOR"], accessToken: "token-1" }))
      .mockResolvedValueOnce(
        envelope({
          roleAssignments: [{ role: "VISITOR", regionId: null, regionName: null }],
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await login("visitor@example.com", "Password!1");
    await getMe();

    const headers = new Headers(fetchMock.mock.calls[1]?.[1]?.headers);
    expect(headers.get("Authorization")).toBe("Bearer token-1");
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("refreshes once after a protected request receives 401 and retries", async () => {
    saveAuthentication("expired-token", "7");
    let meCalls = 0;
    const fetchMock = vi.fn().mockImplementation((input: string) => {
      if (input === "/api/v1/auth/refresh") {
        return Promise.resolve(envelope({ accessToken: "fresh-token" }));
      }
      meCalls += 1;
      return Promise.resolve(
        meCalls === 1
          ? new Response(
              JSON.stringify({
                statusCode: 401,
                code: "UNAUTHENTICATED",
                message: "인증이 필요합니다.",
                data: null,
              }),
              { status: 401, headers: { "Content-Type": "application/json" } },
            )
          : envelope({ roleAssignments: [] }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("/api/v1/me");

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const retryHeaders = new Headers(fetchMock.mock.calls[2]?.[1]?.headers);
    expect(retryHeaders.get("Authorization")).toBe("Bearer fresh-token");
  });

  it("sends the required idempotency key for reservation confirmation and payment", async () => {
    saveAuthentication("token-1", "7");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(envelope({ reservationId: "11" }, 201))
      .mockResolvedValueOnce(
        envelope({ requiresPayment: true, payment: {}, reservation: null }, 201),
      );
    vi.stubGlobal("fetch", fetchMock);

    await confirmFreeReservation("10", "confirm-key");
    await createPayment("12", "3", "payment-key");

    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get("Idempotency-Key")).toBe(
      "confirm-key",
    );
    expect(new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get("Idempotency-Key")).toBe(
      "payment-key",
    );
    expect(fetchMock.mock.calls[1]?.[1]?.body).toBe(JSON.stringify({ couponId: "3" }));
  });
});

describe("abort error detection", () => {
  it("accepts DOMException and cross-realm AbortError-shaped values", () => {
    expect(isAbortError(new DOMException("aborted", "AbortError"))).toBe(true);
    expect(isAbortError({ name: "AbortError", message: "signal is aborted" })).toBe(true);
    expect(isAbortError(new Error("network failure"))).toBe(false);
  });

  it("uses the aborted signal even when the thrown value has another shape", () => {
    const controller = new AbortController();
    controller.abort();

    expect(isAbortError(new Error("signal is aborted without reason"), controller.signal)).toBe(
      true,
    );
  });
});
