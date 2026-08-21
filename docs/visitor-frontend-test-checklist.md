# 방문자 프론트엔드 구현·테스트 체크리스트

방문자 프론트엔드의 41개 API 연결과 화면 검증을 위한 체크리스트다. 체크 결과에는 가능하면 요청 URL, HTTP 상태, 응답 `code`, 화면 캡처를 함께 남긴다.

## 0. 테스트 정보

- [ ] 테스트 일시:
- [ ] 테스터:
- [ ] Frontend commit:
- [ ] Backend commit:
- [ ] 브라우저와 버전:
- [ ] 테스트 환경: 로컬 / 개발 / 스테이징
- [ ] Backend Base URL:
- [ ] 사용한 방문자 계정:
- [ ] 사용한 지역·콘텐츠·회차 ID:

## 1. 완료 기준

- [ ] 방문자 프론트의 41개 API가 의도한 화면 또는 사용자 동작에 연결되어 있다.
- [ ] 공개·선택 인증·필수 인증 API가 각각 올바른 인증 방식으로 호출된다.
- [ ] 정상, 빈 결과, 로딩, 네트워크 실패, 주요 `4xx` 상태를 화면에서 구분한다.
- [ ] 중복 클릭이 예약·결제·보상·신청을 중복 생성하지 않는다.
- [ ] 데스크톱과 모바일에서 핵심 사용자 흐름을 완료할 수 있다.
- [ ] 자동 테스트, TypeScript 검사, Production build가 모두 통과한다.
- [ ] 브라우저 콘솔에 처리되지 않은 오류와 React 경고가 없다.

## 2. 환경 준비

- [ ] Node.js와 의존성을 준비한다: `npm ci`
- [ ] Backend를 `http://localhost:8080`에서 실행한다.
- [ ] `.env.local` 또는 실행 환경에서 `VITE_API_PROXY_TARGET=http://localhost:8080`을 설정한다.
- [ ] 같은 Origin 프록시를 사용할 때 `VITE_API_BASE_URL`은 비워둔다.
- [ ] Frontend를 실행한다: `npm run dev`
- [ ] `http://localhost:8443`에 접속할 수 있다.
- [ ] 브라우저 요청이 `http://localhost:8443/api/...`를 거쳐 Backend로 전달된다.
- [ ] Backend 상태 확인과 DB·Redis 연결이 정상이다.
- [ ] 공개 지역, 공개 콘텐츠, 예약 가능 회차가 포함된 테스트 데이터가 있다.
- [ ] 무료 회차와 유료 회차를 각각 하나 이상 준비한다.
- [ ] 체크인 완료 방문, 진행 중·완료 미션, 완료 스탬프북, 사용 가능 쿠폰을 준비한다.
- [ ] 운영자 재신청 테스트용으로 이전 신청 상태가 `REJECTED`인 방문자 계정을 준비한다.

> Backend가 CORS를 허용하지 않으므로 브라우저 로컬 테스트는 Backend Origin 직접 호출보다 Vite `/api` 프록시를 사용한다.

## 3. 공통 API 클라이언트

- [ ] 모든 요청에 `Accept: application/json`이 포함된다.
- [ ] JSON 본문이 있는 요청에 `Content-Type: application/json`이 포함된다.
- [ ] 모든 브라우저 요청에 `credentials: "include"`가 적용된다.
- [ ] 성공 응답의 `statusCode`, `code`, `message`, `data` envelope를 정상 해석한다.
- [ ] HTTP 성공이어도 `code !== "SUCCESS"`이면 오류로 처리한다.
- [ ] Backend의 오류 `message`를 사용자에게 이해 가능한 위치에 표시한다.
- [ ] 로그인 성공 시 `data.accessToken`을 메모리에 저장한다.
- [ ] 보호 API에 `Authorization: Bearer <accessToken>`을 전송한다.
- [ ] Access Token을 `localStorage` 또는 URL에 저장하지 않는다.
- [ ] `401` 발생 시 Refresh 요청은 한 번만 실행되고 원래 요청은 한 번만 재시도된다.
- [ ] Refresh 실패 시 인증 상태와 저장된 사용자 ID를 제거한다.
- [ ] 로그아웃과 진행 중인 Refresh 요청이 서로 경합하지 않는다.
- [ ] 선택 인증 미션 API는 토큰 없이 호출할 수 있다.
- [ ] 선택 인증 미션 API에 잘못된 토큰을 보냈을 때 `401`을 익명 성공으로 오인하지 않는다.
- [ ] Path Variable은 `encodeURIComponent`로 인코딩된다.
- [ ] 사용하지 않는 Query Parameter는 빈 문자열로 보내지 않고 생략한다.
- [ ] 페이지 이동·필터 변경 시 이전 조회의 `AbortController`가 정리된다.
- [ ] 예약 확정과 결제 생성에 서로 다른 UUID `Idempotency-Key`를 보낸다.
- [ ] 동일 작업 재시도 시 화면과 서버의 멱등 결과가 일치한다.

