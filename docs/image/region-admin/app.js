const query = new URLSearchParams(window.location.search);
const screen = query.get("screen") || "home";
const viewState = query.get("state") || "default";
const modalName = query.get("modal");
const requestedContentStatus = query.get("status") || "PENDING";
const contentStatus = ["PENDING", "APPROVED"].includes(requestedContentStatus)
    ? requestedContentStatus
    : "PENDING";
const requestedErrorCode = query.get("code");
const detailErrorCode = requestedErrorCode && /^[A-Z][A-Z0-9_]{0,63}$/.test(requestedErrorCode)
    ? requestedErrorCode
    : "INTERNAL_SERVER_ERROR";

const mock = {
    me: {
        userId: "103",
        roleAssignments: [
            { role: "VISITOR", regionId: null, regionName: null },
            { role: "REGION_ADMIN", regionId: "1", regionName: "김해시" },
        ],
    },
    operatorRequests: {
        operatorRequests: [
            { operatorApplicationId: "481", applicantUserId: "10042", requestedRegionId: "1", requestedAt: "2026-08-14T01:20:00Z" },
            { operatorApplicationId: "486", applicantUserId: "10057", requestedRegionId: "1", requestedAt: "2026-08-15T04:10:00Z" },
            { operatorApplicationId: "492", applicantUserId: "10083", requestedRegionId: "1", requestedAt: "2026-08-16T08:35:00Z" },
        ],
    },
    operatorDetail: {
        operatorApplicationId: "481",
        applicantUserId: "10042",
        requestedRegionId: "1",
        status: "PENDING",
        businessInformation: "상호: 봉리단길 공방\n사업자등록번호: 123-45-67890\n업종: 도자기 체험 및 교육\n대표자: 김해봄",
        inspectedUserId: null,
        rejectedReason: null,
        requestedAt: "2026-08-14T01:20:00Z",
        updatedAt: "2026-08-14T01:20:00Z",
    },
    contents: [
        { contentId: "1201", contentType: "EVENT_EXPERIENCE", title: "가야 토기 만들기 체험", status: "PENDING", publishAt: "2026-08-24T09:00:00+09:00", submittedAt: "2026-08-14T02:30:00Z", approvedAt: null, operator: { operatorId: "301", name: "봉리단길 공방" }, representativeImageUrl: "mock://content-1201", representativeImageUrlExpiresAt: "2026-08-18T05:00:00Z" },
        { contentId: "1204", contentType: "EVENT_EXPERIENCE", title: "화포천 생태 관찰 교실", status: "PENDING", publishAt: "2026-08-25T10:00:00+09:00", submittedAt: "2026-08-15T03:10:00Z", approvedAt: null, operator: { operatorId: "306", name: "화포천 배움터" }, representativeImageUrl: "mock://content-1204", representativeImageUrlExpiresAt: "2026-08-18T05:00:00Z" },
        { contentId: "1193", contentType: "EVENT_EXPERIENCE", title: "수로왕릉 야간 해설", status: "APPROVED", publishAt: "2026-08-21T18:00:00+09:00", submittedAt: null, approvedAt: "2026-08-17T06:22:00Z", operator: { operatorId: "289", name: "가야문화 해설단" }, representativeImageUrl: "mock://content-1193", representativeImageUrlExpiresAt: "2026-08-18T05:00:00Z" },
        { contentId: "1198", contentType: "EVENT_EXPERIENCE", title: "진영 단감 디저트 클래스", status: "APPROVED", publishAt: "2026-08-23T09:30:00+09:00", submittedAt: null, approvedAt: "2026-08-17T08:12:00Z", operator: { operatorId: "295", name: "진영단감연구소" }, representativeImageUrl: "mock://content-1198", representativeImageUrlExpiresAt: "2026-08-18T05:00:00Z" },
    ],
    contentDetail: {
        contentId: "1201", regionId: "1", operatorId: "301", contentType: "EVENT_EXPERIENCE", status: "PENDING",
        title: "가야 토기 만들기 체험", description: "가야 토기의 형태와 문양을 배우고 직접 생활 토기를 만드는 가족 체험입니다.", representativeImageUrl: "mock://content-1201", representativeImageUrlExpiresAt: "2026-08-18T05:00:00Z", locationText: "김해시 봉황대길 24 공방 2층", operatingHoursText: "토·일 10:00–17:00", contactText: "055-***-4821", precautions: "흙이 묻어도 괜찮은 복장을 준비해 주세요.", ageRequirement: "만 7세 이상", materials: "개인 앞치마", cancellationPolicyText: "회차 시작 전까지 무료 취소", reservationPrice: 18000, publishAt: "2026-08-24T09:00:00+09:00",
        sessions: [
            { sessionId: "7101", status: "PENDING", startsAt: "2026-08-29T10:00:00+09:00", endsAt: "2026-08-29T12:00:00+09:00", checkinOpenAt: "2026-08-29T09:30:00+09:00", checkinCloseAt: "2026-08-29T10:10:00+09:00", capacity: 16, remainingCapacity: 16 },
            { sessionId: "7102", status: "PENDING", startsAt: "2026-08-29T14:00:00+09:00", endsAt: "2026-08-29T16:00:00+09:00", checkinOpenAt: "2026-08-29T13:30:00+09:00", checkinCloseAt: "2026-08-29T14:10:00+09:00", capacity: 16, remainingCapacity: 16 },
        ],
    },
    contentHistory: {
        contentId: "1201",
        histories: [
            { status: "PENDING", reason: null, processedAt: "2026-08-14T02:30:00Z", actor: { userId: "301", displayName: "봉리단길 공방" } },
            { status: "REJECTED", reason: "연령 조건과 준비물 안내를 보완해 주세요.", processedAt: "2026-08-14T05:10:00Z", actor: { userId: "103", displayName: "김해시 지역 관리자" } },
            { status: "PENDING", reason: null, processedAt: "2026-08-15T01:40:00Z", actor: { userId: "301", displayName: "봉리단길 공방" } },
        ],
    },
    revisions: {
        revisions: [
            { revisionId: "9101", contentId: "1088", reviewType: "PUBLISHED_REVISION", contentStatus: "PUBLISHED", title: "봉황동 골목 야간 투어", candidatePublishAt: null, submittedAt: "2026-08-15T07:30:00Z", operator: { operatorId: "272", name: "김해도보여행" }, representativeImageUrl: "mock://revision-9101" },
            { revisionId: "9104", contentId: "1195", reviewType: "PRE_PUBLIC_REVISION", contentStatus: "PENDING", title: "분청사기 어린이 교실", candidatePublishAt: "2026-08-26T09:00:00+09:00", submittedAt: "2026-08-16T02:12:00Z", operator: { operatorId: "291", name: "클레이가야" }, representativeImageUrl: "mock://revision-9104" },
        ],
    },
    revisionDetail: {
        revisionId: "9101", contentId: "1088", reviewType: "PUBLISHED_REVISION", contentStatus: "PUBLISHED", title: "봉황동 골목 야간 투어", description: "해설사와 함께 봉황동의 오래된 골목과 야간 명소를 걷습니다.", locationText: "봉황역 1번 출구 앞", operatingHoursText: "금·토 19:30", contactText: "010-****-2314", precautions: "걷기 편한 신발을 착용해 주세요.", ageRequirement: "만 12세 이상", materials: "개인 음료", cancellationPolicyText: "시작 전까지 무료 취소", reservationPrice: 12000, representativeImageUrl: "mock://revision-9101", representativeImageUrlExpiresAt: "2026-08-18T05:00:00Z", candidatePublishAt: null, sessions: [{ sessionId: "6803", status: "SCHEDULED", startsAt: "2026-08-22T19:30:00+09:00", endsAt: "2026-08-22T21:00:00+09:00", checkinOpenAt: "2026-08-22T19:00:00+09:00", checkinCloseAt: "2026-08-22T19:40:00+09:00", capacity: 20, remainingCapacity: 20 }], submittedAt: "2026-08-15T07:30:00Z",
    },
    publicContents: {
        contents: [
            { contentId: "1088", contentType: "EVENT_EXPERIENCE", title: "봉황동 골목 야간 투어", locationText: "봉황역 1번 출구 앞", representativeImageUrl: "mock://public-1088", representativeImageUrlExpiresAt: "2026-08-18T05:00:00Z", reservationAvailable: true },
            { contentId: "1092", contentType: "EVENT_EXPERIENCE", title: "대성동고분박물관 가족 탐방", locationText: "대성동고분박물관 안내데스크", representativeImageUrl: "mock://public-1092", representativeImageUrlExpiresAt: "2026-08-18T05:00:00Z", reservationAvailable: false },
            { contentId: "1110", contentType: "EVENT_EXPERIENCE", title: "낙동강 자전거 생태 여행", locationText: "김해 낙동강 레일파크", representativeImageUrl: "mock://public-1110", representativeImageUrlExpiresAt: "2026-08-18T05:00:00Z", reservationAvailable: true },
        ],
    },
    publicDetail: { contentId: "1088", contentType: "EVENT_EXPERIENCE", title: "봉황동 골목 야간 투어", description: "해설사와 함께 봉황동의 오래된 골목과 야간 명소를 걷는 90분 프로그램입니다.", representativeImageUrl: "mock://public-1088", representativeImageUrlExpiresAt: "2026-08-18T05:00:00Z", locationText: "봉황역 1번 출구 앞", operatingHoursText: "금·토 19:30", contactText: "010-****-2314", precautions: "걷기 편한 신발을 착용해 주세요.", ageRequirement: "만 12세 이상", materials: "개인 음료", cancellationPolicyText: "회차 시작 전까지 무료 취소" },
    withdrawals: {
        withdrawalRequests: [
            { withdrawalRequestId: "3401", contentId: "1042", contentType: "EVENT_EXPERIENCE", contentTitle: "장유 목공 원데이 클래스", contentStatus: "PUBLISHED", requester: { userId: "260", name: "장유목공소" }, requestedAt: "2026-08-13T02:15:00Z" },
            { withdrawalRequestId: "3404", contentId: "1058", contentType: "EVENT_EXPERIENCE", contentTitle: "김해천문대 별자리 산책", contentStatus: "PUBLISHED", requester: null, requestedAt: "2026-08-15T06:40:00Z" },
        ],
    },
    withdrawalDetail: { withdrawalRequestId: "3401", status: "PENDING", content: { contentId: "1042", contentType: "EVENT_EXPERIENCE", title: "장유 목공 원데이 클래스", status: "PUBLISHED", publishAt: "2026-06-01T09:00:00+09:00" }, requester: { userId: "260", name: "장유목공소" }, requestReason: "공방 이전으로 예정된 회차를 더 이상 운영하기 어렵습니다.", requestedAt: "2026-08-13T02:15:00Z" },
    sessions: {
        sessions: [
            { sessionId: "7301", contentId: "1088", contentTitle: "봉황동 골목 야간 투어", status: "PENDING", startsAt: "2026-09-05T19:30:00+09:00", endsAt: "2026-09-05T21:00:00+09:00", checkinOpenAt: "2026-09-05T19:00:00+09:00", checkinCloseAt: "2026-09-05T19:40:00+09:00", capacity: 20, createdAt: "2026-08-15T03:15:00Z", operator: { operatorId: "272", name: "김해도보여행" } },
            { sessionId: "7305", contentId: "1092", contentTitle: "대성동고분박물관 가족 탐방", status: "PENDING", startsAt: "2026-09-06T10:00:00+09:00", endsAt: "2026-09-06T12:00:00+09:00", checkinOpenAt: "2026-09-06T09:30:00+09:00", checkinCloseAt: "2026-09-06T10:10:00+09:00", capacity: 24, createdAt: "2026-08-16T01:05:00Z", operator: { operatorId: "280", name: "가야가족문화" } },
        ],
    },
    sessionDetail: { sessionId: "7301", contentId: "1088", contentTitle: "봉황동 골목 야간 투어", contentStatus: "PUBLISHED", status: "PENDING", startsAt: "2026-09-05T19:30:00+09:00", endsAt: "2026-09-05T21:00:00+09:00", checkinOpenAt: "2026-09-05T19:00:00+09:00", checkinCloseAt: "2026-09-05T19:40:00+09:00", capacity: 20, remainingCapacity: 20, createdAt: "2026-08-15T03:15:00Z", operator: { operatorId: "272", name: "김해도보여행" } },
    sessionRevisions: {
        revisions: [
            { revisionId: "8201", contentId: "1088", contentTitle: "봉황동 골목 야간 투어", targetSessionId: "6803", baseSessionVersion: 3, startsAt: "2026-08-22T20:00:00+09:00", endsAt: "2026-08-22T21:30:00+09:00", checkinOpenAt: "2026-08-22T19:30:00+09:00", checkinCloseAt: "2026-08-22T20:10:00+09:00", capacity: 24, submittedAt: "2026-08-15T05:40:00Z", operator: { operatorId: "272", name: "김해도보여행" } },
            { revisionId: "8207", contentId: "1110", contentTitle: "낙동강 자전거 생태 여행", targetSessionId: "6890", baseSessionVersion: 1, startsAt: "2026-08-30T08:30:00+09:00", endsAt: "2026-08-30T11:30:00+09:00", checkinOpenAt: "2026-08-30T08:00:00+09:00", checkinCloseAt: "2026-08-30T08:40:00+09:00", capacity: 15, submittedAt: "2026-08-16T03:12:00Z", operator: { operatorId: "310", name: "낙동강바이크" } },
        ],
    },
    sessionRevisionDetail: { revisionId: "8201", contentId: "1088", contentTitle: "봉황동 골목 야간 투어", contentStatus: "PUBLISHED", targetSession: { sessionId: "6803", status: "SCHEDULED", version: 3, startsAt: "2026-08-22T19:30:00+09:00", endsAt: "2026-08-22T21:00:00+09:00", checkinOpenAt: "2026-08-22T19:00:00+09:00", checkinCloseAt: "2026-08-22T19:40:00+09:00", capacity: 20 }, baseSessionVersion: 3, candidate: { startsAt: "2026-08-22T20:00:00+09:00", endsAt: "2026-08-22T21:30:00+09:00", checkinOpenAt: "2026-08-22T19:30:00+09:00", checkinCloseAt: "2026-08-22T20:10:00+09:00", capacity: 24 }, submittedAt: "2026-08-15T05:40:00Z", operator: { operatorId: "272", name: "김해도보여행" } },
    qrExceptions: {
        exceptions: [
            { exceptionId: "55021", exceptionType: "QR_CHECK_IN_FAILURE", result: "FAILURE", reasonCode: "QR_CHECK_IN_SIGNATURE_INVALID", reservationResolved: false, reservationId: null, contentId: null, sessionId: null, occurredAt: "2026-08-18T01:42:10Z" },
            { exceptionId: "55018", exceptionType: "MANUAL_CHECK_IN", result: "SUCCESS", reasonCode: "MANUAL_CHECK_IN_QR_SCAN_FAILED_SUCCESS", reservationResolved: true, reservationId: "88012", contentId: "1088", sessionId: "6803", occurredAt: "2026-08-18T00:18:33Z" },
            { exceptionId: "54993", exceptionType: "RESERVATION_NUMBER_LOOKUP", result: "SUCCESS", reasonCode: "QR_VERIFICATION_FAILED", reservationResolved: true, reservationId: "87984", contentId: "1092", sessionId: "6810", occurredAt: "2026-08-17T08:12:00Z" },
        ], nextCursor: "eyJpZCI6NTQ5OTN9", hasNext: true,
    },
    qrExceptionsNextPage: {
        exceptions: [
            { exceptionId: "54972", exceptionType: "QR_CHECK_IN_FAILURE", result: "FAILURE", reasonCode: "QR_CHECK_IN_SIGNATURE_INVALID", reservationResolved: false, reservationId: null, contentId: null, sessionId: null, occurredAt: "2026-08-17T06:28:44Z" },
            { exceptionId: "54960", exceptionType: "MANUAL_CHECK_IN", result: "SUCCESS", reasonCode: "MANUAL_CHECK_IN_QR_SCAN_FAILED_SUCCESS", reservationResolved: true, reservationId: "87951", contentId: "1110", sessionId: "6890", occurredAt: "2026-08-17T05:45:21Z" },
        ], nextCursor: null, hasNext: false,
    },
    qrDetail: { exceptionId: "55018", exceptionType: "MANUAL_CHECK_IN", result: "SUCCESS", reasonCode: "MANUAL_CHECK_IN_QR_SCAN_FAILED_SUCCESS", occurredAt: "2026-08-18T00:18:33Z", reservationResolved: true, reservation: { reservationId: "88012", reservationNo: "R20260818A7K3M9Q2W5XZ", status: "CHECKED_IN", contentId: "1088", contentTitle: "봉황동 골목 야간 투어", sessionId: "6803", startsAt: "2026-08-22T19:30:00+09:00", checkinOpenAt: "2026-08-22T19:00:00+09:00", checkinCloseAt: "2026-08-22T19:40:00+09:00", participant: { memberLinked: true, name: "김*수", phone: "010-****-1234" }, checkIn: { checkedIn: true, canCheckIn: false, checkedAt: "2026-08-18T00:18:33Z" } } },
    stampbooks: { stampbooks: [
        { stampbookId: "4201", regionId: "1", status: "PENDING_REVIEW", targetCount: 4, rewardCouponPolicyId: "771", requestedAt: "2026-08-14T03:00:00Z" },
        { stampbookId: "4205", regionId: "1", status: "PENDING_REVIEW", targetCount: 6, rewardCouponPolicyId: "782", requestedAt: "2026-08-16T04:20:00Z" },
    ] },
    stampbookDetail: { stampbookId: "4201", regionId: "1", status: "PENDING_REVIEW", targetContents: [
        { contentId: "1088", regionId: "1", title: "봉황동 골목 야간 투어", status: "PUBLISHED" },
        { contentId: "1092", regionId: "1", title: "대성동고분박물관 가족 탐방", status: "PUBLISHED" },
        { contentId: "1110", regionId: "1", title: "낙동강 자전거 생태 여행", status: "PUBLISHED" },
        { contentId: "1122", regionId: "1", title: "김해 한옥 차문화 체험", status: "PUBLISHED" },
    ], rewardCouponPolicy: { couponPolicyId: "771", regionId: "1", issuanceType: "STAMPBOOK_COMPLETION", status: "PUBLISHED" }, requestedAt: "2026-08-14T03:00:00Z", requestReason: "김해 대표 체험 4곳을 잇는 주말 가족 코스로 공개를 요청합니다." },
    missions: { content: [
        { missionId: "701", title: "김해 골목 세 곳 방문하기", status: "PENDING_REVIEW" },
        { missionId: "698", title: "김해 생태 체험 두 곳 완주", status: "PUBLISHED" },
        { missionId: "694", title: "가야 역사 문화 탐방", status: "DRAFT" },
        { missionId: "681", title: "김해 대표 명소 방문하기", status: "ENDED" },
    ], page: 0, size: 20, totalElements: 4, totalPages: 1 },
    missionDetail: { missionId: "701", title: "김해 골목 세 곳 방문하기", regionId: "1", status: "PENDING_REVIEW", conditionType: "CONTENT_SET", requiredVisitCount: null, targetContents: [
        { contentId: "1088", title: "봉황동 골목 야간 투어" },
        { contentId: "1092", title: "대성동고분박물관 가족 탐방" },
        { contentId: "1110", title: "낙동강 자전거 생태 여행" },
    ], rewardCouponPolicyId: "790", endsAt: "2026-10-31T23:59:59+09:00" },
    missionHistory: { missionId: "701", histories: [
        { auditEventId: "9901", action: "CREATED", previousStatus: null, nextStatus: "DRAFT", result: "SUCCESS", reasonCode: "MISSION_CREATED", actorKind: "USER", actorUserId: "322", recordedAt: "2026-08-12T01:10:00Z" },
        { auditEventId: "9913", action: "UPDATED", previousStatus: "DRAFT", nextStatus: "DRAFT", result: "SUCCESS", reasonCode: "MISSION_UPDATED", actorKind: "USER", actorUserId: "322", recordedAt: "2026-08-13T04:22:00Z" },
        { auditEventId: "9928", action: "SUBMITTED", previousStatus: "DRAFT", nextStatus: "PENDING_REVIEW", result: "SUCCESS", reasonCode: "MISSION_SUBMITTED", actorKind: "USER", actorUserId: "322", recordedAt: "2026-08-14T08:40:00Z" },
    ] },
};

