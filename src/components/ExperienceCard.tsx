import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Badge, { type BadgeType } from './Badge'

export interface Experience {
  id: number
  title: string
  location: string
  time: string
  badge: BadgeType
  seats: string
}

function PlaceholderImage() {
  return (
    <div style={{ position: 'relative', background: '#e8ede4', overflow: 'hidden', borderRadius: 'var(--radius-sm)', aspectRatio: '4/3', flexShrink: 0 }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <pattern id="hatch" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="16" stroke="#d0d9cb" strokeWidth="6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hatch)" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 12, color: '#8a9685', background: 'rgba(255,255,255,0.7)', borderRadius: 6, padding: '3px 10px' }}>
          대표 이미지
        </span>
      </div>
    </div>
  )
}

export default function ExperienceCard({ exp }: { exp: Experience }) {
  const [hovered, setHovered] = useState(false)
  const navigate = useNavigate()
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => navigate(`/events/${exp.id === 1 ? 'gaya-culture' : exp.id === 2 ? 'daeseong-tomb' : exp.id === 3 ? 'nakdong-eco' : exp.id === 4 ? 'buncheong-class' : exp.id === 5 ? 'bonghwang-walk' : 'gaya-night'}`)}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'box-shadow 0.18s, transform 0.18s',
        boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
        transform: hovered ? 'translateY(-2px)' : 'none',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <PlaceholderImage />
      <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        <Badge type={exp.badge} />
        <h3 style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.35, color: 'var(--text)', marginTop: 2 }}>{exp.title}</h3>
        <div style={{ fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.6 }}>
          <div>{exp.location}</div>
          <div>{exp.time}</div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)', marginTop: 4 }}>{exp.seats}</div>
      </div>
    </div>
  )
}