## 4. 공통 화면·라우팅

- [ ] `/`, `/events`, `/events/:eventId`, `/events/:eventId/reviews`, `/missions`는 비로그인 상태로 접근할 수 있다.
- [ ] 보호 화면에 비로그인으로 접근하면 `/login`으로 이동한다.
- [ ] 로그인 후 원래 접근하려던 보호 화면으로 복귀한다.
- [ ] 존재하지 않는 경로는 Not Found 화면을 표시한다.
- [ ] 각 조회 화면에 로딩, 오류, 빈 결과, 정상 결과 상태가 있다.
- [ ] 제출 버튼은 요청 중 비활성화되고 연속 클릭으로 중복 요청하지 않는다.
- [ ] 오류 후 다시 시도하거나 입력을 수정할 수 있다.
- [ ] 계정 메뉴가 열리고 각 링크로 이동한 뒤 닫힌다.
- [ ] Presigned 이미지 URL이 만료되기 전에 갱신된다.
- [ ] 이미지 로드 실패 시 대체 UI가 표시되고 무한 갱신하지 않는다.

## 5. API 연결 체크 — 총 41개

### 5.1 인증·계정 — 6개

- [ ] `POST /api/v1/auth/signup` — 방문자 회원가입 후 성공 화면 또는 자동 로그인을 수행한다.
- [ ] `POST /api/v1/auth/login` — Access Token과 Refresh Cookie를 받은 뒤 로그인 상태가 표시된다.
- [ ] `POST /api/v1/auth/refresh` — 새로고침 또는 만료된 Access Token 상황에서 인증이 복구된다.
- [ ] `POST /api/v1/auth/logout` — Cookie 계열을 폐기하고 공개 화면으로 전환한다.
- [ ] `GET /api/v1/me` — `VISITOR` 역할을 읽어 계정 UI를 표시한다.
- [ ] `DELETE /api/v1/auth/delete` — 확인 절차 후 계정을 탈퇴하고 인증 정보를 제거한다. 이 항목은 모든 테스트의 마지막에 실행한다.

### 5.2 공개 지역·콘텐츠 — 7개

- [ ] `GET /api/v1/regions` — 공개 지역 목록과 지역 선택 UI가 일치한다.
- [ ] `GET /api/v1/regions/{regionId}/home` — 선택 지역의 진행·예정 콘텐츠가 구분되어 표시된다.
- [ ] `GET /api/v1/contents` — `regionId`, `contentType`, `reservationAvailable` 필터가 요청과 화면에 반영된다.
- [ ] `GET /api/v1/contents/{contentId}` — 상세 설명과 운영 정보가 표시된다.
- [ ] `GET /api/v1/contents/{contentId}/reviews` — `page`, `size`와 최신 후기 목록이 일치한다.
- [ ] `GET /api/v1/contents/{contentId}/sessions` — 예약 가능한 회차 목록을 표시한다.
- [ ] `GET /api/v1/sessions/{sessionId}` — 가격, 잔여 정원, 예약 가능 여부를 표시한다.

### 5.3 예약·결제·환불 — 10개

- [ ] `POST /api/v1/reservations` — 회차와 수량으로 정원 Hold를 생성하고 만료 시각을 표시한다.
- [ ] `POST /api/v1/reservation-holds/{holdId}/confirm` — 무료 Hold를 멱등키로 확정한다.
- [ ] `POST /api/v1/me/reservation-holds/{holdId}/payments` — 쿠폰 선택 또는 `null`로 결제를 생성한다.
- [ ] `GET /api/v1/me/reservations` — 내 예약 목록과 상태별 탭이 일치한다.
- [ ] `GET /api/v1/me/reservations/{reservationId}` — 콘텐츠, 회차, 예약, 체크인 정보를 표시한다.
- [ ] `POST /api/v1/me/reservations/{reservationId}/cancel` — 취소 결과와 정원·환불 상태를 갱신한다.
- [ ] `GET /api/v1/me/reservations/{reservationId}/qr` — QR과 발급·만료·체크인 종료 시각을 표시한다.
- [ ] `GET /api/v1/me/payments/{paymentId}` — 결제 완료 화면에서 서버 결제 상태를 확인한다.
- [ ] `GET /api/v1/me/refunds` — 내 환불 목록을 예약과 연결해 표시한다.
- [ ] `GET /api/v1/me/refunds/{refundId}` — 환불 상세와 최신 상태를 표시한다.

