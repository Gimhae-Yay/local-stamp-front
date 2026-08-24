import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { reapplyForOperator, type CreateOperatorResponse } from "../api/operatorRequest";
import { useAppState } from "../components/AppLayout";
import { Breadcrumbs, Notice, PageHeader, StatusPill } from "../components/PageElements";

function formatApplicationDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function OperatorRequestPage() {
  const {
    operatorApplication,
    operatorApplicationError,
    operatorApplicationLoading,
    refreshOperatorApplication,
    regionId,
    regions,
  } = useAppState();
  const [requestedRegionId, setRequestedRegionId] = useState(
    operatorApplication?.requestedRegionId ?? regionId,
  );
  const [businessInformation, setBusinessInformation] = useState("");
  const [result, setResult] = useState<CreateOperatorResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (operatorApplication?.status !== "REJECTED") return;
    setSubmitting(true);
    setError(null);
    try {
      const nextResult = await reapplyForOperator({
        requestedRegionId: Number(requestedRegionId),
        businessInformation: businessInformation.trim(),
      });
      setResult(nextResult);
      try {
        await refreshOperatorApplication();
      } catch {
        // 재신청 성공 응답으로 접수 상태를 표시하고 다음 조회에서 전역 상태를 동기화한다.
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "운영자 재신청을 제출하지 못했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const requestedRegion = regions.find(
    (region) => region.regionId === String(result?.requestedRegionId),
  );

  return (
    <section className="page-container narrow-page">
      <Breadcrumbs items={[{ label: "홈", to: "/" }, { label: "운영자 신청 현황" }]} />
      <PageHeader
        title="운영자 신청 현황"
        description="최근 운영자 신청의 심사 상태를 확인하고 반려된 신청을 보완할 수 있습니다."
      />

      {operatorApplicationLoading ? (
        <section className="visitor-page-state">운영자 신청 현황을 불러오는 중입니다.</section>
      ) : operatorApplicationError && !operatorApplication ? (
        <Notice tone="red">
          <p>{operatorApplicationError}</p>
          <button
            className="text-link-button"
            type="button"
            onClick={() => void refreshOperatorApplication().catch(() => undefined)}
          >
            다시 시도
          </button>
        </Notice>
      ) : !operatorApplication ? (
        <Notice>
          <p>운영자 신청 이력이 없습니다.</p>
          <Link to="/">홈으로 돌아가기</Link>
        </Notice>
      ) : result ? (
        <section className="operator-request-result">
          <StatusPill tone="amber">심사 대기</StatusPill>
          <h2>운영자 재신청이 접수되었습니다.</h2>
          <p>
            {requestedRegion?.name ?? `지역 #${result.requestedRegionId}`} 담당 관리자가 보완된 신청
            내용을 검토합니다.
          </p>
          <small>신청 번호 #{result.operatorApplicationId}</small>
          <Link className="button-primary" to="/">
            홈으로 돌아가기
          </Link>
        </section>
      ) : (
        <>
          <section className="operator-application-status-card">
            <div className="operator-application-status-heading">
              <StatusPill
                tone={
                  operatorApplication.status === "PENDING"
                    ? "amber"
                    : operatorApplication.status === "REJECTED"
                      ? "red"
                      : "green"
                }
              >
                {operatorApplication.status === "PENDING"
                  ? "심사 중"
                  : operatorApplication.status === "REJECTED"
                    ? "반려"
                    : "승인 완료"}
              </StatusPill>
              <h2>
                {operatorApplication.status === "PENDING"
                  ? "지역 관리자가 신청 내용을 검토하고 있습니다."
                  : operatorApplication.status === "REJECTED"
                    ? "신청 내용을 보완해 다시 제출해 주세요."
                    : "운영자 신청이 승인되었습니다."}
              </h2>
            </div>
            <dl>
              <div>
                <dt>신청 번호</dt>
                <dd>#{operatorApplication.operatorApplicationId}</dd>
              </div>
              <div>
                <dt>신청 지역</dt>
                <dd>{operatorApplication.requestedRegionName}</dd>
              </div>
              <div>
                <dt>신청일</dt>
                <dd>{formatApplicationDate(operatorApplication.createdAt)}</dd>
              </div>
              <div>
                <dt>심사일</dt>
                <dd>{formatApplicationDate(operatorApplication.reviewedAt)}</dd>
              </div>
            </dl>
            {operatorApplication.status === "REJECTED" && operatorApplication.rejectedReason && (
              <Notice tone="red">
                <strong>반려 사유</strong>
                <p>{operatorApplication.rejectedReason}</p>
              </Notice>
            )}
            {operatorApplication.status === "APPROVED" && (
              <Link className="button-primary" to="/operator">
                운영자 콘솔로 이동
              </Link>
            )}
          </section>

          {operatorApplication.status === "REJECTED" && (
            <form className="operator-request-form" onSubmit={submit}>
              <h2>운영자 재신청</h2>
              <p className="field-help">
                반려 사유를 확인하고 신청 지역과 사업자 정보를 보완해 주세요.
              </p>
              <label>
                신청 지역
                <select
                  value={requestedRegionId}
                  onChange={(event) => setRequestedRegionId(event.target.value)}
                  required
                >
                  <option value="" disabled>
                    지역을 선택하세요
                  </option>
                  {regions.map((region) => (
                    <option key={region.regionId} value={region.regionId}>
                      {region.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                사업자 정보
                <textarea
                  aria-label="사업자 정보"
                  value={businessInformation}
                  onChange={(event) => setBusinessInformation(event.target.value)}
                  placeholder="상호명, 사업자등록번호 등 심사에 필요한 정보를 입력하세요."
                  maxLength={2000}
                  required
                />
                <span className="character-count">{businessInformation.length} / 2,000자</span>
              </label>
              <p className="field-help">
                입력한 사업자 정보는 담당 지역 관리자의 신청 심사에 사용됩니다.
              </p>
              {error && <p className="form-error">{error}</p>}
              <button
                className="button-primary"
                type="submit"
                disabled={submitting || !requestedRegionId || !businessInformation.trim()}
              >
                {submitting ? "신청 제출 중…" : "운영자 재신청 제출"}
              </button>
            </form>
          )}
        </>
      )}
    </section>
  );
}
