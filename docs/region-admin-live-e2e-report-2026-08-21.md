# 지역 관리자 프론트/백엔드 실제 연동 점검 보고서

- 점검 일시: 2026-08-21 (Asia/Seoul)
- 프론트: `http://localhost:8443`
- 백엔드: `http://localhost:8080`, Spring profile `local`
- 테스트 DB: MySQL `regional_event_local` (localhost:3307)

## 실행 환경과 데이터 준비

1. `GET /actuator/health` → `200`, `status=UP` 확인.
2. Vite `/api` 프록시로 무토큰 보호 API 호출 → `401 UNAUTHENTICATED` 확인.
3. 기존 `application-local.yaml`의 DB 이름 `regional_event`에서는 지역 관리자 seed가 안전장치에 걸려 실패함.
4. 별도 로컬 DB `regional_event_local`을 생성하고 Flyway 45개 migration 적용.
5. 아래 명령으로 지역 관리자 전용 테스트 데이터 적용 성공.

```powershell
$env:SPRING_DATASOURCE_URL='jdbc:mysql://localhost:3307/regional_event_local?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Seoul'
.\gradlew.bat seedRegionAdminTestData -PseedProfile=local -PseedAction=apply --console=plain
```

- 지역 A 관리자: `region-admin-a@test.local`, regionId `920001`
- 지역 B 관리자: `region-admin-b@test.local`, regionId `920002`
- 빈 목록 관리자: `region-admin-empty@test.local`, regionId `920003`
- 공통 비밀번호: seed 애플리케이션의 `TEST_PASSWORD` (`LocalRegion1!`)
- 예약번호: `RA-A-BEFORE-001`

## 실제 확인 결과

### 정상 동작

- 로그인 → `/me` 역할·담당 지역 확인 → 지역 관리자 홈 진입.
- 새로고침 후 refresh cookie로 인증 상태 복구.
- 로그아웃 후 로그인 화면 이동 및 보호 API 무토큰 `401`.
- 운영자 신청 목록/상세/사업자 정보/승인 모달/실제 승인/목록 제거.
- 콘텐츠 목록·상세·이력 조회, 승인·삭제(DELETE JSON Body)·운영 중단·정상 종료 API.
- 콘텐츠 수정본 목록·상세와 상태 충돌 응답.
- 추가 회차 목록·상세(로컬 시간, 체크인 창, 정원)·실제 승인·목록 제거.
- 회차 수정본 목록·상세·예약 충돌 `409 SESSION_STATE_CONFLICT`.
- 콘텐츠 철회 목록·상세와 상태 충돌 응답.
- 공백 예약번호는 프론트에서 API 호출 전에 차단.
- 예약번호 조회 결과의 이름 `김*자`, 전화번호 `010-****-5678` 마스킹.
- QR 예외 첫 조회, 서버 `nextCursor`를 사용한 2페이지 조회, 상세 조회.
- 스탬프북 목록·상세·승인 API 및 500자 입력 제한 코드.
- 미션 상태/페이지 크기 필터, 상세·이력, 실제 승인 후 즉시 `PUBLISHED`, 고정 반려 코드 성공, 재처리 `409`.
- 토큰 없음/위조 토큰 `401`, VISITOR/OPERATOR 관리자 API `403`, 타 지역 자원 `404`.
- 필수 쿼리 누락, 문자 ID, 존재하지 않는 ID, 빈/공백 사유, 허용되지 않은 reasonCode, size 0/101의 400/404 계약.
- 브라우저 콘솔 warning/error 0건.
- 프론트 단위/통합 테스트 27 files, 85 tests 통과.
- `npm run build` 통과.

### 확인된 문제와 수정 방향