const regionAdminAssignment = mock.me.roleAssignments.find(
    assignment => assignment.role === "REGION_ADMIN"
);

const nav = [
    { group: "공통", label: "운영 홈", icon: "⌂", screen: "home", key: "home" },
    { group: "P0 운영", label: "운영자 신청", icon: "◉", screen: "operator-list", key: "operator" },
    { group: "P0 운영", label: "콘텐츠 관리", icon: "▤", screen: "content-review", key: "content" },
    { group: "P0 운영", label: "회차 관리", icon: "◫", screen: "session-list", key: "session" },
    { group: "P0 운영", label: "QR 예외", icon: "⌗", screen: "qr-list", key: "qr" },
    { group: "P1 혜택", label: "혜택 심사", icon: "◇", screen: "stampbook-list", key: "benefit" },
];

const screenMeta = {
    home: ["운영 홈", "담당 지역의 운영 업무로 이동합니다.", "home"],
    "operator-list": ["운영자 신청", "담당 지역의 승인 대기 신청을 오래된 순으로 확인합니다.", "operator"],
    "operator-detail": ["운영자 신청 상세", "사업자 정보와 요청 지역을 확인하고 신청을 심사합니다.", "operator"],
    "content-review": ["콘텐츠 관리", "승인 대기와 공개 전 삭제 대상을 관리합니다.", "content"],
    "content-detail": ["최초 콘텐츠 심사 상세", "콘텐츠 전체 정보와 최초 회차를 검토합니다.", "content"],
    "revision-list": ["콘텐츠 관리", "제출된 콘텐츠 수정 후보를 검토합니다.", "content"],
    "revision-detail": ["콘텐츠 수정본 상세", "후보 표시 정보와 원본 상태를 확인합니다.", "content"],
    "published-list": ["콘텐츠 관리", "담당 지역의 공개 콘텐츠를 탐색하고 운영 상태를 관리합니다.", "content"],
    "published-detail": ["공개 콘텐츠 운영 상세", "공개 정보를 확인하고 중단 또는 정상 종료를 요청합니다.", "content"],
    "withdrawal-list": ["콘텐츠 관리", "전체 철회 요청을 오래된 순으로 확인합니다.", "content"],
    "withdrawal-detail": ["전체 철회 요청 상세", "요청 사유와 대상 콘텐츠를 확인하고 심사합니다.", "content"],
    "session-list": ["회차 관리", "신규 회차 심사 대상을 확인합니다.", "session"],
    "session-detail": ["추가 회차 상세", "일정, 체크인 창과 정원을 검토합니다.", "session"],
    "session-revision-list": ["회차 관리", "기존 회차 변경 요청을 확인합니다.", "session"],
    "session-revision-detail": ["회차 수정 상세", "현재 회차와 변경 후보를 비교합니다.", "session"],
    "qr-list": ["QR 예외", "최근 QR 실패와 보조 처리 감사 기록을 확인합니다.", "qr"],
    "qr-detail": ["QR 예외 상세", "예외 원인과 안전하게 연결된 예약 정보를 확인합니다.", "qr"],
    "stampbook-list": ["혜택 심사", "공개 심사 대기 스탬프북을 확인합니다.", "benefit"],
    "stampbook-detail": ["스탬프북 상세", "대상 콘텐츠와 완료 보상 정책을 검토합니다.", "benefit"],
    "mission-list": ["혜택 심사", "담당 지역 미션을 상태별로 확인합니다.", "benefit"],
    "mission-detail": ["미션 상세·이력", "미션 조건과 최근 90일 수명주기 이력을 검토합니다.", "benefit"],
};

function url(nextScreen, extra = {}) {
    const params = new URLSearchParams({ screen: nextScreen, ...extra });
    return `./?${params.toString()}`;
}

const detailIdKeys = {
    "operator-detail": "operatorApplicationId",
    "content-review": "contentId",
    "content-detail": "contentId",
    "revision-detail": "revisionId",
    "published-detail": "contentId",
    "withdrawal-detail": "withdrawalRequestId",
    "session-detail": "sessionId",
    "session-revision-detail": "sessionRevisionId",
    "qr-detail": "exceptionId",
    "stampbook-detail": "stampbookId",
    "mission-detail": "missionId",
};

function targetUrl(nextScreen, targetId, extra = {}) {
    const idKey = detailIdKeys[nextScreen];
    return url(nextScreen, idKey ? { [idKey]: targetId, ...extra } : extra);
}

function currentContext(extra = {}) {
    const context = {};
    query.forEach((value, key) => {
        if (!["screen", "modal", "state", "code", "action", "processedId"].includes(key)) {
            context[key] = value;
        }
    });
    return { ...context, ...extra };
}

function contextUrl(nextScreen, extra = {}) {
    return url(nextScreen, currentContext(extra));
}

function selectByQuery(items, parameterName, idSelector, fallback) {
    const requestedId = query.get(parameterName);
    if (!requestedId) return fallback;
    return items.find(item => String(idSelector(item)) === requestedId) || null;
}

function notFoundDetail(backTarget) {
    return shell(`<div class="empty-state"><div><div class="empty-icon">?</div><h3>대상을 찾을 수 없습니다.</h3><p>목 목록에 없는 식별자이거나 현재 접근할 수 없는 대상입니다.</p><div style="margin-top:16px"><a class="btn" href="${url(backTarget)}">상위 화면으로</a></div></div></div>`);
}

function statusForView(defaultStatus, statusByView) {
    return statusByView[viewState] || defaultStatus;
}

