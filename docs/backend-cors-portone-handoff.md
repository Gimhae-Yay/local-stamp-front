# 프론트엔드 API 연결 및 PortOne 결제 연동: 백엔드 전달 사항

## 1. 이 문서의 목적

프론트엔드는 Vite 개발 서버에서 백엔드 API를 직접 호출하고, 유료 예약에는 PortOne V2 결제창을 사용한다.
이 문서는 **프론트와 백엔드를 교차 Origin으로 연결하는 방식이 선택됐다는 전제**에서 백엔드 담당자가
알아야 할 현재 상황과 조치 사항을 정리한다.

> PortOne 결제창과 PortOne 웹훅은 CORS 대상이 아니다. 이 문서의 CORS 설정은 브라우저 프론트엔드와
> 백엔드 API 간 통신을 위한 것이다.

## 2. 현재 프론트엔드 구성

### 실행 Origin

| 환경 | 프론트 Origin | 백엔드 API Origin |
| --- | --- | --- |
| 로컬 개발 | `http://localhost:8443` | `http://localhost:8080` |
| 운영 | 실제 프론트 도메인 | 백엔드 배포 도메인 또는 API 도메인 |

프론트는 `VITE_API_BASE_URL`을 기준으로 API를 호출한다. 로컬 예시는 다음과 같다.

```env
VITE_API_BASE_URL=http://localhost:8080
```

서로 다른 포트는 서로 다른 Origin이다. 따라서 브라우저가 API 응답을 프론트 JavaScript에 전달하려면
백엔드의 CORS 응답 설정이 필요하다.

### 인증과 요청 방식

- 보호 API: `Authorization: Bearer <accessToken>`
- Refresh Token: `HttpOnly` Cookie를 사용하므로 프론트 `fetch`에 `credentials: 'include'`를 사용한다.
- 결제 생성: `Content-Type: application/json`, `Idempotency-Key`를 함께 전송한다.

결제 생성 호출 예시는 다음과 같다.

```http
POST /api/v1/me/reservation-holds/{holdId}/payments
Authorization: Bearer {accessToken}
Idempotency-Key: {uuid}
Content-Type: application/json
Accept: application/json

{}
```

이 요청은 `Authorization`, JSON `Content-Type`, `Idempotency-Key` 때문에 브라우저 사전 요청(`OPTIONS`) 대상이다.

## 3. 백엔드 CORS 적용 요청

현재 `SecurityConfig`는 `.cors(AbstractHttpConfigurer::disable)` 상태다. 교차 Origin 연결을 지원하려면
Spring Security의 CORS 처리를 활성화하고 `CorsConfigurationSource`를 등록해야 한다.

### 허용 정책

| 항목 | 요구 사항 |
| --- | --- |
| 허용 Origin | 개발 `http://localhost:8443` 및 운영의 실제 프론트 Origin만 정확히 등록 |
| 허용 메서드 | `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS` |
| 허용 헤더 | `Authorization`, `Content-Type`, `Idempotency-Key`, `Accept` |
| Credential | `allowCredentials(true)` |
| 와일드카드 Origin | `allowCredentials(true)`와 함께 `*` 사용 금지 |
| 적용 경로 | 최소 `/api/**` |

운영 Origin은 코드에 하드코딩하지 말고 환경 변수로 관리한다. 예를 들어 다음과 같은 설정 구조를 사용할 수 있다.

```yaml
app:
  cors:
    allowed-origins: ${CORS_ALLOWED_ORIGINS:http://localhost:8443}
```

### 구현 예시

```java
@Bean
CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();
    configuration.setAllowedOrigins(List.of(
        "http://localhost:8443",
        "https://app.example.com"
    ));
    configuration.setAllowedMethods(List.of(
        "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"
    ));
    configuration.setAllowedHeaders(List.of(
        "Authorization", "Content-Type", "Idempotency-Key", "Accept"
    ));
    configuration.setAllowCredentials(true);
    configuration.setMaxAge(3600L);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/api/**", configuration);
    return source;
}
```

그리고 `SecurityConfig`는 다음과 같이 CORS 설정을 사용해야 한다.

```java
.cors(Customizer.withDefaults())
```

`OPTIONS` 요청은 인증 필터보다 먼저 CORS 필터에서 정상 처리되어야 한다. 단순히 `OPTIONS`를
`permitAll()`로 추가하는 것만으로는 `Access-Control-Allow-Origin` 등의 CORS 응답 헤더가 생기지 않는다.

## 4. 기존 보안 정책과의 관계

현재 백엔드 ADR-0045와 공통 인증 문서는 단일 동일 사이트 배포를 전제로 CORS 미적용을 채택한다.
이번 교차 Origin 지원은 그 전제를 바꾸는 정책 변경이다.

따라서 구현 전 또는 같은 변경에서 다음을 함께 처리한다.

