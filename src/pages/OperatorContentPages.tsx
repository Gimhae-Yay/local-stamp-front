import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError, createIdempotencyKey } from "../api/client";
import {
  cancelOperatorSession,
  createContentRevision,
  createOperatorSession,
  getOperatorContent,
  getOperatorContentSessions,
  getOperatorContents,
  getOperatorSessionReservations,
  requestContentWithdrawal,
  requestSessionChange,
  updateContentRevision,
  withdrawContentRevision,
  type ContentRevisionFields,
  type ContentRevisionStatus,
  type OperatorContentDetail,
  type OperatorContentStatus,
  type OperatorContentSummary,
  type OperatorReservationStatus,
  type OperatorSession,
  type OperatorSessionStatus,
  type OperatorSessionReservationsResponse,
  type SessionFields,
} from "../api/operator";
import { Breadcrumbs, Notice, PageHeader, StatusPill } from "../components/PageElements";

const revisionCachePrefix = "local-stamp:operator-revision:";

const contentStatusLabels: Record<OperatorContentStatus, string> = {
  PENDING: "심사 대기",
  REJECTED: "반려",
  APPROVED: "승인",
  PUBLISHED: "공개 중",
  SUSPENDED: "운영 중단",
  WITHDRAWN: "철회",
  ENDED: "종료",
};

const revisionStatusLabels: Record<ContentRevisionStatus, string> = {
  EDIT_REQUESTED: "수정 심사 중",
  EDIT_REJECTED: "수정본 반려",
  EDIT_APPROVED: "수정본 승인",
  EDIT_WITHDRAWN: "수정본 철회",
  EDIT_INVALIDATED: "수정본 무효",
};

const reservationStatusLabels: Record<OperatorReservationStatus, string> = {
  CONFIRMED: "예약 확정",
  CHECKED_IN: "체크인 완료",
  CANCELLED: "예약 취소",
  EXPIRED: "예약 만료",
};

const sessionStatusLabels: Record<OperatorSessionStatus, string> = {
  PENDING: "승인 대기",
  SCHEDULED: "운영 예정",
  REJECTED: "반려",
  COMPLETED: "운영 완료",
  CANCELLED: "취소됨",
};

const sessionStatusTones: Record<OperatorSessionStatus, "green" | "amber" | "gray" | "red"> = {
  PENDING: "amber",
  SCHEDULED: "green",
  REJECTED: "red",
  COMPLETED: "gray",
  CANCELLED: "gray",
};

const contentStatusTones: Record<
  OperatorContentStatus,
  "green" | "amber" | "gray" | "blue" | "red"
> = {
  PENDING: "amber",
  REJECTED: "red",
  APPROVED: "blue",
  PUBLISHED: "green",
  SUSPENDED: "red",
  WITHDRAWN: "gray",
  ENDED: "gray",
};

interface CachedRevision {
  revisionId: string;
  contentId: string;
  status: ContentRevisionStatus;
  fields: ContentRevisionFormState;
}

interface ContentRevisionFormState {
  title: string;
  description: string;
  locationText: string;
  operatingHoursText: string;
  contactText: string;
  precautions: string;
  ageRequirement: string;
  materials: string;
  cancellationPolicyText: string;
  reservationPrice: string;
  publishAt: string;
  representativeImageObjectId: string;
}

interface SessionFormState {
  startsAt: string;
  endsAt: string;
  checkinOpenAt: string;
  checkinCloseAt: string;
  capacity: string;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function commandErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.code === "SESSION_STATE_CONFLICT") {
      return "이미 심사 중인 변경 요청이 있거나 변경할 수 없는 회차입니다. 최신 상태를 확인해 주세요.";
    }
    if (error.code === "SESSION_NOT_CANCELLABLE") {
      return "이미 취소됐거나 현재 취소할 수 없는 회차입니다.";
    }
    if (error.code === "CONTENT_STATE_CONFLICT") {
      return "이미 처리됐거나 현재 수정할 수 없는 콘텐츠 상태입니다.";
    }
  }
  return errorMessage(error, fallback);
}

function toDateTimeLocal(value: string | null | undefined) {
  if (!value) return "";
  const matched = value.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
  return matched?.[1] ?? "";
}

function toKoreaDateTime(value: string) {
  return value ? `${value}:00+09:00` : "";
}

function defaultSessionForm(session?: OperatorSession): SessionFormState {
  if (session) {
    return {
      startsAt: toDateTimeLocal(session.startsAt),
      endsAt: toDateTimeLocal(session.endsAt),
      checkinOpenAt: toDateTimeLocal(session.checkinOpenAt),
      checkinCloseAt: toDateTimeLocal(session.checkinCloseAt),
      capacity: String(session.capacity),
    };
  }

  return {
    startsAt: "",
    endsAt: "",
    checkinOpenAt: "",
    checkinCloseAt: "",
    capacity: "",
  };
}