function canRenderModal(currentScreen, actionName) {
    const actionsByScreen = {
        "operator-detail": ["approve", "reject"],
        "content-review": ["delete"],
        "content-detail": ["approve", "reject", "delete"],
        "revision-detail": ["approve", "reject"],
        "published-detail": ["suspend", "end"],
        "withdrawal-detail": ["approve", "reject"],
        "session-detail": ["approve", "reject"],
        "session-revision-detail": ["approve", "reject"],
        "stampbook-detail": ["approve", "reject"],
        "mission-detail": ["approve", "reject"],
    };
    if (!actionsByScreen[currentScreen]?.includes(actionName)) return false;
    if (["approved", "rejected", "deleted", "suspended", "ended", "action-success", "conflict"].includes(viewState)) {
        return false;
    }

    const targetExistsByScreen = {
        "operator-detail": () => Boolean(selectedOperatorDetail()),
        "content-review": () => {
            const requestedContentId = query.get("contentId");
            return !requestedContentId || mock.contents.some(item => item.contentId === requestedContentId && item.status === contentStatus);
        },
        "content-detail": () => Boolean(selectedContentDetail()),
        "revision-detail": () => Boolean(selectedRevisionDetail()),
        "published-detail": () => Boolean(selectedPublicDetail()),
        "withdrawal-detail": () => Boolean(selectedWithdrawalDetail()),
        "session-detail": () => Boolean(selectedSessionDetail()),
        "session-revision-detail": () => Boolean(selectedSessionRevisionDetail()),
        "stampbook-detail": () => Boolean(selectedStampbookDetail()),
        "mission-detail": () => Boolean(selectedMissionDetail()),
    };
    return targetExistsByScreen[currentScreen]();
}

function selectedTargetId(currentScreen) {
    const selectorsByScreen = {
        "operator-detail": () => selectedOperatorDetail()?.operatorApplicationId,
        "content-review": () => query.get("contentId"),
        "content-detail": () => selectedContentDetail()?.contentId,
        "revision-detail": () => selectedRevisionDetail()?.revisionId,
        "published-detail": () => selectedPublicDetail()?.contentId,
        "withdrawal-detail": () => selectedWithdrawalDetail()?.withdrawalRequestId,
        "session-detail": () => selectedSessionDetail()?.sessionId,
        "session-revision-detail": () => selectedSessionRevisionDetail()?.revisionId,
        "stampbook-detail": () => selectedStampbookDetail()?.stampbookId,
        "mission-detail": () => selectedMissionDetail()?.missionId,
    };
    return selectorsByScreen[currentScreen]?.() || null;
}

function resultListUrl(nextScreen, extra = {}) {
    const action = query.get("action");
    const processedId = query.get("processedId");
    const listContext = {};
    ["status", "size", "reservationAvailable"].forEach(key => {
        if (query.has(key)) listContext[key] = query.get(key);
    });
    const context = { ...listContext, ...extra };
    return url(nextScreen, action && processedId ? { ...context, action, processedId } : context);
}

function formatDate(value) {
    if (!value) return "—";
    return value.replace("T", " ").replace("Z", " UTC").replace("+09:00", "");
}

function formatMoney(value) {
    return `${Number(value).toLocaleString("ko-KR")}원`;
}

const missionStatusLabels = {
    DRAFT: "작성 중",
    PENDING_REVIEW: "심사 대기",
    PUBLISHED: "공개 중",
    ENDED: "종료",
};

const contentTypeLabels = {
    EVENT_EXPERIENCE: "행사·체험",
};

const couponIssuanceTypeLabels = {
    STAMPBOOK_COMPLETION: "스탬프북 완료",
};

const missionConditionTypeLabels = {
    CONTENT_SET: "콘텐츠 묶음",
};

const missionHistoryActionLabels = {
    CREATED: "생성",
    UPDATED: "수정",
    SUBMITTED: "심사 요청",
    APPROVED: "승인",
    REJECTED: "반려",
};

const missionHistoryReasonLabels = {
    MISSION_CREATED: "미션 생성",
    MISSION_UPDATED: "미션 수정",
    MISSION_SUBMITTED: "미션 심사 요청",
    MISSION_APPROVED: "미션 승인",
    MISSION_REJECTED: "미션 반려",
};

const operationResultLabels = {
    SUCCESS: "성공",
    FAILURE: "실패",
};

const auditActorKindLabels = {
    USER: "사용자",
};

const qrExceptionTypeLabels = {
    QR_CHECK_IN_FAILURE: "QR 체크인 실패",
    MANUAL_CHECK_IN: "수동 체크인",
    RESERVATION_NUMBER_LOOKUP: "예약번호 조회",
};

const qrReasonCodeLabels = {
    QR_CHECK_IN_SIGNATURE_INVALID: "QR 체크인 서명 검증 실패",
    MANUAL_CHECK_IN_QR_SCAN_FAILED_SUCCESS: "QR 스캔 실패 후 수동 체크인 성공",
    QR_VERIFICATION_FAILED: "QR 검증 실패",
};

function displayLabel(labels, value) {
    return labels[value] || value;
}

function selectedOperatorDetail() {
    const selected = selectByQuery(
        mock.operatorRequests.operatorRequests,
        "operatorApplicationId",
        item => item.operatorApplicationId,
        mock.operatorDetail
    );
    if (!selected) return null;
    if (selected.operatorApplicationId === mock.operatorDetail.operatorApplicationId) return mock.operatorDetail;
    return {
        ...mock.operatorDetail,
        ...selected,
        businessInformation: `상호: 신청 사업자 ${selected.applicantUserId}\n사업자등록번호: 123-45-${selected.applicantUserId.slice(-4)}\n업종: 지역 체험 및 교육\n대표자: 신청자 ${selected.applicantUserId}`,
        updatedAt: selected.requestedAt,
    };
}

function selectedContentDetail() {
    const selected = selectByQuery(mock.contents, "contentId", item => item.contentId, mock.contentDetail);
    if (!selected) return null;
    if (selected.contentId === mock.contentDetail.contentId) return mock.contentDetail;
    return {
        ...mock.contentDetail,
        ...selected,
        operatorId: selected.operator.operatorId,
        description: `${selected.title}의 운영 정보와 최초 회차를 확인하기 위한 목 상세입니다.`,
        locationText: `${regionAdminAssignment.regionName} 내 운영자 등록 장소`,
        sessions: mock.contentDetail.sessions.map((session, index) => ({
            ...session,
            sessionId: `${selected.contentId}${index + 1}`,
        })),
    };
}

function selectedRevisionDetail() {
    const selected = selectByQuery(
        mock.revisions.revisions,
        "revisionId",
        item => item.revisionId,
        mock.revisionDetail
    );
    if (!selected) return null;
    if (selected.revisionId === mock.revisionDetail.revisionId) return mock.revisionDetail;
    return {
        ...mock.revisionDetail,
        ...selected,
        description: `${selected.title}의 수정 후보 표시 정보입니다.`,
        locationText: `${regionAdminAssignment.regionName} 내 수정 후보 장소`,
    };
}

function selectedPublicDetail() {
    const selected = selectByQuery(
        mock.publicContents.contents,
        "contentId",
        item => item.contentId,
        mock.publicDetail
    );
    if (!selected) return null;
    if (selected.contentId === mock.publicDetail.contentId) return mock.publicDetail;
    return {
        ...mock.publicDetail,
        ...selected,
        description: `${selected.title}의 현재 공개 운영 정보입니다.`,
        operatingHoursText: "운영자 등록 운영 시간",
        contactText: "055-***-0000",
    };
}

function selectedWithdrawalDetail() {
    const selected = selectByQuery(
        mock.withdrawals.withdrawalRequests,
        "withdrawalRequestId",
        item => item.withdrawalRequestId,
        mock.withdrawalDetail
    );
    if (!selected) return null;
    if (selected.withdrawalRequestId === mock.withdrawalDetail.withdrawalRequestId) return mock.withdrawalDetail;
    return {
        ...mock.withdrawalDetail,
        withdrawalRequestId: selected.withdrawalRequestId,
        requester: selected.requester,
        requestedAt: selected.requestedAt,
        requestReason: "운영 사정 변경으로 전체 콘텐츠 철회를 요청했습니다.",
        content: {
            ...mock.withdrawalDetail.content,
            contentId: selected.contentId,
            contentType: selected.contentType,
            title: selected.contentTitle,
            status: selected.contentStatus,
        },
    };
}

function selectedSessionDetail() {
    const selected = selectByQuery(mock.sessions.sessions, "sessionId", item => item.sessionId, mock.sessionDetail);
    if (!selected) return null;
    if (selected.sessionId === mock.sessionDetail.sessionId) return mock.sessionDetail;
    return { ...mock.sessionDetail, ...selected, remainingCapacity: selected.capacity };
}

function selectedSessionRevisionDetail() {
    const selected = selectByQuery(
        mock.sessionRevisions.revisions,
        "sessionRevisionId",
        item => item.revisionId,
        mock.sessionRevisionDetail
    );
    if (!selected) return null;
    if (selected.revisionId === mock.sessionRevisionDetail.revisionId) return mock.sessionRevisionDetail;
    return {
        ...mock.sessionRevisionDetail,
        revisionId: selected.revisionId,
        contentId: selected.contentId,
        contentTitle: selected.contentTitle,
        baseSessionVersion: selected.baseSessionVersion,
        submittedAt: selected.submittedAt,
        operator: selected.operator,
        targetSession: {
            ...mock.sessionRevisionDetail.targetSession,
            sessionId: selected.targetSessionId,
            version: selected.baseSessionVersion,
        },
        candidate: {
            startsAt: selected.startsAt,
            endsAt: selected.endsAt,
            checkinOpenAt: selected.checkinOpenAt,
            checkinCloseAt: selected.checkinCloseAt,
            capacity: selected.capacity,
        },
    };
}

function selectedQrDetail() {
    const exceptions = [
        ...mock.qrExceptions.exceptions,
        ...mock.qrExceptionsNextPage.exceptions,
    ];
    const selected = selectByQuery(exceptions, "exceptionId", item => item.exceptionId, mock.qrDetail);
    if (!selected) return null;
    if (selected.exceptionId === mock.qrDetail.exceptionId) return mock.qrDetail;
    const reservation = selected.reservationResolved
        ? {
            ...mock.qrDetail.reservation,
            reservationId: selected.reservationId,
            contentId: selected.contentId,
            contentTitle: mock.publicContents.contents.find(item => item.contentId === selected.contentId)?.title || "연결 콘텐츠",
            sessionId: selected.sessionId,
        }
        : null;
    return { ...selected, reservation };
}

function selectedStampbookDetail() {
    const selected = selectByQuery(
        mock.stampbooks.stampbooks,
        "stampbookId",
        item => item.stampbookId,
        mock.stampbookDetail
    );
    if (!selected) return null;
    if (selected.stampbookId === mock.stampbookDetail.stampbookId) return mock.stampbookDetail;
    const extraContents = [
        { contentId: "1130", regionId: "1", title: "김해 분청도자기 체험", status: "PUBLISHED" },
        { contentId: "1141", regionId: "1", title: "화포천 습지 생태 탐방", status: "PUBLISHED" },
    ];
    return {
        ...mock.stampbookDetail,
        ...selected,
        targetContents: [...mock.stampbookDetail.targetContents, ...extraContents].slice(0, selected.targetCount),
        rewardCouponPolicy: {
            ...mock.stampbookDetail.rewardCouponPolicy,
            couponPolicyId: selected.rewardCouponPolicyId,
        },
        requestReason: `${selected.targetCount}개 지역 콘텐츠를 연결한 스탬프북 공개를 요청합니다.`,
    };
}

function selectedMissionDetail() {
    const selected = selectByQuery(mock.missions.content, "missionId", item => item.missionId, mock.missionDetail);
    if (!selected) return null;
    if (selected.missionId === mock.missionDetail.missionId) return mock.missionDetail;
    return { ...mock.missionDetail, ...selected };
}

function badge(value, label) {
    const map = {
        PENDING: "pending", PENDING_REVIEW: "review", APPROVED: "approved", EDIT_APPROVED: "approved",
        PUBLISHED: "published", SCHEDULED: "scheduled", SUCCESS: "success", CHECKED_IN: "checked",
        REJECTED: "rejected", EDIT_REJECTED: "rejected", FAILURE: "failure", SUSPENDED: "suspended",
        DELETED: "deleted", WITHDRAWN: "deleted", ENDED: "ended", CANCELLED: "cancelled", DRAFT: "neutral",
        INFO: "info", EVENT_EXPERIENCE: "info", PUBLISHED_REVISION: "info", PRE_PUBLIC_REVISION: "review",
    };
    const labels = {
        PENDING: "승인 대기", PENDING_REVIEW: "심사 대기", APPROVED: "승인 완료", PUBLISHED: "공개 중",
        SCHEDULED: "운영 예정", SUCCESS: "성공", FAILURE: "실패", CHECKED_IN: "체크인 완료",
        REJECTED: "반려", EDIT_APPROVED: "수정 승인", EDIT_REJECTED: "수정 반려", DELETED: "삭제", WITHDRAWN: "철회",
        SUSPENDED: "운영 중단", ENDED: "종료", CANCELLED: "취소", DRAFT: "작성 중",
        EVENT_EXPERIENCE: "행사·체험", PUBLISHED_REVISION: "공개 콘텐츠 수정", PRE_PUBLIC_REVISION: "공개 전 수정",
    };
    return `<span class="badge ${map[value] || "neutral"}">${label || labels[value] || value}</span>`;
}

function pageHeader(title, description, actions = "") {
    return `<div class="breadcrumb">지역 관리자 &nbsp;›&nbsp; ${title}</div>
        <div class="page-header">
            <div><h1 class="page-title">${title}</h1><p class="page-description">${description}</p></div>
            ${actions ? `<div class="button-row">${actions}</div>` : ""}
        </div>`;
}

