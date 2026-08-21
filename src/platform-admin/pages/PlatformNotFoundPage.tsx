import { Link } from "react-router-dom";
import { PageHeader } from "../PlatformComponents";

export default function PlatformNotFoundPage() {
  return (
    <main className="pa-content">
      <PageHeader
        title="페이지를 찾을 수 없습니다"
        description="요청한 전체 관리자 콘솔 주소가 올바른지 확인해 주세요."
        action={
          <Link className="pa-button pa-button-primary" to="/admin">
            운영 홈으로 이동
          </Link>
        }
      />
      <section className="pa-state" aria-labelledby="pa-not-found-title">
        <span className="pa-not-found-code" aria-hidden="true">
          404
        </span>
        <h2 id="pa-not-found-title">존재하지 않는 관리자 페이지입니다.</h2>
        <p>메뉴에서 필요한 업무를 다시 선택하거나 운영 홈으로 이동해 주세요.</p>
      </section>
    </main>
  );
}
