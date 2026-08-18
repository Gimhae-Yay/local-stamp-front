import { useState } from 'react'
import Hero from '../components/Hero'
import ExperienceSection from '../components/ExperienceSection'
import ActivitySection from '../components/ActivitySection'
import LoginCTA from '../components/LoginCTA'
import { useAppState } from '../components/AppLayout'
import type { Experience } from '../components/ExperienceCard'
import { Link } from 'react-router-dom'

const featuredExps: Experience[] = [
  { id: '101', title: '김해 가야문화 체험', location: '김해시 가야의길 190', reservationAvailable: true },
  { id: '102', title: '대성동 고분 박물관 해설', location: '김해시 가야안길 126', reservationAvailable: true },
  { id: '103', title: '낙동강 생태 탐방', location: '김해시 생태원 일대', reservationAvailable: false },
  { id: '104', title: '분청도자기 원데이 클래스', location: '김해시 진례면', reservationAvailable: true },
  { id: '105', title: '봉리단길 로컬 산책', location: '김해시 봉황동', reservationAvailable: true },
  { id: '106', title: '가야왕도 야간 투어', location: '김해시 대성동', reservationAvailable: true },
]

export default function HomePage() {
  const { loggedIn, region, openRegionDialog } = useAppState()
  const [filter, setFilter] = useState('전체')
  const applyFilter = (list: Experience[]) => filter === '예약 가능' ? list.filter((event) => event.reservationAvailable) : list

  return (
    <>
      <Hero region={region} loggedIn={loggedIn} filter={filter} setFilter={setFilter} onOpenRegion={openRegionDialog} />
      <ExperienceSection title="추천 행사·체험" items={applyFilter(featuredExps)} right={<Link to="/events">전체 행사·체험 보기 ›</Link>} />
      {loggedIn ? <ActivitySection /> : <LoginCTA />}
    </>
  )
}