function tabs(active, items) {
    return `<div class="tab-row">${items.map(item => `<a class="tab ${active === item.key ? "active" : ""}" href="${url(item.screen, item.extra || {})}">${item.label}</a>`).join("")}</div>`;
}

function listState(content, emptyMessage, filtered = false, persistentContent = "") {
    if (viewState === "loading") {
        return `<div class="loading-state"><div class="skeletons"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div><h3>목록을 불러오는 중입니다</h3><p>담당 지역의 최신 데이터를 확인하고 있습니다.</p></div></div>`;
    }
    if (viewState === "error") {
        return `<div class="alert"><strong>목록을 불러오지 못했습니다.</strong><span class="mono">INTERNAL_SERVER_ERROR</span> · 잠시 후 다시 시도해 주세요.<div style="margin-top:12px"><button class="btn small" data-retry-state>다시 시도</button></div></div>`;
    }
    if (viewState === "empty" || viewState === "filtered-empty") {
        return `${persistentContent}<div class="empty-state"><div><div class="empty-icon">${filtered ? "⌕" : "✓"}</div><h3>${emptyMessage}</h3><p>${filtered ? "선택한 필터 조건을 확인해 주세요." : "현재 처리할 업무가 없습니다."}</p></div></div>`;
    }
    return content;
}

function detailErrorState(backTarget) {
    return `<div class="alert"><strong>상세 정보를 불러오지 못했습니다.</strong><span class="mono">${detailErrorCode}</span><span> · 현재 상태를 다시 확인한 뒤 재시도하거나 상위 목록으로 이동해 주세요.</span><div style="margin-top:12px"><a class="btn small" href="${url(backTarget)}">상위 목록으로</a></div></div>`;
}

function actionResultBanner() {
    const action = query.get("action");
    const labels = {
        approve: "승인 처리를 목 화면에 반영했습니다.",
        reject: "반려 처리를 목 화면에 반영했습니다.",
        delete: "삭제 처리를 목 화면에 반영했습니다.",
        suspend: "운영 중단 처리를 목 화면에 반영했습니다.",
        end: "정상 종료 처리를 목 화면에 반영했습니다.",
    };
    if (!labels[action]) return "";
    return `<div class="info-banner"><div><strong>처리가 완료되었습니다.</strong><span>${labels[action]} 실제 연결 시 서버 응답을 기준으로 갱신합니다.</span></div>${badge("SUCCESS")}</div>`;
}

function shell(content, meta = screenMeta[screen] || screenMeta.home) {
    const activeKey = meta[2];
    const backTargets = {
        "operator-detail": "operator-list",
        "content-detail": "content-review",
        "revision-detail": "revision-list",
        "published-detail": "published-list",
        "withdrawal-detail": "withdrawal-list",
        "session-detail": "session-list",
        "session-revision-detail": "session-revision-list",
        "qr-detail": "qr-list",
        "stampbook-detail": "stampbook-list",
        "mission-detail": "mission-list",
    };
    const headerAction = backTargets[screen] ? `<a class="btn" href="${resultListUrl(backTargets[screen])}">← 목록으로</a>` : "";
    if (viewState === "forbidden") {
        content = `<div class="empty-state"><div><div class="empty-icon">!</div><h3>접근할 수 없는 화면입니다.</h3><p>담당 지역 또는 활성 지역 관리자 권한을 확인해 주세요.</p><div style="margin-top:16px"><a class="btn" href="${url("home")}">운영 홈으로</a></div></div></div>`;
    } else if (viewState === "not-found") {
        content = `<div class="empty-state"><div><div class="empty-icon">?</div><h3>대상을 찾을 수 없습니다.</h3><p>삭제되었거나 현재 접근할 수 없는 대상입니다.</p><div style="margin-top:16px"><a class="btn" href="${url(backTargets[screen] || "home")}">상위 화면으로</a></div></div></div>`;
    } else if (viewState === "detail-loading") {
        content = `<div class="loading-state"><div class="skeletons"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div><h3>상세 정보를 불러오는 중입니다</h3><p>현재 상태와 담당 지역 권한을 확인하고 있습니다.</p></div></div>`;
    } else if (viewState === "detail-error") {
        content = detailErrorState(backTargets[screen] || "home");
    } else if (viewState === "conflict") {
        content = `<div class="alert warning-alert"><strong>다른 처리로 현재 상태가 변경되었습니다.</strong><span>입력한 내용은 유지한 채 상세 정보를 다시 조회해 현재 상태를 확인해 주세요.</span><div style="margin-top:12px"><button class="btn small" data-retry-state>현재 상태 다시 조회</button></div></div>${content}`;
    }
    content = `${actionResultBanner()}${content}`;
    const groups = ["공통", "P0 운영", "P1 혜택"];
    const sidebar = groups.map(group => `<div class="nav-section"><p class="nav-label">${group}</p>${nav.filter(item => item.group === group).map(item => `<a class="nav-link ${item.key === activeKey ? "active" : ""}" href="${url(item.screen)}"><span class="nav-icon">${item.icon}</span>${item.label}</a>`).join("")}</div>`).join("");
    return `<div class="app-shell">
        <header class="topbar">
            <div class="brand-row"><span class="brand-mark">S</span><span class="brand-name">Local Stamp</span><span class="role-chip">지역 관리자 콘솔</span></div>
            <div class="account-row"><div class="region-context"><small>담당 지역 · 지역 ID ${regionAdminAssignment.regionId}</small><strong>${regionAdminAssignment.regionName}</strong></div><span class="avatar">관</span><div class="account-context"><strong>사용자 ${mock.me.userId}</strong><small>지역 관리자</small></div><button class="btn small" data-mock-logout>로그아웃</button></div>
        </header>
        <aside class="sidebar">${sidebar}<div class="sidebar-note"><strong>${regionAdminAssignment.regionName}</strong>서버에 등록된 담당 지역 기준으로 모든 관리 업무가 제한됩니다.</div></aside>
        <main class="main"><div class="main-inner">${pageHeader(meta[0], meta[1], headerAction)}${content}</div></main>
        ${modalName && canRenderModal(screen, modalName) ? modalFor(screen, modalName) : ""}
    </div>`;
}

function loginScreen() {
    const loginError = viewState === "error" ? `<div class="alert login-alert"><strong>로그인하지 못했습니다.</strong><span>이메일 또는 비밀번호를 확인해 주세요.</span></div>` : "";
    const passwordValue = "wireframe";
    return `<div class="login-page">
        <section class="login-visual">
            <div class="brand-row"><span class="brand-mark">S</span><span class="brand-name">Local Stamp</span></div>
            <div class="login-copy"><span class="role-chip">지역 관리자 콘솔</span><h1>지역의 좋은 경험이<br>안전하게 이어지도록.</h1><p>운영자 신청, 콘텐츠와 회차, QR 예외와 지역 혜택을 담당 지역 기준으로 검토합니다.</p></div>
            <small class="muted">Local Stamp · Regional Operations</small>
        </section>
        <section class="login-form-wrap"><form class="login-card"><h2>관리자 로그인</h2><p>승인된 지역 관리자 계정으로 로그인해 주세요.</p>${loginError}<div class="field"><label>이메일</label><input class="control" value="region.admin@gimhae.local" aria-label="이메일"></div><div class="field"><label>비밀번호</label><input class="control" type="password" value="${passwordValue}" aria-label="비밀번호"></div><button class="btn primary" id="mock-login" type="button">로그인</button><div class="mock-note">정적 와이어프레임 화면입니다. 인증 요청과 폼 제출은 실행되지 않습니다.</div></form></section>
    </div>`;
}

function roleAccessDeniedScreen() {
    return `<div class="login-page">
        <section class="login-visual">
            <div class="brand-row"><span class="brand-mark">S</span><span class="brand-name">Local Stamp</span></div>
            <div class="login-copy"><span class="role-chip">지역 관리자 콘솔</span><h1>지역 관리자 권한을<br>확인할 수 없습니다.</h1><p>활성 지역 관리자 역할과 담당 지역이 확인된 계정만 접근할 수 있습니다.</p></div>
            <small class="muted">Local Stamp · Regional Operations</small>
        </section>
        <section class="login-form-wrap"><div class="login-card"><h2>접근할 수 없습니다</h2><p>계정의 역할 배정 상태를 확인한 뒤 다시 로그인해 주세요.</p><a class="btn primary" href="${url("login")}">로그인 화면으로</a></div></section>
    </div>`;
}

function homeScreen() {
    const cards = [
        ["운영자 신청", "사업자 정보와 요청 지역을 확인합니다.", "operator-list", "◉"],
        ["콘텐츠 관리", "콘텐츠 심사와 운영 상태를 관리합니다.", "content-review", "▤"],
        ["회차 관리", "추가 회차와 변경안을 검토합니다.", "session-list", "◫"],
        ["QR 예외", "QR 실패와 보조 처리 기록을 조회합니다.", "qr-list", "⌗"],
        ["스탬프북 심사", "대상 콘텐츠와 보상 정책을 검토합니다.", "stampbook-list", "◇"],
        ["미션 심사", "지역 미션 조건과 이력을 확인합니다.", "mission-list", "◎"],
    ];
    const assignment = regionAdminAssignment;
    return shell(`<div class="info-banner account-banner"><div><strong>${assignment.regionName} 담당 지역 관리자</strong><span>사용자 ID ${mock.me.userId} · 지역 관리자 · 지역 ID ${assignment.regionId}</span></div><div class="button-row">${badge("APPROVED", "활성 역할")}<button class="btn small" data-mock-logout>로그아웃</button></div></div><div class="grid cols-3">${cards.map(([title, desc, target, icon]) => `<a class="card task-card" href="${url(target)}"><span class="task-icon">${icon}</span><h2 class="card-title">${title}</h2><p>${desc}</p><span class="inline-link">업무로 이동 →</span></a>`).join("")}</div>`);
}

function operatorList() {
    const processedId = query.get("action") ? query.get("processedId") : null;
    const rows = mock.operatorRequests.operatorRequests.filter(item => item.operatorApplicationId !== processedId).map(item => `<tr><td class="mono">${item.operatorApplicationId}</td><td class="mono">${item.applicantUserId}</td><td>김해시 <span class="cell-sub">지역 ID ${item.requestedRegionId}</span></td><td class="nowrap">${formatDate(item.requestedAt)}</td><td>${badge("PENDING")}</td><td class="right"><a class="btn small" href="${targetUrl("operator-detail", item.operatorApplicationId)}">상세 보기</a></td></tr>`).join("");
    const table = `<div class="filter-bar"><div><strong>승인 대기</strong><span class="cell-sub">승인 대기 상태 고정</span></div><span class="helper">신청 시각 오래된 순 · 정렬 고정</span></div><div class="table-wrap"><table><thead><tr><th>신청 ID</th><th>신청자 ID</th><th>요청 지역</th><th>신청 시각</th><th>상태</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
    return shell(listState(table, "승인 대기 중인 운영자 신청이 없습니다."));
}

function kv(items) {
    return `<dl class="kv-grid">${items.map(([label, value, full]) => `<div class="kv ${full ? "full" : ""}"><dt>${label}</dt><dd>${value ?? "—"}</dd></div>`).join("")}</dl>`;
}

function actionAside(status, actions, note, statusLabel) {
    return `<aside class="detail-aside"><section class="card action-card"><div class="status-line" style="justify-content:space-between"><h2 class="card-title">처리 상태</h2>${badge(status, statusLabel)}</div><p>${note}</p>${actions}</section></aside>`;
}

function operatorDetail() {
    const d = selectedOperatorDetail();
    if (!d) return notFoundDetail("operator-list");
    const applicantWithdrawn = viewState === "applicant-withdrawn";
    const statusByState = {
        approved: "APPROVED",
        rejected: "REJECTED",
        cancelled: "CANCELLED",
        "applicant-withdrawn": "CANCELLED",
    };
    const status = statusByState[viewState] || d.status;
    const applicantUserId = applicantWithdrawn ? null : d.applicantUserId;
    const rejectedReason = status === "REJECTED" ? "사업자 정보의 등록 내용과 제출 정보가 일치하지 않습니다." : d.rejectedReason;
    const inspectedUserId = status === "APPROVED" || status === "REJECTED" ? mock.me.userId : d.inspectedUserId;
    const businessInformation = !applicantWithdrawn && d.businessInformation
        ? `<div class="warning-box">담당 지역의 승인 심사 목적으로만 확인합니다. 화면 밖으로 복사하거나 로그에 기록하지 않습니다.</div><p style="white-space:pre-line;margin:0;font-weight:650">${d.businessInformation}</p>`
        : `<div class="empty-inline">신청자 탈퇴로 사업자 정보를 확인할 수 없습니다.</div>`;
    const actions = status === "PENDING" ? `<a class="btn admin" href="${contextUrl("operator-detail", { modal: "approve" })}">승인</a><a class="btn danger" href="${contextUrl("operator-detail", { modal: "reject" })}">반려</a>` : `<a class="btn" href="${resultListUrl("operator-list")}">목록으로</a>`;
    const note = status === "PENDING" ? "사업자 정보와 요청 지역을 확인한 뒤 처리해 주세요." : "종결된 신청은 읽기 전용으로 확인합니다.";
    const main = `<div class="detail-layout"><div class="detail-main"><section class="panel"><div class="panel-header"><h2 class="section-title">신청 정보</h2>${badge(status)}</div><div class="panel-body">${kv([["신청 ID", d.operatorApplicationId], ["신청자 ID", applicantUserId], ["요청 지역", `김해시 · ${d.requestedRegionId}`], ["신청 시각", formatDate(d.requestedAt)], ["마지막 변경", formatDate(d.updatedAt)], ["처리자 ID", inspectedUserId], ["반려 사유", rejectedReason, true]])}</div></section><section class="panel"><div class="panel-header"><h2 class="section-title">사업자 정보 원문</h2><span class="badge info">보호 정보</span></div><div class="panel-body">${businessInformation}</div></section></div>${actionAside(status, actions, note)}</div>`;
    return shell(main);
}

const contentTabs = active => tabs(active, [
    { key: "review", label: "콘텐츠 심사", screen: "content-review" },
    { key: "revisions", label: "수정본 심사", screen: "revision-list" },
    { key: "published", label: "공개 콘텐츠 운영", screen: "published-list" },
    { key: "withdrawals", label: "전체 철회 요청", screen: "withdrawal-list" },
]);

function contentReviewList() {
    const processedId = query.get("action") ? query.get("processedId") : null;
    const data = mock.contents.filter(item => item.status === contentStatus && item.contentId !== processedId);
    const rows = data.map(item => `<tr><td><div class="thumb"></div></td><td><span class="cell-title">${item.title}</span><span class="cell-sub mono">콘텐츠 ${item.contentId}</span></td><td>${badge(item.contentType)}</td><td><span class="cell-title">${item.operator.name}</span><span class="cell-sub mono">${item.operator.operatorId}</span></td><td class="nowrap">${formatDate(item.publishAt)}</td><td class="nowrap">${formatDate(contentStatus === "PENDING" ? item.submittedAt : item.approvedAt)}</td><td>${badge(item.status)}</td><td class="right"><div class="button-row content-actions">${contentStatus === "PENDING" ? `<a class="btn small" href="${targetUrl("content-detail", item.contentId)}">상세</a>` : ""}<a class="btn small compact danger" href="${targetUrl("content-review", item.contentId, { status: contentStatus, modal: "delete" })}">삭제</a></div></td></tr>`).join("");
    const empty = contentStatus === "PENDING" ? "승인 대기 콘텐츠가 없습니다." : "공개 전 삭제 가능한 승인 콘텐츠가 없습니다.";
    const body = `${contentTabs("review")}<div class="filter-bar"><div class="filter-row"><a class="btn small ${contentStatus === "PENDING" ? "admin" : ""}" href="${url("content-review", { status: "PENDING" })}">승인 대기</a><a class="btn small ${contentStatus === "APPROVED" ? "admin" : ""}" href="${url("content-review", { status: "APPROVED" })}">공개 전 삭제</a></div><span class="helper">${contentStatus === "PENDING" ? "제출 시각" : "공개 예정 시각"} 오래된 순 · 정렬 고정</span></div><div class="table-wrap"><table><thead><tr><th>이미지</th><th>콘텐츠</th><th>유형</th><th>운영자</th><th>공개 예정</th><th>${contentStatus === "PENDING" ? "제출 시각" : "승인 시각"}</th><th>상태</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
    return shell(listState(body, empty));
}

