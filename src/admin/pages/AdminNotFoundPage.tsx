import { Link } from "react-router-dom";
import { PageHeader } from "../AdminComponents";

export default function AdminNotFoundPage() {
  return (
    <>
      <PageHeader
        title="페이지를 찾을 수 없습니다"
        description="요청한 지역 관리자 주소가 올바른지 확인해 주세요."
        actions={
          <Link className="ra-button ra-button-primary" to="/region-admin">
            운영 홈으로 이동
          </Link>
        }
      />
      <section className="ra-state" aria-labelledby="ra-not-found-title">
        <div className="ra-state-inner">
          <span className="ra-not-found-code" aria-hidden="true">
            404
          </span>
          <h3 id="ra-not-found-title">존재하지 않는 관리 페이지입니다.</h3>
          <p>메뉴에서 필요한 업무를 다시 선택하거나 운영 홈으로 이동해 주세요.</p>
        </div>
      </section>
    </>
  );
}
