import ExperienceCard, { type Experience } from './ExperienceCard'

interface ExperienceSectionProps {
  title: string
  items: Experience[]
  right?: React.ReactNode
}

export default function ExperienceSection({ title, items, right }: ExperienceSectionProps) {
  return (
    <section style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 40px' }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{title}</h2>
        {right && <span style={{ fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer' }}>{right}</span>}
      </div>

      {items.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {items.map(exp => <ExperienceCard key={exp.id} exp={exp} />)}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>
          해당하는 체험이 없습니다.
        </div>
      )}
    </section>
  )
}
