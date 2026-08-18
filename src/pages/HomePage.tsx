import { useEffect, useMemo, useState } from 'react'
import { getRegionHome } from '../api/public'
import Hero from '../components/Hero'
import ExperienceSection from '../components/ExperienceSection'
import ActivitySection from '../components/ActivitySection'
import LoginCTA from '../components/LoginCTA'
import { useAppState } from '../components/AppLayout'
import type { Experience } from '../components/ExperienceCard'
import { Link } from 'react-router-dom'

export default function HomePage() {
  const { loggedIn, region, regionId, openRegionDialog } = useAppState()
  const [filter, setFilter] = useState('전체')
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)

  useEffect(() => {
    if (!regionId) {
      setExperiences([])
      return
    }

    const controller = new AbortController()
    setIsLoading(true)
    setErrorMessage(null)
    getRegionHome(regionId, controller.signal)
      .then(({ ongoingContents, upcomingContents }) => {
        setExperiences([...ongoingContents, ...upcomingContents].map((content) => ({
          id: content.contentId,
          title: content.title,
          location: content.locationText,
          imageUrl: content.representativeImageUrl,
          reservationAvailable: content.reservationAvailable,
        })))
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setExperiences([])
        setErrorMessage(error instanceof Error ? error.message : '행사·체험을 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [regionId, requestVersion])

  const filteredExperiences = useMemo(
    () => filter === '예약 가능' ? experiences.filter((experience) => experience.reservationAvailable) : experiences,
    [experiences, filter],
  )

  return (
    <>
      <Hero region={region} loggedIn={loggedIn} filter={filter} setFilter={setFilter} onOpenRegion={openRegionDialog} />
      {isLoading && <section style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 40px', color: 'var(--text-muted)' }}>행사·체험을 불러오는 중입니다.</section>}
      {!isLoading && errorMessage && <section style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 40px' }}>
        <p style={{ color: 'var(--text-sub)', marginBottom: 12 }}>{errorMessage}</p>
        <button className="text-link-button" type="button" onClick={() => setRequestVersion((version) => version + 1)}>다시 시도</button>
      </section>}
      {!isLoading && !errorMessage && <ExperienceSection title="추천 행사·체험" items={filteredExperiences} right={<Link to="/events">전체 행사·체험 보기 ›</Link>} />}
      {loggedIn ? <ActivitySection /> : <LoginCTA />}
    </>
  )
}
