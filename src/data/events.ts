export type EventStatus = '진행 중' | '곧 시작' | '종료'
export type ReservationStatus = '예약 가능' | '예약 마감'

export interface LocalEvent {
  id: string
  title: string
  location: string
  address: string
  date: string
  time: string
  status: EventStatus
  reservationStatus: ReservationStatus
  seats: number
  description: string
}

export const events: LocalEvent[] = [
  { id: '101', title: '김해 가야문화 체험', location: '김해시 가야의길 190', address: '김해문화회관 1층', date: '8월 17일 (일)', time: '10:00–12:00', status: '진행 중', reservationStatus: '예약 가능', seats: 4, description: '김해의 가야 문화를 직접 보고, 만들고, 들어보는 주말 체험 프로그램' },
  { id: '102', title: '대성동 고분 박물관 해설', location: '김해시 가야안길 126', address: '대성동고분박물관', date: '8월 17일 (일)', time: '14:00–16:00', status: '진행 중', reservationStatus: '예약 가능', seats: 8, description: '전시 해설과 함께 가야 왕국의 역사를 만나는 시간' },
  { id: '103', title: '낙동강 생태 탐방', location: '김해시 생태원 일대', address: '김해시 생태원', date: '8월 16일 (토)', time: '14:00–16:00', status: '곧 시작', reservationStatus: '예약 가능', seats: 12, description: '낙동강의 생태와 계절 풍경을 걸으며 알아보는 탐방' },
  { id: '104', title: '분청도자기 원데이 클래스', location: '김해시 진례면', address: '진례문화센터', date: '8월 23일 (토)', time: '13:00–15:00', status: '곧 시작', reservationStatus: '예약 가능', seats: 6, description: '나만의 분청도자기를 만들어 보는 원데이 클래스' },
  { id: '105', title: '봉리단길 로컬 산책', location: '김해시 봉황동', address: '봉황동 주민센터', date: '8월 24일 (일)', time: '10:30–12:00', status: '곧 시작', reservationStatus: '예약 가능', seats: 15, description: '동네 이야기와 로컬 상점을 만나는 느린 산책' },
  { id: '106', title: '가야왕도 야간 투어', location: '김해시 대성동', address: '대성동고분박물관', date: '8월 30일 (토)', time: '19:00–21:00', status: '곧 시작', reservationStatus: '예약 가능', seats: 2, description: '밤의 가야왕도를 해설과 함께 돌아보는 투어' },
  { id: 'hanok-story', title: '김해한글박물관 이야기', location: '김해시 대성동', address: '김해한글박물관', date: '8월 31일 (일)', time: '11:00–12:30', status: '곧 시작', reservationStatus: '예약 마감', seats: 0, description: '한글과 지역 기록을 따라가는 박물관 해설' },
  { id: 'jeon-dong-pottery', title: '김해 전통주 빚기', location: '김해시 삼계동', address: '삼계생활문화센터', date: '9월 12일 (금)', time: '15:00–17:00', status: '곧 시작', reservationStatus: '예약 가능', seats: 5, description: '지역 쌀로 전통주를 빚고 맛보는 체험' },
  { id: 'daeseong-forest', title: '대성천 숲길 걷기', location: '김해시 장유동', address: '대성천 산책로', date: '9월 14일 (일)', time: '10:00–12:00', status: '곧 시작', reservationStatus: '예약 가능', seats: 16, description: '해설사와 함께 걷는 대성천 숲길' },
  { id: 'gaya-music', title: '가야금 연주 체험', location: '김해시 외동', address: '김해문화의전당', date: '9월 20일 (토)', time: '13:30–15:00', status: '곧 시작', reservationStatus: '예약 가능', seats: 7, description: '가야금의 소리를 직접 연주하며 알아보는 시간' },
  { id: 'museum-curator', title: '김해 미술관 큐레이터 투어', location: '김해시 구산동', address: '김해문화의전당', date: '9월 21일 (일)', time: '14:00–15:30', status: '곧 시작', reservationStatus: '예약 마감', seats: 0, description: '전시 기획자의 설명을 듣는 미술관 투어' },
  { id: 'bonghwang-market', title: '봉황대 달빛 산책', location: '김해시 봉황동', address: '봉황대 유적지', date: '9월 27일 (토)', time: '19:30–21:00', status: '곧 시작', reservationStatus: '예약 가능', seats: 11, description: '달빛 아래 유적지를 걷는 야간 산책' },
  { id: 'clay-architecture', title: '클레이아크 건축 체험', location: '김해시 진례면', address: '클레이아크 김해미술관', date: '9월 28일 (일)', time: '11:00–12:30', status: '곧 시작', reservationStatus: '예약 가능', seats: 4, description: '흙과 건축을 연결해 나만의 모형을 만드는 체험' },
  { id: 'gimhae-garden', title: '김해 도시정원 가꾸기', location: '김해시 내외동', address: '연지공원', date: '10월 4일 (토)', time: '10:00–12:00', status: '곧 시작', reservationStatus: '예약 가능', seats: 9, description: '시민 정원에서 계절 식물을 심고 돌보는 활동' },
  { id: 'gaya-food', title: '가야 식탁 로컬 쿠킹', location: '김해시 삼방동', address: '삼방생활문화센터', date: '10월 11일 (토)', time: '13:00–15:00', status: '곧 시작', reservationStatus: '예약 가능', seats: 14, description: '김해 식재료로 가야의 맛을 재해석하는 쿠킹 클래스' },
  { id: 'river-photography', title: '낙동강 노을 사진 산책', location: '김해시 대동면', address: '대동생태공원', date: '10월 12일 (일)', time: '17:00–19:00', status: '곧 시작', reservationStatus: '예약 가능', seats: 10, description: '해질녘 강변 풍경을 촬영하며 걷는 사진 산책' },
  { id: 'museum-night', title: '박물관의 밤, 가야 이야기', location: '김해시 구산동', address: '국립김해박물관', date: '10월 18일 (토)', time: '18:30–20:00', status: '곧 시작', reservationStatus: '예약 가능', seats: 3, description: '야간 개장 시간에 만나는 가야 역사 해설' },
  { id: 'bamboo-craft', title: '대나무 생활소품 만들기', location: '김해시 장유동', address: '장유도서관', date: '10월 25일 (토)', time: '14:00–16:00', status: '곧 시작', reservationStatus: '예약 가능', seats: 13, description: '대나무를 활용해 생활소품을 만드는 공예 체험' },
]

export const featuredEvents = events.slice(0, 6)

export const getEvent = (id?: string) => events.find((event) => event.id === id) ?? events[0]
