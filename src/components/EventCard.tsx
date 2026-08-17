import { Link } from 'react-router-dom'
import type { LocalEvent } from '../data/events'
import { PlaceholderImage, StatusPill } from './PageElements'

export default function EventCard({ event, compact = false }: { event: LocalEvent; compact?: boolean }) {
  const reservationTone = event.reservationStatus === '마감 임박' ? 'amber' : event.reservationStatus === '예약 마감' ? 'gray' : 'green'
  return (
    <Link to={`/events/${event.id}`} className={`event-card${compact ? ' event-card-compact' : ''}`}>
      <PlaceholderImage />
      <div className="event-card-body">
        <div className="card-pills">
          <StatusPill tone={event.status === '진행 중' ? 'green' : 'blue'}>{event.status}</StatusPill>
          <StatusPill tone={reservationTone}>{event.reservationStatus}</StatusPill>
        </div>
        <h3>{event.title}</h3>
        <p>{event.location}</p>
        <div className="event-card-meta"><b>{event.date} {event.time}</b><strong>{event.seats ? `${event.seats}자리 남음` : '정원 마감'}</strong></div>
      </div>
    </Link>
  )
}
