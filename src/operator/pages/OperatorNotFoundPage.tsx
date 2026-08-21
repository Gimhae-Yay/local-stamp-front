import { Link } from "react-router-dom";
import { Breadcrumb, PageHeader } from "../OperatorComponents";

export default function OperatorNotFoundPage() {
  return (
    <>
      <Breadcrumb>운영자 콘솔 › 페이지를 찾을 수 없음</Breadcrumb>
      <PageHeader
        title="페이지를 찾을 수 없습니다"
        description="요청한 운영자 콘솔 주소가 올바른지 확인해 주세요."
        actions={
          <Link className="op-button op-button-primary" to="/operator">
            내 콘텐츠로 이동
          </Link>
        }
      />
      <section className="op-state" aria-labelledby="op-not-found-title">
        <div>
          <span className="op-not-found-code" aria-hidden="true">
            404
          </span>
          <h3 id="op-not-found-title">존재하지 않는 운영자 페이지입니다.</h3>
          <p>메뉴에서 필요한 업무를 다시 선택하거나 내 콘텐츠로 이동해 주세요.</p>
        </div>
      </section>
    </>
  );
}
