import { Link } from "react-router-dom"
import { PageHeader } from "../PlatformComponents"
import { usePlatformAuth } from "../PlatformAdminAuth"

export default function PlatformHomePage() {
  const { session } = usePlatformAuth()
  return (
    <main className="pa-content pa-content-wide">
      <PageHeader
        title="플랫폼 운영"
        description="지역, 계정·권한, 거래 예외를 한 곳에서 관리합니다."
      />
      <section className="pa-nav-cards">
        <Link to="/admin/regions" className="pa-nav-card">
          <span className="pa-nav-icon">⌖</span>
          <h2>지역 관리</h2>
          <p>
            전체 지역의 공개 상태와 활성 지역 관리자 수를 확인하고 운영 상태를
            변경합니다.
          </p>
          <strong>지역 관리로 이동 →</strong>
        </Link>
        <Link to="/admin/users" className="pa-nav-card">
          <span className="pa-nav-icon">♙</span>
          <h2>계정·권한 관리</h2>
          <p>
            일반 사용자의 역할과 담당 지역을 확인하고 지역 관리자 역할을
            변경합니다.
          </p>
          <strong>계정·권한 관리로 이동 →</strong>
          {session?.grade === "SUPER_ADMIN" && (
            <span className="pa-exclusive-link">
              ▣ 최고 관리자 · 전체 관리자 계정
            </span>
          )}
        </Link>
        <Link to="/admin/payment-discrepancies" className="pa-nav-card">
          <span className="pa-nav-icon">↯</span>
          <h2>거래 예외 관리</h2>
          <p>
            결제 불일치와 환불 실패를 오래된 순서로 확인하고 필요한 조치를
            수행합니다.
          </p>
          <strong>거래 예외 관리로 이동 →</strong>
        </Link>
      </section>
      <div className="pa-notice pa-notice-orange">
        <strong>운영 범위 안내</strong>
        <span>
          현재 계약으로 확인 가능한 지역·권한·거래 예외 업무만 제공합니다.
          매출·성장·지역 성과·감사 통계는 표시하지 않습니다.
        </span>
      </div>
    </main>
  )
}
