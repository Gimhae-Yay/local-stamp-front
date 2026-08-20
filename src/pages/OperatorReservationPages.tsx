import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../api/client";
import {
  searchOperatorReservation,
  type OperatorReservationSearchResponse,
  type OperatorReservationStatus,
} from "../api/operator";
import { Breadcrumbs, Notice, PageHeader, StatusPill } from "../components/PageElements";

const statusLabels: Record<OperatorReservationStatus, string> = {
  CONFIRMED: "예약 확정",
  CHECKED_IN: "체크인 완료",
  CANCELLED: "예약 취소",
  EXPIRED: "예약 만료",
};

function searchErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === "NOT_FOUND") {
      return "일치하는 예약번호를 찾을 수 없습니다. 예약번호를 확인해 주세요.";
    }
    if (error.code === "FORBIDDEN") {
      return "담당 콘텐츠의 예약이 아니어서 조회할 수 없습니다.";
    }
    return error.message;
  }
  return error instanceof Error ? error.message : "예약번호를 조회하지 못했습니다.";
}

export default function OperatorReservationSearchPage() {
  const [reservationNo, setReservationNo] = useState("");
  const [result, setResult] = useState<OperatorReservationSearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedReservationNo = reservationNo.trim();
    if (!normalizedReservationNo) {
      setResult(null);
      setError("예약번호를 입력해 주세요.");
      return;
    }

    setSearching(true);
    setResult(null);
    setError(null);
    try {
      setResult(await searchOperatorReservation(normalizedReservationNo));
    } catch (requestError) {
      setError(searchErrorMessage(requestError));
    } finally {
      setSearching(false);
    }
  };

  return (
    <section className="page-container">
      <Breadcrumbs
        items={[{ label: "콘텐츠 관리", to: "/operator/contents" }, { label: "예약번호 검색" }]}
      />
      <PageHeader
        title="예약번호 검색"
        description="QR 확인이 어려운 예약을 예약번호로 조회합니다."
      />

      <form className="operator-reservation-search" onSubmit={submit}>
        <label htmlFor="operator-reservation-number">예약번호</label>
        <div>
          <input
            id="operator-reservation-number"
            value={reservationNo}
            onChange={(event) => setReservationNo(event.target.value)}
            placeholder="예: R20260730A7K3M9Q2W5XZ"
            autoComplete="off"
          />
          <button className="button-primary" type="submit" disabled={searching}>
            {searching ? "검색 중…" : "검색"}
          </button>
        </div>
      </form>

      {error && <Notice tone="red">{error}</Notice>}

      {result && (
        <article className="operator-reservation-result" aria-live="polite">
          <div className="operator-reservation-result-heading">
            <div>
              <StatusPill
                tone={
                  result.status === "CONFIRMED"
                    ? "green"
                    : result.status === "CHECKED_IN"
                      ? "blue"
                      : "gray"
                }
              >
                {statusLabels[result.status]}
              </StatusPill>
              <h2>{result.content.title}</h2>
              <p>예약번호 {result.reservationNo}</p>
            </div>
            <Link className="button-outline" to={`/operator/contents/${result.content.contentId}`}>
              콘텐츠 보기
            </Link>
          </div>
          <dl>
            <div>
              <dt>예약자</dt>
              <dd>{result.participant.name}</dd>
            </div>
            <div>
              <dt>연락처</dt>
              <dd>{result.participant.phone ?? "연락처 없음"}</dd>
            </div>
            <div>
              <dt>회차</dt>
              <dd>
                {new Date(result.session.startsAt).toLocaleString("ko-KR", {
                  timeZone: "Asia/Seoul",
                })}
              </dd>
            </div>
            <div>
              <dt>체크인</dt>
              <dd>
                {result.checkIn.checkedIn
                  ? "체크인 완료"
                  : result.checkIn.canCheckIn
                    ? "체크인 가능"
                    : "체크인 불가"}
              </dd>
            </div>
          </dl>
        </article>
      )}
    </section>
  );
}
