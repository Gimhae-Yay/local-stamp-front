import * as PortOne from "@portone/browser-sdk/v2";

export interface PortOneCheckoutRequest {
  backendPaymentId: string;
  orderId: string;
  orderName: string;
  totalAmount: number;
  currency: string;
  customer: PortOneCheckoutCustomer;
}

export interface PortOneCheckoutCustomer {
  fullName: string;
  phoneNumber: string;
  email: string;
}

function requiredConfiguration(name: string, value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`PortOne 결제 설정(${name})이 없습니다. Frontend 환경변수를 확인해 주세요.`);
  }
  return normalized;
}

export function validatePortOneCheckoutConfiguration() {
  return {
    storeId: requiredConfiguration("VITE_PORTONE_STORE_ID", import.meta.env.VITE_PORTONE_STORE_ID),
    channelKey: requiredConfiguration(
      "VITE_PORTONE_CHANNEL_KEY",
      import.meta.env.VITE_PORTONE_CHANNEL_KEY,
    ),
  };
}

export function validatePortOneCustomer({
  fullName,
  phoneNumber,
  email,
}: PortOneCheckoutCustomer): PortOneCheckoutCustomer {
  const customer = {
    fullName: fullName.trim(),
    phoneNumber: phoneNumber.trim(),
    email: email.trim(),
  };
  if (!customer.fullName) throw new Error("결제자 이름을 입력해 주세요.");
  if (!customer.phoneNumber) throw new Error("결제자 연락처를 입력해 주세요.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
    throw new Error("올바른 결제자 이메일을 입력해 주세요.");
  }
  return customer;
}

export async function requestPortOneCheckout({
  backendPaymentId,
  orderId,
  orderName,
  totalAmount,
  currency,
  customer: customerInput,
}: PortOneCheckoutRequest) {
  const { storeId, channelKey } = validatePortOneCheckoutConfiguration();
  const noticeUrl = import.meta.env.VITE_PORTONE_NOTICE_URL?.trim();

  if (currency !== "KRW") {
    throw new Error(`지원하지 않는 결제 통화입니다: ${currency}`);
  }
  if (!Number.isSafeInteger(totalAmount) || totalAmount <= 0) {
    throw new Error("결제 금액이 올바르지 않습니다.");
  }
  const customer = validatePortOneCustomer(customerInput);

  const redirectUrl = new URL("/payment/complete", window.location.origin);
  redirectUrl.searchParams.set("backendPaymentId", backendPaymentId);
  redirectUrl.searchParams.set("checkout", "portone");

  console.info("[PortOne] 결제창 요청 시작", {
    backendPaymentId,
    orderId,
    totalAmount,
  });

  let response: Awaited<ReturnType<typeof PortOne.requestPayment>>;
  try {
    response = await PortOne.requestPayment({
      storeId,
      channelKey,
      paymentId: orderId,
      orderName,
      totalAmount,
      currency: "KRW",
      payMethod: "CARD",
      customer,
      redirectUrl: redirectUrl.toString(),
      forceRedirect: true,
      ...(noticeUrl ? { noticeUrls: [noticeUrl] } : {}),
    });
  } catch (error) {
    console.error("[PortOne] 결제창 요청 실패", error);
    throw error;
  }

  console.info("[PortOne] 강제 리다이렉트 흐름에서 SDK가 반환됨", {
    backendPaymentId,
    orderId,
    txId: response?.txId,
    responsePaymentId: response?.paymentId,
    code: response?.code,
    message: response?.message,
  });

  if (!response) {
    throw new Error("결제창을 열지 못했거나 결제가 중단되었습니다.");
  }
  if (response.code) {
    throw new Error(response.message || "결제가 완료되지 않았습니다.");
  }
  if (response.paymentId !== orderId) {
    throw new Error("결제 응답의 주문 정보가 요청과 일치하지 않습니다.");
  }

  return response;
}
