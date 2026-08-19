import { useState } from "react"
import { Link, NavLink, useNavigate } from "react-router-dom"
import type { AuthenticatedUser } from "../api/auth"

interface NavbarProps {
  loggedIn: boolean
  user: AuthenticatedUser | null
  onLogout: () => Promise<void>
  onDeleteAccount: () => Promise<void>
}

export default function Navbar({
  loggedIn,
  user,
  onLogout,
  onDeleteAccount,
}: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const visitorRole = user?.roleAssignments.find(
    (assignment) => assignment.role === "VISITOR",
  )
  const links = [
    ["홈", "/"],
    ["행사·체험", "/events"],
    ["지역 미션", "/missions"],
  ]

  const logout = async () => {
    setBusy(true)
    try {
      await onLogout()
      setMenuOpen(false)
      navigate("/")
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "로그아웃하지 못했습니다.",
      )
    } finally {
      setBusy(false)
    }
  }

  const deleteAccount = async () => {
    if (!window.confirm("회원탈퇴 후 계정은 복구할 수 없습니다. 탈퇴할까요?")) {
      return
    }
    setBusy(true)
    try {
      await onDeleteAccount()
      setMenuOpen(false)
      navigate("/")
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "회원탈퇴를 처리하지 못했습니다.",
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "rgba(247,248,245,0.92)",
        borderBottom: "1px solid var(--border)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "0 24px",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link to="/" className="brand">
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: "var(--green)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
              color: "#fff",
              fontFamily: "Outfit, sans-serif",
              flexShrink: 0,
            }}
          >
            S
          </div>
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "var(--text)",
              fontFamily: "Outfit, sans-serif",
            }}
          >
            Local Stamp
          </span>
        </Link>

        <div className="primary-nav">
          {links.map(([label, to]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              {label}
            </NavLink>
          ))}
        </div>

        {loggedIn ? (
          <div className="account-menu-wrap">
            <button
              className="account-trigger"
              onClick={() => setMenuOpen((value) => !value)}
              aria-expanded={menuOpen}
            >
              <span>방</span> 내 예약 · 내 계정
            </button>
            {menuOpen && (
              <div className="account-menu">
                <div className="account-menu-user">
                  <b>방문자 계정</b>
                  <small>
                    {visitorRole?.regionName ?? "Local Stamp 방문자 회원"}
                  </small>
                </div>
                {[
                  ["내 예약", "/reservations"],
                  ["내 방문 후기", "/reservations?tab=past"],
                  ["내 스탬프북", "/stampbook"],
                  ["내 지역 미션", "/missions"],
                  ["쿠폰함", "/coupons"],
                  ["운영자 재신청", "/operator-request"],
                ].map(([label, to]) => (
                  <Link key={label} to={to} onClick={() => setMenuOpen(false)}>
                    {label}
                  </Link>
                ))}
                <button disabled={busy} onClick={logout}>
                  로그아웃
                </button>
                <button disabled={busy} onClick={deleteAccount}>
                  회원탈퇴
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="guest-actions">
            <Link className="button-outline" to="/login">
              로그인
            </Link>
            <Link className="button-primary button-small" to="/signup">
              회원가입
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}
