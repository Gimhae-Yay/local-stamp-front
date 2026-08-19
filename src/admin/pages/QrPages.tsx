import { Link, useParams, useSearchParams } from "react-router-dom"
import {
  AsyncContent,
  EmptyState,
  KeyValueGrid,
  PageHeader,
  Panel,
  StatusBadge,
  formatDate,
  useApiData,
} from "../AdminComponents"
import { withQuery } from "../api"
import type { QrExceptionDetail, QrExceptionSummary } from "../types"

const exceptionTypeLabels: Record<string, string> = {
  QR_CHECK_IN_FAILURE: "QR 체크인 실패",
  MANUAL_CHECK_IN: "수동 체크인",
  RESERVATION_NUMBER_LOOKUP: "예약번호 조회",
}

const reasonCodeLabels: Record<string, string> = {
  QR_CHECK_IN_MALFORMED: "QR 형식 오류",
  QR_CHECK_IN_VERSION_UNSUPPORTED: "지원하지 않는 QR 버전",
  QR_CHECK_IN_KEY_UNKNOWN: "알 수 없는 QR 서명 키",
  QR_CHECK_IN_SIGNATURE_INVALID: "QR 체크인 서명 검증 실패",
  QR_CHECK_IN_EXPIRED: "만료된 QR",
  QR_CHECK_IN_OPERATOR_ROLE_FORBIDDEN: "운영자 권한 없음",
  QR_CHECK_IN_REFERENCE_INVALID: "예약 참조 정보 불일치",
  QR_CHECK_IN_SESSION_MISMATCH: "예약 회차 불일치",
  QR_CHECK_IN_RESERVATION_ALREADY_CHECKED_IN: "이미 체크인한 예약",
  MANUAL_CHECK_IN_QR_SCAN_FAILED_SUCCESS: "QR 스캔 실패 후 수동 체크인 성공",
  QR_VERIFICATION_FAILED: "QR 검증 실패",
}

const checkInResultLabels: Record<string, string> = {
  SUCCESS: "체크인 성공",
  NOT_FOUND: "예약을 찾을 수 없음",
  REGION_FORBIDDEN: "담당 지역 불일치",
  OWNER_FORBIDDEN: "담당 운영자 불일치",
  MEMBER_UNLINKED: "회원 연결 해제",
  RESERVATION_CANCELLED: "취소된 예약",
  RESERVATION_EXPIRED: "만료된 예약",
  RESERVATION_ALREADY_CHECKED_IN: "이미 체크인한 예약",
  SESSION_CANCELLED: "취소된 회차",
  SESSION_COMPLETED: "종료된 회차",
  WINDOW_NOT_OPEN: "체크인 시작 전",
  WINDOW_CLOSED: "체크인 종료 후",
  VISIT_INCONSISTENT: "방문 기록 불일치",
  STATE_TRANSITION_CONFLICT: "상태 전이 충돌",
  RELATION_INCONSISTENT: "예약 관계 정보 불일치",
}

function labelFor(labels: Record<string, string>, value: string) {
  return labels[value] ?? value
}

export function formatQrReason(value: string) {
  const exact = reasonCodeLabels[value]
  if (exact) return exact

  const manualReason = value.startsWith("MANUAL_CHECK_IN_QR_NOT_AVAILABLE_")
    ? "QR 사용 불가"
    : value.startsWith("MANUAL_CHECK_IN_QR_SCAN_FAILED_")
      ? "QR 스캔 실패"
      : null
  if (manualReason) {
    const suffix = value.replace(/^MANUAL_CHECK_IN_QR_(?:NOT_AVAILABLE|SCAN_FAILED)_/, "")
    return `${manualReason} · ${checkInResultLabels[suffix] ?? suffix}`
  }

  if (value.startsWith("QR_CHECK_IN_")) {
    const suffix = value.slice("QR_CHECK_IN_".length)
    return checkInResultLabels[suffix] ?? value
  }
  return value
}

export function readCursorHistory(value: string | null) {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) &&
      parsed.every((item) => typeof item === "string")
      ? parsed
      : []
  } catch {
    return []
  }
}