| 우선순위 | 현상 | 원인 구분 | 근거 | 수정 방향 |
| --- | --- | --- | --- | --- |
| P1 | 기본 local 설정으로 지역관리자 seed 실행 실패 | 백엔드 설정 | local DB는 `regional_event`, seed는 DB명에 `local/dev/test` 포함을 강제 | `application-local.yaml` 기본 DB를 `regional_event_local`로 통일하거나 compose 초기 DB 이름을 동일하게 변경. 안전장치 완화보다는 DB 이름 통일 권장 |
| P1 | 이미 승인한 운영자 신청을 다시 승인해도 `200 SUCCESS` | 백엔드 계약 | 같은 `920001/approve` 두 번째 호출이 200. UseCase가 `APPROVED`면 성공 응답을 반환 | 체크리스트대로라면 `409 OPERATOR_APPLICATION_STATE_CONFLICT` 반환. 멱등 200이 제품 의도라면 API 문서와 체크리스트를 200 멱등으로 통일 |
| P1 | 관리자 API 요청에 기본 `Accept: application/json` 없음 | 프론트 | `src/admin/api.ts`가 Content-Type/Authorization만 설정 | 공통 클라이언트에서 `if (!headers.has('Accept')) headers.set('Accept', 'application/json')` 추가하고 테스트 작성 |
| P1 | 존재하지 않는 관리자 URL이 404 화면 대신 운영 홈으로 이동 | 프론트 | `/region-admin/does-not-exist`가 `/region-admin`으로 replace | 관리자 전용 NotFoundPage를 만들고 wildcard route에 렌더링 |
| P2 | 미션 목록/상세에 제목 대신 `미션 #920002` fallback 표시 | 백엔드 응답 계약 | `RegionAdminMissionSummaryResponse`, `RegionAdminMissionDetailResponse`에 `title` 필드가 없음 | 두 DTO와 조회 projection에 `title` 추가. 프론트의 optional `title?`을 required로 변경 |
| P2 | 실제 HTTP 요청 취소는 하지 않음 | 프론트 | `useApiData`는 `active` 플래그로 stale state 반영만 막음 | `AbortController` signal을 `apiRequest`에 전달해 이전 조회를 취소. 현재 구현도 최신 응답 우선 조건은 충족 |
| P2 | 타 지역 조회 체크리스트는 403을 기대하지만 실제는 404 | 계약/체크리스트 | 지역 A 토큰으로 지역 B 콘텐츠 조회 시 `404 NOT_FOUND`; 백엔드 문서는 존재 은닉을 위해 404 정의 | 보안 의도상 404 유지 권장. 체크리스트의 타 지역 조회 기대값을 404로 변경하고 변경 API는 정책에 맞게 403/404 명시 |

## 미완료 또는 제한된 점검

- 만료 토큰을 실시간으로 기다리는 테스트는 하지 않았고, 무토큰/위조 토큰과 refresh 복구를 검증함.
- 동시에 발생한 401의 refresh 단일 실행 및 refresh/logout 경합은 프론트 테스트로만 검증(통과).
- 의도적인 500을 만들 안전한 테스트 endpoint가 없어 실제 500 화면은 유발하지 않음.
- 느린 네트워크 throttling은 이번 브라우저 표면에서 적용하지 못함. 버튼의 ref 기반 중복 제출 방지와 disabled 상태는 코드/테스트로 확인.
- 비밀번호/refresh token은 백엔드 구조화 로그에 출력되지 않았으나, 브라우저 전체 network export는 제공되지 않아 패킷 수준 검증은 미완료.

## 캡처 파일

- `live-e2e-02-home.png`: 로그인 성공, 역할과 담당 지역
- `live-e2e-04-operator-detail.png`: 운영자 신청 상세와 사업자 정보
- `live-e2e-05-approve-modal.png`: 승인 확인 모달
- `live-e2e-06-approve-result.png`: 승인 성공과 목록 제거
- `live-e2e-07-reservation-masked.png`: 예약 조회와 개인정보 마스킹
- `live-e2e-08-qr-cursor-page2.png`: QR 커서 2페이지
- `live-e2e-10-mission-approve-modal.png`: 미션 승인 확인
- `live-e2e-12-mission-published.png`: 승인 직후 공개 상태
- `live-e2e-13-refresh-auth-restored.png`: 새로고침 후 공개 목록과 인증 복구
- `live-e2e-15-session-approved.png`: 회차 승인과 목록 갱신
