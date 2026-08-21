import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { isAbortError } from "../../api/client";
import {
  createCouponPolicy,
  createMission,
  createStampbook,
  endCouponPolicy,
  endMission,
  endStampbook,
  getCouponPolicy,
  getMission,
  getStampbook,
  listCouponPolicies,
  listMissions,
  listMyContents,
  listStampbooks,
  publishCouponPolicy,
  publishStampbook,
  submitMission,
  updateCouponPolicy,
  updateMission,
  updateStampbook,
} from "../api";
import {
  ActionModal,
  apiErrorMessage,
  Breadcrumb,
  ConfirmModal,
  formatDate,
  formatMoney,
  PageHeader,
  RouteState,
  StatusBadge,
  statusLabel,
} from "../OperatorComponents";
import { useOperatorAuth } from "../OperatorAuth";
import type {
  ContentSummary,
  CouponPolicyDetail,
  CouponPolicySummary,
  MissionDetail,
  MissionInput,
  MissionSummary,
  OperatorStampbookDetail,
  OperatorStampbookSummary,
  StampbookDraft,
  StampbookInput,
} from "../types";

function toInputDate(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  })
    .format(date)
    .replace(" ", "T");
}

function toInstant(value: string) {
  return new Date(`${value}:00+09:00`).toISOString();
}

function toOffset(value: string) {
  return `${value}:00+09:00`;
}

