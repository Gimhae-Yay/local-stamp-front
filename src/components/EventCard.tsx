import { Link } from 'react-router-dom'
import type { PublicContent } from '../api/public'
import { PlaceholderImage, StatusPill } from './PageElements'

export default function EventCard({ content, compact = false }: { content: PublicContent; compact?: boolean }) {
  const reservationTone = content.reservationAvailable ? 'green' : 'gray'
  return (
    <Link to={`/events/${content.contentId}`} className={`event-card${compact ? ' event-card-compact' : ''}`}>
      {content.representativeImageUrl
        ? <img src={content.representativeImageUrl} alt="" style={{ width: '100%', height: 106, objectFit: 'cover' }} />
        : <PlaceholderImage />}
      <div className="event-card-body">
        <div className="card-pills">
          <StatusPill tone={reservationTone}>{content.reservationAvailable ? '예약 가능' : '예약 마감'}</StatusPill>
        </div>
        <h3>{content.title}</h3>
        <p>{content.locationText}</p>
      </div>
    </Link>
  )
}
