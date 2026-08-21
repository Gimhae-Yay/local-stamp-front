# 전체관리자 로컬 테스트 데이터

## 개요

전체관리자 프론트엔드와 Backend API의 정상·실패 흐름을 로컬에서 확인하기 위한 수동 fixture다.
fixture 구현은 백엔드 저장소의 운영 소스·Flyway migration과 분리된 `platformAdminSeed` source set에 있다.

- 백엔드 저장소: `Regional-Event-Platform-Backend`
- 적용 범위: 고정 ID `910xxx`, `LOCAL-PA-*` 지역 코드, `@test.local` 전용 계정
- 테스트 비밀번호: `LocalTest1!`
- 비밀번호 저장: 실행할 때마다 프로젝트 `SecurityConfig.passwordEncoder()`로 인코딩
- 자동 실행: 없음. 일반 백엔드 시작으로는 fixture가 생성되지 않는다.
- 데이터베이스 제약: FK·CHECK를 비활성화하지 않으며 현재 Flyway schema 검증을 먼저 통과해야 한다.

플랫폼 관리자 등급은 일반 사용자 역할과 별도다. 로그인 응답의 `roles`는
`user_role_assignment`만 포함하므로 `SUPER_ADMIN`·`PLATFORM_ADMIN`은 로그인 응답에 나타나지 않는다.
프론트엔드는 로그인 후 전체관리자 API 호출 결과로 접근 권한을 확인해야 한다.

## 실행 방법

### 실행 전 준비사항

1. 백엔드 저장소로 이동한다.
2. 로컬 MySQL을 `application-local.yaml` 기본값인 `localhost:3307`에서 실행한다.
3. DB 사용자와 schema를 준비하고 Backend Flyway migration이 현재 코드와 일치하는지 확인한다.
4. API 로그인·환불 재시도까지 테스트한다면 Redis도 `localhost:6380`에서 실행한다.
5. 환불 재시도 성공 흐름은 백엔드 실행 전에 `PORTONE_FAKE_ENABLED=true`를 환경 변수로 설정한다.

Flyway checksum 불일치나 미적용 migration이 있으면 seed는 fixture SQL 실행 전에 실패한다. 검증을 끄거나
운영 migration을 수정하지 말고 로컬 DB를 현재 코드와 일치하게 복구한다.

### 테스트 데이터 적용 또는 초기 상태 복구

Windows PowerShell:

```powershell
.\gradlew.bat platformAdminSeed -PseedProfile=local -PseedAction=apply
```

macOS/Linux:

```bash
./gradlew platformAdminSeed -PseedProfile=local -PseedAction=apply
```

`apply`는 이 문서의 fixture 범위만 먼저 삭제한 뒤 초기 상태로 다시 만든다. API 테스트로 상태가
변경된 뒤 같은 명령을 다시 실행하면 초기 상태로 복구된다. 따라서 반복 실행해도 fixture가 중복되지 않는다.

### 테스트 데이터 제거

Windows PowerShell:

```powershell
.\gradlew.bat platformAdminSeed -PseedProfile=local -PseedAction=reset
```

macOS/Linux:

```bash
./gradlew platformAdminSeed -PseedProfile=local -PseedAction=reset
```

`createdadmin@test.local` 계정과 `LOCAL-PA-CREATE-OK` 지역은 생성 API의 권장 입력값이며 reset 대상에
포함된다. 그 밖의 임의 이메일·지역 코드로 API에서 생성한 데이터는 자동 삭제하지 않는다.

## 안전장치

- 명시적 `platformAdminSeed` Gradle task와 `seedAction`이 없으면 아무 작업도 하지 않는다.
- Gradle task는 `-PseedProfile=local` 외 값을 애플리케이션 시작 전에 거부한다.
- 실행 클래스는 활성 프로필이 정확히 `local` 하나인지 다시 확인한다.
- JDBC URL이 `localhost`, `127.0.0.1`, `[::1]`의 MySQL이 아니면 거부한다.
- 일반 백엔드 runtime classpath에는 `src/platformAdminSeed`가 포함되지 않는다.
- MySQL advisory lock으로 두 seed 실행의 동시 수행을 막는다.
- reset과 apply는 한 DB transaction으로 실행한다. SQL 또는 FK 실패 시 전체 rollback한다.
- FK 검사나 CHECK 제약을 끄지 않는다.
- 운영 Flyway migration, 운영 초기 데이터, 애플리케이션 시작 hook을 사용하지 않는다.