function contentDetail() {
    const d = selectedContentDetail();
    if (!d) return notFoundDetail("content-review");
    const status = statusForView(d.status, {
        approved: "APPROVED",
        rejected: "REJECTED",
        deleted: "DELETED",
    });
    const fields = [["콘텐츠 ID", d.contentId], ["지역 ID", d.regionId], ["운영자 ID", d.operatorId], ["유형", badge(d.contentType)], ["제목", d.title, true], ["소개", d.description, true], ["대표 이미지 만료 시각", formatDate(d.representativeImageUrlExpiresAt), true], ["위치", d.locationText], ["운영 시간", d.operatingHoursText], ["연락처", d.contactText], ["연령 조건", d.ageRequirement], ["준비물", d.materials], ["예약 가격", formatMoney(d.reservationPrice)], ["공개 예정", formatDate(d.publishAt)], ["취소 정책", d.cancellationPolicyText, true], ["유의사항", d.precautions, true]];
    const sessions = d.sessions.map(session => {
        const sessionStatus = viewState === "approved" ? "SCHEDULED" : session.status;
        return `<tr><td class="mono">${session.sessionId}</td><td>${badge(sessionStatus)}</td><td>${formatDate(session.startsAt)}</td><td>${formatDate(session.endsAt)}</td><td>${formatDate(session.checkinOpenAt)}<span class="cell-sub">~ ${formatDate(session.checkinCloseAt)}</span></td><td>${session.capacity}명</td><td>${session.remainingCapacity}명</td></tr>`;
    }).join("");
    const selectedDefaultContent = d.contentId === mock.contentHistory.contentId;
    let contentHistories = viewState === "history-empty"
        ? []
        : selectedDefaultContent
            ? mock.contentHistory.histories
            : [{ status: d.status, reason: null, processedAt: d.submittedAt, actor: { userId: d.operatorId, displayName: d.operator.name } }];
    if (["approved", "rejected", "deleted"].includes(viewState)) {
        contentHistories = [...contentHistories, {
            status,
            reason: viewState === "approved" ? null : "지역 관리자 목 처리 결과입니다.",
            processedAt: "2026-08-18T10:00:00Z",
            actor: { userId: mock.me.userId, displayName: `${regionAdminAssignment.regionName} 지역 관리자` },
        }];
    }
    const history = contentHistories.length ? contentHistories.map(h => `<div class="timeline-item"><span class="timeline-dot"></span><div class="timeline-content"><strong>${badge(h.status)} ${h.reason || "상태가 변경되었습니다."}</strong><span>${formatDate(h.processedAt)} · ${h.actor?.displayName || "시스템"}${h.actor?.userId ? ` (${h.actor.userId})` : ""}</span></div></div>`).join("") : `<div class="empty-inline">표시할 콘텐츠 상태 이력이 없습니다.</div>`;
    const actions = status === "PENDING"
        ? `<a class="btn admin" href="${contextUrl("content-detail", { modal: "approve" })}">승인</a><a class="btn danger" href="${contextUrl("content-detail", { modal: "reject" })}">반려</a><a class="btn" href="${contextUrl("content-detail", { modal: "delete" })}">삭제</a>`
        : `<a class="btn" href="${resultListUrl("content-review", { status: "PENDING" })}">목록으로</a>`;
    const main = `<div class="detail-layout"><div class="detail-main"><section class="panel"><div class="panel-header"><h2 class="section-title">콘텐츠 정보</h2>${badge(status)}</div><div class="panel-body"><div class="image-placeholder">대표 이미지 · 단기 조회 URL</div>${kv(fields)}</div></section><section class="panel"><div class="panel-header"><h2 class="section-title">최초 회차</h2><span class="helper">승인 시 함께 운영 예정으로 전환</span></div><div class="table-wrap" style="border:0;border-radius:0"><table><thead><tr><th>회차 ID</th><th>상태</th><th>시작</th><th>종료</th><th>체크인 창</th><th>정원</th><th>잔여 정원</th></tr></thead><tbody>${sessions}</tbody></table></div></section><section class="panel"><div class="panel-header"><h2 class="section-title">상태 이력</h2><span class="helper">전체 이력</span></div><div class="panel-body timeline">${history}</div></section></div>${actionAside(status, actions, status === "PENDING" ? "전체 콘텐츠 정보와 최초 회차를 확인해 주세요." : "처리된 콘텐츠는 읽기 전용으로 확인합니다.")}</div>`;
    return shell(main);
}

function revisionList() {
    const processedId = query.get("action") ? query.get("processedId") : null;
    const rows = mock.revisions.revisions.filter(item => item.revisionId !== processedId).map(item => `<tr><td><div class="thumb"></div></td><td><span class="cell-title">${item.title}</span><span class="cell-sub mono">수정본 ${item.revisionId} · 원본 ${item.contentId}</span></td><td>${badge(item.reviewType)}</td><td>${badge(item.contentStatus)}</td><td>${formatDate(item.candidatePublishAt)}</td><td><span class="cell-title">${item.operator.name}</span><span class="cell-sub mono">${item.operator.operatorId}</span></td><td>${formatDate(item.submittedAt)}</td><td class="right"><a class="btn small" href="${targetUrl("revision-detail", item.revisionId)}">상세</a></td></tr>`).join("");
    const body = `${contentTabs("revisions")}<div class="filter-bar"><div><strong>수정본 심사 대기</strong><span class="cell-sub">수정 요청 상태 고정</span></div><span class="helper">제출 시각 오래된 순 · 정렬 고정</span></div><div class="table-wrap"><table><thead><tr><th>이미지</th><th>수정 후보</th><th>검토 유형</th><th>원본 상태</th><th>후보 공개</th><th>운영자</th><th>제출 시각</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
    return shell(listState(body, "심사 대기 중인 콘텐츠 수정본이 없습니다."));
}

function revisionDetail() {
    const d = selectedRevisionDetail();
    if (!d) return notFoundDetail("revision-list");
    const status = statusForView("PENDING", {
        approved: "EDIT_APPROVED",
        rejected: "EDIT_REJECTED",
    });
    const fields = [["수정본 ID", d.revisionId], ["원본 콘텐츠 ID", d.contentId], ["검토 유형", badge(d.reviewType)], ["원본 상태", badge(d.contentStatus)], ["후보 제목", d.title, true], ["후보 소개", d.description, true], ["대표 이미지 만료 시각", formatDate(d.representativeImageUrlExpiresAt), true], ["위치", d.locationText], ["운영 시간", d.operatingHoursText], ["연락처", d.contactText], ["연령 조건", d.ageRequirement], ["준비물", d.materials], ["예약 가격", formatMoney(d.reservationPrice)], ["후보 공개 시각", formatDate(d.candidatePublishAt)], ["취소 정책", d.cancellationPolicyText, true], ["유의사항", d.precautions, true], ["제출 시각", formatDate(d.submittedAt)]];
    const currentSessions = d.sessions.map(s => `<tr><td class="mono">${s.sessionId}</td><td>${badge(s.status)}</td><td>${formatDate(s.startsAt)}<span class="cell-sub">~ ${formatDate(s.endsAt)}</span></td><td>${formatDate(s.checkinOpenAt)}<span class="cell-sub">~ ${formatDate(s.checkinCloseAt)}</span></td><td>${s.capacity}명</td><td>${s.remainingCapacity}명</td></tr>`).join("");
    const actions = status === "PENDING"
        ? `<a class="btn admin" href="${contextUrl("revision-detail", { modal: "approve" })}">수정본 승인</a><a class="btn danger" href="${contextUrl("revision-detail", { modal: "reject" })}">수정본 반려</a>`
        : `<a class="btn" href="${resultListUrl("revision-list")}">목록으로</a>`;
    const main = `<div class="detail-layout"><div class="detail-main"><section class="panel"><div class="panel-header"><h2 class="section-title">수정 후보 정보</h2>${badge(status, status === "PENDING" ? "수정 심사 대기" : undefined)}</div><div class="panel-body"><div class="image-placeholder">후보 대표 이미지 · 단기 조회 URL</div>${kv(fields)}</div></section><section class="panel"><div class="panel-header"><div><h2 class="section-title">현재 원본 회차</h2><span class="helper">수정본 승인으로 회차·체크인 창·정원은 변경되지 않습니다.</span></div></div><div class="table-wrap" style="border:0;border-radius:0"><table><thead><tr><th>회차 ID</th><th>상태</th><th>일정</th><th>체크인 창</th><th>정원</th><th>잔여 정원</th></tr></thead><tbody>${currentSessions}</tbody></table></div></section></div>${actionAside(status, actions, status === "PENDING" ? "승인된 후보 필드만 원본에 반영됩니다." : "처리된 수정본은 읽기 전용으로 확인합니다.")}</div>`;
    return shell(main);
}

function publishedList() {
    const processedId = query.get("action") ? query.get("processedId") : null;
    const requestedReservationFilter = query.get("reservationAvailable");
    const reservationFilter = ["true", "false"].includes(requestedReservationFilter)
        ? requestedReservationFilter
        : "ALL";
    const contents = (reservationFilter === "ALL"
        ? mock.publicContents.contents
        : mock.publicContents.contents.filter(item => String(item.reservationAvailable) === reservationFilter))
        .filter(item => item.contentId !== processedId);
    const detailFilter = reservationFilter === "ALL" ? {} : { reservationAvailable: reservationFilter };
    const rows = contents.map(item => `<tr><td><div class="thumb"></div></td><td><span class="cell-title">${item.title}</span><span class="cell-sub mono">${item.contentId}</span></td><td>${badge(item.contentType)}</td><td>${item.locationText}</td><td>${item.reservationAvailable ? badge("APPROVED", "예약 가능") : badge("ENDED", "예약 불가")}</td><td>${badge("PUBLISHED")}</td><td class="right"><a class="btn small" href="${targetUrl("published-detail", item.contentId, detailFilter)}">상세</a></td></tr>`).join("");
    const filters = `<div class="filter-bar"><div class="filter-row"><div class="field"><label for="published-content-type-filter">콘텐츠 유형</label><select class="control" id="published-content-type-filter"><option value="EVENT_EXPERIENCE">행사·체험</option></select></div><div class="field"><label for="published-reservation-filter">예약 가능 여부</label><select class="control" id="published-reservation-filter"><option value="ALL"${reservationFilter === "ALL" ? " selected" : ""}>전체</option><option value="true"${reservationFilter === "true" ? " selected" : ""}>예약 가능</option><option value="false"${reservationFilter === "false" ? " selected" : ""}>예약 불가</option></select></div></div><div class="right"><strong>${regionAdminAssignment.regionName}</strong><span class="cell-sub">담당 지역 ID ${regionAdminAssignment.regionId} · 공개 시각 최신 순</span></div></div>`;
    const persistentContent = `${contentTabs("published")}${filters}`;
    const results = rows
        ? `<div class="table-wrap"><table><thead><tr><th>이미지</th><th>콘텐츠</th><th>유형</th><th>위치</th><th>예약</th><th>상태</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`
        : `<div class="empty-state"><div><div class="empty-icon">⌕</div><h3>선택한 조건의 공개 콘텐츠가 없습니다.</h3><p>선택한 필터 조건을 확인해 주세요.</p></div></div>`;
    const body = `${persistentContent}<div class="info-banner"><div><strong>공개 조회 API를 사용하는 탐색 보조 화면</strong><span>운영 명령 시 서버가 담당 지역 권한을 다시 확인합니다.</span></div>${badge("PUBLISHED")}</div>${results}`;
    return shell(listState(body, "선택한 조건의 공개 콘텐츠가 없습니다.", true, persistentContent));
}

function publishedDetail() {
    const d = selectedPublicDetail();
    if (!d) return notFoundDetail("published-list");
    const status = statusForView("PUBLISHED", { suspended: "SUSPENDED", ended: "ENDED" });
    const actions = status === "PUBLISHED"
        ? `<a class="btn danger" href="${contextUrl("published-detail", { modal: "suspend" })}">운영 중단</a><a class="btn" href="${contextUrl("published-detail", { modal: "end" })}">정상 종료</a>`
        : `<a class="btn" href="${resultListUrl("published-list")}">목록으로</a>`;
    const main = `<div class="detail-layout"><div class="detail-main"><section class="panel"><div class="panel-header"><h2 class="section-title">공개 정보</h2>${badge(status)}</div><div class="panel-body"><div class="image-placeholder">현재 대표 이미지 · 단기 조회 URL</div>${kv([["콘텐츠 ID", d.contentId], ["유형", badge(d.contentType)], ["제목", d.title, true], ["소개", d.description, true], ["위치", d.locationText], ["운영 시간", d.operatingHoursText], ["연락처", d.contactText], ["연령 조건", d.ageRequirement], ["준비물", d.materials], ["취소 정책", d.cancellationPolicyText, true], ["유의사항", d.precautions, true]])}</div></section></div>${actionAside(status, actions, status === "PUBLISHED" ? "정상 종료 조건은 공개 상세만으로 계산하지 않고 서버 검증을 따릅니다." : "처리된 공개 콘텐츠는 읽기 전용으로 확인합니다.")}</div>`;
    return shell(main);
}

function withdrawalList() {
    const processedId = query.get("action") ? query.get("processedId") : null;
    const rows = mock.withdrawals.withdrawalRequests.filter(item => item.withdrawalRequestId !== processedId).map(item => `<tr><td class="mono">${item.withdrawalRequestId}</td><td><span class="cell-title">${item.contentTitle}</span><span class="cell-sub mono">${item.contentId} · ${displayLabel(contentTypeLabels, item.contentType)}</span></td><td>${badge(item.contentStatus)}</td><td>${item.requester ? `<span class="cell-title">${item.requester.name}</span><span class="cell-sub mono">${item.requester.userId}</span>` : `<span class="muted">요청자 연결 없음</span>`}</td><td>${formatDate(item.requestedAt)}</td><td>${badge("PENDING")}</td><td class="right"><a class="btn small" href="${targetUrl("withdrawal-detail", item.withdrawalRequestId)}">상세</a></td></tr>`).join("");
    const body = `${contentTabs("withdrawals")}<div class="filter-bar"><div><strong>전체 철회 심사 대기</strong><span class="cell-sub">승인 대기 상태 고정</span></div><span class="helper">요청 시각 오래된 순 · 정렬 고정</span></div><div class="table-wrap"><table><thead><tr><th>요청 ID</th><th>콘텐츠</th><th>콘텐츠 상태</th><th>요청자</th><th>요청 시각</th><th>요청 상태</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
    return shell(listState(body, "심사 대기 중인 전체 철회 요청이 없습니다."));
}

