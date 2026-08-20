import { GreenButton } from "./Button";
import { useNavigate } from "react-router-dom";

export default function LoginCTA() {
  const navigate = useNavigate();
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 56px" }}>
      <div
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "36px 40px",
        }}
      >
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
          예약은 로그인 후 이용할 수 있어요.
        </p>
        <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 10, color: "var(--text)" }}>
          관심 있는 체험을 찾으셨나요?
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-sub)", marginBottom: 28 }}>
          로그인하면 예약, 예약 QR, 방문 후기까지 이어서 이용할 수 있습니다.
        </p>
        <GreenButton large fullWidth onClick={() => navigate("/login")}>
          로그인하고 예약하기
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </GreenButton>
      </div>
    </div>
  );
}
