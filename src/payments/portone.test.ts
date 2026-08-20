import { beforeEach, describe, expect, it, vi } from "vitest"
import * as PortOne from "@portone/browser-sdk/v2"
import { requestPortOneCheckout } from "./portone"

vi.mock("@portone/browser-sdk/v2", () => ({
  requestPayment: vi.fn(),
}))

const requestPayment = vi.mocked(PortOne.requestPayment)

describe("requestPortOneCheckout", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("VITE_PORTONE_STORE_ID", "store-test")
    vi.stubEnv("VITE_PORTONE_CHANNEL_KEY", "channel-key-test")
    vi.stubEnv("VITE_PORTONE_NOTICE_URL", "")
  })

  it("overrides the webhook URL when a notice URL is configured", async () => {
    vi.stubEnv(
      "VITE_PORTONE_NOTICE_URL",
      "https://example.ngrok-free.dev/api/v1/webhooks/portone",
    )
    requestPayment.mockResolvedValue({
      transactionType: "PAYMENT",
      txId: "tx-1",
      paymentId: "order-123",
    })

    await requestPortOneCheckout({
      backendPaymentId: "payment-456",
      orderId: "order-123",
      orderName: "지역 축제",
      totalAmount: 12_000,
      currency: "KRW",
      customer: {
        fullName: "홍길동",
        phoneNumber: "010-1234-5678",
        email: "visitor@example.com",
      },
    })

    expect(requestPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        noticeUrls: [
          "https://example.ngrok-free.dev/api/v1/webhooks/portone",
        ],
      }),
    )
  })

  it("uses the backend order id and final amount for checkout", async () => {
    requestPayment.mockResolvedValue({
      transactionType: "PAYMENT",
      txId: "tx-1",
      paymentId: "order-123",
    })

    await requestPortOneCheckout({
      backendPaymentId: "payment-456",
      orderId: "order-123",
      orderName: "지역 축제",
      totalAmount: 12_000,
      currency: "KRW",
      customer: {
        fullName: "홍길동",
        phoneNumber: "010-1234-5678",
        email: "visitor@example.com",
      },
    })

    expect(requestPayment).toHaveBeenCalledWith({
      storeId: "store-test",
      channelKey: "channel-key-test",
      paymentId: "order-123",
      orderName: "지역 축제",
      totalAmount: 12_000,
      currency: "KRW",
      payMethod: "CARD",
      customer: {
        fullName: "홍길동",
        phoneNumber: "010-1234-5678",
        email: "visitor@example.com",
      },
      redirectUrl:
        "http://localhost:3000/payment/complete?backendPaymentId=payment-456&checkout=portone",
    })
  })

  it("shows the PortOne failure message", async () => {
    requestPayment.mockResolvedValue({
      transactionType: "PAYMENT",
      txId: "tx-2",
      paymentId: "order-123",
      code: "FAILURE_TYPE_PG",
      message: "결제가 취소되었습니다.",
    })

    await expect(
      requestPortOneCheckout({
        backendPaymentId: "payment-456",
        orderId: "order-123",
        orderName: "지역 축제",
        totalAmount: 12_000,
        currency: "KRW",
        customer: {
          fullName: "홍길동",
          phoneNumber: "010-1234-5678",
          email: "visitor@example.com",
        },
      }),
    ).rejects.toThrow("결제가 취소되었습니다.")
  })

  it("rejects checkout when the public configuration is missing", async () => {
    vi.stubEnv("VITE_PORTONE_STORE_ID", "")

    await expect(
      requestPortOneCheckout({
        backendPaymentId: "payment-456",
        orderId: "order-123",
        orderName: "지역 축제",
        totalAmount: 12_000,
        currency: "KRW",
        customer: {
          fullName: "홍길동",
          phoneNumber: "010-1234-5678",
          email: "visitor@example.com",
        },
      }),
    ).rejects.toThrow("VITE_PORTONE_STORE_ID")
    expect(requestPayment).not.toHaveBeenCalled()
  })

  it("rejects invalid customer information before opening checkout", async () => {
    await expect(
      requestPortOneCheckout({
        backendPaymentId: "payment-456",
        orderId: "order-123",
        orderName: "지역 축제",
        totalAmount: 12_000,
        currency: "KRW",
        customer: {
          fullName: "홍길동",
          phoneNumber: "010-1234-5678",
          email: "invalid-email",
        },
      }),
    ).rejects.toThrow("올바른 결제자 이메일")
    expect(requestPayment).not.toHaveBeenCalled()
  })
})