function withdrawalDetail() {
    const d = selectedWithdrawalDetail();
    if (!d) return notFoundDetail("withdrawal-list");
    const status = statusForView(d.status, { approved: "APPROVED", rejected: "REJECTED" });
    const targetContentStatus = viewState === "approved" ? "WITHDRAWN" : d.content.status;
    const actions = status === "PENDING"
        ? `<a class="btn admin" href="${contextUrl("withdrawal-detail", { modal: "approve" })}">철회 승인</a><a class="btn danger" href="${contextUrl("withdrawal-detail", { modal: "reject" })}">철회 반려</a>`
        : `<a class="btn" href="${resultListUrl("withdrawal-list")}">목록으로</a>`;
    const main = `<div class="detail-layout"><div class="detail-main"><section class="panel"><div class="panel-header"><h2 class="section-title">철회 요청</h2>${badge(status)}</div><div class="panel-body">${kv([["요청 ID", d.withdrawalRequestId], ["요청 시각", formatDate(d.requestedAt)], ["요청자", d.requester?.name || "요청자 연결 없음"], ["요청자 ID", d.requester?.userId], ["요청 사유", d.requestReason, true]])}</div></section><section class="panel"><div class="panel-header"><h2 class="section-title">대상 콘텐츠</h2>${badge(targetContentStatus)}</div><div class="panel-body">${kv([["콘텐츠 ID", d.content.contentId], ["유형", badge(d.content.contentType)], ["제목", d.content.title, true], ["공개 예정", formatDate(d.content.publishAt)]])}</div></section></div>${actionAside(status, actions, status === "PENDING" ? "승인하면 콘텐츠가 철회 상태로 전환됩니다." : "처리된 철회 요청은 읽기 전용으로 확인합니다.")}</div>`;
    return shell(main);
}

const sessionTabs = active => tabs(active, [
    { key: "new", label: "추가 회차 심사", screen: "session-list" },
    { key: "revision", label: "회차 수정 심사", screen: "session-revision-list" },
]);

function sessionList() {
    const processedId = query.get("action") ? query.get("processedId") : null;
    const rows = mock.sessions.sessions.filter(item => item.sessionId !== processedId).map(item => `<tr><td class="mono">${item.sessionId}</td><td><span class="cell-title">${item.contentTitle}</span><span class="cell-sub mono">${item.contentId}</span></td><td>${badge(item.status)}</td><td>${formatDate(item.startsAt)}<span class="cell-sub">~ ${formatDate(item.endsAt)}</span></td><td>${formatDate(item.checkinOpenAt)}<span class="cell-sub">~ ${formatDate(item.checkinCloseAt)}</span></td><td>${item.capacity}명</td><td><span class="cell-title">${item.operator.name}</span><span class="cell-sub mono">${item.operator.operatorId}</span></td><td>${formatDate(item.createdAt)}</td><td class="right"><a class="btn small" href="${targetUrl("session-detail", item.sessionId)}">상세</a></td></tr>`).join("");
    const body = `${sessionTabs("new")}<div class="filter-bar"><div><strong>추가 회차 심사 대기</strong><span class="cell-sub">승인 대기 상태 고정</span></div><span class="helper">생성 시각 오래된 순 · 정렬 고정</span></div><div class="table-wrap"><table><thead><tr><th>회차 ID</th><th>콘텐츠</th><th>상태</th><th>일정</th><th>체크인 창</th><th>정원</th><th>운영자</th><th>생성 시각</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
    return shell(listState(body, "심사 대기 중인 추가 회차가 없습니다."));
}

function sessionDetail() {
    const d = selectedSessionDetail();
    if (!d) return notFoundDetail("session-list");
    const status = statusForView(d.status, { approved: "SCHEDULED", rejected: "REJECTED" });
    const actions = status === "PENDING"
        ? `<a class="btn admin" href="${contextUrl("session-detail", { modal: "approve" })}">회차 승인</a><a class="btn danger" href="${contextUrl("session-detail", { modal: "reject" })}">회차 반려</a>`
        : `<a class="btn" href="${resultListUrl("session-list")}">목록으로</a>`;
    const main = `<div class="detail-layout"><div class="detail-main"><section class="panel"><div class="panel-header"><h2 class="section-title">회차 후보</h2>${badge(status)}</div><div class="panel-body">${kv([["회차 ID", d.sessionId], ["콘텐츠", `${d.contentTitle} · ${d.contentId}`], ["콘텐츠 상태", badge(d.contentStatus)], ["운영자", `${d.operator.name} · ${d.operator.operatorId}`], ["시작", formatDate(d.startsAt)], ["종료", formatDate(d.endsAt)], ["체크인 시작", formatDate(d.checkinOpenAt)], ["체크인 종료", formatDate(d.checkinCloseAt)], ["총정원", `${d.capacity}명`], ["잔여 정원", `${d.remainingCapacity}명`], ["생성 시각", formatDate(d.createdAt)]])}</div></section></div>${actionAside(status, actions, status === "PENDING" ? "승인된 회차는 운영 예정 상태로 전환됩니다." : "처리된 회차 요청은 읽기 전용으로 확인합니다.")}</div>`;
    return shell(main);
}

function sessionRevisionList() {
    const processedId = query.get("action") ? query.get("processedId") : null;
    const rows = mock.sessionRevisions.revisions.filter(item => item.revisionId !== processedId).map(item => `<tr><td class="mono">${item.revisionId}</td><td><span class="cell-title">${item.contentTitle}</span><span class="cell-sub mono">${item.contentId}</span></td><td class="mono">${item.targetSessionId}</td><td>v${item.baseSessionVersion}</td><td>${formatDate(item.startsAt)}<span class="cell-sub">~ ${formatDate(item.endsAt)}</span></td><td>${formatDate(item.checkinOpenAt)}<span class="cell-sub">~ ${formatDate(item.checkinCloseAt)}</span></td><td>${item.capacity}명</td><td>${item.operator.name}</td><td>${formatDate(item.submittedAt)}</td><td class="right"><a class="btn small" href="${targetUrl("session-revision-detail", item.revisionId)}">비교</a></td></tr>`).join("");
    const body = `${sessionTabs("revision")}<div class="filter-bar"><div><strong>회차 수정 심사 대기</strong><span class="cell-sub">심사 대기 상태 고정</span></div><span class="helper">제출 시각 오래된 순 · 정렬 고정</span></div><div class="table-wrap"><table><thead><tr><th>요청 ID</th><th>콘텐츠</th><th>대상 회차</th><th>기준 버전</th><th>후보 일정</th><th>후보 체크인</th><th>후보 정원</th><th>운영자</th><th>제출 시각</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
    return shell(listState(body, "심사 대기 중인 회차 수정 요청이 없습니다."));
}

function compareFields(title, data, candidate = false) {
    return `<section class="compare-card ${candidate ? "candidate" : ""}"><h2 class="card-title">${title}</h2>${kv([["시작", formatDate(data.startsAt), true], ["종료", formatDate(data.endsAt), true], ["체크인 시작", formatDate(data.checkinOpenAt), true], ["체크인 종료", formatDate(data.checkinCloseAt), true], ["정원", `${data.capacity}명`, true]])}</section>`;
}

function sessionRevisionDetail() {
    const d = selectedSessionRevisionDetail();
    if (!d) return notFoundDetail("session-revision-list");
    const status = statusForView("PENDING", { approved: "APPROVED", rejected: "REJECTED" });
    const currentSession = viewState === "approved"
        ? { ...d.targetSession, ...d.candidate, version: d.targetSession.version + 1 }
        : d.targetSession;
    const actions = status === "PENDING"
        ? `<a class="btn admin" href="${contextUrl("session-revision-detail", { modal: "approve" })}">변경 승인</a><a class="btn danger" href="${contextUrl("session-revision-detail", { modal: "reject" })}">변경 반려</a>`
        : `<a class="btn" href="${resultListUrl("session-revision-list")}">목록으로</a>`;
    const main = `<div class="detail-layout"><div class="detail-main"><section class="panel"><div class="panel-header"><h2 class="section-title">수정 요청 정보</h2>${badge(status)}</div><div class="panel-body">${kv([["수정 요청 ID", d.revisionId], ["콘텐츠", `${d.contentTitle} · ${d.contentId}`], ["콘텐츠 상태", badge(d.contentStatus)], ["대상 회차", currentSession.sessionId], ["대상 회차 상태", badge(currentSession.status)], ["현재 버전", `v${currentSession.version}`], ["기준 버전", `v${d.baseSessionVersion}`], ["운영자", `${d.operator.name} · ${d.operator.operatorId}`], ["제출 시각", formatDate(d.submittedAt)]])}</div></section><div class="compare-grid">${compareFields(viewState === "approved" ? "반영된 현재 회차" : "현재 회차", currentSession)}${compareFields("변경 후보", d.candidate, true)}</div></div>${actionAside(status, actions, status === "PENDING" ? "승인 시 버전과 예약·홀드 조건을 다시 검증합니다." : "처리된 회차 수정 요청은 읽기 전용으로 확인합니다.")}</div>`;
    return shell(main);
}

