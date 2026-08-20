import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { createIdempotencyKey, isAbortError } from "../../api/client";
import {
  checkInByQr,
  checkInManually,
  getReservationPayment,
  listMyContents,
  listPublicContentSessions,
  listSessionReservations,
  searchReservation,
} from "../api";
import {
  apiErrorMessage,
  Breadcrumb,
  formatDate,
  formatMoney,
  PageHeader,
  RouteState,
  StatusBadge,
} from "../OperatorComponents";
import type {
  CheckInResult,
  ContentSessionSummary,
  ContentSummary,
  ReservationPayment,
  ReservationSearchResult,
  SessionReservations,
} from "../types";

export function ReservationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [contents, setContents] = useState<ContentSummary[]>([]);
  const [sessions, setSessions] = useState<ContentSessionSummary[]>([]);
  const [selectedContent, setSelectedContent] = useState(searchParams.get("contentId") ?? "");
  const [selectedSession, setSelectedSession] = useState(searchParams.get("sessionId") ?? "");
  const [data, setData] = useState<SessionReservations | null>(null);
  const [payment, setPayment] = useState<ReservationPayment | null>(null);
  const [paymentReservationNo, setPaymentReservationNo] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    listMyContents(controller.signal)
      .then(({ contents: items }) => {
        const published = items.filter((item) => item.status === "PUBLISHED");
        setContents(published);
        if (!selectedContent && published[0]) setSelectedContent(published[0].contentId);
      })
      .catch((caught) => {
        if (!isAbortError(caught, controller.signal))
          setError(apiErrorMessage(caught, "콘텐츠를 불러오지 못했습니다."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedContent) {
      setSessions([]);
      return;
    }
    const controller = new AbortController();
    setData(null);
    setPayment(null);
    setError("");
    listPublicContentSessions(selectedContent, controller.signal)
      .then(({ sessions: items }) => {
        setSessions(items);
        if (!items.some((item) => item.sessionId === selectedSession))
          setSelectedSession(items[0]?.sessionId ?? "");
      })
      .catch((caught) => {
        if (!isAbortError(caught, controller.signal))
          setError(apiErrorMessage(caught, "공개 회차를 불러오지 못했습니다."));
      });
    return () => controller.abort();
  }, [selectedContent]);

  useEffect(() => {
    if (!selectedContent || !selectedSession) {
      setData(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setPayment(null);
    setSearchParams({ contentId: selectedContent, sessionId: selectedSession }, { replace: true });
    listSessionReservations(selectedContent, selectedSession, controller.signal)
      .then(setData)
      .catch((caught) => {
        if (!isAbortError(caught, controller.signal))
          setError(apiErrorMessage(caught, "예약자 목록을 불러오지 못했습니다."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [selectedContent, selectedSession, setSearchParams]);

  const loadPayment = async (reservationId: string, reservationNo?: string) => {
    setPaymentLoading(true);
    setPaymentError("");
    setPayment(null);
    if (reservationNo) setPaymentReservationNo(reservationNo);
    try {
      setPayment(await getReservationPayment(reservationId));
    } catch (caught) {
      setPaymentError(apiErrorMessage(caught, "결제·환불 상태를 불러오지 못했습니다."));
    } finally {
      setPaymentLoading(false);
    }
  };
  const searchPayment = async (event: FormEvent) => {
    event.preventDefault();
    const reservationNo = paymentReservationNo.trim();
    if (!reservationNo) return;
    setPaymentLoading(true);
    setPaymentError("");
    setPayment(null);
    try {
      const reservation = await searchReservation(reservationNo);
      setPayment(await getReservationPayment(reservation.reservationId));
    } catch (caught) {
      setPaymentError(apiErrorMessage(caught, "결제·환불 상태를 불러오지 못했습니다."));
    } finally {
      setPaymentLoading(false);
    }
  };
  const reservations = data?.reservations ?? [];
  const checkedIn = reservations.filter((item) => item.checkIn.checkedIn).length;
  const confirmed = reservations.filter((item) => item.status === "CONFIRMED").length;
  const inactive = reservations.filter((item) =>
    ["CANCELLED", "EXPIRED"].includes(item.status),
  ).length;
  const paymentPanel = (
    <aside className="op-payment-card">
      <form className="op-payment-search" onSubmit={searchPayment}>
        <label className="op-field">
          예약 번호로 결제·환불 조회
          <input
            className="op-control"
            value={paymentReservationNo}
            onChange={(event) => setPaymentReservationNo(event.target.value)}
            placeholder="완료·취소 예약도 조회할 수 있습니다"
            required
          />
        </label>
        <button className="op-button" disabled={paymentLoading}>
          {paymentLoading ? "조회 중…" : "결제 조회"}
        </button>
      </form>
      {paymentError && (
        <div className="op-alert" role="alert">
          {paymentError}
        </div>
      )}
      {paymentLoading ? (
        <div className="op-state op-state-compact">
          <div>
            <span className="op-spinner" />
            <h3>결제 정보를 불러오는 중입니다</h3>
          </div>
        </div>
      ) : payment ? (
        <>
          <h2>예약 결제·환불 상태</h2>
          <p>
            예약 ID {payment.reservationId} · {payment.reservationNo}
          </p>
          <dl className="op-kv-grid">
            <div className="op-kv">
              <dt>결제 상태</dt>
              <dd>
                {payment.payment ? <StatusBadge value={payment.payment.status} /> : "결제 없음"}
              </dd>
            </div>
            <div className="op-kv">
              <dt>최종 결제 금액</dt>
              <dd>
                {payment.payment
                  ? formatMoney(payment.payment.finalAmount, payment.payment.currency)
                  : "—"}
              </dd>
            </div>
            <div className="op-kv">
              <dt>환불 상태</dt>
              <dd>
                {payment.refund ? <StatusBadge value={payment.refund.status} /> : "환불 없음"}
              </dd>
            </div>
            <div className="op-kv">
              <dt>환불 금액</dt>
              <dd>{payment.refund ? formatMoney(payment.refund.amount) : "—"}</dd>
            </div>
            <div className="op-kv op-full">
              <dt>최근 변경</dt>
              <dd>{formatDate(payment.updatedAt)}</dd>
            </div>
          </dl>
          <div className="op-notice">운영자는 결제·환불 상태를 읽기 전용으로만 확인합니다.</div>
        </>
      ) : (
        <div className="op-state op-state-compact">
          <div>
            <h3>결제 정보 선택</h3>
            <p>예약 행을 선택하거나 예약 번호를 직접 입력하세요.</p>
          </div>
        </div>
      )}
    </aside>
  );

  return (
    <>
      <Breadcrumb>회차·예약 관리 › 회차별 예약자</Breadcrumb>
      <PageHeader
        title="회차별 예약자"
        description="예약자 개인정보는 Backend가 제공하는 마스킹 값만 표시하며 결제·환불 정보는 읽기 전용입니다."
      />
      <div className="op-filter-bar">
        <div className="op-filter-row">
          <label className="op-field">
            콘텐츠
            <select
              className="op-control"
              value={selectedContent}
              onChange={(event) => setSelectedContent(event.target.value)}
            >
              <option value="">콘텐츠 선택</option>
              {contents.map((item) => (
                <option key={item.contentId} value={item.contentId}>
                  {item.title} ({item.contentId})
                </option>
              ))}
            </select>
          </label>
          <label className="op-field">
            회차
            <select
              className="op-control"
              value={selectedSession}
              onChange={(event) => setSelectedSession(event.target.value)}
            >
              <option value="">공개 회차 선택</option>
              {sessions.map((item) => (
                <option key={item.sessionId} value={item.sessionId}>
                  {formatDate(item.startsAt)} ({item.sessionId})
                </option>
              ))}
            </select>
          </label>
        </div>
        {data && (
          <div>
            <strong>
              회차 상태 <StatusBadge value={data.session.status} />
            </strong>
            <small>확정 시각 오름차순 · 상태 필터/페이지 없음</small>
          </div>
        )}
      </div>
      {error && (
        <div className="op-alert" role="alert">
          {error}
        </div>
      )}
      {paymentPanel}
      {loading ? (
        <RouteState loading />
      ) : !selectedSession ? (
        <RouteState empty="공개 예정 회차를 선택해 주세요. 승인 전 회차는 운영자 조회 API가 제공되지 않습니다." />
      ) : (
        data && (
          <>
            <div className="op-summary-grid">
              <div className="op-summary-card">
                <small>전체 예약</small>
                <strong>{reservations.length}건</strong>
              </div>
              <div className="op-summary-card">
                <small>확정</small>
                <strong>{confirmed}건</strong>
              </div>
              <div className="op-summary-card">
                <small>체크인</small>
                <strong>{checkedIn}건</strong>
              </div>
              <div className="op-summary-card">
                <small>취소·만료</small>
                <strong>{inactive}건</strong>
              </div>
            </div>
            {reservations.length === 0 ? (
              <RouteState empty="이 회차의 예약자가 없습니다." />
            ) : (
              <div className="op-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>예약 번호</th>
                      <th>예약자</th>
                      <th>인원</th>
                      <th>상태</th>
                      <th>체크인</th>
                      <th className="op-right">액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservations.map((item) => (
                      <tr key={item.reservationId}>
                        <td className="op-mono">{item.reservationNo}</td>
                        <td>
                          <span className="op-cell-title">{item.participant.name}</span>
                          <span className="op-cell-sub">
                            {item.participant.phone ?? "연락처 없음"}
                          </span>
                        </td>
                        <td>{item.quantity}명</td>
                        <td>
                          <StatusBadge value={item.status} />
                        </td>
                        <td>
                          {item.checkIn.checkedIn
                            ? `${formatDate(item.checkIn.checkedAt)} 완료`
                            : "미체크인"}
                        </td>
                        <td className="op-right">
                          <button
                            className="op-button op-button-small"
                            onClick={() => loadPayment(item.reservationId, item.reservationNo)}
                          >
                            결제·환불
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )
      )}
    </>
  );
}

type BarcodeDetectorLike = {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
};

export function CheckInPage() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<"qr" | "manual">(
    searchParams.get("reservationNo") ? "manual" : "qr",
  );
  return (
    <>
      <Breadcrumb>현장 체크인</Breadcrumb>
      <PageHeader
        title="현장 체크인"
        description="QR을 우선 검증하고, 사용할 수 없을 때만 예약번호 보조 조회 후 체크인합니다."
      />
      <div className="op-tabs">
        <button className={`op-tab${tab === "qr" ? " active" : ""}`} onClick={() => setTab("qr")}>
          QR 스캔
        </button>
        <button
          className={`op-tab${tab === "manual" ? " active" : ""}`}
          onClick={() => setTab("manual")}
        >
          예약번호 보조 체크인
        </button>
      </div>
      {tab === "qr" ? (
        <QrCheckIn />
      ) : (
        <ManualCheckIn initialReservationNo={searchParams.get("reservationNo") ?? ""} />
      )}
    </>
  );
}

function QrCheckIn() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const processingRef = useRef(false);
  const attemptRef = useRef<{
    signature: string;
    idempotencyKey: string;
  } | null>(null);
  const [qrToken, setQrToken] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [reservation, setReservation] = useState<ReservationSearchResult | null>(null);
  const [error, setError] = useState("");
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);

  const stop = () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    frameRef.current = null;
    setScanning(false);
  };
  useEffect(() => stop, []);

  const submitToken = async (token: string) => {
    if (processingRef.current || !token.trim()) return;
    processingRef.current = true;
    setError("");
    setResult(null);
    setReservation(null);
    const normalizedToken = token.trim();
    if (attemptRef.current?.signature !== normalizedToken) {
      attemptRef.current = {
        signature: normalizedToken,
        idempotencyKey: createIdempotencyKey(),
      };
    }
    try {
      const checked = await checkInByQr(normalizedToken, attemptRef.current.idempotencyKey);
      setResult(checked);
      stop();
      try {
        const payment = await getReservationPayment(checked.reservationId);
        setReservation(await searchReservation(payment.reservationNo));
      } catch {
        // 체크인 성공은 유지하고 예약자 보강 조회만 생략한다.
      }
    } catch (caught) {
      setError(apiErrorMessage(caught, "QR 체크인을 완료하지 못했습니다."));
    } finally {
      processingRef.current = false;
    }
  };

  const start = async () => {
    setError("");
    setResult(null);
    const Detector = (
      window as unknown as {
        BarcodeDetector?: new (options: { formats: string[] }) => BarcodeDetectorLike;
      }
    ).BarcodeDetector;
    if (!Detector) {
      setError(
        "이 브라우저는 카메라 QR 인식을 지원하지 않습니다. 아래 QR 토큰 입력을 사용해 주세요.",
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      detectorRef.current = new Detector({ formats: ["qr_code"] });
      setScanning(true);
      const detect = async () => {
        if (!videoRef.current || !detectorRef.current || !streamRef.current) return;
        try {
          const codes = await detectorRef.current.detect(videoRef.current);
          const token = codes[0]?.rawValue;
          if (token) {
            setQrToken(token);
            await submitToken(token);
            return;
          }
        } catch {
          /* 다음 프레임에서 재시도 */
        }
        frameRef.current = requestAnimationFrame(detect);
      };
      frameRef.current = requestAnimationFrame(detect);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "카메라를 시작하지 못했습니다.");
      stop();
    }
  };

  return (
    <div className="op-scanner">
      <div className="op-scanner-inner">
        <div className="op-scan-frame">
          {scanning ? <video ref={videoRef} muted playsInline /> : "⌗"}
        </div>
        <h2>{scanning ? "QR 코드를 카메라에 맞춰 주세요" : "방문자 QR을 스캔해 주세요"}</h2>
        <p>같은 체크인 시도에는 동일한 멱등성 키를 재사용합니다.</p>
        <div className="op-button-row op-center">
          {scanning ? (
            <button className="op-button" onClick={stop}>
              카메라 중지
            </button>
          ) : (
            <button className="op-button op-button-admin" onClick={start}>
              카메라 QR 스캔 시작
            </button>
          )}
        </div>
        <form
          className="op-qr-fallback"
          onSubmit={(event) => {
            event.preventDefault();
            void submitToken(qrToken);
          }}
        >
          <label className="op-field">
            QR 토큰 직접 입력
            <input
              className="op-control"
              value={qrToken}
              onChange={(event) => setQrToken(event.target.value)}
              placeholder="스캐너가 전달한 QR 토큰"
            />
          </label>
          <button className="op-button op-button-primary">QR 토큰 확인</button>
        </form>
        {error && <div className="op-alert">{error}</div>}
        {result && <CheckInResultCard result={result} reservation={reservation} />}
      </div>
    </div>
  );
}

function ManualCheckIn({ initialReservationNo }: { initialReservationNo: string }) {
  const [reservationNo, setReservationNo] = useState(initialReservationNo);
  const [reservation, setReservation] = useState<ReservationSearchResult | null>(null);
  const [reason, setReason] = useState("QR_SCAN_FAILED");
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const processingRef = useRef(false);
  const attemptRef = useRef<{
    signature: string;
    idempotencyKey: string;
  } | null>(null);
  const search = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setReservation(null);
    setResult(null);
    attemptRef.current = null;
    try {
      setReservation(await searchReservation(reservationNo.trim()));
    } catch (caught) {
      setError(apiErrorMessage(caught, "예약을 조회하지 못했습니다."));
    } finally {
      setLoading(false);
    }
  };
  const checkIn = async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setLoading(true);
    setError("");
    setResult(null);
    const normalizedReservationNo = reservationNo.trim();
    const signature = `${normalizedReservationNo}:${reason}`;
    if (attemptRef.current?.signature !== signature) {
      attemptRef.current = {
        signature,
        idempotencyKey: createIdempotencyKey(),
      };
    }
    try {
      const checked = await checkInManually(
        normalizedReservationNo,
        reason,
        attemptRef.current.idempotencyKey,
      );
      setResult(checked);
      setReservation((current) =>
        current
          ? {
              ...current,
              status: checked.reservationStatus,
              checkIn: {
                checkedIn: true,
                canCheckIn: false,
                checkedAt: checked.checkedAt,
              },
            }
          : current,
      );
    } catch (caught) {
      setError(apiErrorMessage(caught, "보조 체크인을 완료하지 못했습니다."));
    } finally {
      processingRef.current = false;
      setLoading(false);
    }
  };
  return (
    <div className="op-split">
      <section className="op-state">
        <div>
          <StatusBadge value="PENDING" />
          <h3>예약번호 조회</h3>
          <p>QR 스캔 실패 또는 사용 불가 사유가 있을 때만 보조 조회합니다.</p>
        </div>
      </section>
      <aside className="op-panel">
        <header>
          <h2>예약번호 보조 조회</h2>
          <StatusBadge value="PENDING" />
        </header>
        <div className="op-panel-body">
          <form onSubmit={search}>
            <label className="op-field">
              예약 번호
              <input
                className="op-control"
                value={reservationNo}
                onChange={(event) => setReservationNo(event.target.value)}
                required
              />
            </label>
            <button className="op-button" disabled={loading}>
              {loading ? "조회 중…" : "예약 조회"}
            </button>
          </form>
          {error && <div className="op-alert">{error}</div>}
          {reservation && (
            <div className="op-result-card">
              <h3>
                {reservation.checkIn.canCheckIn
                  ? "체크인 가능한 예약입니다"
                  : "현재 체크인할 수 없는 예약입니다"}
              </h3>
              <p>
                {reservation.participant.name} · {reservation.participant.phone ?? "연락처 없음"}
              </p>
              <dl className="op-kv-grid">
                <div className="op-kv">
                  <dt>콘텐츠</dt>
                  <dd>{reservation.content.title}</dd>
                </div>
                <div className="op-kv">
                  <dt>회차</dt>
                  <dd>{formatDate(reservation.session.startsAt)}</dd>
                </div>
                <div className="op-kv">
                  <dt>예약 상태</dt>
                  <dd>
                    <StatusBadge value={reservation.status} />
                  </dd>
                </div>
                <div className="op-kv">
                  <dt>체크인</dt>
                  <dd>
                    {reservation.checkIn.checkedIn
                      ? "완료"
                      : reservation.checkIn.canCheckIn
                        ? "가능"
                        : "불가"}
                  </dd>
                </div>
              </dl>
              <label className="op-field">
                보조 처리 사유
                <select
                  className="op-control"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                >
                  <option value="QR_SCAN_FAILED">QR 스캔 실패</option>
                  <option value="QR_NOT_AVAILABLE">QR 사용 불가</option>
                </select>
              </label>
              <button
                className="op-button op-button-primary op-full-button"
                onClick={checkIn}
                disabled={loading || !reservation.checkIn.canCheckIn}
              >
                예약번호로 체크인
              </button>
            </div>
          )}
          {result && <CheckInResultCard result={result} reservation={reservation} />}
        </div>
      </aside>
    </div>
  );
}

function CheckInResultCard({
  result,
  reservation,
}: {
  result: CheckInResult;
  reservation?: ReservationSearchResult | null;
}) {
  return (
    <div className="op-result-card" role="status">
      <h3>체크인이 완료되었습니다.</h3>
      <p>
        방문 ID {result.visitId} · {formatDate(result.checkedAt)}
      </p>
      <dl className="op-kv-grid">
        {reservation && (
          <>
            <div className="op-kv">
              <dt>예약자</dt>
              <dd>
                {reservation.participant.name} · {reservation.participant.phone ?? "연락처 없음"}
              </dd>
            </div>
            <div className="op-kv">
              <dt>예약 번호</dt>
              <dd>{reservation.reservationNo}</dd>
            </div>
          </>
        )}
        <div className="op-kv">
          <dt>예약 ID</dt>
          <dd>{result.reservationId}</dd>
        </div>
        <div className="op-kv">
          <dt>회차 ID</dt>
          <dd>{result.sessionId}</dd>
        </div>
        <div className="op-kv">
          <dt>처리 방식</dt>
          <dd>{result.checkInMethod}</dd>
        </div>
        <div className="op-kv">
          <dt>예약 상태</dt>
          <dd>
            <StatusBadge value={result.reservationStatus} />
          </dd>
        </div>
      </dl>
    </div>
  );
}
