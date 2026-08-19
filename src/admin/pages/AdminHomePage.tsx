import { Link } from "react-router-dom"
import { PageHeader, StatusBadge } from "../AdminComponents"
import { useAdminAuth } from "../AdminAuth"

const tasks = [
  [
    "운영자 신청",
    "사업자 정보와 요청 지역을 확인합니다.",
    "/region-admin/operator-requests",
    "◉",
  ],
  [
    "콘텐츠 관리",
    "콘텐츠 심사와 운영 상태를 관리합니다.",
    "/region-admin/contents/review",
    "▤",
  ],
  [
    "회차 관리",
    "추가 회차와 변경안을 검토합니다.",
    "/region-admin/sessions",
    "◫",
  ],
  [
    "QR 예외",
    "QR 실패와 보조 처리 기록을 조회합니다.",
    "/region-admin/qr-exceptions",
    "⌗",
  ],
  [
    "스탬프북 심사",
    "대상 콘텐츠와 보상 정책을 검토합니다.",
    "/region-admin/stampbooks",
    "◇",
  ],
  [
    "미션 심사",
    "지역 미션 조건과 이력을 확인합니다.",
    "/region-admin/missions",
    "◎",
  ],
]

export default function AdminHomePage() {
  const { session } = useAdminAuth()
  return (
    <>
      <PageHeader
        title="운영 홈"
        description="담당 지역의 운영 업무로 이동합니다."
      />
      <div className="ra-info-banner">
        <div>
          <strong>{session!.assignment.regionName} 담당 지역 관리자</strong>
          <span>
            사용자 ID {session!.userId} · 지역 ID {session!.assignment.regionId}
          </span>
        </div>
        <StatusBadge value="APPROVED" label="활성 역할" />
      </div>
      <div className="ra-task-grid">
        {tasks.map(([title, description, path, icon]) => (
          <Link className="ra-task-card" to={path} key={path}>
            <span className="ra-task-icon">{icon}</span>
            <h2>{title}</h2>
            <p>{description}</p>
            <strong>업무로 이동 →</strong>
          </Link>
        ))}
      </div>
    </>
  )
}