## API 테스트 공통값

- 로그인: `POST /api/v1/auth/login`
- 정상 전체관리자: `superadmin@test.local` 또는 `platformadmin@test.local`
- `403` 권한 확인: `user@test.local`, `regionadmin@test.local`, `inactiveadmin@test.local`
- `401` 확인: `Authorization` 헤더를 생략하거나 유효하지 않은 토큰 사용
- `404` 확인: 각 양수 ID 경로에 존재하지 않는 값 `999999999` 사용
- `400` 확인: 문서화된 필수 필드 누락, 잘못된 Enum·형식 또는 0/음수 ID 사용
- 공통 비밀번호: `LocalTest1!`

## 데이터 상세

### 테스트 계정

| 용도                                             | 이메일                        | 비밀번호      | userId | 권한                           | 상태                                           |
| ------------------------------------------------ | ----------------------------- | ------------- | -----: | ------------------------------ | ---------------------------------------------- |
| 전체관리자 정상·자기 자신·마지막 최고관리자 보호 | `superadmin@test.local`       | `LocalTest1!` | 910001 | `SUPER_ADMIN`                  | 관리자 배정 `ACTIVE`                           |
| 전체관리자 정상·비활성화 정상 대상               | `platformadmin@test.local`    | `LocalTest1!` | 910002 | `PLATFORM_ADMIN`               | 관리자 배정 `ACTIVE`                           |
| 무권한·일반 사용자·결제 소유자                   | `user@test.local`             | `LocalTest1!` | 910003 | 없음                           | 사용자 `ACTIVE`                                |
| 지역관리자 권한 확인·마지막 지역관리자 충돌      | `regionadmin@test.local`      | `LocalTest1!` | 910004 | `REGION_ADMIN` / region 910003 | 역할 배정 `ACTIVE`                             |
| 비활성 관리자 `403`                              | `inactiveadmin@test.local`    | `LocalTest1!` | 910005 | `PLATFORM_ADMIN`               | 관리자 배정 `INACTIVE`; 사용자 자체는 `ACTIVE` |
| 지역관리자 임명 정상 대상                        | `appointable@test.local`      | `LocalTest1!` | 910006 | 없음                           | 사용자 `ACTIVE`                                |
| 지역관리자 회수 정상 대상                        | `revocable@test.local`        | `LocalTest1!` | 910007 | `REGION_ADMIN` / region 910004 | 역할 배정 `ACTIVE`                             |
| 콘텐츠·결제 관계 지원 fixture                    | `operator-fixture@test.local` | `LocalTest1!` | 910008 | `OPERATOR` / region 910003     | 역할 배정 `ACTIVE`                             |

`inactiveadmin@test.local`은 로그인 자체는 가능하지만 활성 플랫폼 관리자 배정이 없으므로 전체관리자 API는
`403 FORBIDDEN`이다. 이는 실제 인증·인가 모델의 비활성 표현을 따른다.

### 사용자·권한 테스트 데이터

| 용도                   | userId | 현재 역할                      | regionId | API                                              | 예상 결과                                                            | 실행 후 변경      |
| ---------------------- | -----: | ------------------------------ | -------: | ------------------------------------------------ | -------------------------------------------------------------------- | ----------------- |
| 역할 없는 일반 사용자  | 910003 | 없음                           |        - | `GET /api/v1/platform-admin/regions`             | 일반 사용자 토큰이면 `403`                                           | 아니요            |
| 지역관리자 보유 사용자 | 910004 | `REGION_ADMIN`                 |   910003 | `PATCH /api/v1/platform-admin/users/910004/role` | 마지막 관리자+콘텐츠 조건에서 회수 시 `409 ROLE_ASSIGNMENT_CONFLICT` | 실패이므로 아니요 |
| 임명 가능 사용자       | 910006 | 없음                           |        - | `PATCH /api/v1/platform-admin/users/910006/role` | 유효한 지역으로 `REGION_ADMIN` 임명 성공                             | 예                |
| 회수 가능 사용자       | 910007 | `REGION_ADMIN`                 |   910004 | `PATCH /api/v1/platform-admin/users/910007/role` | `NONE`으로 회수 성공                                                 | 예                |
| 고권한 충돌 사용자     | 910002 | 플랫폼 관리자 `PLATFORM_ADMIN` |        - | `PATCH /api/v1/platform-admin/users/910002/role` | `409 ROLE_ASSIGNMENT_CONFLICT`                                       | 아니요            |