export function QrExceptionListPage() {
  const [search, setSearch] = useSearchParams()
  const cursor = search.get("cursor")
  const cursorHistory = readCursorHistory(search.get("cursorHistory"))
  const state = useApiData<{
    exceptions: QrExceptionSummary[]
    nextCursor: string | null
    hasNext: boolean
  }>(withQuery("/api/v1/region-admin/qr-exceptions", { cursor, size: 20 }))
  return (
    <>
      <PageHeader
        title="QR 예외"
        description="최근 QR 실패와 보조 처리 감사 기록을 확인합니다."
      />
      <div className="ra-filter-bar">
        <div>
          <strong>최근 QR 예외 기록</strong>
          <span>기본 20건 · 커서 방식</span>
        </div>
        <small>서버 고정 순서 · 검색/필터 없음</small>
      </div>
      <AsyncContent
        state={state}
        empty={(data) => data.exceptions.length === 0}
        emptyTitle="기록된 QR 예외가 없습니다."
        emptyDescription="QR 실패나 보조 처리 기록이 생기면 이 화면에 표시됩니다."
      >
        {(data) => (
          <>
            <div className="ra-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>예외 ID</th>
                    <th>유형</th>
                    <th>결과</th>
                    <th>사유</th>
                    <th>예약</th>
                    <th>연결 대상</th>
                    <th>발생 시각</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.exceptions.map((item) => (
                    <tr key={item.exceptionId}>
                      <td className="ra-mono">{item.exceptionId}</td>
                      <td title={item.exceptionType}>
                        {labelFor(exceptionTypeLabels, item.exceptionType)}
                      </td>
                      <td>
                        <StatusBadge value={item.result} />
                      </td>
                      <td title={item.reasonCode}>
                        {formatQrReason(item.reasonCode)}
                      </td>
                      <td>
                        {item.reservationResolved ? (
                          <StatusBadge value="SUCCESS" label="연결됨" />
                        ) : (
                          <StatusBadge value="FAILURE" label="미연결" />
                        )}
                      </td>
                      <td>
                        <span className="ra-cell-sub">
                          예약 {item.reservationId ?? "—"}
                        </span>
                        <span className="ra-cell-sub">
                          콘텐츠 {item.contentId ?? "—"} · 회차{" "}
                          {item.sessionId ?? "—"}
                        </span>
                      </td>
                      <td>{formatDate(item.occurredAt)}</td>
                      <td className="ra-right">
                        <Link
                          className="ra-button ra-button-small"
                          to={`${item.exceptionId}`}
                        >
                          상세
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ra-pagination">
              <button
                className="ra-page-button"
                disabled={cursorHistory.length === 0}
                aria-label="이전 페이지"
                onClick={() => {
                  const previousCursor = cursorHistory.at(-1) ?? ""
                  const nextHistory = cursorHistory.slice(0, -1)
                  const params = new URLSearchParams()
                  if (previousCursor) params.set("cursor", previousCursor)
                  if (nextHistory.length)
                    params.set("cursorHistory", JSON.stringify(nextHistory))
                  setSearch(params)
                }}
              >
                ‹
              </button>
              <span>{cursorHistory.length + 1}페이지</span>
              <button
                className="ra-page-button"
                disabled={!data.hasNext || !data.nextCursor}
                aria-label="다음 페이지"
                onClick={() => {
                  const params = new URLSearchParams()
                  params.set("cursor", data.nextCursor!)
                  params.set(
                    "cursorHistory",
                    JSON.stringify([...cursorHistory, cursor ?? ""]),
                  )
                  setSearch(params)
                }}
              >
                ›
              </button>
            </div>
          </>
        )}
      </AsyncContent>
    </>
  )
}

export function QrExceptionDetailPage() {
  const { exceptionId = "" } = useParams()
  const state = useApiData<QrExceptionDetail>(
    `/api/v1/region-admin/qr-exceptions/${exceptionId}`,
  )
  return (
    <>
      <PageHeader
        title="QR 예외 상세"
        description="예외 원인과 안전하게 연결된 예약 정보를 확인합니다."
        actions={
          <Link className="ra-button" to="/region-admin/qr-exceptions">
            ← 목록으로
          </Link>
        }
      />
      <AsyncContent state={state}>
        {(detail) => (
          <div className="ra-detail-main">
            <Panel
              title="예외 정보"
              action={<StatusBadge value={detail.result} />}
            >
              <KeyValueGrid
                items={[
                  ["예외 ID", detail.exceptionId],
                  [
                    "예외 유형",
                    <span title={detail.exceptionType}>
                      {labelFor(exceptionTypeLabels, detail.exceptionType)}
                    </span>,
                  ],
                  [
                    "사유",
                    <span title={detail.reasonCode}>
                      {formatQrReason(detail.reasonCode)}
                    </span>,
                  ],
                  ["발생 시각", formatDate(detail.occurredAt)],
                  [
                    "예약 연결",
                    detail.reservationResolved ? "연결됨" : "연결되지 않음",
                  ],
                ]}
              />
            </Panel>
            {detail.reservation ? (
              <Panel title="연결된 예약">
                <KeyValueGrid
                  items={[
                    ["예약 번호", detail.reservation.reservationNo],
                    [
                      "예약 상태",
                      <StatusBadge value={detail.reservation.status} />,
                    ],
                    ["콘텐츠", detail.reservation.contentTitle, true],
                    ["콘텐츠 ID", detail.reservation.contentId],
                    ["회차 ID", detail.reservation.sessionId],
                    ["회차 시작", formatDate(detail.reservation.startsAt)],
                    [
                      "체크인 창",
                      `${formatDate(detail.reservation.checkinOpenAt)} ~ ${formatDate(detail.reservation.checkinCloseAt)}`,
                      true,
                    ],
                    [
                      "참가자",
                      `${detail.reservation.participant.name} · ${detail.reservation.participant.phone}`,
                    ],
                    [
                      "회원 연결",
                      detail.reservation.participant.memberLinked
                        ? "회원"
                        : "비회원",
                    ],
                    [
                      "체크인",
                      detail.reservation.checkIn.checkedIn
                        ? `완료 · ${formatDate(detail.reservation.checkIn.checkedAt)}`
                        : "미완료",
                    ],
                    [
                      "지역 관리자 체크인",
                      detail.reservation.checkIn.canCheckIn ? "가능" : "불가",
                    ],
                  ]}
                />
              </Panel>
            ) : (
              <EmptyState title="안전하게 연결된 예약 정보가 없습니다." />
            )}
          </div>
        )}
      </AsyncContent>
    </>
  )
}
