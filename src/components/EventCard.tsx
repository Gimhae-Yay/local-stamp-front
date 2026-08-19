import { Link } from "react-router-dom"
import type { PublicContent } from "../api/public"
import { StatusPill } from "./PageElements"
import PresignedImage from "./PresignedImage"

export default function EventCard({
  content,
  onImageRefresh,
  compact = false,
}: {
  content: PublicContent
  onImageRefresh: (failedUrl?: string) => void
  compact?: boolean
}) {
  const reservationTone = content.reservationAvailable ? "green" : "gray"
  return (
    <Link
      to={`/events/${content.contentId}`}
      className={`event-card${compact ? " event-card-compact" : ""}`}
    >
      <PresignedImage
        src={content.representativeImageUrl}
        expiresAt={content.representativeImageUrlExpiresAt}
        alt={`${content.title} 대표 이미지`}
        onRefresh={onImageRefresh}
        style={{
          width: "100%",
          height: 106,
          objectFit: "cover",
          display: "block",
        }}
      />
      <div className="event-card-body">
        <div className="card-pills">
          <StatusPill tone={reservationTone}>
            {content.reservationAvailable ? "예약 가능" : "예약 마감"}
          </StatusPill>
        </div>
        <h3>{content.title}</h3>
        <p>{content.locationText}</p>
      </div>
    </Link>
  )
}