권한 변경 뒤 `apply` 명령으로 원상복구한다. 정상 임명 요청의 `regionId`로는 910001 또는 910002를 사용할 수 있다.

### 지역 테스트 데이터

| 용도                    |     regionId | regionCode           | 공개 여부         | API                                                  | 예상 결과                                         | 실행 후 변경      |
| ----------------------- | -----------: | -------------------- | ----------------- | ---------------------------------------------------- | ------------------------------------------------- | ----------------- |
| 공개 목록·상태 조회     |       910001 | `LOCAL-PA-PUBLIC`    | 공개              | `GET /api/v1/platform-admin/regions`                 | 정상 조회                                         | 아니요            |
| 비공개 목록·공개 전환   |       910002 | `LOCAL-PA-PRIVATE`   | 비공개            | `PATCH /api/v1/platform-admin/regions/910002/status` | 공개 전환 정상                                    | 예                |
| 중복 코드               |       910001 | `LOCAL-PA-PUBLIC`    | 공개              | `POST /api/v1/platform-admin/regions`                | 같은 코드 생성 시 중복 충돌                       | 아니요            |
| 콘텐츠 보유 비공개 충돌 |       910003 | `LOCAL-PA-CONTENT`   | 공개              | `PATCH /api/v1/platform-admin/regions/910003/status` | 비공개 전환 시 `409 REGION_AVAILABILITY_CONFLICT` | 실패이므로 아니요 |
| 자유로운 상태 변경      |       910004 | `LOCAL-PA-FREE`      | 공개              | `PATCH /api/v1/platform-admin/regions/910004/status` | 비공개 전환 정상                                  | 예                |
| 생성 성공용 예약 코드   | 실행 시 생성 | `LOCAL-PA-CREATE-OK` | 생성 API는 비공개 | `POST /api/v1/platform-admin/regions`                | 최초 생성 정상; reset 대상                        | 예                |

### 결제 불일치 테스트 데이터

| 용도                     | discrepancyId | paymentId | 상태                | API                                                                       | 예상 결과                                | 실행 후 변경 |
| ------------------------ | ------------: | --------: | ------------------- | ------------------------------------------------------------------------- | ---------------------------------------- | ------------ |
| 수동 무이상 종결 정상    |        910101 |    910101 | `OPEN`              | `POST /api/v1/platform-admin/payment-discrepancies/910101/manual-actions` | `RESOLVED_NO_ISSUE` 성공                 | 예           |
| 이미 종결된 건 충돌      |        910102 |    910102 | `RESOLVED_NO_ISSUE` | 같은 수동 조치 API                                                        | `409 PAYMENT_DISCREPANCY_STATE_CONFLICT` | 아니요       |
| 환불 요청 완료 목록·상세 |        910103 |    910103 | `REFUND_REQUESTED`  | 목록·상세 조회                                                            | 정상 조회                                | 아니요       |

910102와 910103에는 `payment_discrepancy_action` 및 관리자 감사 이력이 각각 1건 포함된다.

### 결제 테스트 데이터

| 용도                  | paymentId | 상태         | API                                                  | 예상 결과                     | 실행 후 변경    |
| --------------------- | --------: | ------------ | ---------------------------------------------------- | ----------------------------- | --------------- |
| 전액 환불 정상        |    910201 | `APPROVED`   | `POST /api/v1/platform-admin/payments/910201/refund` | 전액 환불 요청 정상           | 예; refund 생성 |
| 불일치 결제 환불 정상 |    910202 | `DISCREPANT` | `POST /api/v1/platform-admin/payments/910202/refund` | 전액 환불 요청 정상           | 예; refund 생성 |
| 환불 불가 결제        |    910203 | `PENDING`    | `POST /api/v1/platform-admin/payments/910203/refund` | `409 REFUND_PAYMENT_CONFLICT` | 아니요          |

`APPROVED` 결제는 사용자 910003의 예약·소비된 홀드·가격 snapshot·외부 결제 식별자를 갖는다.
`DISCREPANT` 결제는 실제 상태 전이처럼 예약 없이 활성 홀드·snapshot·관찰된 외부 결제 식별자를 가지며,
910203은 아직 외부 확정 전인 `PENDING`이므로 예약·외부 결제 식별자·`finalizedAt`이 없다.
정상 환불의 결정적 성공 응답을 확인하려면 백엔드를 `PORTONE_FAKE_ENABLED=true`로 실행한다.