function qrList() {
    const cursor = query.get("cursor");
    const page = cursor || viewState === "cursor-end" ? mock.qrExceptionsNextPage : mock.qrExceptions;
    const hasNext = page.hasNext;
    const rows = page.exceptions.map(item => `<tr><td class="mono">${item.exceptionId}</td><td>${badge("INFO", displayLabel(qrExceptionTypeLabels, item.exceptionType))}</td><td>${badge(item.result)}</td><td>${displayLabel(qrReasonCodeLabels, item.reasonCode)}</td><td>${item.reservationResolved ? badge("SUCCESS", "식별됨") : badge("FAILURE", "미식별")}</td><td>${item.reservationResolved ? `<span class="mono">예약 ${item.reservationId}</span><span class="cell-sub mono">콘텐츠 ${item.contentId} · 회차 ${item.sessionId}</span>` : "—"}</td><td>${formatDate(item.occurredAt)}</td><td class="right"><a class="btn small" href="${targetUrl("qr-detail", item.exceptionId)}">상세</a></td></tr>`).join("");
    const pagination = hasNext
        ? `<a class="btn" id="qr-next-page" href="${url("qr-list", { cursor: page.nextCursor })}">다음 기록 →</a>`
        : `${cursor ? `<a class="btn" href="${url("qr-list")}">첫 기록으로</a>` : ""}<button class="btn" disabled>마지막 기록</button>`;
    const body = `<div class="filter-bar"><div><strong>최근 QR 예외 기록</strong><span class="cell-sub">기본 20건 · 커서 방식</span></div><span class="helper">서버 고정 순서 · 검색/필터 없음</span></div><div class="table-wrap"><table><thead><tr><th>예외 ID</th><th>유형</th><th>결과</th><th>사유 코드</th><th>예약</th><th>연결 대상</th><th>발생 시각</th><th></th></tr></thead><tbody>${rows}</tbody></table></div><div class="pagination">${pagination}</div>`;
    return shell(listState(body, "확인할 QR 예외 기록이 없습니다."));
}

function qrDetail() {
    const d = selectedQrDetail();
    if (!d) return notFoundDetail("qr-list");
    const r = d.reservation;
    const reservationPanel = r ? `<section class="panel"><div class="panel-header"><h2 class="section-title">연결 예약</h2>${badge(r.status)}</div><div class="panel-body">${kv([["예약 ID", r.reservationId], ["예약 번호", `<span class="mono">${r.reservationNo}</span>`], ["콘텐츠", `${r.contentTitle} · ${r.contentId}`, true], ["회차 ID", r.sessionId], ["회차 시작", formatDate(r.startsAt)], ["체크인 창", `${formatDate(r.checkinOpenAt)} ~ ${formatDate(r.checkinCloseAt)}`, true], ["참여자", r.participant.name], ["연락처", r.participant.phone], ["회원 연결", r.participant.memberLinked ? "유지" : "해제"], ["체크인", r.checkIn.checkedIn ? `완료 · ${formatDate(r.checkIn.checkedAt)}` : "미완료"], ["지역 관리자 체크인 가능", r.checkIn.canCheckIn ? "가능" : "불가"]])}</div></section>` : `<div class="empty-state"><div><div class="empty-icon">!</div><h3>안전하게 식별된 예약 정보가 없습니다.</h3><p>미식별 QR 실패 기록입니다.</p></div></div>`;
    return shell(`<div class="detail-layout"><div class="detail-main"><section class="panel"><div class="panel-header"><h2 class="section-title">예외 정보</h2>${badge(d.result)}</div><div class="panel-body">${kv([["예외 ID", d.exceptionId], ["유형", displayLabel(qrExceptionTypeLabels, d.exceptionType)], ["사유", displayLabel(qrReasonCodeLabels, d.reasonCode), true], ["발생 시각", formatDate(d.occurredAt)], ["예약 식별", d.reservationResolved ? "식별됨" : "미식별"]])}</div></section>${reservationPanel}</div>${actionAside("INFO", `<a class="btn" href="${url("qr-list")}">목록으로</a>`, "조회 전용 화면입니다. 체크인 또는 이관 처리 액션은 제공하지 않습니다.", "조회 전용")}</div>`);
}

const benefitTabs = active => tabs(active, [
    { key: "stampbook", label: "스탬프북", screen: "stampbook-list" },
    { key: "mission", label: "미션", screen: "mission-list" },
]);