### 5.4 미션 — 6개

- [ ] `GET /api/v1/regions/{regionId}/missions` — 비로그인 공개 목록과 로그인 참여 상태를 각각 확인한다.
- [ ] `GET /api/v1/missions/{missionId}` — 조건, 대상 콘텐츠, 종료 시각, 참여 진행도를 표시한다.
- [ ] `POST /api/v1/missions/{missionId}/participations` — 로그인 방문자가 미션에 참여한다.
- [ ] `GET /api/v1/me/mission-participations` — `status`, `page`, `size`가 목록에 반영된다.
- [ ] `GET /api/v1/me/mission-participations/{participationId}` — 방문별 진행 근거를 표시한다.
- [ ] `POST /api/v1/me/mission-participations/{participationId}/rewards/claim` — 완료 보상을 한 번만 수령한다.

### 5.5 스탬프북 — 3개

- [ ] `GET /api/v1/me/stampbooks` — 내 스탬프북과 적립 개수를 표시한다.
- [ ] `GET /api/v1/me/stampbooks/{stampbookId}` — 대상 콘텐츠별 적립 여부와 완료 보상을 표시한다.
- [ ] `GET /api/v1/me/stampbooks/{stampbookId}/earnings` — 방문별 스탬프 적립 이력을 표시한다.

### 5.6 쿠폰 — 5개

- [ ] `POST /api/v1/coupon-policies/{couponPolicyId}/coupons` — `VISIT` 또는 `STAMPBOOK_COMPLETION` 근거로 발급한다.
- [ ] `GET /api/v1/me/coupons` — 전체 및 상태별 쿠폰 목록을 표시한다.
- [ ] `GET /api/v1/me/coupons/available?holdId={holdId}` — 해당 Hold 결제에 사용 가능한 쿠폰만 표시한다.
- [ ] `GET /api/v1/me/coupons/{couponId}` — 쿠폰 정책과 만료 정보를 표시한다.
- [ ] `GET /api/v1/me/coupons/{couponId}/usage-history` — 사용 확정과 취소·환불 반전 이력을 표시한다.

### 5.7 후기 — 3개

- [ ] `POST /api/v1/visits/{visitId}/reviews` — 체크인 완료 방문에 평점과 후기를 작성한다.
- [ ] `PATCH /api/v1/reviews/{reviewId}` — 본인 후기를 수정하고 변경된 시각·내용을 반영한다.
- [ ] `DELETE /api/v1/reviews/{reviewId}` — 본인 후기를 삭제하고 공개 목록에서 제거한다.

### 5.8 운영자 재신청 — 1개

- [ ] `POST /api/v1/operator/operator-requests` — `/operator-request`에서 공개 지역과 1~2,000자 사업자 정보를 제출한다.
- [ ] 성공 시 신청 번호, 신청 지역, `PENDING` 상태를 표시한다.
- [ ] 최초 신청, 기존 `PENDING`, 운영자 권한 보유 계정의 거부 메시지를 구분한다.

## 6. 핵심 사용자 시나리오

### 시나리오 A — 비로그인 탐색

- [ ] 첫 화면에서 공개 지역을 조회한다.
- [ ] 지역을 변경하면 홈과 콘텐츠 목록이 새 지역 기준으로 갱신된다.
- [ ] 콘텐츠 목록 → 상세 → 후기 → 회차 정보를 확인한다.
- [ ] 미션 목록과 상세를 토큰 없이 조회한다.
- [ ] 예약 버튼을 누르면 로그인 화면으로 이동한다.

### 시나리오 B — 회원가입·인증 복구

- [ ] 방문자로 회원가입한다.
- [ ] 가입한 계정으로 로그인한다.
- [ ] 새로고침 후 Refresh Cookie로 로그인 상태를 복구한다.
- [ ] 만료 Access Token 상태에서 보호 API를 호출해 자동 Refresh와 재시도를 확인한다.
- [ ] 로그아웃 후 보호 화면과 API에 접근할 수 없다.

### 시나리오 C — 무료 예약

