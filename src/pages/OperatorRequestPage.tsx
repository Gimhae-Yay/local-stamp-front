import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { reapplyForOperator, type CreateOperatorResponse } from "../api/operator";
import { useAppState } from "../components/AppLayout";
import { Breadcrumbs, Notice, PageHeader, StatusPill } from "../components/PageElements";

export default function OperatorRequestPage() {
  const { regionId, regions } = useAppState();
  const [requestedRegionId, setRequestedRegionId] = useState(regionId);
  const [businessInformation, setBusinessInformation] = useState("");
  const [result, setResult] = useState<CreateOperatorResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      setResult(
        await reapplyForOperator({
          requestedRegionId: Number(requestedRegionId),
          businessInformation,
        }),
      );
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
      <Breadcrumbs items={[{ label: "홈", to: "/" }, { label: "운영자 재신청" }]} />
      <PageHeader
        title="운영자 재신청"
        description="이전에 반려된 운영자 신청의 지역과 사업자 정보를 보완해 다시 제출하세요."
      />

      {result ? (
        <section className="operator-request-result">
          <StatusPill tone="amber">심사 대기</StatusPill>
          <h2>운영자 신청이 접수되었습니다.</h2>
          <p>
            {requestedRegion?.name ?? `지역 #${result.requestedRegionId}`} 담당 관리자가 신청 내용을
            검토합니다.
          </p>
          <small>신청 번호 #{result.operatorApplicationId}</small>
          <Link className="button-primary" to="/">
            홈으로 돌아가기
          </Link>
        </section>
      ) : (
        <>
          <Notice>
            이 화면은 이전 신청이 반려된 활성 회원만 사용할 수 있습니다. 최초 운영자 신청, 심사 중인
            신청, 이미 운영자 권한이 있는 계정은 Backend 정책에 따라 제출되지 않습니다.
          </Notice>
          <form className="operator-request-form" onSubmit={submit}>
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
        </>
      )}
    </section>
  );
}
