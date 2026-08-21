import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ConsoleNavIcon, type ConsoleNavIconName } from "../components/ConsoleNavIcon";
import { Brand, usePlatformAuth } from "./PlatformAdminAuth";

const navigation: Array<{
  group: string;
  icon: ConsoleNavIconName;
  label: string;
  accountLabel?: string;
  path: string;
}> = [
  {
    group: "플랫폼 관리",
    icon: "home",
    label: "운영 홈",
    path: "/admin",
  },
  {
    group: "플랫폼 관리",
    icon: "region",
    label: "지역 관리",
    path: "/admin/regions",
  },
  {
    group: "계정·권한",
    icon: "users",
    label: "사용자·권한 관리",
    accountLabel: "일반 사용자·지역 관리자 역할",
    path: "/admin/users",
  },
  {
    group: "거래 예외",
    icon: "payment",
    label: "결제 불일치",
    path: "/admin/payment-discrepancies",
  },
  {
    group: "거래 예외",
    icon: "refund",
    label: "환불 실패",
    path: "/admin/refund-failures",
  },
  {
    group: "거래 예외",
    icon: "manual-refund",
    label: "수동 전액 환불",
    path: "/admin/manual-refund",
  },
  {
    group: "최고 관리자 전용",
    icon: "admin",
    label: "전체 관리자 계정",
    path: "/admin/admin-accounts",
  },
];

export default function PlatformLayout() {
  const { session, logout } = usePlatformAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isSuperAdmin = session?.grade === "SUPER_ADMIN";
  const visibleNavigation = navigation.filter(
    ({ group }) => group !== "최고 관리자 전용" || isSuperAdmin,
  );
  const groups = Array.from(new Set(visibleNavigation.map(({ group }) => group)));

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const isActive = (path: string) =>
    path === "/admin"
      ? location.pathname === path
      : location.pathname === path || location.pathname.startsWith(`${path}/`);

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
            aria-haspopup="menu"
            aria-expanded={open}
          >
            <span className="pa-account-avatar">관</span>
            <span>사용자 {session?.userId}</span>
            <span className="pa-grade-pill">{isSuperAdmin ? "최고 관리자" : "플랫폼 관리자"}</span>
            <span aria-hidden="true">⌄</span>
          </button>
          {open && (
            <aside className="pa-account-popover" aria-label="전체 관리자 계정 메뉴">
              <div className="pa-popover-profile">
                <span className="pa-account-avatar">관</span>
                <div>
                  <strong>{isSuperAdmin ? "최고 관리자" : "플랫폼 관리자"}</strong>
                  <small>사용자 {session?.userId}</small>
                </div>
              </div>
              {groups.map((group) => (
                <section key={group}>
                  <h3>{group}</h3>
                  {visibleNavigation
                    .filter((item) => item.group === group)
                    .map((item) => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === "/admin"}
                        onClick={() => setOpen(false)}
                      >
                        <span className="pa-account-nav-icon">
                          <ConsoleNavIcon name={item.icon} />
                        </span>
                        {item.accountLabel ?? item.label}
                        {group === "최고 관리자 전용" && <small>전용</small>}
                      </NavLink>
                    ))}
                </section>
              ))}
              <button
                className="pa-popover-logout"
                onClick={async () => {
                  await logout();
                  navigate("/admin/login", { replace: true });
                }}
              >
                로그아웃
              </button>
            </aside>
          )}
        </div>
      </header>

      <aside className="pa-sidebar" aria-label="전체 관리자 메뉴">
        {groups.map((group) => (
          <section className="pa-nav-section" key={group}>
            <p>{group}</p>
            {visibleNavigation
              .filter((item) => item.group === group)
              .map((item) => {
                const active = isActive(item.path);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === "/admin"}
                    className={active ? "active" : ""}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className="pa-sidebar-icon">
                      <ConsoleNavIcon name={item.icon} />
                    </span>
                    <span className="pa-sidebar-label">{item.label}</span>
                  </NavLink>
                );
              })}
          </section>
        ))}
        <div className="pa-sidebar-note">
          <strong>{isSuperAdmin ? "최고 관리자 권한" : "플랫폼 관리자 권한"}</strong>
          현재 계정에 허용된 플랫폼 관리 기능만 표시됩니다.
        </div>
      </aside>

      <div className="pa-layout-main">
        <Outlet />
      </div>
    </div>
  );
}
