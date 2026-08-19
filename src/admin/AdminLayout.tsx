import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import { useAdminAuth } from "./AdminAuth"

const navigation = [
  {
    group: "공통",
    label: "운영 홈",
    icon: "⌂",
    path: "/region-admin",
    end: true,
  },
  {
    group: "P0 운영",
    label: "운영자 신청",
    icon: "◉",
    path: "/region-admin/operator-requests",
  },
  {
    group: "P0 운영",
    label: "콘텐츠 관리",
    icon: "▤",
    path: "/region-admin/contents/review",
  },
  {
    group: "P0 운영",
    label: "회차 관리",
    icon: "◫",
    path: "/region-admin/sessions",
  },
  {
    group: "P0 운영",
    label: "QR 예외",
    icon: "⌗",
    path: "/region-admin/qr-exceptions",
  },
  {
    group: "P1 혜택",
    label: "혜택 심사",
    icon: "◇",
    path: "/region-admin/stampbooks",
  },
]

export default function AdminLayout() {
  const { session, logout } = useAdminAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const assignment = session!.assignment

  const isActive = (path: string) => {
    if (path.endsWith("/contents/review"))
      return (
        location.pathname.includes("/contents") ||
        location.pathname.includes("/content-revisions") ||
        location.pathname.includes("/withdrawal-requests")
      )
    if (path.endsWith("/sessions"))
      return (
        location.pathname.includes("/sessions") ||
        location.pathname.includes("/session-revisions")
      )
    if (path.endsWith("/stampbooks"))
      return (
        location.pathname.includes("/stampbooks") ||
        location.pathname.includes("/missions")
      )
    return (
      location.pathname === path || location.pathname.startsWith(`${path}/`)
    )
  }

  const handleLogout = async () => {
    await logout()
    navigate("/region-admin/login", { replace: true })
  }

  return (
    <div className="ra-shell">
      <header className="ra-topbar">
        <div className="ra-brand">
          <span className="ra-brand-mark">S</span>
          <strong>Local Stamp</strong>
          <span className="ra-role-chip">지역 관리자 콘솔</span>
        </div>
        <div className="ra-account-row">
          <div className="ra-region-context">
            <small>담당 지역 · 지역 ID {assignment.regionId}</small>
            <strong>{assignment.regionName}</strong>
          </div>
          <span className="ra-avatar">관</span>
          <div className="ra-account-context">
            <strong>사용자 {session!.userId}</strong>
            <small>지역 관리자</small>
          </div>
          <button className="ra-button ra-button-small" onClick={handleLogout}>
            로그아웃
          </button>
        </div>
      </header>
      <aside className="ra-sidebar">
        {["공통", "P0 운영", "P1 혜택"].map((group) => (
          <section className="ra-nav-section" key={group}>
            <p>{group}</p>
            {navigation
              .filter((item) => item.group === group)
              .map((item) => {
                const active = isActive(item.path)
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    className={active ? "active" : ""}
                    aria-current={active ? "page" : undefined}
                  >
                    <span aria-hidden="true">{item.icon}</span>
                    {item.label}
                  </NavLink>
                )
              })}
          </section>
        ))}
        <div className="ra-sidebar-note">
          <strong>{assignment.regionName}</strong>서버에 등록된 담당 지역
          기준으로 모든 관리 업무가 제한됩니다.
        </div>
      </aside>
      <main className="ra-main">
        <div className="ra-main-inner">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
