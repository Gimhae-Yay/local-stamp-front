import { useState } from 'react'
import Hero from '../components/Hero'
import ExperienceSection from '../components/ExperienceSection'
import ActivitySection from '../components/ActivitySection'
import LoginCTA from '../components/LoginCTA'
import { useAppState } from '../components/AppLayout'
import type { Experience } from '../components/ExperienceCard'
import { Link } from 'react-router-dom'

const ongoingExps: Experience[] = [
  { id: 1, title: '김해 가야문화 체험', location: '김해시 가야의길 190', time: '오늘 10:00–16:00', badge: '진행 중', seats: '다음 회차 4자리 남음' },
  { id: 2, title: '대성동 고분 박물관 해설', location: '김해시 가야안길 126', time: '오늘 11:00–17:00', badge: '진행 중', seats: '다음 회차 8자리 남음' },
  { id: 3, title: '낙동강 생태 탐방', location: '김해시 생태원 일대', time: '8월 16일(토) 14:00', badge: '예약 가능', seats: '12자리 남음' },
]

const upcomingExps: Experience[] = [
  { id: 4, title: '분청도자기 원데이 클래스', location: '김해시 진례면', time: '8월 23일(토) 13:00', badge: '예약 가능', seats: '6자리 남음' },
  { id: 5, title: '봉리단길 로컬 산책', location: '김해시 봉황동', time: '8월 24일(일) 10:30', badge: '예약 가능', seats: '15자리 남음' },
  { id: 6, title: '가야왕도 야간 투어', location: '김해시 대성동', time: '8월 30일(토) 19:00', badge: '마감 임박', seats: '2자리 남음' },
]

export default function HomePage() {
  const { loggedIn, login, openRegionDialog } = useAppState()
  const [filter, setFilter] = useState('전체')
  const applyFilter = (list: Experience[]) => filter === '예약 가능' ? list.filter((event) => event.badge === '예약 가능') : list

  return (
    <>
      <Hero loggedIn={loggedIn} filter={filter} setFilter={setFilter} onLogin={login} onOpenRegion={openRegionDialog} />
      <ExperienceSection title="지금 진행 중인 체험" items={applyFilter(ongoingExps)} right={`진행 중인 콘텐츠 ${applyFilter(ongoingExps).length}개`} />
      <ExperienceSection title="곧 시작하는 체험" items={applyFilter(upcomingExps)} right={<Link to="/events">전체 행사·체험 보기 ›</Link>} />
      {loggedIn ? <ActivitySection /> : <LoginCTA />}
    </>
  )
}