function sessionRequest(values: SessionFormState): SessionFields {
  return {
    startsAt: toKoreaDateTime(values.startsAt),
    endsAt: toKoreaDateTime(values.endsAt),
    checkinOpenAt: toKoreaDateTime(values.checkinOpenAt),
    checkinCloseAt: toKoreaDateTime(values.checkinCloseAt),
    capacity: Number(values.capacity),
  };
}

function validateSession(values: SessionFormState) {
  if (Object.values(values).some((value) => !value)) {
    return "일정, 체크인 시간, 정원을 모두 입력해 주세요.";
  }
  const start = new Date(values.startsAt);
  const end = new Date(values.endsAt);
  const checkinOpen = new Date(values.checkinOpenAt);
  const checkinClose = new Date(values.checkinCloseAt);
  const capacity = Number(values.capacity);
  if (!Number.isInteger(capacity) || capacity < 1) {
    return "정원은 1명 이상의 정수여야 합니다.";
  }
  if (start.getTime() <= Date.now()) {
    return "회차 시작 시각은 현재 이후여야 합니다.";
  }
  if (start >= end) return "종료 시각은 시작 시각보다 뒤여야 합니다.";
  if (checkinOpen >= checkinClose) {
    return "체크인 종료 시각은 체크인 시작 시각보다 뒤여야 합니다.";
  }
  if (checkinClose >= end) {
    return "체크인 종료 시각은 회차 종료 시각보다 앞서야 합니다.";
  }
  return null;
}

function initialRevisionFields(content: OperatorContentDetail): ContentRevisionFormState {
  return {
    title: content.title,
    description: content.description,
    locationText: content.locationText,
    operatingHoursText: content.operatingHoursText,
    contactText: content.contactText,
    precautions: content.precautions,
    ageRequirement: content.ageRequirement,
    materials: content.materials,
    cancellationPolicyText: content.cancellationPolicyText,
    reservationPrice:
      content.reservationPrice === undefined ? "" : String(content.reservationPrice),
    publishAt: toDateTimeLocal(content.publishAt),
    representativeImageObjectId: "",
  };
}

function revisionRequest(values: ContentRevisionFormState): ContentRevisionFields {
  const request: ContentRevisionFields = {
    title: values.title.trim(),
    description: values.description.trim(),
    locationText: values.locationText.trim(),
    operatingHoursText: values.operatingHoursText.trim(),
    contactText: values.contactText.trim(),
    precautions: values.precautions.trim(),
    ageRequirement: values.ageRequirement.trim(),
    materials: values.materials.trim(),
    cancellationPolicyText: values.cancellationPolicyText.trim(),
    reservationPrice: Number(values.reservationPrice),
  };
  if (values.publishAt) request.publishAt = toKoreaDateTime(values.publishAt);
  if (values.representativeImageObjectId.trim()) {
    request.representativeImageObjectId = values.representativeImageObjectId.trim();
  }
  return request;
}

function validateRevision(values: ContentRevisionFormState, publishAtRequired: boolean) {
  const requiredText = [
    values.title,
    values.description,
    values.locationText,
    values.operatingHoursText,
    values.contactText,
    values.precautions,
    values.ageRequirement,
    values.materials,
    values.cancellationPolicyText,
  ];
  if (requiredText.some((value) => !value.trim())) {
    return "콘텐츠 필수 정보를 모두 입력해 주세요.";
  }
  if (!values.reservationPrice.trim()) {
    return "예약 가격을 입력해 주세요.";
  }
  const price = Number(values.reservationPrice);
  if (!Number.isInteger(price) || price < 0) {
    return "예약 가격은 0원 이상의 정수여야 합니다.";
  }
  if (publishAtRequired && !values.publishAt) {
    return "공개 전 콘텐츠의 공개 예정 시각을 입력해 주세요.";
  }
  return null;
}

function readCachedRevision(revisionId: string) {
  try {
    const raw = sessionStorage.getItem(`${revisionCachePrefix}${revisionId}`);
    return raw ? (JSON.parse(raw) as CachedRevision) : null;
  } catch {
    return null;
  }
}

function writeCachedRevision(revision: CachedRevision) {
  sessionStorage.setItem(`${revisionCachePrefix}${revision.revisionId}`, JSON.stringify(revision));
  sessionStorage.setItem(
    `${revisionCachePrefix}content:${revision.contentId}`,
    revision.revisionId,
  );
}

function readContentRevision(contentId: string) {
  const revisionId = sessionStorage.getItem(`${revisionCachePrefix}content:${contentId}`);
  return revisionId ? readCachedRevision(revisionId) : null;
}