- [ ] 예약 가능 무료 회차와 수량을 선택한다.
- [ ] Hold 생성 후 제한 시간과 선택 정보를 확인한다.
- [ ] 확인 화면에서 무료 예약을 확정한다.
- [ ] 완료 화면과 내 예약 목록에서 같은 예약을 확인한다.
- [ ] 동일 확정 요청의 중복 클릭이 예약을 두 건 만들지 않는다.

### 시나리오 D — 유료 예약과 쿠폰

- [ ] 유료 회차의 Hold를 생성한다.
- [ ] 사용 가능한 쿠폰 목록과 할인 미리보기를 확인한다.
- [ ] 쿠폰 미사용 결제와 쿠폰 사용 결제를 각각 확인한다.
- [ ] 최종 금액이 0원이면 결제 없이 예약이 즉시 확정된다.
- [ ] 최종 금액이 양수이면 결제 생성 후 서버 결제 상태를 조회한다.
- [ ] 결제 생성 중복 클릭이 결제를 두 건 만들지 않는다.

### 시나리오 E — QR·체크인·후기

- [ ] 확정 예약 상세에서 QR을 발급한다.
- [ ] QR 만료 또는 체크인 가능 시간 밖의 안내를 확인한다.
- [ ] Backend 또는 운영자 흐름으로 체크인을 완료한다.
- [ ] 과거 예약에서 후기 작성 화면으로 이동한다.
- [ ] 후기 작성 → 공개 조회 → 수정 → 삭제를 순서대로 확인한다.

### 시나리오 F — 미션·스탬프북·쿠폰

- [ ] 공개 미션에 참여한다.
- [ ] 참여 후 발생한 방문이 진행도에 반영된다.
- [ ] 완료 미션 보상을 수령하고 쿠폰함에서 확인한다.
- [ ] 보상 수령을 반복해도 쿠폰이 중복 발급되지 않는다.
- [ ] 스탬프북 대상 방문의 적립과 완료 상태를 확인한다.
- [ ] 스탬프북 완료 쿠폰을 발급하고 중복 응답을 확인한다.
- [ ] 쿠폰 사용 예약을 취소한 뒤 사용 이력과 쿠폰 복구 상태를 확인한다.

### 시나리오 G — 운영자 재신청

- [ ] 이전 신청이 반려된 방문자로 로그인한다.
- [ ] 계정 메뉴 또는 로그인 화면에서 `/operator-request`로 이동한다.
- [ ] 지역과 사업자 정보를 입력하고 재신청한다.
- [ ] 신청 번호와 심사 대기 상태를 확인한다.
- [ ] 같은 계정으로 재제출했을 때 `PENDING` 충돌을 사용자에게 표시한다.

### 시나리오 H — 회원탈퇴

- [ ] 활성 Hold 또는 미완료 예약이 있는 계정의 정책 결과를 확인한다.
- [ ] 탈퇴 확인창에서 취소하면 API가 호출되지 않는다.
- [ ] 탈퇴를 확정하면 계정·토큰·저장 사용자 ID를 제거한다.
- [ ] 탈퇴 후 기존 보호 API가 `401`을 반환한다.
- [ ] 이 시나리오는 해당 계정의 다른 테스트를 모두 마친 뒤 실행한다.

## 7. 오류·경계값

- [ ] Backend 중단 또는 네트워크 오류 시 빈 화면 대신 오류와 재시도 수단을 표시한다.
- [ ] 느린 네트워크에서 Skeleton/로딩 문구와 버튼 비활성화가 유지된다.
- [ ] `400 INVALID_INPUT`, `400 INVALID_JSON`을 입력 오류로 표시한다.
- [ ] `401 UNAUTHENTICATED`에서 Refresh 실패 후 로그인으로 유도한다.
- [ ] `403 FORBIDDEN`을 로그인 필요 오류로 잘못 표시하지 않는다.
- [ ] `404 NOT_FOUND`에서 존재 여부가 없는 화면을 표시한다.
- [ ] `409` 예약·결제·보상·운영자 신청 충돌을 사용자가 다음 행동을 알 수 있게 표시한다.
- [ ] 잔여 정원보다 큰 수량, 0, 음수 입력이 전송되지 않는다.
- [ ] 만료된 Hold로 예약 확정·결제를 시도했을 때 새 회차 선택으로 돌아갈 수 있다.
- [ ] 타인의 예약·결제·환불·쿠폰·후기 ID를 URL에 넣어도 데이터가 노출되지 않는다.
- [ ] 삭제·취소·보상 수령을 새로고침하거나 연속 실행해도 화면 상태가 서버와 일치한다.
- [ ] 빈 지역, 콘텐츠, 후기, 예약, 미션, 스탬프북, 쿠폰 목록이 정상적인 Empty State를 표시한다.