### 환불 테스트 데이터

| 용도                    | refundId | paymentId | 상태         | 재시도 횟수 | API                                                                 | 예상 결과                                | 실행 후 변경 |
| ----------------------- | -------: | --------: | ------------ | ----------: | ------------------------------------------------------------------- | ---------------------------------------- | ------------ |
| 결제 불일치의 환불 요청 |   910101 |    910103 | `REQUESTED`  |           0 | 목록·상세 조회                                                      | 정상 조회                                | 아니요       |
| 상태별 `REQUESTED`      |   910301 |    910301 | `REQUESTED`  |           0 | 목록·상세, 수동 확정                                                | 수동 확정 시 `409 REFUND_STATE_CONFLICT` | 아니요       |
| 상태별 `PROCESSING`     |   910302 |    910302 | `PROCESSING` |           1 | 목록·상세                                                           | `PENDING` 외부 시도 이력 조회            | 아니요       |
| 상태별 `SUCCEEDED`      |   910303 |    910303 | `SUCCEEDED`  |           1 | 목록·상세, 수동 확정                                                | 상세 정상; 수동 확정은 `409`             | 아니요       |
| 재시도 성공 대상        |   910304 |    910304 | `FAILED`     |           1 | `POST /api/v1/platform-admin/refunds/910304/retry`                  | fake gateway 사용 시 `SUCCEEDED`         | 예           |
| 재시도 불가 상태        |   910305 |    910305 | `DISCREPANT` |           1 | 같은 재시도 API                                                     | `409 REFUND_STATE_CONFLICT`              | 아니요       |
| 최대 재시도 초과        |   910306 |    910306 | `FAILED`     |           3 | 같은 재시도 API                                                     | `409 REFUND_STATE_CONFLICT`              | 아니요       |
| 수동 확정 대상          |   910307 |    910307 | `DISCREPANT` |           1 | `POST /api/v1/platform-admin/refund-failures/910307/manual-actions` | `SUCCEEDED` 또는 `FAILED` 확정 성공      | 예           |

외부 환불 시도 이력은 refund 910302~910307에 포함된다. 상태가 바뀐 뒤 `apply`로 복구한다.

### 관리자 계정 테스트 데이터

현재 별도 관리자 목록 API는 없다. 아래 고정 `userId`를 직접 사용한다.

| 용도                           |       userId | 이메일                     | 등급             | 활성 여부              | API                                                            | 예상 결과                                 | 실행 후 변경 |
| ------------------------------ | -----------: | -------------------------- | ---------------- | ---------------------- | -------------------------------------------------------------- | ----------------------------------------- | ------------ |
| 로그인·자기 자신 비활성화      |       910001 | `superadmin@test.local`    | `SUPER_ADMIN`    | 활성                   | `POST /api/v1/platform-admin/admin-accounts/910001/deactivate` | `409 ADMIN_ACCOUNT_DEACTIVATION_CONFLICT` | 아니요       |
| 정상 비활성화 대상             |       910002 | `platformadmin@test.local` | `PLATFORM_ADMIN` | 활성                   | `POST /api/v1/platform-admin/admin-accounts/910002/deactivate` | 정상 비활성화                             | 예           |
| 이미 비활성화 대상             |       910005 | `inactiveadmin@test.local` | `PLATFORM_ADMIN` | 비활성                 | `POST /api/v1/platform-admin/admin-accounts/910005/deactivate` | `409 ADMIN_ACCOUNT_DEACTIVATION_CONFLICT` | 아니요       |
| 마지막 최고관리자 보호         |       910001 | `superadmin@test.local`    | `SUPER_ADMIN`    | 유일한 활성 최고관리자 | 비활성화 API                                                   | `409 ADMIN_ACCOUNT_DEACTIVATION_CONFLICT` | 아니요       |
| 관리자 생성 성공용 예약 이메일 | 실행 시 생성 | `createdadmin@test.local`  | 요청값           | 생성 후 활성           | `POST /api/v1/platform-admin/admin-accounts`                   | 최초 생성 정상; reset 대상                | 예           |

관리자 생성·비활성화 API는 `SUPER_ADMIN` 토큰으로 호출한다. `PLATFORM_ADMIN` 토큰이면 `403`을 확인할 수 있다.