function ContentRevisionFieldsForm({
  values,
  onChange,
  publishAtRequired,
  disabled = false,
}: {
  values: ContentRevisionFormState;
  onChange: (values: ContentRevisionFormState) => void;
  publishAtRequired: boolean;
  disabled?: boolean;
}) {
  const set = (field: keyof ContentRevisionFormState, value: string) =>
    onChange({ ...values, [field]: value });

  const textFields: Array<[keyof ContentRevisionFormState, string, "input" | "textarea"]> = [
    ["title", "제목", "input"],
    ["description", "소개", "textarea"],
    ["locationText", "위치 안내", "input"],
    ["operatingHoursText", "운영 시간", "input"],
    ["contactText", "연락처", "input"],
    ["precautions", "유의사항", "textarea"],
    ["ageRequirement", "연령 조건", "input"],
    ["materials", "준비물", "input"],
    ["cancellationPolicyText", "취소 정책", "textarea"],
  ];

  return (
    <div className="operator-form-grid">
      {textFields.map(([field, label, kind]) => (
        <label key={field} className={kind === "textarea" ? "operator-field-wide" : ""}>
          {label}
          {kind === "textarea" ? (
            <textarea
              value={values[field]}
              onChange={(event) => set(field, event.target.value)}
              disabled={disabled}
              required
            />
          ) : (
            <input
              value={values[field]}
              onChange={(event) => set(field, event.target.value)}
              disabled={disabled}
              required
            />
          )}
        </label>
      ))}
      <label>
        예약 기본 가격
        <input
          type="number"
          min="0"
          step="1"
          value={values.reservationPrice}
          onChange={(event) => set("reservationPrice", event.target.value)}
          disabled={disabled}
          required
        />
      </label>
      {publishAtRequired && (
        <label>
          공개 예정 시각
          <input
            type="datetime-local"
            value={values.publishAt}
            onChange={(event) => set("publishAt", event.target.value)}
            disabled={disabled}
            required
          />
        </label>
      )}
      <label className="operator-field-wide">
        새 대표 이미지 객체 ID (선택)
        <input
          inputMode="numeric"
          value={values.representativeImageObjectId}
          onChange={(event) => set("representativeImageObjectId", event.target.value)}
          disabled={disabled}
        />
      </label>
    </div>
  );
}