function stampbookList() {
    const processedId = query.get("action") ? query.get("processedId") : null;
    const rows = mock.stampbooks.stampbooks.filter(item => item.stampbookId !== processedId).map(item => `<tr><td class="mono">${item.stampbookId}</td><td>${badge(item.status)}</td><td>${item.targetCount}개</td><td class="mono">${item.rewardCouponPolicyId}</td><td>${formatDate(item.requestedAt)}</td><td class="right"><a class="btn small" href="${targetUrl("stampbook-detail", item.stampbookId)}">상세</a></td></tr>`).join("");
    const body = `${benefitTabs("stampbook")}<div class="filter-bar"><div><strong>스탬프북 공개 심사</strong><span class="cell-sub">공개 심사 대기 상태 고정</span></div><span class="helper">요청 시각 오래된 순 · 정렬 고정</span></div><div class="table-wrap"><table><thead><tr><th>스탬프북 ID</th><th>상태</th><th>목표 스탬프</th><th>보상 정책 ID</th><th>요청 시각</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
    return shell(listState(body, "심사 대기 중인 스탬프북이 없습니다."));
}

function stampbookDetail() {
    const d = selectedStampbookDetail();
    if (!d) return notFoundDetail("stampbook-list");
    const status = statusForView(d.status, { approved: "PUBLISHED", rejected: "DRAFT" });
    const contents = d.targetContents.map(item => `<tr><td class="mono">${item.contentId}</td><td>${item.title}</td><td>${badge(item.status)}</td><td class="mono">${item.regionId}</td></tr>`).join("");
    const actions = status === "PENDING_REVIEW"
        ? `<a class="btn admin" href="${contextUrl("stampbook-detail", { modal: "approve" })}">공개 승인</a><a class="btn danger" href="${contextUrl("stampbook-detail", { modal: "reject" })}">반려</a>`
        : `<a class="btn" href="${resultListUrl("stampbook-list")}">목록으로</a>`;
    const main = `<div class="detail-layout"><div class="detail-main"><section class="panel"><div class="panel-header"><h2 class="section-title">스탬프북 정보</h2>${badge(status)}</div><div class="panel-body">${kv([["스탬프북 ID", d.stampbookId], ["지역 ID", d.regionId], ["요청 시각", formatDate(d.requestedAt)], ["요청 사유", d.requestReason, true]])}</div></section><section class="panel"><div class="panel-header"><h2 class="section-title">대상 콘텐츠</h2><span class="helper">${d.targetContents.length}개</span></div><div class="table-wrap" style="border:0;border-radius:0"><table><thead><tr><th>콘텐츠 ID</th><th>제목</th><th>상태</th><th>지역 ID</th></tr></thead><tbody>${contents}</tbody></table></div></section><section class="panel"><div class="panel-header"><h2 class="section-title">완료 보상 정책</h2>${badge(d.rewardCouponPolicy.status)}</div><div class="panel-body">${kv([["쿠폰 정책 ID", d.rewardCouponPolicy.couponPolicyId], ["지역 ID", d.rewardCouponPolicy.regionId], ["발급 유형", displayLabel(couponIssuanceTypeLabels, d.rewardCouponPolicy.issuanceType)]])}</div></section></div>${actionAside(status, actions, status === "PENDING_REVIEW" ? "승인과 반려 모두 처리 사유를 입력합니다." : "처리된 스탬프북은 읽기 전용으로 확인합니다.")}</div>`;
    return shell(main);
}

function missionList() {
    const requestedStatus = query.get("status") || "PENDING_REVIEW";
    const missionStatuses = Object.keys(missionStatusLabels);
    const selectedStatus = requestedStatus === "ALL" || missionStatuses.includes(requestedStatus)
        ? requestedStatus
        : "PENDING_REVIEW";
    const requestedSize = Number(query.get("size") || mock.missions.size);
    const selectedSize = [20, 50, 100].includes(requestedSize) ? requestedSize : mock.missions.size;
    const processedId = query.get("action") ? query.get("processedId") : null;
    const missions = (selectedStatus === "ALL"
        ? mock.missions.content
        : mock.missions.content.filter(item => item.status === selectedStatus))
        .filter(item => item.missionId !== processedId);
    const rows = missions.slice(0, selectedSize).map(item => `<tr><td><span class="cell-title">${item.title}</span><span class="cell-sub mono">미션 ${item.missionId}</span></td><td>${badge(item.status)}</td><td class="right"><a class="btn small" href="${targetUrl("mission-detail", item.missionId, { status: selectedStatus, size: selectedSize })}">상세</a></td></tr>`).join("");
    const persistentContent = `${benefitTabs("mission")}<div class="filter-bar"><div class="filter-row"><div class="field"><label for="mission-status-filter">미션 상태</label><select class="control" id="mission-status-filter"><option value="ALL"${selectedStatus === "ALL" ? " selected" : ""}>전체</option><option value="DRAFT"${selectedStatus === "DRAFT" ? " selected" : ""}>${missionStatusLabels.DRAFT}</option><option value="PENDING_REVIEW"${selectedStatus === "PENDING_REVIEW" ? " selected" : ""}>${missionStatusLabels.PENDING_REVIEW}</option><option value="PUBLISHED"${selectedStatus === "PUBLISHED" ? " selected" : ""}>${missionStatusLabels.PUBLISHED}</option><option value="ENDED"${selectedStatus === "ENDED" ? " selected" : ""}>${missionStatusLabels.ENDED}</option></select></div><div class="field"><label for="mission-size-filter">페이지 크기</label><select class="control" id="mission-size-filter"><option value="20"${selectedSize === 20 ? " selected" : ""}>20개</option><option value="50"${selectedSize === 50 ? " selected" : ""}>50개</option><option value="100"${selectedSize === 100 ? " selected" : ""}>100개</option></select></div></div><span class="helper">미션 ID 내림차순 · 정렬 고정</span></div>`;
    const body = `${persistentContent}<div class="table-wrap"><table><thead><tr><th>미션</th><th>상태</th><th></th></tr></thead><tbody>${rows}</tbody></table></div><div class="pagination"><button class="page-btn" disabled>‹</button><button class="page-btn active">1</button><button class="page-btn" disabled>›</button></div>`;
    return shell(listState(body, "선택한 상태의 미션이 없습니다.", true, persistentContent));
}

function missionDetail() {
    const d = selectedMissionDetail();
    if (!d) return notFoundDetail("mission-list");
    const status = statusForView(d.status, { approved: "PUBLISHED", rejected: "DRAFT" });
    const targets = d.targetContents.map(item => `<tr><td class="mono">${item.contentId}</td><td>${item.title}</td></tr>`).join("");
    let missionHistories = viewState === "history-empty" || d.missionId !== mock.missionHistory.missionId
        ? []
        : mock.missionHistory.histories;
    if (["approved", "rejected"].includes(viewState)) {
        missionHistories = [...missionHistories, {
            auditEventId: "9999",
            action: viewState === "approved" ? "APPROVED" : "REJECTED",
            previousStatus: "PENDING_REVIEW",
            nextStatus: status,
            result: "SUCCESS",
            reasonCode: viewState === "approved" ? "MISSION_APPROVED" : "MISSION_REJECTED",
            actorKind: "USER",
            actorUserId: mock.me.userId,
            recordedAt: "2026-08-18T10:00:00Z",
        }];
    }
    const history = missionHistories.length ? missionHistories.map(h => `<div class="timeline-item"><span class="timeline-dot"></span><div class="timeline-content"><strong>${displayLabel(missionHistoryActionLabels, h.action)} · ${h.previousStatus ? displayLabel(missionStatusLabels, h.previousStatus) : "없음"} → ${displayLabel(missionStatusLabels, h.nextStatus)}</strong><span>이벤트 ${h.auditEventId} · 결과 ${displayLabel(operationResultLabels, h.result)} · ${displayLabel(missionHistoryReasonLabels, h.reasonCode)} · ${displayLabel(auditActorKindLabels, h.actorKind)}${h.actorUserId ? ` ${h.actorUserId}` : ""} · ${formatDate(h.recordedAt)}</span></div></div>`).join("") : `<div class="empty-inline">최근 90일 이력이 없습니다.</div>`;
    const actions = status === "PENDING_REVIEW" ? `<a class="btn admin" href="${contextUrl("mission-detail", { modal: "approve" })}">미션 승인</a><a class="btn danger" href="${contextUrl("mission-detail", { modal: "reject" })}">미션 반려</a>` : `<a class="btn" href="${resultListUrl("mission-list")}">목록으로</a>`;
    const conditionTypeLabel = displayLabel(missionConditionTypeLabels, d.conditionType);
    const main = `<div class="detail-layout"><div class="detail-main"><section class="panel"><div class="panel-header"><h2 class="section-title">미션 정보</h2>${badge(status)}</div><div class="panel-body">${kv([["미션 제목", d.title, true], ["미션 ID", d.missionId], ["지역 ID", d.regionId], ["조건 유형", conditionTypeLabel], ["목표 방문 수", d.requiredVisitCount], ["보상 쿠폰 정책 ID", d.rewardCouponPolicyId], ["종료 시각", formatDate(d.endsAt)]])}</div></section><section class="panel"><div class="panel-header"><h2 class="section-title">목표 콘텐츠</h2><span class="helper">${conditionTypeLabel} 조건</span></div><div class="table-wrap" style="border:0;border-radius:0"><table><thead><tr><th>콘텐츠 ID</th><th>제목</th></tr></thead><tbody>${targets}</tbody></table></div></section><section class="panel"><div class="panel-header"><h2 class="section-title">최근 90일 이력</h2><span class="helper">성공한 상태 전이</span></div><div class="panel-body timeline">${history}</div></section></div>${actionAside(status, actions, status === "PENDING_REVIEW" ? "심사 대기 상태에서만 승인과 반려가 가능합니다." : "현재 상태에서는 심사 명령을 제공하지 않습니다.")}</div>`;
    return shell(main);
}

function modalFor(currentScreen, name) {
    const configs = {
        approve: { title: "승인하시겠습니까?", description: "검토한 내용을 기준으로 승인 처리를 확인합니다.", confirm: "승인", tone: "admin", input: null },
        reject: { title: "반려 사유를 입력해 주세요", description: "대상 운영자가 보완할 수 있도록 확인된 사유를 남깁니다.", confirm: "반려", tone: "danger", input: "reason" },
        delete: { title: "공개 전 콘텐츠를 삭제할까요?", description: "삭제된 콘텐츠는 승인·게시·복구할 수 없습니다.", confirm: "삭제", tone: "danger", input: "reason" },
        suspend: { title: "콘텐츠 운영을 중단할까요?", description: "방문자 노출과 신규 예약에 영향을 주는 위험 작업입니다.", confirm: "운영 중단", tone: "danger", input: "reason" },
        end: { title: "콘텐츠를 정상 종료할까요?", description: "모든 연결 회차가 종결 상태인지 서버가 다시 확인합니다.", confirm: "정상 종료", tone: "admin", input: null, warning: "종결되지 않은 회차가 있으면 상태를 변경하지 않고 요청이 거부됩니다." },
    };
    const config = { ...(configs[name] || configs.reject) };
    config.target = "선택한 관리 대상";
    config.result = name === "reject" ? "반려" : "승인 완료";

    if (currentScreen === "operator-detail") {
        const detail = selectedOperatorDetail() || mock.operatorDetail;
        config.target = `신청자 ${detail.applicantUserId} · 요청 지역 김해시(${detail.requestedRegionId})`;
        config.result = name === "approve" ? "신청 승인 완료 · 운영자 역할 부여" : "신청 반려";
    }
    if (currentScreen === "content-review" && name === "delete") {
        const requestedContentId = query.get("contentId");
        const target = mock.contents.find(item => item.contentId === requestedContentId && item.status === contentStatus)
            || mock.contents.find(item => item.status === contentStatus)
            || mock.contents[0];
        const statusLabel = target.status === "APPROVED" ? "승인 완료" : "승인 대기";
        config.target = `${target.title} · 콘텐츠 ${target.contentId}`;
        config.result = "공개 전 콘텐츠 삭제";
        config.warning = `현재 상태: ${statusLabel} · 공개 예정: ${formatDate(target.publishAt)}`;
    }
    if (currentScreen === "content-detail") {
        const detail = selectedContentDetail() || mock.contentDetail;
        config.target = `${detail.title} · 콘텐츠 ${detail.contentId}`;
        if (name === "approve") {
            config.result = "콘텐츠 승인 완료 · 최초 회차 운영 예정 전환";
            config.description = `공개 예정 시각 ${formatDate(detail.publishAt)}을 기준으로 승인합니다.`;
        } else if (name === "reject") {
            config.result = "콘텐츠 반려";
        } else if (name === "delete") {
            config.result = "공개 전 콘텐츠 삭제";
            config.warning = `현재 상태: 승인 대기 · 공개 예정: ${formatDate(detail.publishAt)}`;
        }
    }
    if (currentScreen === "revision-detail") {
        const detail = selectedRevisionDetail() || mock.revisionDetail;
        config.target = `${detail.title} · 수정본 ${detail.revisionId} · 원본 ${detail.contentId}`;
        config.result = name === "approve" ? "수정본 승인 · 후보 필드 원본 반영" : "수정본 반려";
    }
    if (currentScreen === "published-detail") {
        const detail = selectedPublicDetail() || mock.publicDetail;
        config.target = `${detail.title} · 콘텐츠 ${detail.contentId}`;
        config.result = name === "suspend" ? "공개 콘텐츠 운영 중단" : "공개 콘텐츠 정상 종료";
    }
    if (currentScreen === "withdrawal-detail") {
        const detail = selectedWithdrawalDetail() || mock.withdrawalDetail;
        config.target = `철회 요청 ${detail.withdrawalRequestId} · ${detail.content.title}`;
        config.result = name === "approve" ? "요청 승인 완료 · 콘텐츠 철회" : "요청 반려 · 콘텐츠 공개 상태 유지";
    }
    if (currentScreen === "session-detail") {
        const detail = selectedSessionDetail() || mock.sessionDetail;
        config.target = `${detail.contentTitle} · 회차 ${detail.sessionId}`;
        config.result = name === "approve" ? "회차 승인 완료 · 운영 예정 전환" : "회차 반려";
    }
    if (currentScreen === "session-revision-detail") {
        const detail = selectedSessionRevisionDetail() || mock.sessionRevisionDetail;
        config.target = `수정 요청 ${detail.revisionId} · 회차 ${detail.targetSession.sessionId}`;
        config.result = name === "approve" ? `수정 요청 승인 · 회차 버전 v${detail.targetSession.version} → v${detail.targetSession.version + 1}` : "수정 요청 반려";
    }
    if (currentScreen === "stampbook-detail") {
        const detail = selectedStampbookDetail() || mock.stampbookDetail;
        config.title = name === "approve" ? "스탬프북 공개를 승인할까요?" : "스탬프북을 반려할까요?";
        config.input = "reason";
        config.description = "처리 사유는 1~500자로 입력합니다.";
        config.target = `스탬프북 ${detail.stampbookId}`;
        config.result = name === "approve" ? "스탬프북 공개 중 전환" : "스탬프북 작성 중 전환";
    }
    if (currentScreen === "operator-detail" && name === "reject") {
        config.description = "반려 사유(rejectedReason)는 1~2,000자로 입력합니다.";
    }
    if (currentScreen === "mission-detail" && name === "reject") {
        config.title = "미션 반려 사유를 선택해 주세요";
        config.description = "개인정보를 포함하지 않는 정해진 사유 중 하나를 선택합니다.";
        config.input = "reasonCode";
    }
    if (currentScreen === "mission-detail") {
        const detail = selectedMissionDetail() || mock.missionDetail;
        config.target = `${detail.title} · 미션 ${detail.missionId}`;
        config.result = name === "approve" ? "미션 즉시 공개" : "미션 작성 중 전환";
        if (name === "approve") {
            config.description = "승인하면 미션이 즉시 공개됩니다.";
        }
    }
    if (currentScreen === "withdrawal-detail" && name === "approve") {
        config.title = "전체 철회를 승인할까요?";
        config.description = "요청은 승인 완료, 콘텐츠는 철회 상태로 전환됩니다.";
    }
    let input = "";
    if (config.input === "reason") {
        const maxLength = currentScreen === "operator-detail" && name === "reject" ? 2000 : 500;
        const defaultReason = "화면에 표시된 정보를 기준으로 보완이 필요한 항목을 확인했습니다.";
        input = `<div class="field grow"><label for="action-reason">처리 사유</label><textarea class="control" id="action-reason" minlength="1" maxlength="${maxLength}" required>${defaultReason}</textarea><span class="helper right" id="action-reason-count">${defaultReason.length}자</span><span class="alert" id="action-validation-error" hidden>처리 사유를 입력해 주세요.</span></div>`;
    }
    if (config.input === "reasonCode") {
        input = `<div class="field grow"><label>반려 사유</label><select class="control"><option value="MISSION_INFORMATION_INCOMPLETE">미션 정보가 충분하지 않음</option><option value="MISSION_CONDITION_INVALID">미션 조건이 올바르지 않음</option><option value="MISSION_TARGET_CONTENT_INVALID">대상 콘텐츠가 올바르지 않음</option><option value="MISSION_REWARD_POLICY_INVALID" selected>보상 정책이 올바르지 않음</option><option value="MISSION_SCHEDULE_INVALID">미션 일정이 올바르지 않음</option></select></div>`;
    }
    const summary = `<div class="modal-summary"><div><span>대상</span><strong>${config.target}</strong></div><div><span>처리 결과</span><strong>${config.result}</strong></div></div>`;
    return `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true"><div class="modal-head"><h2>${config.title}</h2><p>${config.description}</p></div><div class="modal-body">${summary}${config.warning ? `<div class="warning-box">${config.warning}</div>` : ""}${input || `<div class="info-banner" style="margin:0"><div><strong>입력 없이 처리합니다.</strong><span>확인 시 서버가 현재 상태와 담당 지역을 다시 검증합니다.</span></div></div>`}</div><div class="modal-foot"><a class="btn" href="${contextUrl(currentScreen)}">취소</a><button class="btn ${config.tone}" id="confirm-action" data-action="${name}">${config.confirm}</button></div></section></div>`;
}

const renderers = {
    login: loginScreen,
    home: homeScreen,
    "operator-list": operatorList,
    "operator-detail": operatorDetail,
    "content-review": contentReviewList,
    "content-detail": contentDetail,
    "revision-list": revisionList,
    "revision-detail": revisionDetail,
    "published-list": publishedList,
    "published-detail": publishedDetail,
    "withdrawal-list": withdrawalList,
    "withdrawal-detail": withdrawalDetail,
    "session-list": sessionList,
    "session-detail": sessionDetail,
    "session-revision-list": sessionRevisionList,
    "session-revision-detail": sessionRevisionDetail,
    "qr-list": qrList,
    "qr-detail": qrDetail,
    "stampbook-list": stampbookList,
    "stampbook-detail": stampbookDetail,
    "mission-list": missionList,
    "mission-detail": missionDetail,
};

function renderScreen() {
    if (screen !== "login" && viewState === "unauthenticated") {
        return loginScreen();
    }
    if (screen !== "login" && !regionAdminAssignment) {
        return roleAccessDeniedScreen();
    }
    return (renderers[screen] || homeScreen)();
}

document.getElementById("app").innerHTML = renderScreen();

const missionStatusFilter = document.getElementById("mission-status-filter");
if (missionStatusFilter) {
    missionStatusFilter.addEventListener("change", event => {
        const size = document.getElementById("mission-size-filter")?.value || "20";
        window.location.href = url("mission-list", { status: event.target.value, size });
    });
}

const missionSizeFilter = document.getElementById("mission-size-filter");
if (missionSizeFilter) {
    missionSizeFilter.addEventListener("change", event => {
        const status = document.getElementById("mission-status-filter")?.value || "PENDING_REVIEW";
        window.location.href = url("mission-list", { status, size: event.target.value });
    });
}

const publishedReservationFilter = document.getElementById("published-reservation-filter");
if (publishedReservationFilter) {
    publishedReservationFilter.addEventListener("change", event => {
        const reservationAvailable = event.target.value;
        window.location.href = reservationAvailable === "ALL"
            ? url("published-list")
            : url("published-list", { reservationAvailable });
    });
}

const mockLogin = document.getElementById("mock-login");
if (mockLogin) {
    mockLogin.addEventListener("click", () => {
        window.location.href = url("home");
    });
}

document.querySelectorAll("[data-mock-logout]").forEach(button => {
    button.addEventListener("click", () => {
        window.location.href = url("login");
    });
});

document.querySelectorAll("[data-retry-state]").forEach(button => {
    button.addEventListener("click", () => {
        window.location.href = contextUrl(screen);
    });
});

const actionReason = document.getElementById("action-reason");
const actionReasonCount = document.getElementById("action-reason-count");
if (actionReason && actionReasonCount) {
    actionReason.addEventListener("input", event => {
        actionReasonCount.textContent = `${event.target.value.length}자`;
    });
}

const confirmAction = document.getElementById("confirm-action");
if (confirmAction) {
    confirmAction.addEventListener("click", () => {
        const validationError = document.getElementById("action-validation-error");
        if (actionReason && !actionReason.value.trim()) {
            validationError.hidden = false;
            actionReason.focus();
            return;
        }
        if (validationError) validationError.hidden = true;

        const action = confirmAction.dataset.action;
        const stateByAction = {
            approve: "approved",
            reject: "rejected",
            delete: "deleted",
            suspend: "suspended",
            end: "ended",
        };
        const extra = {
            state: stateByAction[action] || "default",
            action,
            processedId: selectedTargetId(screen),
        };
        if (screen === "content-review") {
            extra.state = "action-success";
            extra.processedId = query.get("contentId");
        }
        window.location.href = url(screen, currentContext(extra));
    });
}
