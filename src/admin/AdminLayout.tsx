import { useEffect, useRef, useState } from "react"
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

const accountNavigation = [
  { group: "공통", label: "운영 홈", icon: "⌂", path: "/region-admin" },
  {
    group: "심사 운영",
    label: "운영자 신청 심사",
    icon: "◉",
    path: "/region-admin/operator-requests",
  },
  {
    group: "심사 운영",
    label: "콘텐츠 최초 심사",
    icon: "▤",
    path: "/region-admin/contents/review",
  },
  {
    group: "심사 운영",
    label: "콘텐츠 수정본 심사",
    icon: "≠",
    path: "/region-admin/content-revisions",
  },
  {
    group: "심사 운영",
    label: "콘텐츠 철회 심사",
    icon: "↺",
    path: "/region-admin/withdrawal-requests",
  },
  {
    group: "심사 운영",
    label: "추가 회차 심사",
    icon: "◫",
    path: "/region-admin/sessions",
  },
  {
    group: "심사 운영",
    label: "회차 수정 심사",
    icon: "⇄",
    path: "/region-admin/session-revisions",
  },
  {
    group: "현장·혜택",
    label: "예약번호 조회·QR 예외",
    icon: "⌗",
    path: "/region-admin/qr-exceptions",
  },
  {
    group: "현장·혜택",
    label: "스탬프북 심사",
    icon: "◇",
    path: "/region-admin/stampbooks",
  },
  {
    group: "현장·혜택",
    label: "미션 심사",
    icon: "◎",
    path: "/region-admin/missions",
  },
]

export default function AdminLayout() {
  const { session, logout } = useAdminAuth()
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const assignment = session!.assignment

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node))
        setAccountMenuOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountMenuOpen(false)
    }
    document.addEventListener("mousedown", closeOnOutsideClick)
    document.addEventListener("keydown", closeOnEscape)
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick)
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [])

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
    setAccountMenuOpen(false)
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
          <div className="ra-account-wrap" ref={accountMenuRef}>
            <button
              className="ra-account-trigger"
              type="button"
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
              onClick={() => setAccountMenuOpen((open) => !open)}
            >
              <span className="ra-avatar">관</span>
              <span className="ra-account-context">
                <strong>사용자 {session!.userId}</strong>
                <small>지역 관리자</small>
              </span>
              <span className="ra-role-chip">지역 관리자</span>
              <span aria-hidden="true">⌄</span>
            </button>
            {accountMenuOpen && (
              <aside
                className="ra-account-popover"
                aria-label="지역 관리자 계정 메뉴"
              >
                <div className="ra-account-profile">
                  <span className="ra-avatar">관</span>
                  <div>
                    <strong>지역 관리자</strong>
                    <small>사용자 {session!.userId}</small>
                  </div>
                </div>
                <section className="ra-account-scope">
                  <h3>담당 범위</h3>
                  <strong>{assignment.regionName}</strong>
                  <small>지역 ID {assignment.regionId}</small>
                </section>
                <div className="ra-account-functions">
                  <h2>사용 가능한 기능</h2>
                  {["공통", "심사 운영", "현장·혜택"].map((group) => (
                    <section key={group}>
                      <h3>{group}</h3>
                      {accountNavigation
                        .filter((item) => item.group === group)
                        .map((item) => (
                          <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === "/region-admin"}
                            onClick={() => setAccountMenuOpen(false)}
                          >
                            <span aria-hidden="true">{item.icon}</span>
                            {item.label}
                          </NavLink>
                        ))}
                    </section>
                  ))}
                </div>
                <button
                  className="ra-account-logout"
                  type="button"
                  onClick={handleLogout}
                >
                  로그아웃
                </button>
              </aside>
            )}
          </div>
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
