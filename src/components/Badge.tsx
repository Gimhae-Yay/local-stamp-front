export type BadgeType = "진행 중" | "예정" | "예약 가능" | "예약 마감";

const badgeStyles: Record<BadgeType, { bg: string; color: string; border: string }> = {
  "진행 중": { bg: "var(--green-light)", color: "var(--green-dark)", border: "var(--green-mid)" },
  예정: { bg: "#edf4ff", color: "#41698e", border: "#c9d9ec" },
  "예약 가능": { bg: "var(--green-light)", color: "var(--green-dark)", border: "var(--green-mid)" },
  "예약 마감": { bg: "#f2f3f1", color: "#6f776e", border: "#d8dcd7" },
};

export default function Badge({ type }: { type: BadgeType }) {
  const s = badgeStyles[type];
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        borderRadius: 999,
        padding: "2px 10px",
        fontSize: 11,
        fontWeight: 600,
        display: "inline-block",
        fontFamily: "Outfit, sans-serif",
      }}
    >
      {type}
    </span>
  );
}