function SessionForm({
  initialValues,
  inheritedPrice,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialValues: SessionFormState;
  inheritedPrice?: number;
  submitLabel: string;
  onSubmit: (request: SessionFields) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validateSession(values);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(sessionRequest(values));
    } catch (requestError) {
      setError(commandErrorMessage(requestError, "회차 요청을 처리하지 못했습니다."));
    } finally {
      setSubmitting(false);
    }
  };

  const set = (field: keyof SessionFormState, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  return (
    <form className="operator-command-form" onSubmit={submit}>
      <div className="operator-form-grid">
        <label>
          시작 시각
          <input
            type="datetime-local"
            value={values.startsAt}
            onChange={(event) => set("startsAt", event.target.value)}
            required
          />
        </label>
        <label>
          종료 시각
          <input
            type="datetime-local"
            value={values.endsAt}
            onChange={(event) => set("endsAt", event.target.value)}
            required
          />
        </label>
        <label>
          체크인 시작
          <input
            type="datetime-local"
            value={values.checkinOpenAt}
            onChange={(event) => set("checkinOpenAt", event.target.value)}
            required
          />
        </label>
        <label>
          체크인 종료
          <input
            type="datetime-local"
            value={values.checkinCloseAt}
            onChange={(event) => set("checkinCloseAt", event.target.value)}
            required
          />
        </label>
        <label>
          정원
          <input
            type="number"
            min="1"
            step="1"
            value={values.capacity}
            onChange={(event) => set("capacity", event.target.value)}
            required
          />
        </label>
        <label>
          예약 가격
          <input
            value={
              inheritedPrice === undefined
                ? "콘텐츠 기본 가격 적용"
                : `${inheritedPrice.toLocaleString("ko-KR")}원`
            }
            disabled
          />
        </label>
      </div>
      <p className="field-help">회차 가격은 콘텐츠에 설정된 예약 기본 가격을 사용합니다.</p>
      {error && <Notice tone="red">{error}</Notice>}
      <div className="operator-form-actions">
        <button className="button-outline" type="button" onClick={onCancel}>
          닫기
        </button>
        <button className="button-primary" type="submit" disabled={submitting}>
          {submitting ? "처리 중…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

export function OperatorContentListPage() {
  const [contents, setContents] = useState<OperatorContentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    getOperatorContents(controller.signal)
      .then(({ contents: nextContents }) => setContents(nextContents))
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        setError(errorMessage(requestError, "운영자 콘텐츠를 불러오지 못했습니다."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [version]);

  return (
    <section className="page-container">
      <Breadcrumbs items={[{ label: "홈", to: "/" }, { label: "콘텐츠 관리" }]} />
      <PageHeader
        title="내 콘텐츠 관리"
        description="콘텐츠 수정본과 회차 일정의 심사 요청·취소 상태를 관리하세요."
      />
      {loading ? (
        <p className="operator-page-state">콘텐츠를 불러오는 중입니다.</p>
      ) : error ? (
        <Notice tone="red">
          {error}{" "}
          <button className="text-link-button" onClick={() => setVersion((value) => value + 1)}>
            다시 시도
          </button>
        </Notice>
      ) : contents.length === 0 ? (
        <p className="operator-page-state">관리할 콘텐츠가 없습니다.</p>
      ) : (
        <div className="operator-content-list">
          {contents.map((content) => (
            <article key={content.contentId}>
              <div>
                <StatusPill tone={contentStatusTones[content.status]}>
                  {contentStatusLabels[content.status]}
                </StatusPill>
                <h2>{content.title}</h2>
                <small>콘텐츠 #{content.contentId}</small>
              </div>
              <Link className="button-outline" to={`/operator/contents/${content.contentId}`}>
                상세 관리
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function OperatorContentDetailPage() {
  const { contentId = "" } = useParams();
  const withdrawalIdempotencyKey = useMemo(() => createIdempotencyKey(), [contentId]);
  const [content, setContent] = useState<OperatorContentDetail | null>(null);
  const [sessions, setSessions] = useState<OperatorSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessionReloadKey, setSessionReloadKey] = useState(0);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [changingSessionId, setChangingSessionId] = useState<string | null>(null);
  const [cancellingSessionId, setCancellingSessionId] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [showContentWithdrawal, setShowContentWithdrawal] = useState(false);
  const [contentWithdrawalReason, setContentWithdrawalReason] = useState("");
  const [contentWithdrawalBusy, setContentWithdrawalBusy] = useState(false);
  const [contentWithdrawalError, setContentWithdrawalError] = useState<string | null>(null);
  const [contentWithdrawalPending, setContentWithdrawalPending] = useState(false);
  const [selectedReservationSessionId, setSelectedReservationSessionId] = useState<string | null>(
    null,
  );
  const [sessionReservations, setSessionReservations] =
    useState<OperatorSessionReservationsResponse | null>(null);
  const [reservationLoading, setReservationLoading] = useState(false);
  const [reservationError, setReservationError] = useState<string | null>(null);

  useEffect(() => {
    setShowContentWithdrawal(false);
    setContentWithdrawalReason("");
    setContentWithdrawalError(null);
    setContentWithdrawalPending(false);
    setSelectedReservationSessionId(null);
    setSessionReservations(null);
    setReservationError(null);
  }, [contentId]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    getOperatorContent(contentId, controller.signal)
      .then(setContent)
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setError(errorMessage(requestError, "콘텐츠를 불러오지 못했습니다."));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [contentId]);

  useEffect(() => {
    if (!contentId) return;
    const controller = new AbortController();
    setSessionLoading(true);
    setSessionError(null);
    getOperatorContentSessions(contentId, controller.signal)
      .then(({ sessions: ownedSessions }) => {
        if (!controller.signal.aborted) setSessions(ownedSessions);
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setSessionError(errorMessage(requestError, "운영자 회차를 불러오지 못했습니다."));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setSessionLoading(false);
      });
    return () => controller.abort();
  }, [contentId, sessionReloadKey]);

  const cachedRevision = useMemo(
    () => (contentId ? readContentRevision(contentId) : null),
    [contentId],
  );

  const refreshSessions = () => setSessionReloadKey((current) => current + 1);

  const canManageSessions = content?.status === "APPROVED" || content?.status === "PUBLISHED";
  const canCreateRevision = content?.status === "APPROVED" || content?.status === "PUBLISHED";
  const canRequestWithdrawal = content?.status === "PUBLISHED" && !contentWithdrawalPending;

  if (loading) {
    return <section className="operator-page-state">콘텐츠를 불러오는 중입니다.</section>;
  }
  if (error || !content) {
    return (
      <section className="page-container narrow-page">
        <Notice tone="red">{error ?? "콘텐츠를 찾을 수 없습니다."}</Notice>
        <Link className="button-outline" to="/operator/contents">
          목록으로
        </Link>
      </section>
    );
  }

  const createSession = async (request: SessionFields) => {
    await createOperatorSession(contentId, request);
    setShowCreateSession(false);
    refreshSessions();
  };

  const changeSession = async (sessionId: string, request: SessionFields) => {
    await requestSessionChange(sessionId, request);
    setChangingSessionId(null);
    refreshSessions();
  };

  const cancelSession = async (sessionId: string) => {
    if (!cancellationReason.trim()) {
      setCancelError("취소 사유를 입력해 주세요.");
      return;
    }
    setCancelBusy(true);
    setCancelError(null);
    try {
      await cancelOperatorSession(sessionId, cancellationReason.trim());
      setCancellingSessionId(null);
      setCancellationReason("");
      refreshSessions();
    } catch (requestError) {
      setCancelError(commandErrorMessage(requestError, "회차를 취소하지 못했습니다."));
    } finally {
      setCancelBusy(false);
    }
  };

  const withdrawContent = async () => {
    if (!contentWithdrawalReason.trim()) {
      setContentWithdrawalError("전체 철회 사유를 입력해 주세요.");
      return;
    }
    setContentWithdrawalBusy(true);
    setContentWithdrawalError(null);
    try {
      await requestContentWithdrawal(
        contentId,
        contentWithdrawalReason.trim(),
        withdrawalIdempotencyKey,
      );
      setContentWithdrawalPending(true);
      setShowContentWithdrawal(false);
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        if (requestError.code === "CONTENT_STATE_CONFLICT") {
          setContentWithdrawalError(
            "이미 처리 대기 중인 철회 요청이 있거나 현재 철회할 수 없는 콘텐츠입니다.",
          );
        } else if (requestError.code === "IDEMPOTENCY_KEY_CONFLICT") {
          setContentWithdrawalError(
            "요청 정보가 이전 시도와 다릅니다. 화면을 새로고침한 뒤 다시 요청해 주세요.",
          );
        } else {
          setContentWithdrawalError(requestError.message);
        }
      } else {
        setContentWithdrawalError(
          errorMessage(requestError, "전체 콘텐츠 철회를 요청하지 못했습니다."),
        );
      }
    } finally {
      setContentWithdrawalBusy(false);
    }
  };

  const loadSessionReservations = async (sessionId: string) => {
    setSelectedReservationSessionId(sessionId);
    setSessionReservations(null);
    setReservationLoading(true);
    setReservationError(null);
    try {
      setSessionReservations(await getOperatorSessionReservations(contentId, sessionId));
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        if (requestError.code === "NOT_FOUND") {
          setReservationError("선택한 회차가 이 콘텐츠에 속하지 않거나 조회할 수 없습니다.");
        } else if (requestError.code === "FORBIDDEN") {
          setReservationError("이 회차의 예약자를 조회할 권한이 없습니다.");
        } else {
          setReservationError(requestError.message);
        }
      } else {
        setReservationError(errorMessage(requestError, "예약자 목록을 불러오지 못했습니다."));
      }
    } finally {
      setReservationLoading(false);
    }
  };

  return (
    <section className="page-container">
      <Breadcrumbs
        items={[{ label: "콘텐츠 관리", to: "/operator/contents" }, { label: content.title }]}
      />
      <PageHeader
        title={content.title}
        description={`콘텐츠 #${content.contentId}`}
        action={
          canCreateRevision || canRequestWithdrawal ? (
            <div className="operator-header-actions">
              {canRequestWithdrawal && (
                <button
                  className="button-danger"
                  onClick={() => {
                    setShowContentWithdrawal(true);
                    setContentWithdrawalError(null);
                  }}
                >
                  전체 콘텐츠 철회 요청
                </button>
              )}
              {canCreateRevision && (
                <Link
                  className="button-primary"
                  to={`/operator/contents/${content.contentId}/revisions/new`}
                >
                  수정본 생성
                </Link>
              )}
            </div>
          ) : undefined
        }
      >
        <StatusPill tone={contentStatusTones[content.status]}>
          {contentStatusLabels[content.status]}
        </StatusPill>
      </PageHeader>

      {content.rejectionReason && <Notice tone="red">반려 사유: {content.rejectionReason}</Notice>}
      {cachedRevision && (
        <Notice>
          최근 수정본 #{cachedRevision.revisionId} · {revisionStatusLabels[cachedRevision.status]}{" "}
          <Link to={`/operator/content-revisions/${cachedRevision.revisionId}/edit`}>
            수정본 열기
          </Link>
        </Notice>
      )}
      {contentWithdrawalPending && (
        <Notice>
          전체 콘텐츠 철회 요청이 접수되었습니다. 지역 관리자 심사를 기다리고 있습니다.
        </Notice>
      )}
      {showContentWithdrawal && (
        <section className="operator-command-form operator-withdraw-panel">
          <h2>전체 콘텐츠 철회를 요청할까요?</h2>
          <p>요청이 승인되면 콘텐츠 전체가 철회됩니다. 요청 사유를 입력해 주세요.</p>
          <label>
            전체 철회 사유
            <textarea
              maxLength={500}
              value={contentWithdrawalReason}
              onChange={(event) => setContentWithdrawalReason(event.target.value)}
            />
          </label>
          {contentWithdrawalError && <Notice tone="red">{contentWithdrawalError}</Notice>}
          <div className="operator-form-actions">
            <button className="button-outline" onClick={() => setShowContentWithdrawal(false)}>
              돌아가기
            </button>
            <button
              className="button-danger"
              disabled={contentWithdrawalBusy}
              onClick={withdrawContent}
            >
              {contentWithdrawalBusy ? "요청 중…" : "철회 요청 확정"}
            </button>
          </div>
        </section>
      )}

      <section className="operator-detail-card">
        <h2>콘텐츠 정보</h2>
        <dl>
          <div>
            <dt>위치</dt>
            <dd>{content.locationText}</dd>
          </div>
          <div>
            <dt>운영 시간</dt>
            <dd>{content.operatingHoursText}</dd>
          </div>
          <div>
            <dt>연락처</dt>
            <dd>{content.contactText}</dd>
          </div>
          <div>
            <dt>예약 가격</dt>
            <dd>
              {content.reservationPrice === undefined
                ? "콘텐츠 기본 가격"
                : `${content.reservationPrice.toLocaleString("ko-KR")}원`}
            </dd>
          </div>
        </dl>
      </section>

      <section className="operator-session-section">
        <div className="operator-section-heading">
          <div>
            <h2>회차 관리</h2>
            <p>새 회차를 만들거나 예정된 회차의 변경·취소를 요청합니다.</p>
          </div>
          <div className="operator-header-actions">
            <Link className="button-outline" to="/operator/reservations/search">
              예약번호 검색
            </Link>
            {canManageSessions && !showCreateSession && (
              <button className="button-primary" onClick={() => setShowCreateSession(true)}>
                회차 생성
              </button>
            )}
          </div>
        </div>
        {!canManageSessions && (
          <Notice>승인 또는 공개 중인 콘텐츠에서만 회차를 생성·관리할 수 있습니다.</Notice>
        )}
        {showCreateSession && (
          <SessionForm
            initialValues={defaultSessionForm()}
            inheritedPrice={content.reservationPrice}
            submitLabel="회차 생성 요청"
            onSubmit={createSession}
            onCancel={() => setShowCreateSession(false)}
          />
        )}
        {sessionError && (
          <Notice tone="red">
            {sessionError}{" "}
            <button className="text-link-button" onClick={refreshSessions}>
              다시 시도
            </button>
          </Notice>
        )}
        <div className="operator-session-list">
          {sessionLoading && sessions.length === 0 ? (
            <p className="operator-page-state">회차를 불러오는 중입니다.</p>
          ) : sessions.length === 0 ? (
            <p className="operator-page-state">표시할 회차가 없습니다.</p>
          ) : (
            sessions.map((session) => {
              const isScheduled = session.status === "SCHEDULED";
              const isFuture = new Date(session.startsAt).getTime() > Date.now();
              const pendingChange = session.pendingChangeRequest;
              return (
                <article key={session.sessionId}>
                  <div className="operator-session-summary">
                    <div>
                      <StatusPill tone={sessionStatusTones[session.status]}>
                        {sessionStatusLabels[session.status]}
                      </StatusPill>
                      {pendingChange && <StatusPill tone="amber">변경 심사 대기</StatusPill>}
                    </div>
                    <h3>
                      {new Date(session.startsAt).toLocaleString("ko-KR", {
                        timeZone: "Asia/Seoul",
                      })}
                    </h3>
                    <p>
                      정원 {session.capacity}명 · 잔여 {session.remainingCapacity}명
                    </p>
                    {pendingChange && (
                      <p>
                        변경안:{" "}
                        {new Date(pendingChange.candidate.startsAt).toLocaleString("ko-KR", {
                          timeZone: "Asia/Seoul",
                        })}{" "}
                        · 정원 {pendingChange.candidate.capacity}명
                      </p>
                    )}
                    {session.rejectReason && <p>반려 사유: {session.rejectReason}</p>}
                    {session.cancellationReason && <p>취소 사유: {session.cancellationReason}</p>}
                    <small>회차 #{session.sessionId}</small>
                  </div>
                  <div className="operator-session-actions">
                    <button
                      className="button-outline"
                      disabled={reservationLoading}
                      onClick={() => loadSessionReservations(session.sessionId)}
                    >
                      {reservationLoading && selectedReservationSessionId === session.sessionId
                        ? "예약자 조회 중…"
                        : "예약자 보기"}
                    </button>
                    {canManageSessions && isScheduled && isFuture && !pendingChange && (
                      <>
                        <button
                          className="button-outline"
                          onClick={() => {
                            setChangingSessionId(session.sessionId);
                            setCancellingSessionId(null);
                          }}
                        >
                          변경 요청
                        </button>
                        <button
                          className="button-danger"
                          onClick={() => {
                            setCancellingSessionId(session.sessionId);
                            setChangingSessionId(null);
                            setCancelError(null);
                          }}
                        >
                          회차 취소
                        </button>
                      </>
                    )}
                  </div>
                  {changingSessionId === session.sessionId && (
                    <SessionForm
                      initialValues={defaultSessionForm(session)}
                      inheritedPrice={content.reservationPrice}
                      submitLabel="변경 심사 요청"
                      onSubmit={(request) => changeSession(session.sessionId, request)}
                      onCancel={() => setChangingSessionId(null)}
                    />
                  )}
                  {cancellingSessionId === session.sessionId && (
                    <div className="operator-command-form operator-cancel-confirm">
                      <h4>회차를 취소할까요?</h4>
                      <p>확정 예약도 함께 취소될 수 있습니다. 취소 후에는 되돌릴 수 없습니다.</p>
                      <label>
                        취소 사유
                        <textarea
                          value={cancellationReason}
                          maxLength={500}
                          onChange={(event) => setCancellationReason(event.target.value)}
                        />
                      </label>
                      {cancelError && <Notice tone="red">{cancelError}</Notice>}
                      <div className="operator-form-actions">
                        <button
                          className="button-outline"
                          onClick={() => setCancellingSessionId(null)}
                        >
                          돌아가기
                        </button>
                        <button
                          className="button-danger"
                          disabled={cancelBusy}
                          onClick={() => cancelSession(session.sessionId)}
                        >
                          {cancelBusy ? "취소 처리 중…" : "취소 확정"}
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
        {selectedReservationSessionId && (
          <section className="operator-reservation-panel" aria-live="polite">
            <div className="operator-section-heading">
              <div>
                <h2>회차 예약자 목록</h2>
                <p>회차 #{selectedReservationSessionId}</p>
              </div>
            </div>
            {reservationLoading && (
              <p className="operator-page-state">예약자 목록을 불러오는 중입니다.</p>
            )}
            {reservationError && <Notice tone="red">{reservationError}</Notice>}
            {sessionReservations && sessionReservations.reservations.length === 0 && (
              <p className="operator-page-state">이 회차에는 예약자가 없습니다.</p>
            )}
            {sessionReservations && sessionReservations.reservations.length > 0 && (
              <div className="operator-reservation-list">
                {sessionReservations.reservations.map((reservation) => (
                  <article key={reservation.reservationId}>
                    <div>
                      <StatusPill
                        tone={
                          reservation.status === "CONFIRMED"
                            ? "green"
                            : reservation.status === "CHECKED_IN"
                              ? "blue"
                              : "gray"
                        }
                      >
                        {reservationStatusLabels[reservation.status]}
                      </StatusPill>
                      <h3>{reservation.participant.name}</h3>
                      <p>{reservation.participant.phone ?? "연락처 없음"}</p>
                    </div>
                    <dl>
                      <div>
                        <dt>예약번호</dt>
                        <dd>{reservation.reservationNo}</dd>
                      </div>
                      <div>
                        <dt>예약 인원</dt>
                        <dd>{reservation.quantity}명</dd>
                      </div>
                      <div>
                        <dt>체크인</dt>
                        <dd>{reservation.checkIn.checkedIn ? "체크인 완료" : "미체크인"}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </section>
    </section>
  );
}

export function CreateContentRevisionPage() {
  const { contentId = "" } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState<OperatorContentDetail | null>(null);
  const [values, setValues] = useState<ContentRevisionFormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    getOperatorContent(contentId, controller.signal)
      .then((detail) => {
        setContent(detail);
        setValues(initialRevisionFields(detail));
      })
      .catch((requestError: unknown) =>
        setError(errorMessage(requestError, "콘텐츠를 불러오지 못했습니다.")),
      );
    return () => controller.abort();
  }, [contentId]);

  if (error && !content) {
    return (
      <section className="page-container narrow-page">
        <Notice tone="red">{error}</Notice>
      </section>
    );
  }
  if (!content || !values) {
    return <section className="operator-page-state">수정본 정보를 준비하는 중입니다.</section>;
  }

  const publishAtRequired = content.status !== "PUBLISHED";
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validateRevision(values, publishAtRequired);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await createContentRevision(contentId, revisionRequest(values));
      writeCachedRevision({
        revisionId: result.revisionId,
        contentId: result.contentId,
        status: result.status,
        fields: values,
      });
      navigate(`/operator/content-revisions/${result.revisionId}/edit`);
    } catch (requestError) {
      setError(commandErrorMessage(requestError, "수정본을 생성하지 못했습니다."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="page-container">
      <Breadcrumbs
        items={[
          { label: "콘텐츠 관리", to: "/operator/contents" },
          { label: content.title, to: `/operator/contents/${contentId}` },
          { label: "수정본 생성" },
        ]}
      />
      <PageHeader
        title="콘텐츠 수정본 생성"
        description="현재 콘텐츠 정보를 바탕으로 심사할 수정 후보를 작성합니다."
      />
      <form className="operator-command-form" onSubmit={submit}>
        <ContentRevisionFieldsForm
          values={values}
          onChange={setValues}
          publishAtRequired={publishAtRequired}
        />
        {error && <Notice tone="red">{error}</Notice>}
        <div className="operator-form-actions">
          <Link className="button-outline" to={`/operator/contents/${contentId}`}>
            취소
          </Link>
          <button className="button-primary" type="submit" disabled={submitting}>
            {submitting ? "생성 중…" : "수정본 생성 및 심사 요청"}
          </button>
        </div>
      </form>
    </section>
  );
}

export function EditContentRevisionPage() {
  const { revisionId = "" } = useParams();
  const initial = useMemo(() => readCachedRevision(revisionId), [revisionId]);
  const [revision, setRevision] = useState<CachedRevision | null>(initial);
  const [values, setValues] = useState<ContentRevisionFormState | null>(initial?.fields ?? null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawalReason, setWithdrawalReason] = useState("");

  if (!revision || !values) {
    return (
      <section className="page-container narrow-page">
        <PageHeader
          title="수정본을 불러올 수 없습니다."
          description="운영자용 수정본 조회 API가 없어 이 브라우저에서 생성하거나 편집한 수정본만 다시 열 수 있습니다."
        />
        <Link className="button-outline" to="/operator/contents">
          콘텐츠 목록으로
        </Link>
      </section>
    );
  }

  const publishAtRequired = Boolean(values.publishAt);
  const updateRevision = (next: CachedRevision) => {
    setRevision(next);
    writeCachedRevision(next);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validateRevision(values, publishAtRequired);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await updateContentRevision(revisionId, revisionRequest(values));
      updateRevision({ ...revision, status: result.status, fields: values });
      setSuccess("수정 결과가 저장되었습니다.");
    } catch (requestError) {
      setError(commandErrorMessage(requestError, "수정본을 저장하지 못했습니다."));
    } finally {
      setSubmitting(false);
    }
  };
  const withdraw = async () => {
    if (!withdrawalReason.trim()) {
      setError("철회 사유를 입력해 주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await withdrawContentRevision(revisionId, withdrawalReason.trim());
      updateRevision({ ...revision, status: result.status, fields: values });
      setShowWithdraw(false);
      setSuccess("수정본이 철회되었습니다.");
    } catch (requestError) {
      setError(commandErrorMessage(requestError, "수정본을 철회하지 못했습니다."));
    } finally {
      setSubmitting(false);
    }
  };

  const editable = revision.status === "EDIT_REJECTED";
  const withdrawable = revision.status === "EDIT_REQUESTED";

  return (
    <section className="page-container">
      <Breadcrumbs
        items={[
          { label: "콘텐츠 관리", to: "/operator/contents" },
          { label: `수정본 #${revisionId}` },
        ]}
      />
      <PageHeader title="콘텐츠 수정본 편집" description={`원본 콘텐츠 #${revision.contentId}`}>
        <StatusPill
          tone={
            revision.status === "EDIT_REQUESTED"
              ? "amber"
              : revision.status === "EDIT_WITHDRAWN"
                ? "gray"
                : revision.status === "EDIT_REJECTED"
                  ? "red"
                  : "green"
          }
        >
          {revisionStatusLabels[revision.status]}
        </StatusPill>
      </PageHeader>
      {revision.status === "EDIT_REQUESTED" && (
        <Notice>심사 중인 수정본은 내용이 동결됩니다. 필요하면 철회할 수 있습니다.</Notice>
      )}
      {revision.status === "EDIT_WITHDRAWN" && (
        <Notice>이미 철회된 수정본입니다. 다시 철회할 수 없습니다.</Notice>
      )}
      {success && <Notice>{success}</Notice>}
      <form className="operator-command-form" onSubmit={submit}>
        <ContentRevisionFieldsForm
          values={values}
          onChange={setValues}
          publishAtRequired={publishAtRequired}
          disabled={!editable}
        />
        {error && <Notice tone="red">{error}</Notice>}
        <div className="operator-form-actions">
          <Link className="button-outline" to={`/operator/contents/${revision.contentId}`}>
            콘텐츠로 돌아가기
          </Link>
          {withdrawable && (
            <button className="button-danger" type="button" onClick={() => setShowWithdraw(true)}>
              수정본 철회
            </button>
          )}
          {editable && (
            <button className="button-primary" type="submit" disabled={submitting}>
              {submitting ? "저장 중…" : "수정본 저장"}
            </button>
          )}
        </div>
      </form>
      {showWithdraw && (
        <section className="operator-command-form operator-withdraw-panel">
          <h2>심사 중인 수정본을 철회할까요?</h2>
          <p>철회된 수정본은 다시 심사받을 수 없습니다.</p>
          <label>
            철회 사유
            <textarea
              value={withdrawalReason}
              onChange={(event) => setWithdrawalReason(event.target.value)}
            />
          </label>
          <div className="operator-form-actions">
            <button className="button-outline" onClick={() => setShowWithdraw(false)}>
              돌아가기
            </button>
            <button className="button-danger" disabled={submitting} onClick={withdraw}>
              {submitting ? "철회 중…" : "철회 확정"}
            </button>
          </div>
        </section>
      )}
    </section>
  );
}
