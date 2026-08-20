import { useEffect, useRef, useState } from "react"
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom"
import { Brand, usePlatformAuth } from "./PlatformAdminAuth"

const navigation = [
  ["플랫폼 운영", "⌂", "운영 홈", "/admin"],
  ["플랫폼 운영", "⌖", "지역 관리", "/admin/regions"],
  ["계정·권한", "♙", "일반 사용자·지역 관리자 역할", "/admin/users"],
  ["거래 예외", "▣", "결제 불일치", "/admin/payment-discrepancies"],
  ["거래 예외", "↺", "환불 실패", "/admin/refund-failures"],
  ["거래 예외", "↯", "수동 전액 환불", "/admin/manual-refund"],
  ["최고 관리자 전용", "▣", "전체 관리자 계정", "/admin/admin-accounts"],
] as const

export default function PlatformLayout() {
  const { session, logout } = usePlatformAuth()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const isSuperAdmin = session?.grade === "SUPER_ADMIN"
  const visibleNavigation = navigation.filter(
    ([group]) => group !== "최고 관리자 전용" || isSuperAdmin,
  )

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [])

  return (
    <div className="pa-shell">
      <header className="pa-header">
        <Link to="/admin" className="pa-header-brand">
          <Brand />
          <span className="pa-console-pill">전체 관리자 콘솔</span>
        </Link>
        <div className="pa-account-wrap" ref={menuRef}>
          <button
            className="pa-account"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
          >
            <span className="pa-account-avatar">관</span>
            <span>사용자 {session?.userId}</span>
            <span className="pa-grade-pill">
              {isSuperAdmin ? "최고 관리자" : "플랫폼 관리자"}
            </span>
            <span>⌄</span>
          </button>
          {open && (
            <aside className="pa-account-popover">
              <div className="pa-popover-profile">
                <span className="pa-account-avatar">관</span>
                <div>
                  <strong>
                    {isSuperAdmin ? "최고 관리자" : "플랫폼 관리자"}
                  </strong>
                  <small>사용자 {session?.userId}</small>
                </div>
              </div>
              {Array.from(
                new Set(visibleNavigation.map(([group]) => group)),
              ).map((group) => (
                <section key={group}>
                  <h3>{group}</h3>
                  {visibleNavigation
                    .filter(([itemGroup]) => itemGroup === group)
                    .map(([, icon, label, path]) => (
                      <NavLink
                        key={path}
                        to={path}
                        end={path === "/admin"}
                        onClick={() => setOpen(false)}
                      >
                        <span>{icon}</span>
                        {label}
                        {group === "최고 관리자 전용" && <small>전용</small>}
                      </NavLink>
                    ))}
                </section>
              ))}
              <button
                className="pa-popover-logout"
                onClick={async () => {
                  await logout()
                  navigate("/admin/login", { replace: true })
                }}
              >
                로그아웃
              </button>
            </aside>
          )}
        </div>
      </header>
      <Outlet />
    </div>
  )
}