1. ADR-0045의 CORS·동일 사이트 전제를 교차 Origin 지원 정책으로 변경 또는 대체한다.
2. 공통 인증 명세의 CORS·Refresh Token Cookie 조건을 갱신한다.
3. 운영 Origin이 별도 사이트가 되는 경우 Refresh Token Cookie의 `SameSite=Strict` 정책과 CSRF 방어를 별도로 검토한다.

프론트와 백엔드를 같은 Origin으로 제공할 수 있다면 리버스 프록시 방식이 기존 보안 정책과 가장 잘 맞는다.

```text
https://service.example.com/       → 프론트 정적 파일
https://service.example.com/api/*  → 백엔드
```

이 구조에서는 브라우저 CORS 설정이 필요 없다. 교차 Origin API 배포를 확정했을 때만 3절의 CORS 설정을 적용한다.

## 5. PortOne 결제 연동에서 백엔드가 맡는 부분

### 프론트가 제공받아 사용하는 값

프론트는 서버의 결제 생성 응답에서 다음 값을 받아 PortOne V2 SDK 호출에 사용한다.

| 서버 응답 | PortOne V2 요청 필드 |
| --- | --- |
| `payment.orderId` | `paymentId` |
| `payment.amount.finalAmount` | `totalAmount` |
| `payment.amount.currency` | `currency` |

프론트의 Store ID·채널 키는 다음 빌드 환경 변수에 넣는다. 이들은 서버 시크릿이 아니다.

```env
VITE_PORTONE_STORE_ID=store-...
VITE_PORTONE_CHANNEL_KEY=channel-key-...
```

### 백엔드 환경 변수

백엔드 실행 환경에는 아래 시크릿이 필요하다.

```env
PORTONE_API_SECRET=<PortOne V2 API Secret>
PORTONE_WEBHOOK_SECRET=<PortOne Webhook Secret>
PORTONE_FAKE_ENABLED=false
```

- `PORTONE_API_SECRET`: 웹훅 수신 후 PortOne 결제 단건 조회에 사용한다.
- `PORTONE_WEBHOOK_SECRET`: PortOne 웹훅 서명 검증에 사용한다.
- 위 값은 프론트 환경 변수나 저장소에 넣지 않는다.

### 웹훅과 인프라

PortOne 콘솔에 다음 공개 HTTPS 주소를 웹훅 수신 URL로 등록한다.

```text
POST https://{backend-public-domain}/api/v1/webhooks/portone
```

리버스 프록시를 사용하는 경우 `{backend-public-domain}`은 프론트와 같은 서비스 도메인일 수 있다.

백엔드에는 다음 네트워크 조건이 필요하다.

- 백엔드에서 `api.portone.io:443`으로 나가는 HTTPS 통신 허용
- PortOne이 웹훅 URL로 들어오는 HTTPS 통신 허용
- 로컬 테스트에서는 `localhost` 대신 PortOne이 접근 가능한 HTTPS 터널 또는 개발 URL 사용

웹훅은 서버 간 호출이므로 브라우저 CORS 설정과 무관하다.

## 6. 결제 처리 흐름

```text
프론트
  └─ POST /api/v1/me/reservation-holds/{holdId}/payments
       └─ 백엔드: 가격 스냅샷·주문 번호 생성
       └─ 양수 금액: PENDING 결제 응답

프론트
  └─ PortOne V2 SDK 결제창 호출
       └─ paymentId = 서버 orderId
       └─ totalAmount = 서버 finalAmount

PortOne
  └─ POST /api/v1/webhooks/portone
       └─ 백엔드: 서명 검증 → PortOne 결제 재조회
       └─ 주문 번호·거래 ID·Store ID·금액·통화 검증
       └─ 일치 시 결제 APPROVED + 예약 CONFIRMED

프론트
  └─ GET /api/v1/me/payments/{paymentId}
       └─ APPROVED와 reservationId를 확인한 뒤 예약 완료 화면 표시
```

프론트는 결제를 승인하거나 예약을 확정하지 않는다. 예약 확정은 백엔드 웹훅 처리 결과만 기준으로 한다.

## 7. 완료 확인 항목

1. `http://localhost:8443`에서 로그인·공개 API·보호 API 요청이 브라우저 CORS 오류 없이 동작한다.
2. 결제 생성 요청의 `OPTIONS` 응답에 허용 Origin·Credential·Method·Header가 포함된다.
3. 유료 예약에서 결제 생성 API가 `PENDING` 결제와 서버 `orderId`·최종 금액을 반환한다.
4. PortOne 테스트 결제를 완료하면 웹훅이 수신된다.
5. 백엔드가 웹훅의 결제 정보와 내부 가격 스냅샷을 검증한 뒤 결제를 `APPROVED`로 전이하고 예약을 생성한다.
6. 프론트의 결제 상태 조회가 `APPROVED`와 `reservationId`를 받아 예약 완료 화면으로 이동한다.