## 고정 관계 ID

결제·환불 UI에서 관계를 추적할 때 다음 값을 사용한다.

| 범위              | regionId | contentId | sessionId | userId | 비고                                                                        |
| ----------------- | -------: | --------: | --------: | -----: | --------------------------------------------------------------------------- |
| 결제·환불 fixture |   910003 |    910001 |    910001 | 910003 | paymentId와 holdId, snapshotId는 동일; `APPROVED`만 같은 reservationId 보유 |

예를 들어 payment 910304는 hold 910304, reservation 910304,
`reservation_price_snapshot` 910304와 연결되고 refund 910304를 가진다. `DISCREPANT` payment
910101~910103·910202와 `PENDING` payment 910203은 reservation이 없다.

## 검증 결과

최신 migration V45가 적용된 MySQL 8.0.42 임시 DB에서 다음을 확인했다.

- 첫 `apply` 성공
- 두 번째 `apply` 후에도 8 users, 4 regions, 13 payments, 8 refunds, 8 attempts, 3 audits 유지
- `reset` 후 위 fixture 0건
- fixture user를 참조하는 외부 FK를 의도적으로 추가해 `reset`을 실패시켰을 때 모든 앞선 삭제 rollback
- `seedProfile=test` 실행은 DB 연결 전에 실패
- 원격 JDBC URL override는 Spring context refresh·Flyway·DB 연결 전에 실패
- 기존 로컬 DB에서 Flyway checksum 불일치가 있으면 SQL 실행 전에 실패
- 실제 Backend API에서 최고관리자 로그인 `200`, 지역 4건 조회 `200`, 일반 사용자 `403`, 토큰 없음 `401` 확인
- 종결 불일치 910102는 `409 PAYMENT_DISCREPANCY_STATE_CONFLICT` 확인
- refund 910304는 fake gateway 재시도 후 `200 SUCCEEDED`, 910305·910306은 `409 REFUND_STATE_CONFLICT` 확인
- payment 910203은 `409 REFUND_PAYMENT_CONFLICT` 확인

## 테스트 계정

| 용도                          | 이메일                     | 권한             | 상태               |
| ----------------------------- | -------------------------- | ---------------- | ------------------ |
| 전체관리자 정상·보호 규칙     | `superadmin@test.local`    | `SUPER_ADMIN`    | 활성               |
| 전체관리자 정상·비활성화 대상 | `platformadmin@test.local` | `PLATFORM_ADMIN` | 활성               |
| 일반 사용자·무권한            | `user@test.local`          | 없음             | 활성               |
| 지역관리자                    | `regionadmin@test.local`   | `REGION_ADMIN`   | 활성               |
| 비활성 관리자                 | `inactiveadmin@test.local` | `PLATFORM_ADMIN` | 관리자 배정 비활성 |
| 임명 가능 사용자              | `appointable@test.local`   | 없음             | 활성               |
| 회수 가능 사용자              | `revocable@test.local`     | `REGION_ADMIN`   | 활성               |

## 사용자·권한 테스트 데이터

| 용도                        | userId | 현재 역할        | regionId | 예상 결과                      |
| --------------------------- | -----: | ---------------- | -------: | ------------------------------ |
| 역할 없음                   | 910003 | 없음             |        - | 전체관리자 API `403`           |
| 마지막 지역관리자 회수 충돌 | 910004 | `REGION_ADMIN`   |   910003 | `409 ROLE_ASSIGNMENT_CONFLICT` |
| 지역관리자 임명             | 910006 | 없음             |        - | 정상 임명                      |
| 지역관리자 회수             | 910007 | `REGION_ADMIN`   |   910004 | 정상 회수                      |
| 고권한 역할 변경 충돌       | 910002 | `PLATFORM_ADMIN` |        - | `409 ROLE_ASSIGNMENT_CONFLICT` |

## 지역 테스트 데이터

| 용도             | regionId | regionCode         | 공개 여부 | 예상 결과                |
| ---------------- | -------: | ------------------ | --------- | ------------------------ |
| 공개 기본        |   910001 | `LOCAL-PA-PUBLIC`  | 공개      | 정상 조회·중복 코드 충돌 |
| 비공개 기본      |   910002 | `LOCAL-PA-PRIVATE` | 비공개    | 공개 전환 정상           |
| 콘텐츠 보유 충돌 |   910003 | `LOCAL-PA-CONTENT` | 공개      | 비공개 전환 `409`        |
| 상태 변경 자유   |   910004 | `LOCAL-PA-FREE`    | 공개      | 비공개 전환 정상         |

