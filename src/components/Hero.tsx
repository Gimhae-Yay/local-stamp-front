import { GreenButton } from "./Button";
import { useNavigate } from "react-router-dom";

function HowToCard() {
  const steps = [
    "지역의 행사·체험을 둘러봐요.",
    "원하는 회차를 예약해요.",
    "현장에서 QR로 체크인해요.",
  ];
  return (
    <div
      data-testid="visitor-how-to-card"
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "24px 26px",
        flex: "0 1 320px",
        width: "100%",
        maxWidth: 320,
        minWidth: 0,
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--text-muted)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        LOCAL STAMP 이용 방법
      </p>
      <h3
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "var(--text)",
          marginBottom: 24,
          lineHeight: 1.3,
        }}
      >
        탐색부터 체크인까지
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 999,
                background: "var(--green-mid)",
                color: "var(--green-dark)",
                fontSize: 12,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontFamily: "Outfit, sans-serif",
              }}
            >
              {i + 1}
            </div>
            <span
              style={{ fontSize: 14, color: "var(--text-sub)", lineHeight: 1.5, paddingTop: 2 }}
            >
              {s}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface HeroProps {
  region: string;
  loggedIn: boolean;
  filter: string;
  setFilter: (v: string) => void;
  onOpenRegion: () => void;
}

export default function Hero({ region, loggedIn, filter, setFilter, onOpenRegion }: HeroProps) {
  const navigate = useNavigate();
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px 32px" }}>
      {/* Top row */}
      <div style={{ display: "flex", gap: 40, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Left */}
        <div style={{ flex: "1 1 440px", minWidth: 0 }}>
          <button
            onClick={onOpenRegion}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              background: "var(--surface)",
              border: "1px solid var(--border-2)",
              borderRadius: 999,
              padding: "5px 14px",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--text-sub)",
              cursor: "pointer",
              marginBottom: 20,
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--green)"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
            {region}
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          <h1
            style={{
              fontSize: 40,
              fontWeight: 800,
              lineHeight: 1.2,
              color: "var(--text)",
              marginBottom: 14,
            }}
          >
            <span className="visitor-hero-title-line">
              {region}에서 할 일을
            </span>
            <span style={{ display: "block" }}>찾아보세요.</span>
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-sub)", lineHeight: 1.7, marginBottom: 28 }}>
            지역 행사·체험을 둘러보고,
            <br />
            원하는 회차의 예약을 시작할 수 있습니다.
          </p>
          <GreenButton onClick={() => navigate("/events")}>
            행사·체험 둘러보기
            <svg
              width="14"
              height="14"
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

        {/* Right */}
        {!loggedIn ? (
          <HowToCard />
        ) : (
          <div style={{ flex: "0 0 auto", paddingTop: 48 }}>
            <p
              style={{
                fontSize: 14,
                color: "var(--text-sub)",
                lineHeight: 1.8,
                textAlign: "right",
                maxWidth: 260,
              }}
            >
              행사·체험을 비교하고 원하는 회차를 선택해
              <br />
              예약을 진행할 수 있습니다.
            </p>
          </div>
        )}
      </div>

      {/* Content filter */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginTop: 32,
        }}
      >
        <span style={{ flex: 1, fontSize: 14, color: "var(--text-muted)" }}>
          {region} 행사·체험
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          {["전체", "예약 가능"].map((label) => (
            <button
              key={label}
              onClick={() => setFilter(label)}
              style={{
                padding: "7px 18px",
                borderRadius: "var(--radius-sm)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                border: filter === label ? "none" : "1px solid var(--border-2)",
                background: filter === label ? "var(--green)" : "var(--surface)",
                color: filter === label ? "#fff" : "var(--text-sub)",
                transition: "all 0.15s",
                fontFamily: "Outfit, sans-serif",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