export function CouponListPage() {
  const [items, setItems] = useState<CouponPolicySummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<CouponPolicyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [version, setVersion] = useState(0);
  const [modal, setModal] = useState<"publish" | "end" | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    listCouponPolicies(controller.signal)
      .then(({ couponPolicies }) => {
        setItems(couponPolicies);
        setSelectedId((current) =>
          couponPolicies.some((item) => item.couponPolicyId === current)
            ? current
            : (couponPolicies[0]?.couponPolicyId ?? ""),
        );
      })
      .catch((caught) => {
        if (!isAbortError(caught, controller.signal))
          setError(apiErrorMessage(caught, "쿠폰 정책을 불러오지 못했습니다."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [version]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    const controller = new AbortController();
    setError("");
    getCouponPolicy(selectedId, controller.signal)
      .then(setDetail)
      .catch((caught) => {
        if (!isAbortError(caught, controller.signal))
          setError(apiErrorMessage(caught, "쿠폰 정책 상세를 불러오지 못했습니다."));
      });
    return () => controller.abort();
  }, [selectedId, version]);

  const completed = (message: string) => {
    setModal(null);
    setNotice(message);
    setVersion((value) => value + 1);
  };
  return (
    <>
      <Breadcrumb>P1 혜택 › 쿠폰 정책</Breadcrumb>
      <PageHeader
        title="쿠폰 정책"
        description="내 콘텐츠에 연결된 쿠폰 정책을 생성하고 공개·종료 상태를 관리합니다."
        actions={
          <Link className="op-button op-button-primary" to="/operator/coupon-policies/new">
            ＋ 쿠폰 정책 만들기
          </Link>
        }
      />
      {notice && <div className="op-alert op-alert-success">{notice}</div>}
      {error && <div className="op-alert">{error}</div>}
      {loading ? (
        <RouteState loading />
      ) : items.length === 0 ? (
        <RouteState empty="생성된 쿠폰 정책이 없습니다." />
      ) : (
        <>
          <div className="op-info-banner">
            <div>
              <strong>총 {items.length}개 정책</strong>
              <span>단순 목록 · 검색/필터/페이지 없음</span>
            </div>
            <span>방문 · 미션 보상 · 스탬프북 완주</span>
          </div>
          <div className="op-split">
            <div className="op-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>정책 ID</th>
                    <th>정책명</th>
                    <th>콘텐츠</th>
                    <th>상태</th>
                    <th className="op-right">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.couponPolicyId}
                      className={selectedId === item.couponPolicyId ? "op-selected-row" : ""}
                    >
                      <td className="op-mono">{item.couponPolicyId}</td>
                      <td>
                        <span className="op-cell-title">{item.name}</span>
                      </td>
                      <td className="op-mono">{item.contentId}</td>
                      <td>
                        <StatusBadge value={item.status} />
                      </td>
                      <td className="op-right">
                        <button
                          className="op-button op-button-small"
                          onClick={() => setSelectedId(item.couponPolicyId)}
                        >
                          상세
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <aside className="op-panel">
              {detail ? (
                <>
                  <header>
                    <h2>{detail.name}</h2>
                    <StatusBadge value={detail.status} />
                  </header>
                  <div className="op-panel-body">
                    <dl className="op-kv-grid">
                      <div className="op-kv">
                        <dt>정책 ID</dt>
                        <dd>{detail.couponPolicyId}</dd>
                      </div>
                      <div className="op-kv">
                        <dt>콘텐츠 ID</dt>
                        <dd>{detail.contentId}</dd>
                      </div>
                      <div className="op-kv">
                        <dt>지역 ID</dt>
                        <dd>{detail.regionId}</dd>
                      </div>
                      <div className="op-kv">
                        <dt>발급 유형</dt>
                        <dd>{statusLabel(detail.issueSourceType)}</dd>
                      </div>
                      <div className="op-kv">
                        <dt>할인 금액</dt>
                        <dd>{formatMoney(detail.discountAmount)}</dd>
                      </div>
                      <div className="op-kv">
                        <dt>최소 결제</dt>
                        <dd>{formatMoney(detail.minimumPaymentAmount)}</dd>
                      </div>
                      <div className="op-kv">
                        <dt>발급 후 유효일</dt>
                        <dd>{detail.validDaysAfterIssue}일</dd>
                      </div>
                      <div className="op-kv">
                        <dt>발급 기간</dt>
                        <dd>
                          {formatDate(detail.issueStartsAt)}–{formatDate(detail.issueEndsAt)}
                        </dd>
                      </div>
                      <div className="op-kv">
                        <dt>발급 수량</dt>
                        <dd>
                          {detail.issuedCount} / {detail.totalIssueLimit ?? "무제한"}
                        </dd>
                      </div>
                      <div className="op-kv">
                        <dt>공개 시각</dt>
                        <dd>{formatDate(detail.publishedAt)}</dd>
                      </div>
                      <div className="op-kv">
                        <dt>종료 시각</dt>
                        <dd>{formatDate(detail.endedAt)}</dd>
                      </div>
                      <div className="op-kv op-full">
                        <dt>설명</dt>
                        <dd>{detail.description || "—"}</dd>
                      </div>
                    </dl>
                    <div className="op-button-row op-top-gap">
                      {detail.status === "DRAFT" && (
                        <>
                          <Link
                            className="op-button"
                            to={`/operator/coupon-policies/${detail.couponPolicyId}/edit`}
                          >
                            수정
                          </Link>
                          <button
                            className="op-button op-button-admin"
                            onClick={() => setModal("publish")}
                          >
                            정책 공개
                          </button>
                        </>
                      )}
                      {detail.status === "PUBLISHED" && (
                        <button
                          className="op-button op-button-danger-outline"
                          onClick={() => setModal("end")}
                        >
                          정책 종료
                        </button>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <RouteState loading />
              )}
            </aside>
          </div>
        </>
      )}
      {modal === "publish" && detail && (
        <ActionModal
          title="쿠폰 정책을 공개할까요?"
          description="초안 정책이 즉시 발급 가능한 공개 상태로 전환됩니다."
          label="공개 사유"
          confirmLabel="정책 공개"
          onClose={() => setModal(null)}
          onConfirm={async (reason) => {
            await publishCouponPolicy(detail.couponPolicyId, reason);
            completed("쿠폰 정책이 공개되었습니다.");
          }}
        />
      )}
      {modal === "end" && detail && (
        <ActionModal
          title="쿠폰 정책을 종료할까요?"
          description="공개 정책이 종료 상태로 전환됩니다."
          label="종료 사유"
          confirmLabel="정책 종료"
          tone="danger"
          onClose={() => setModal(null)}
          onConfirm={async (reason) => {
            await endCouponPolicy(detail.couponPolicyId, reason);
            completed("쿠폰 정책이 종료되었습니다.");
          }}
        />
      )}
    </>
  );
}

const emptyCoupon = {
  contentId: "",
  issueSourceType: "VISIT",
  name: "",
  description: "",
  discountAmount: "",
  minimumPaymentAmount: "0",
  validDaysAfterIssue: "30",
  totalIssueLimit: "",
  issueStartsAt: "",
  issueEndsAt: "",
  reason: "",
};

export type CouponDraft = typeof emptyCoupon;

const issueSourceTypes = new Set(["VISIT", "MISSION_REWARD", "STAMPBOOK_COMPLETION"]);

function parseInteger(value: string) {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function validateCouponDraft(draft: CouponDraft, editing = false) {
  const name = draft.name.trim();
  if (!/^[1-9]\d*$/.test(draft.contentId)) return "연결 콘텐츠를 선택해 주세요.";
  if (!issueSourceTypes.has(draft.issueSourceType)) return "발급 출처를 확인해 주세요.";
  if (!name) return "정책명을 입력해 주세요.";
  if (name.length > 255) return "정책명은 255자 이하로 입력해 주세요.";
  if (draft.description.length > 1_000) return "정책 설명은 1,000자 이하로 입력해 주세요.";

  const discountAmount = parseInteger(draft.discountAmount);
  if (discountAmount === null || discountAmount < 1)
    return "할인 금액은 1원 이상의 정수로 입력해 주세요.";

  const minimumPaymentAmount = parseInteger(draft.minimumPaymentAmount);
  if (minimumPaymentAmount === null || minimumPaymentAmount < discountAmount)
    return "최소 결제 금액은 할인 금액 이상의 정수로 입력해 주세요.";

  const validDaysAfterIssue = parseInteger(draft.validDaysAfterIssue);
  if (validDaysAfterIssue === null || validDaysAfterIssue < 1 || validDaysAfterIssue > 365)
    return "발급 후 유효일은 1일 이상 365일 이하로 입력해 주세요.";

  if (draft.totalIssueLimit) {
    const totalIssueLimit = parseInteger(draft.totalIssueLimit);
    if (totalIssueLimit === null || totalIssueLimit < 1)
      return "총 발급 한도는 1 이상의 정수로 입력해 주세요.";
  }

  const issueStartsAt = Date.parse(`${draft.issueStartsAt}:00+09:00`);
  const issueEndsAt = Date.parse(`${draft.issueEndsAt}:00+09:00`);
  if (!Number.isFinite(issueStartsAt) || !Number.isFinite(issueEndsAt))
    return "발급 시작 시각과 종료 시각을 입력해 주세요.";
  if (issueStartsAt >= issueEndsAt) return "발급 종료 시각은 시작 시각보다 뒤여야 합니다.";

  const reason = draft.reason.trim();
  if (editing && !reason) return "수정 사유를 입력해 주세요.";
  if (editing && reason.length > 500) return "수정 사유는 500자 이하로 입력해 주세요.";
  return "";
}

export function CouponFormPage() {
  const { couponPolicyId } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(couponPolicyId);
  const [contents, setContents] = useState<ContentSummary[]>([]);
  const [draft, setDraft] = useState(emptyCoupon);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [policyStatus, setPolicyStatus] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setLoadError("");
    setPolicyStatus(null);
    Promise.all([
      listMyContents(controller.signal),
      couponPolicyId ? getCouponPolicy(couponPolicyId, controller.signal) : Promise.resolve(null),
    ])
      .then(([contentData, policy]) => {
        setContents(
          contentData.contents.filter((item) => ["APPROVED", "PUBLISHED"].includes(item.status)),
        );
        if (policy) {
          setPolicyStatus(policy.status);
          setDraft({
            contentId: policy.contentId,
            issueSourceType: policy.issueSourceType,
            name: policy.name,
            description: policy.description ?? "",
            discountAmount: String(policy.discountAmount),
            minimumPaymentAmount: String(policy.minimumPaymentAmount),
            validDaysAfterIssue: String(policy.validDaysAfterIssue),
            totalIssueLimit: policy.totalIssueLimit === null ? "" : String(policy.totalIssueLimit),
            issueStartsAt: toInputDate(policy.issueStartsAt),
            issueEndsAt: toInputDate(policy.issueEndsAt),
            reason: "",
          });
        } else
          setDraft((current) => ({
            ...current,
            contentId:
              contentData.contents.find((item) => ["APPROVED", "PUBLISHED"].includes(item.status))
                ?.contentId ?? "",
          }));
      })
      .catch((caught) => {
        if (!isAbortError(caught, controller.signal))
          setLoadError(apiErrorMessage(caught, "정책 입력 정보를 불러오지 못했습니다."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [couponPolicyId]);
  const set = (key: keyof typeof draft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const validationError = validateCouponDraft(draft, editing);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    const input = {
      contentId: draft.contentId,
      issueSourceType: draft.issueSourceType,
      name: draft.name.trim(),
      description: draft.description.trim(),
      discountAmount: Number(draft.discountAmount),
      minimumPaymentAmount: Number(draft.minimumPaymentAmount),
      validDaysAfterIssue: Number(draft.validDaysAfterIssue),
      totalIssueLimit: draft.totalIssueLimit ? Number(draft.totalIssueLimit) : null,
      issueStartsAt: toInstant(draft.issueStartsAt),
      issueEndsAt: toInstant(draft.issueEndsAt),
    };
    try {
      if (couponPolicyId)
        await updateCouponPolicy(couponPolicyId, {
          name: input.name,
          description: input.description,
          discountAmount: input.discountAmount,
          minimumPaymentAmount: input.minimumPaymentAmount,
          validDaysAfterIssue: input.validDaysAfterIssue,
          totalIssueLimit: input.totalIssueLimit,
          issueStartsAt: input.issueStartsAt,
          issueEndsAt: input.issueEndsAt,
          reason: draft.reason.trim(),
        });
      else await createCouponPolicy(input);
      navigate("/operator/coupon-policies", { replace: true });
    } catch (caught) {
      setError(apiErrorMessage(caught, "쿠폰 정책을 저장하지 못했습니다."));
      setSubmitting(false);
    }
  };
  if (loading) return <RouteState loading />;
  if (loadError) return <RouteState error={loadError} />;
  if (editing && policyStatus !== "DRAFT")
    return <RouteState error="초안 상태의 쿠폰 정책만 수정할 수 있습니다." />;
  return (
    <>
      <Breadcrumb>쿠폰 정책 › {editing ? "정책 수정" : "새 정책 만들기"}</Breadcrumb>
      <PageHeader
        title={editing ? "쿠폰 정책 수정" : "쿠폰 정책 만들기"}
        description={
          editing
            ? "초안 상태의 발급 조건과 기간·한도를 수정합니다."
            : "발급 출처와 할인 조건, 발급 기간·한도를 설정해 초안 정책을 생성합니다."
        }
      />
      <form className="op-form-shell" onSubmit={submit}>
        <article className="op-panel">
          <header>
            <h2>정책 정보</h2>
            <StatusBadge value="DRAFT" />
          </header>
          <div className="op-panel-body">
            <div className="op-form-grid">
              <label className="op-field">
                연결 콘텐츠
                <select
                  className="op-control"
                  value={draft.contentId}
                  onChange={(event) => set("contentId", event.target.value)}
                  disabled={editing}
                  required
                >
                  <option value="">선택</option>
                  {contents.map((item) => (
                    <option key={item.contentId} value={item.contentId}>
                      {item.title} ({item.contentId})
                    </option>
                  ))}
                </select>
              </label>
              <label className="op-field">
                발급 출처
                <select
                  className="op-control"
                  value={draft.issueSourceType}
                  onChange={(event) => set("issueSourceType", event.target.value)}
                  disabled={editing}
                >
                  <option value="VISIT">방문</option>
                  <option value="MISSION_REWARD">미션 보상</option>
                  <option value="STAMPBOOK_COMPLETION">스탬프북 완주</option>
                </select>
              </label>
              <Text
                label="정책명"
                value={draft.name}
                set={(value) => set("name", value)}
                maxLength={255}
                full
              />
              <Area
                label="정책 설명"
                value={draft.description}
                set={(value) => set("description", value)}
                maxLength={1000}
                required={false}
                full
              />
              <NumberField
                label="할인 금액 (원)"
                value={draft.discountAmount}
                set={(value) => set("discountAmount", value)}
                min="1"
              />
              <NumberField
                label="최소 결제 금액 (원)"
                value={draft.minimumPaymentAmount}
                set={(value) => set("minimumPaymentAmount", value)}
                min="0"
              />
              <NumberField
                label="발급 후 유효일"
                value={draft.validDaysAfterIssue}
                set={(value) => set("validDaysAfterIssue", value)}
                min="1"
                max="365"
              />
              <NumberField
                label="총 발급 한도 (비우면 무제한)"
                value={draft.totalIssueLimit}
                set={(value) => set("totalIssueLimit", value)}
                min="1"
                required={false}
              />
              <DateTime
                label="발급 시작 시각"
                value={draft.issueStartsAt}
                set={(value) => set("issueStartsAt", value)}
              />
              <DateTime
                label="발급 종료 시각"
                value={draft.issueEndsAt}
                set={(value) => set("issueEndsAt", value)}
              />
              {editing && (
                <Area
                  label="수정 사유"
                  value={draft.reason}
                  set={(value) => set("reason", value)}
                  maxLength={500}
                  full
                />
              )}
            </div>
          </div>
        </article>
        <aside className="op-action-card">
          <h2>{editing ? "수정 저장" : "정책 생성"}</h2>
          <p>
            {editing
              ? "초안 상태를 유지하며 변경값을 저장합니다."
              : "생성 직후 상태는 초안이며 공개 전에 수정할 수 있습니다."}
          </p>
          <button className="op-button op-button-primary" disabled={submitting}>
            {submitting ? "저장 중…" : editing ? "수정 내용 저장" : "쿠폰 정책 초안 생성"}
          </button>
          {error && <div className="op-alert">{error}</div>}
          <Link className="op-button" to="/operator/coupon-policies">
            취소하고 목록으로
          </Link>
        </aside>
      </form>
    </>
  );
}

export function MissionListPage() {
  const [items, setItems] = useState<MissionSummary[]>([]);
  const [detail, setDetail] = useState<MissionDetail | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [total, setTotal] = useState({ elements: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [version, setVersion] = useState(0);
  const [modal, setModal] = useState<"submit" | "end" | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    listMissions(status, page, size, controller.signal)
      .then((result) => {
        setItems(result.content);
        setTotal({ elements: result.totalElements, pages: result.totalPages });
        setSelectedId((current) =>
          result.content.some((item) => item.missionId === current)
            ? current
            : (result.content[0]?.missionId ?? ""),
        );
      })
      .catch((caught) => {
        if (!isAbortError(caught, controller.signal))
          setError(apiErrorMessage(caught, "미션 목록을 불러오지 못했습니다."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [status, page, size, version]);
  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    const controller = new AbortController();
    getMission(selectedId, controller.signal)
      .then(setDetail)
      .catch((caught) => {
        if (!isAbortError(caught, controller.signal))
          setError(apiErrorMessage(caught, "미션 상세를 불러오지 못했습니다."));
      });
    return () => controller.abort();
  }, [selectedId, version]);
  const refresh = (message: string) => {
    setModal(null);
    setNotice(message);
    setVersion((value) => value + 1);
  };
  return (
    <>
      <Breadcrumb>P1 혜택 › 지역 미션</Breadcrumb>
      <PageHeader
        title="지역 미션"
        description="방문 횟수 또는 대상 콘텐츠 세트 조건으로 미션을 구성하고 심사를 요청합니다."
        actions={
          <Link className="op-button op-button-primary" to="/operator/missions/new">
            ＋ 미션 초안 만들기
          </Link>
        }
      />
      {notice && <div className="op-alert op-alert-success">{notice}</div>}
      {error && <div className="op-alert">{error}</div>}
      <div className="op-filter-bar">
        <div className="op-filter-row">
          <label className="op-field">
            상태
            <select
              className="op-control"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(0);
              }}
            >
              <option value="">전체 상태</option>
              <option value="DRAFT">초안</option>
              <option value="PENDING_REVIEW">심사 대기</option>
              <option value="PUBLISHED">공개</option>
              <option value="ENDED">종료</option>
            </select>
          </label>
          <label className="op-field">
            페이지 크기
            <select
              className="op-control"
              value={size}
              onChange={(event) => {
                setSize(Number(event.target.value));
                setPage(0);
              }}
            >
              <option value="20">20개</option>
              <option value="50">50개</option>
              <option value="100">100개</option>
            </select>
          </label>
        </div>
        <div>
          <strong>총 {total.elements}개</strong>
          <small>미션 ID 내림차순</small>
        </div>
      </div>
      {loading ? (
        <RouteState loading />
      ) : items.length === 0 ? (
        <RouteState empty="조건에 맞는 미션이 없습니다." />
      ) : (
        <div className="op-split">
          <div>
            <div className="op-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>미션 ID</th>
                    <th>조건 유형</th>
                    <th>종료 예정</th>
                    <th>상태</th>
                    <th className="op-right">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.missionId}
                      className={item.missionId === selectedId ? "op-selected-row" : ""}
                    >
                      <td className="op-mono">{item.missionId}</td>
                      <td>{statusLabel(item.conditionType)}</td>
                      <td>{formatDate(item.endsAt)}</td>
                      <td>
                        <StatusBadge value={item.status} />
                      </td>
                      <td className="op-right">
                        <button
                          className="op-button op-button-small"
                          onClick={() => setSelectedId(item.missionId)}
                        >
                          상세
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <nav className="op-pagination">
              <button
                className="op-page-button"
                disabled={page === 0}
                onClick={() => setPage((value) => value - 1)}
              >
                ‹
              </button>
              <span>
                {page + 1} / {Math.max(total.pages, 1)}
              </span>
              <button
                className="op-page-button"
                disabled={page + 1 >= total.pages}
                onClick={() => setPage((value) => value + 1)}
              >
                ›
              </button>
            </nav>
          </div>
          <aside className="op-panel">
            {detail ? (
              <>
                <header>
                  <h2>{detail.title || `미션 #${detail.missionId}`}</h2>
                  <StatusBadge value={detail.status} />
                </header>
                <div className="op-panel-body">
                  <dl className="op-kv-grid">
                    <div className="op-kv">
                      <dt>미션 ID</dt>
                      <dd>{detail.missionId}</dd>
                    </div>
                    <div className="op-kv">
                      <dt>조건 유형</dt>
                      <dd>{statusLabel(detail.conditionType)}</dd>
                    </div>
                    <div className="op-kv">
                      <dt>필요 방문</dt>
                      <dd>{detail.requiredVisitCount ?? "해당 없음"}</dd>
                    </div>
                    <div className="op-kv">
                      <dt>보상 쿠폰 정책</dt>
                      <dd>#{detail.rewardCouponPolicyId}</dd>
                    </div>
                    <div className="op-kv">
                      <dt>종료 예정</dt>
                      <dd>{formatDate(detail.endsAt)}</dd>
                    </div>
                    <div className="op-kv op-full">
                      <dt>대상 콘텐츠</dt>
                      <dd>{detail.targetContents.map((item) => item.title).join(", ")}</dd>
                    </div>
                  </dl>
                  <div className="op-button-row op-top-gap">
                    {detail.status === "DRAFT" && (
                      <>
                        <Link
                          className="op-button"
                          to={`/operator/missions/${detail.missionId}/edit`}
                        >
                          초안 수정
                        </Link>
                        <button
                          className="op-button op-button-admin"
                          onClick={() => setModal("submit")}
                        >
                          심사 요청
                        </button>
                      </>
                    )}
                    {detail.status === "PUBLISHED" && (
                      <button
                        className="op-button op-button-danger-outline"
                        onClick={() => setModal("end")}
                      >
                        미션 종료
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <RouteState loading />
            )}
          </aside>
        </div>
      )}
      {modal === "submit" && detail && (
        <ConfirmModal
          title="미션 심사를 요청할까요?"
          description="초안이 심사 대기 상태로 전환되며 심사 중에는 수정할 수 없습니다."
          confirmLabel="심사 요청"
          onClose={() => setModal(null)}
          onConfirm={async () => {
            await submitMission(detail.missionId);
            refresh("미션 심사 요청이 접수되었습니다.");
          }}
        />
      )}
      {modal === "end" && detail && (
        <ActionModal
          title="미션을 조기 종료할까요?"
          description="공개 미션을 종료 상태로 전환합니다."
          label="종료 사유"
          initialReason="MISSION_OPERATION_SCHEDULE_CHANGED"
          reasonOptions={missionEndReasons}
          confirmLabel="미션 종료"
          tone="danger"
          onClose={() => setModal(null)}
          onConfirm={async (reason) => {
            await endMission(detail.missionId, reason);
            refresh("미션이 종료되었습니다.");
          }}
        />
      )}
    </>
  );
}

const missionEndReasons = [
  {
    value: "MISSION_OPERATION_SCHEDULE_CHANGED",
    label: "운영 일정 변경",
  },
  {
    value: "MISSION_TARGET_CONTENT_UNAVAILABLE",
    label: "목표 콘텐츠 운영 불가",
  },
  {
    value: "MISSION_REWARD_POLICY_UNAVAILABLE",
    label: "보상 정책 운영 불가",
  },
  {
    value: "MISSION_OPERATION_SAFETY_CONCERN",
    label: "안전 문제",
  },
];

const emptyMission = {
  title: "",
  conditionType: "VISIT_COUNT",
  requiredVisitCount: "",
  targetContentIds: [] as string[],
  rewardCouponPolicyId: "",
  endsAt: "",
};

export function MissionFormPage() {
  const { missionId } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(missionId);
  const [contents, setContents] = useState<ContentSummary[]>([]);
  const [coupons, setCoupons] = useState<CouponPolicySummary[]>([]);
  const [draft, setDraft] = useState(emptyMission);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      listMyContents(controller.signal),
      listCouponPolicies(controller.signal),
      missionId ? getMission(missionId, controller.signal) : Promise.resolve(null),
    ])
      .then(([contentData, couponData, mission]) => {
        const available = contentData.contents.filter((item) =>
          ["APPROVED", "PUBLISHED"].includes(item.status),
        );
        setContents(available);
        setCoupons(couponData.couponPolicies);
        if (mission) {
          setDraft({
            title: mission.title,
            conditionType: mission.conditionType,
            requiredVisitCount:
              mission.requiredVisitCount === null ? "" : String(mission.requiredVisitCount),
            targetContentIds: mission.targetContents.map((item) => item.contentId),
            rewardCouponPolicyId: mission.rewardCouponPolicyId,
            endsAt: toInputDate(mission.endsAt),
          });
        } else
          setDraft((current) => ({
            ...current,
            rewardCouponPolicyId: couponData.couponPolicies[0]?.couponPolicyId ?? "",
          }));
      })
      .catch((caught) => {
        if (!isAbortError(caught, controller.signal))
          setError(apiErrorMessage(caught, "미션 입력 정보를 불러오지 못했습니다."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [missionId]);
  const set = (key: keyof typeof draft, value: string | string[]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const toggleContent = (id: string) =>
    set(
      "targetContentIds",
      draft.targetContentIds.includes(id)
        ? draft.targetContentIds.filter((item) => item !== id)
        : [...draft.targetContentIds, id],
    );
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const input: MissionInput = {
      title: draft.title.trim(),
      conditionType: draft.conditionType,
      requiredVisitCount:
        draft.conditionType === "VISIT_COUNT" ? Number(draft.requiredVisitCount) : null,
      targetContentIds: draft.targetContentIds,
      rewardCouponPolicyId: draft.rewardCouponPolicyId,
      endsAt: toOffset(draft.endsAt),
    };
    try {
      if (missionId) {
        await updateMission(missionId, input);
      } else {
        await createMission(input);
      }
      navigate("/operator/missions", { replace: true });
    } catch (caught) {
      setError(apiErrorMessage(caught, "미션을 저장하지 못했습니다."));
      setSubmitting(false);
    }
  };
  if (loading) return <RouteState loading />;
  return (
    <>
      <Breadcrumb>지역 미션 › {editing ? `미션 #${missionId} 수정` : "새 미션 초안"}</Breadcrumb>
      <PageHeader
        title={editing ? "미션 초안 수정" : "미션 초안 만들기"}
        description="미션 제목과 참여 조건, 보상 쿠폰, 종료 시각을 설정합니다."
      />
      <form className="op-form-shell" onSubmit={submit}>
        <article className="op-panel">
          <header>
            <h2>미션 구성</h2>
            <StatusBadge value="DRAFT" />
          </header>
          <div className="op-panel-body">
            <div className="op-form-grid">
              <Text
                label="미션 제목"
                value={draft.title}
                set={(value) => set("title", value)}
                full
              />
              <label className="op-field">
                조건 유형
                <select
                  className="op-control"
                  value={draft.conditionType}
                  onChange={(event) => set("conditionType", event.target.value)}
                >
                  <option value="VISIT_COUNT">방문 횟수</option>
                  <option value="CONTENT_SET">콘텐츠 세트</option>
                </select>
              </label>
              {draft.conditionType === "VISIT_COUNT" && (
                <NumberField
                  label="필요 방문 횟수"
                  value={draft.requiredVisitCount}
                  set={(value) => set("requiredVisitCount", value)}
                  min="1"
                />
              )}
              <div className="op-full">
                <span className="op-field">대상 콘텐츠</span>
                <div className="op-list-cards op-top-gap">
                  {contents.map((item) => (
                    <label className="op-list-card" key={item.contentId}>
                      <input
                        type="checkbox"
                        checked={draft.targetContentIds.includes(item.contentId)}
                        onChange={() => toggleContent(item.contentId)}
                      />
                      <div>
                        <strong>{item.title}</strong>
                        <small>콘텐츠 ID {item.contentId}</small>
                      </div>
                      {draft.targetContentIds.includes(item.contentId) && (
                        <StatusBadge value="APPROVED" />
                      )}
                    </label>
                  ))}
                </div>
              </div>
              <label className="op-field">
                보상 쿠폰 정책
                <select
                  className="op-control"
                  value={draft.rewardCouponPolicyId}
                  onChange={(event) => set("rewardCouponPolicyId", event.target.value)}
                  required
                >
                  <option value="">선택</option>
                  {coupons.map((item) => (
                    <option key={item.couponPolicyId} value={item.couponPolicyId}>
                      {item.name} (#{item.couponPolicyId}, {statusLabel(item.status)})
                    </option>
                  ))}
                </select>
              </label>
              <DateTime
                label="종료 시각"
                value={draft.endsAt}
                set={(value) => set("endsAt", value)}
              />
            </div>
          </div>
        </article>
        <aside className="op-action-card">
          <h2>{editing ? "수정 저장" : "초안 생성"}</h2>
          <p>대상 콘텐츠와 보상 쿠폰은 Backend가 동일 담당 지역 범위인지 검증합니다.</p>
          <button
            className="op-button op-button-primary"
            disabled={
              submitting ||
              (draft.conditionType === "CONTENT_SET" && draft.targetContentIds.length === 0)
            }
          >
            {submitting ? "저장 중…" : editing ? "수정 내용 저장" : "미션 초안 생성"}
          </button>
          {error && <div className="op-alert">{error}</div>}
          <Link className="op-button" to="/operator/missions">
            취소하고 목록으로
          </Link>
        </aside>
      </form>
    </>
  );
}

type StampbookFormDraft = Omit<StampbookInput, "regionId">;

const emptyStampbookWorkspaceDraft: StampbookFormDraft = {
  title: "",
  contentIds: [],
  rewardCouponPolicyId: "",
  reason: "",
};

export function validateStampbookDraft(draft: StampbookFormDraft) {
  if (!draft.title.trim()) return "스탬프북 제목을 입력해 주세요.";
  if (draft.title.trim().length > 100) return "스탬프북 제목은 100자 이하로 입력해 주세요.";
  if (draft.contentIds.length === 0) return "대상 콘텐츠를 하나 이상 선택해 주세요.";
  if (!draft.rewardCouponPolicyId) return "완주 보상 쿠폰을 선택해 주세요.";
  if (!draft.reason.trim()) return "생성·수정 사유를 입력해 주세요.";
  if (draft.reason.trim().length > 500) return "생성·수정 사유는 500자 이하로 입력해 주세요.";
  return "";
}

export function StampbookListPage() {
  const [items, setItems] = useState<OperatorStampbookSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    listStampbooks(controller.signal)
      .then(({ stampbooks }) => setItems(stampbooks))
      .catch((caught) => {
        if (!isAbortError(caught, controller.signal))
          setError(apiErrorMessage(caught, "스탬프북 목록을 불러오지 못했습니다."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  return (
    <>
      <Breadcrumb>P1 혜택 › 스탬프북</Breadcrumb>
      <PageHeader
        title="스탬프북"
        description="담당 지역과 소유 콘텐츠 범위의 스탬프북을 조회하고 관리합니다."
        actions={
          <Link className="op-button op-button-primary" to="/operator/stampbooks/new">
            ＋ 스탬프북 만들기
          </Link>
        }
      />
      {loading ? (
        <RouteState loading />
      ) : error ? (
        <RouteState error={error} />
      ) : items.length === 0 ? (
        <RouteState empty="생성된 스탬프북이 없습니다." />
      ) : (
        <div className="op-table-wrap op-top-gap">
          <table>
            <thead>
              <tr>
                <th>스탬프북 ID</th>
                <th>제목</th>
                <th>대상 수</th>
                <th>상태</th>
                <th>공개·종료 시각</th>
                <th className="op-right">액션</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.stampbookId}>
                  <td className="op-mono">{item.stampbookId}</td>
                  <td>{item.title}</td>
                  <td>{item.targetCount}개</td>
                  <td>
                    <StatusBadge value={item.status} />
                  </td>
                  <td>{formatDate(item.endedAt ?? item.publishedAt)}</td>
                  <td className="op-right">
                    <Link
                      className="op-button op-button-small"
                      to={`/operator/stampbooks/${item.stampbookId}`}
                    >
                      상세
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export function StampbookDetailPage() {
  const { stampbookId = "" } = useParams();
  const [detail, setDetail] = useState<OperatorStampbookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"publish" | "end" | null>(null);
  const [notice, setNotice] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    getStampbook(stampbookId, controller.signal)
      .then(setDetail)
      .catch((caught) => {
        if (!isAbortError(caught, controller.signal))
          setError(apiErrorMessage(caught, "스탬프북 상세를 불러오지 못했습니다."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [stampbookId, version]);

  if (loading) return <RouteState loading />;
  if (!detail) return <RouteState error={error || "스탬프북을 찾을 수 없습니다."} />;

  return (
    <>
      <Breadcrumb>P1 혜택 › 스탬프북 › #{detail.stampbookId}</Breadcrumb>
      <PageHeader
        title={detail.title}
        description={`스탬프북 #${detail.stampbookId}의 현재 서버 상세입니다.`}
        actions={
          <Link className="op-button" to="/operator/stampbooks">
            목록으로
          </Link>
        }
      />
      {notice && <div className="op-alert op-alert-success">{notice}</div>}
      <div className="op-form-shell op-top-gap">
        <article className="op-panel">
          <header>
            <h2>구성 상세</h2>
            <StatusBadge value={detail.status} />
          </header>
          <div className="op-panel-body">
            <dl className="op-kv-grid">
              <div className="op-kv">
                <dt>스탬프북 ID</dt>
                <dd>{detail.stampbookId}</dd>
              </div>
              <div className="op-kv">
                <dt>지역 ID</dt>
                <dd>{detail.regionId}</dd>
              </div>
              <div className="op-kv">
                <dt>보상 쿠폰 정책</dt>
                <dd>#{detail.rewardCouponPolicy.couponPolicyId}</dd>
              </div>
              <div className="op-kv">
                <dt>보상 정책 상태</dt>
                <dd>{statusLabel(detail.rewardCouponPolicy.status)}</dd>
              </div>
              <div className="op-kv op-full">
                <dt>공개 시각</dt>
                <dd>{formatDate(detail.publishedAt)}</dd>
              </div>
              <div className="op-kv op-full">
                <dt>종료 시각</dt>
                <dd>{formatDate(detail.endedAt)}</dd>
              </div>
              <div className="op-kv op-full">
                <dt>대상 콘텐츠</dt>
                <dd>
                  {detail.targetContents
                    .map((item) => `${item.title} (#${item.contentId})`)
                    .join(", ")}
                </dd>
              </div>
            </dl>
          </div>
        </article>
        <aside className="op-action-card">
          <h2>가능한 처리</h2>
          {detail.status === "DRAFT" && (
            <>
              <Link className="op-button" to={`/operator/stampbooks/${detail.stampbookId}/edit`}>
                초안 수정
              </Link>
              <button className="op-button op-button-admin" onClick={() => setModal("publish")}>
                공개 심사 요청
              </button>
            </>
          )}
          {detail.status === "PUBLISHED" && (
            <button className="op-button op-button-danger-outline" onClick={() => setModal("end")}>
              스탬프북 종료
            </button>
          )}
          {detail.status === "ENDED" && <p>이미 종료된 스탬프북입니다.</p>}
        </aside>
      </div>
      {modal === "publish" && (
        <ActionModal
          title="스탬프북 공개 심사를 요청할까요?"
          description="초안이 심사 대기 상태로 전환됩니다."
          label="심사 요청 사유"
          confirmLabel="공개 심사 요청"
          onClose={() => setModal(null)}
          onConfirm={async (reason) => {
            await publishStampbook(detail.stampbookId, reason);
            setNotice("스탬프북 공개 심사 요청이 접수되었습니다.");
            setModal(null);
            setVersion((value) => value + 1);
          }}
        />
      )}
      {modal === "end" && (
        <ActionModal
          title="스탬프북을 종료할까요?"
          description="공개 상태인 스탬프북과 미완료 진행이 종료됩니다."
          label="종료 사유"
          placeholder="예: 행사 운영 종료"
          confirmLabel="스탬프북 종료"
          tone="danger"
          onClose={() => setModal(null)}
          onConfirm={async (reason) => {
            await endStampbook(detail.stampbookId, reason);
            setNotice("스탬프북이 종료되었습니다.");
            setModal(null);
            setVersion((value) => value + 1);
          }}
        />
      )}
    </>
  );
}

export function StampbookFormPage() {
  const { stampbookId } = useParams();
  const navigate = useNavigate();
  const { session } = useOperatorAuth();
  const editing = Boolean(stampbookId);
  const [source, setSource] = useState<OperatorStampbookDetail | null>(null);
  const [contents, setContents] = useState<ContentSummary[]>([]);
  const [coupons, setCoupons] = useState<CouponPolicySummary[]>([]);
  const [draft, setDraft] = useState<StampbookFormDraft>({
    ...emptyStampbookWorkspaceDraft,
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      listMyContents(controller.signal),
      listCouponPolicies(controller.signal),
      stampbookId ? getStampbook(stampbookId, controller.signal) : Promise.resolve(null),
    ])
      .then(([contentData, couponData, stampbook]) => {
        setContents(contentData.contents);
        setCoupons(couponData.couponPolicies);
        setSource(stampbook);
        setDraft(
          stampbook
            ? {
                title: stampbook.title,
                contentIds: stampbook.targetContents.map((item) => item.contentId),
                rewardCouponPolicyId: stampbook.rewardCouponPolicy.couponPolicyId,
                reason: "",
              }
            : {
                ...emptyStampbookWorkspaceDraft,
                rewardCouponPolicyId: couponData.couponPolicies[0]?.couponPolicyId ?? "",
              },
        );
      })
      .catch((caught) => {
        if (!isAbortError(caught, controller.signal))
          setError(apiErrorMessage(caught, "스탬프북 입력 정보를 불러오지 못했습니다."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [stampbookId]);

  const eligible = useMemo(
    () => contents.filter((item) => ["APPROVED", "PUBLISHED"].includes(item.status)),
    [contents],
  );
  const toggle = (id: string) =>
    setDraft((current) => ({
      ...current,
      contentIds: current.contentIds.includes(id)
        ? current.contentIds.filter((item) => item !== id)
        : [...current.contentIds, id],
    }));

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validateStampbookDraft(draft);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!session) return;
    setSubmitting(true);
    setError("");
    const input = { ...draft, regionId: session.assignment.regionId };
    try {
      let created: StampbookDraft;
      if (editing && source) {
        const result = await updateStampbook(source.stampbookId, input);
        navigate(`/operator/stampbooks/${result.stampbookId}`, {
          replace: true,
        });
      } else {
        created = await createStampbook(input);
        navigate(`/operator/stampbooks/${created.stampbookId}`, {
          replace: true,
        });
      }
    } catch (caught) {
      setError(apiErrorMessage(caught, "스탬프북을 저장하지 못했습니다."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <RouteState loading />;
  if (editing && !source) return <RouteState error={error || "스탬프북을 찾을 수 없습니다."} />;
  if (editing && source?.status !== "DRAFT")
    return <RouteState error="초안 상태의 스탬프북만 수정할 수 있습니다." />;

  return (
    <>
      <Breadcrumb>P1 혜택 › 스탬프북 › {editing ? "초안 수정" : "새 스탬프북"}</Breadcrumb>
      <PageHeader
        title={editing ? "스탬프북 초안 수정" : "스탬프북 만들기"}
        description="대상 콘텐츠와 완주 보상 쿠폰 정책을 선택해 초안을 저장합니다."
      />
      <form className="op-form-shell" onSubmit={save}>
        <article className="op-panel">
          <header>
            <h2>스탬프북 구성</h2>
            <StatusBadge value={source?.status ?? "DRAFT"} />
          </header>
          <div className="op-panel-body">
            <div className="op-form-grid">
              <Text
                label="스탬프북 제목"
                value={draft.title}
                set={(value) => setDraft((current) => ({ ...current, title: value }))}
                maxLength={100}
                full
              />
              <label className="op-field">
                담당 지역
                <input
                  className="op-control"
                  value={`${session!.assignment.regionName ?? "담당 지역"} (${session!.assignment.regionId})`}
                  disabled
                />
              </label>
              <label className="op-field">
                완주 보상 쿠폰
                <select
                  className="op-control"
                  value={draft.rewardCouponPolicyId}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      rewardCouponPolicyId: event.target.value,
                    }))
                  }
                  required
                >
                  <option value="">선택</option>
                  {coupons.map((item) => (
                    <option key={item.couponPolicyId} value={item.couponPolicyId}>
                      {item.name} (#{item.couponPolicyId})
                    </option>
                  ))}
                </select>
              </label>
              <div className="op-full">
                <span className="op-field">대상 콘텐츠</span>
                <div className="op-list-cards op-top-gap">
                  {contents.map((item) => {
                    const available = eligible.some(
                      (candidate) => candidate.contentId === item.contentId,
                    );
                    return (
                      <label
                        className={`op-list-card${available ? "" : " disabled"}`}
                        key={item.contentId}
                      >
                        <input
                          type="checkbox"
                          checked={draft.contentIds.includes(item.contentId)}
                          disabled={!available}
                          onChange={() => toggle(item.contentId)}
                        />
                        <div>
                          <strong>{item.title}</strong>
                          <small>
                            콘텐츠 ID {item.contentId} · {statusLabel(item.status)}
                          </small>
                        </div>
                        {available ? (
                          draft.contentIds.includes(item.contentId) && (
                            <StatusBadge value="APPROVED" />
                          )
                        ) : (
                          <StatusBadge value="REJECTED" />
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
              <Area
                label={editing ? "수정 사유" : "생성 사유"}
                value={draft.reason}
                set={(value) => setDraft((current) => ({ ...current, reason: value }))}
                maxLength={500}
                full
              />
            </div>
          </div>
        </article>
        <aside className="op-action-card">
          <h2>{editing ? "수정 저장" : "초안 생성"}</h2>
          <p>저장 성공 후 Backend 상세 화면으로 이동합니다.</p>
          <button className="op-button op-button-primary" disabled={submitting}>
            {submitting ? "처리 중…" : editing ? "수정 내용 저장" : "스탬프북 초안 생성"}
          </button>
          {error && <div className="op-alert">{error}</div>}
          <Link className="op-button" to="/operator/stampbooks">
            취소하고 목록으로
          </Link>
        </aside>
      </form>
    </>
  );
}

function Text({
  label,
  value,
  set,
  full,
  maxLength,
}: {
  label: string;
  value: string;
  set: (value: string) => void;
  full?: boolean;
  maxLength?: number;
}) {
  return (
    <label className={`op-field${full ? " op-full" : ""}`}>
      {label}
      <input
        className="op-control"
        value={value}
        onChange={(event) => set(event.target.value)}
        maxLength={maxLength}
        required
      />
    </label>
  );
}
function Area({
  label,
  value,
  set,
  full,
  required = true,
  maxLength,
}: {
  label: string;
  value: string;
  set: (value: string) => void;
  full?: boolean;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <label className={`op-field${full ? " op-full" : ""}`}>
      {label}
      <textarea
        className="op-control"
        value={value}
        onChange={(event) => set(event.target.value)}
        required={required}
        maxLength={maxLength}
      />
    </label>
  );
}
function NumberField({
  label,
  value,
  set,
  min,
  max,
  required = true,
}: {
  label: string;
  value: string;
  set: (value: string) => void;
  min: string;
  max?: string;
  required?: boolean;
}) {
  return (
    <label className="op-field">
      {label}
      <input
        className="op-control"
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => set(event.target.value)}
        required={required}
      />
    </label>
  );
}
function DateTime({
  label,
  value,
  set,
}: {
  label: string;
  value: string;
  set: (value: string) => void;
}) {
  return (
    <label className="op-field">
      {label}
      <input
        className="op-control"
        type="datetime-local"
        value={value}
        onChange={(event) => set(event.target.value)}
        required
      />
    </label>
  );
}
