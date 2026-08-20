import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useOperatorAuth } from "./OperatorAuth";

const navigation = [
  {
    group: "P0 운영",
    label: "내 콘텐츠",
    icon: "▤",
    path: "/operator",
    end: true,
  },
  {
    group: "P0 운영",
    label: "회차·예약 관리",
    icon: "◫",
    path: "/operator/reservations",
  },
  {
    group: "P0 운영",
    label: "현장 체크인",
    icon: "⌗",
    path: "/operator/check-in",
  },
  {
    group: "P1 혜택",
    label: "쿠폰 정책",
    icon: "◇",
    path: "/operator/coupon-policies",
  },
  {
    group: "P1 혜택",
    label: "지역 미션",
    icon: "◎",
    path: "/operator/missions",
  },
  {
    group: "P1 혜택",
    label: "스탬프북 만들기",
    icon: "▣",
    path: "/operator/stampbooks",
  },
];

export default function OperatorLayout() {
  const { session, logout } = useOperatorAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const assignment = session!.assignment;

  useEffect(() => {
    const outside = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  const active = (path: string) => {
    if (path === "/operator")
      return location.pathname === path || location.pathname.startsWith("/operator/contents");
    if (path === "/operator/reservations") return location.pathname.startsWith(path);
    return location.pathname.startsWith(path);
  };

  return (
    <div className="op-shell">
      <header className="op-topbar">
        <NavLink to="/operator" className="op-brand">
          <span className="op-brand-mark">S</span>
          <strong>Local Stamp</strong>
          <span className="op-role-chip">운영자 콘솔</span>
        </NavLink>
        <div className="op-account-row">
          <div className="op-region-context">
            <small>담당 지역 · 지역 ID {assignment.regionId}</small>
            <strong>{assignment.regionName ?? "담당 지역"}</strong>
          </div>
          <div className="op-account-wrap" ref={menuRef}>
            <button
              className="op-account"
              onClick={() => setMenuOpen((value) => !value)}
              aria-expanded={menuOpen}
            >
              <span className="op-avatar">운</span>
              <span>
                <strong>사용자 {session!.userId}</strong>
                <small>승인된 운영자</small>
              </span>
              <span>⌄</span>
            </button>
            {menuOpen && (
              <aside className="op-account-menu">
                <strong>운영자 계정</strong>
                <small>사용자 {session!.userId}</small>
                <div>
                  <span>담당 지역</span>
                  <strong>{assignment.regionName ?? `지역 #${assignment.regionId}`}</strong>
                </div>
                <button
                  onClick={async () => {
                    await logout();
                    navigate("/operator/login", { replace: true });
                  }}
                >
                  로그아웃
                </button>
              </aside>
            )}
          </div>
        </div>
      </header>
      <aside className="op-sidebar">
        {["P0 운영", "P1 혜택"].map((group) => (
          <section className="op-nav-group" key={group}>
            <p>{group}</p>
            {navigation
              .filter((item) => item.group === group)
              .map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={active(item.path) ? "active" : ""}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
          </section>
        ))}
        <div className="op-sidebar-note">
          <strong>{assignment.regionName ?? "담당 지역"}</strong>본인 소유 콘텐츠와 담당 지역 범위
          안에서만 업무를 처리합니다.
        </div>
      </aside>
      <main className="op-main">
        <div className="op-main-inner">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