## 결제 불일치 테스트 데이터

| 용도                | discrepancyId | 상태                | 예상 결과                                |
| ------------------- | ------------: | ------------------- | ---------------------------------------- |
| 수동 종결 정상      |        910101 | `OPEN`              | `RESOLVED_NO_ISSUE`                      |
| 종결 상태 충돌      |        910102 | `RESOLVED_NO_ISSUE` | `409 PAYMENT_DISCREPANCY_STATE_CONFLICT` |
| 환불 요청 완료 조회 |        910103 | `REFUND_REQUESTED`  | 정상 조회                                |

## 결제 테스트 데이터

| 용도                  | paymentId | 상태         | 예상 결과                     |
| --------------------- | --------: | ------------ | ----------------------------- |
| 전액 환불 정상        |    910201 | `APPROVED`   | 정상 환불                     |
| 불일치 결제 환불 정상 |    910202 | `DISCREPANT` | 정상 환불                     |
| 환불 불가             |    910203 | `PENDING`    | `409 REFUND_PAYMENT_CONFLICT` |

## 환불 테스트 데이터

| 용도                  | refundId | 상태         | 재시도 횟수 | 예상 결과                           |
| --------------------- | -------: | ------------ | ----------: | ----------------------------------- |
| 결제 불일치 환불 요청 |   910101 | `REQUESTED`  |           0 | 정상 조회                           |
| 상태별 요청           |   910301 | `REQUESTED`  |           0 | 정상 조회·수동 확정 `409`           |
| 상태별 처리 중        |   910302 | `PROCESSING` |           1 | 정상 조회                           |
| 상태별 성공           |   910303 | `SUCCEEDED`  |           1 | 정상 조회·수동 확정 `409`           |
| 재시도 성공           |   910304 | `FAILED`     |           1 | fake gateway에서 `SUCCEEDED`        |
| 재시도 불가 상태      |   910305 | `DISCREPANT` |           1 | 재시도 `409`                        |
| 최대 재시도           |   910306 | `FAILED`     |           3 | 재시도 `409`                        |
| 수동 확정             |   910307 | `DISCREPANT` |           1 | `SUCCEEDED` 또는 `FAILED` 확정 정상 |

## 관리자 계정 테스트 데이터

| 용도                        | userId | 등급             | 활성 여부 | 예상 결과      |
| --------------------------- | -----: | ---------------- | --------- | -------------- |
| 자기 자신·마지막 최고관리자 | 910001 | `SUPER_ADMIN`    | 활성      | 비활성화 `409` |
| 정상 비활성화               | 910002 | `PLATFORM_ADMIN` | 활성      | 정상 처리      |
| 이미 비활성화               | 910005 | `PLATFORM_ADMIN` | 비활성    | 비활성화 `409` |

## 준비 데이터만으로 검증할 수 없는 항목

- 실제 PortOne sandbox/운영망의 timeout, network failure, 비정상 외부 상태 전이는 고정 DB fixture만으로 재현할 수 없다.
  현재 fake adapter는 성공만 반환하므로 실패 전이 자체를 호출로 만들려면 별도의 제어 가능한 gateway가 필요하다.
- `400`, `401`, `403`, `404`는 별도 DB 상태보다 요청 형식·토큰·존재하지 않는 ID로 검증한다.
  이 문서의 계정과 공통값으로 실행할 수 있지만 fixture만 생성했다고 자동 검증되지는 않는다.
- 동시 요청 경합, transaction lock, 중복 요청 타이밍은 별도의 병렬 호출 도구가 필요하다.
- 관리자 계정 목록 API는 현재 존재하지 않으므로 관리자 ID 탐색은 API로 검증할 수 없다. 이 문서의 고정 ID를 사용한다.
- 현재 비활성화 정책에서 마지막 활성 `SUPER_ADMIN`은 곧 실행자 자신이므로, 마지막 최고관리자 보호와 자기 자신
  비활성화 보호를 서로 독립된 요청으로 분리해 관찰할 수 없다. user 910001 요청으로 결합된 충돌은 검증할 수 있다.
- 로컬 DB의 Flyway checksum이 현재 소스와 다르면 seed를 실행할 수 없다. 이는 schema 검증 우회를 금지한 안전장치다.