## 8. 접근성·반응형·브라우저

- [ ] 키보드만으로 메뉴, 링크, 폼, 모달, QR 화면을 이용할 수 있다.
- [ ] 모든 입력에 연결된 Label과 오류 설명이 있다.
- [ ] 로딩·성공·오류 상태가 색상만으로 전달되지 않는다.
- [ ] 포커스 표시가 보이고 모달 종료 후 적절한 위치로 돌아간다.
- [ ] 이미지에 적절한 대체 텍스트가 있다.
- [ ] 320px, 390px, 768px, 1440px 너비에서 가로 스크롤과 잘림이 없다.
- [ ] 모바일에서 메뉴와 주요 제출 버튼을 사용할 수 있다.
- [ ] 긴 콘텐츠 제목, 지역명, 오류 메시지가 레이아웃을 깨지 않는다.
- [ ] Chrome 최신 버전에서 핵심 시나리오를 통과한다.
- [ ] 필요 지원 범위에 따라 Edge, Safari, Firefox에서도 핵심 시나리오를 통과한다.

## 9. 자동 테스트

### 현재 존재하는 테스트 확인

- [ ] API Client의 Bearer Token 전송을 검증한다.
- [ ] `401 → Refresh → 원 요청 재시도`를 검증한다.
- [ ] 예약 확정·결제의 `Idempotency-Key`를 검증한다.
- [ ] 방문자 회원가입·로그인 통합 흐름을 검증한다.
- [ ] 공개 콘텐츠 요청과 ID 인코딩을 검증한다.
- [ ] 대표 이미지 Presigned URL 표시·만료·실패 처리를 검증한다.
- [ ] 운영자 재신청의 지역·사업자 정보 제출을 검증한다.

### 추가 권장 테스트

- [ ] 보호 Route의 로그인 Redirect와 원래 경로 복귀 테스트를 추가한다.
- [ ] 로그아웃·회원탈퇴 인증 정보 정리 테스트를 추가한다.
- [ ] 무료 예약 성공·Hold 만료·중복 클릭 테스트를 추가한다.
- [ ] 유료 결제와 쿠폰 선택·0원 결제 분기 테스트를 추가한다.
- [ ] 예약 취소와 환불 표시 테스트를 추가한다.
- [ ] QR 발급·만료 표현 테스트를 추가한다.
- [ ] 미션 참여·진행도·보상 수령 테스트를 추가한다.
- [ ] 스탬프북 상세·적립·보상 발급 테스트를 추가한다.
- [ ] 쿠폰 상태·사용 이력 테스트를 추가한다.
- [ ] 후기 작성·수정·삭제 테스트를 추가한다.
- [ ] Playwright 등으로 핵심 사용자 시나리오 E2E 테스트를 추가한다.

## 10. 배포 전 명령

```powershell
npm ci
npm run format
npm test
npm exec tsc -- --noEmit
npm run build
npm run preview
```

- [ ] `npm test`가 모두 통과한다.
- [ ] `npm exec tsc -- --noEmit`이 오류 없이 종료된다.
- [ ] `npm run build`가 성공한다.
- [ ] Preview 환경에서 새로고침과 직접 URL 접근이 정상이다.
- [ ] Production 환경 변수와 API Origin 설정을 확인한다.
- [ ] Source Map, 콘솔 로그, 테스트 계정·개인정보 노출 여부를 확인한다.

> 현재 `package.json`에는 별도의 `lint`, `typecheck`, E2E 스크립트가 없다. 반복 검증을 위해 `typecheck`와 E2E 스크립트 추가를 권장한다.

## 11. 결함 기록 양식

```text
제목:
환경/브라우저:
Frontend commit:
Backend commit:
사전 조건:
재현 절차:
기대 결과:
실제 결과:
API Method/URL:
HTTP Status / Response code:
콘솔 오류:
스크린샷 또는 영상:
심각도: Blocker / Critical / Major / Minor
```

## 12. 최종 종료 조건

- [ ] 41개 API 체크가 모두 완료되었거나 제외 사유가 기록되어 있다.
- [ ] 핵심 시나리오 A~H를 모두 실행했다.
- [ ] Blocker·Critical 결함이 0개다.
- [ ] 남은 Major·Minor 결함의 배포 허용 여부가 결정되었다.
- [ ] 자동 테스트·TypeScript 검사·Production build 결과를 기록했다.
- [ ] 테스트 계정과 생성 데이터의 정리 여부를 확인했다.
