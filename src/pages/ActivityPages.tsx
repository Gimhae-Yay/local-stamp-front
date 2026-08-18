import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Breadcrumbs, InfoRow, Notice, PageHeader, StatusPill } from '../components/PageElements'
import { useAppState } from '../components/AppLayout'

export function ReviewPage() {
  const navigate = useNavigate()
  const [rating, setRating] = useState(0)
  const [review, setReview] = useState('')
  return <section className="page-container narrow-page"><PageHeader title="방문 후기를 남겨주세요" description="체크인이 완료된 방문에 대해 한 번 작성할 수 있어요."><Breadcrumbs items={[{ label: '홈', to: '/' }, { label: '내 예약', to: '/reservations' }, { label: '김해 가야문화 체험' }, { label: '후기 작성' }]} /></PageHeader>
    <div className="confirmation-grid review-layout"><section><h2>후기 내용</h2><label className="field-label">만족도 <em>필수</em></label><div className="stars" aria-label="만족도">{[1, 2, 3, 4, 5].map((star) => <button key={star} onClick={() => setRating(star)} aria-label={`${star}점`}>{star <= rating ? '★' : '☆'}</button>)}</div><p className="field-help">별점을 선택해 주세요.</p><label className="field-label" htmlFor="review">후기 <em>필수</em></label><textarea id="review" value={review} onChange={(event) => setReview(event.target.value)} maxLength={2000} placeholder="방문하며 좋았던 점이나 다른 방문자에게 도움이 될 내용을 남겨 주세요." /><span className="character-count">{review.length} / 2,000</span><button className="button-primary review-submit" disabled={!rating || !review.trim()} onClick={() => navigate('/reservations')}>후기 등록하기</button></section><section className="visited-content"><h2>방문한 콘텐츠</h2><article><StatusPill>체크인 완료</StatusPill><h3>김해 가야문화 체험</h3><p>2026년 8월 13일(목) 14:00–16:00<br />김해문화회관 1층</p></article><h3>작성 안내</h3><ul><li>후기는 콘텐츠 상세에 ‘인증 방문자’로 공개됩니다.</li><li>방문당 한 개의 후기만 작성할 수 있습니다.</li><li>등록 후 30일 동안 내용을 수정할 수 있습니다.</li></ul></section></div>
  </section>
}

export function CouponsPage() {
  const [openCouponId, setOpenCouponId] = useState<string | null>(null)
  return <section className="page-container narrow-page"><PageHeader title="쿠폰 지갑" description="보유한 쿠폰과 사용 내역을 확인하세요." action={<b className="green-text">사용 가능 쿠폰 2장</b>}><Breadcrumbs items={[{ label: '홈', to: '/' }, { label: '쿠폰 지갑' }]} /></PageHeader>
    <h2 className="content-title">보유 쿠폰</h2><div className="coupon-list"><Coupon couponId="1001" amount="3,000" content="10,000원 이상 결제 시 · 김해 가야문화 체험 재방문 시" expiry="2026년 8월 31일까지" isHistoryOpen={openCouponId === '1001'} onToggleHistory={() => setOpenCouponId((current) => current === '1001' ? null : '1001')} history={[{ symbol: '↶', title: '3,000원 할인 · 쿠폰 복구', sub: '예약 ID 123 · 카드 실패 ID 9001 · 할인 3,000원', date: '복구 2026. 08. 08 10:30' }]} /><Coupon couponId="1002" amount="5,000" content="20,000원 이상 결제 시 · 동해 바다 산책 예약 시" expiry="2026년 9월 15일까지" isHistoryOpen={openCouponId === '1002'} onToggleHistory={() => setOpenCouponId((current) => current === '1002' ? null : '1002')} history={[{ symbol: '✓', title: '지역 체험 5,000원 할인 · 사용 확정', sub: '예약 ID 94 · 카드 승인 ID 884 · 할인 5,000원', date: '사용 2026. 07. 21 14:05' }]} /></div><p className="coupon-note">쿠폰 적용 가능 여부와 최종 할인 금액은 예약 결제 단계에서 현재 회차와 결제 금액을 기준으로 다시 확인됩니다. 사용·복구 이력은 쿠폰별로 확인할 수 있습니다.</p>
  </section>
}

interface CouponHistoryItem {
  symbol: string
  title: string
  sub: string
  date: string
}

function Coupon({ couponId, amount, content, expiry, history, isHistoryOpen, onToggleHistory }: { couponId: string; amount: string; content: string; expiry: string; history: CouponHistoryItem[]; isHistoryOpen: boolean; onToggleHistory: () => void }) { return <article className="coupon"><div><StatusPill>사용 가능</StatusPill><b>{amount}<small>원 할인</small></b></div><div><p>{content}</p><small>방문 인증으로 발급</small><button className="coupon-history-toggle" type="button" aria-expanded={isHistoryOpen} aria-controls={`coupon-history-${couponId}`} onClick={onToggleHistory}>사용 이력 {isHistoryOpen ? '접기' : '보기'}</button></div><time>{expiry}<small>발급일 2026. 08. 01</small></time>{isHistoryOpen && <div className="coupon-usage-history" id={`coupon-history-${couponId}`}><h3>사용 · 복구 이력</h3>{history.length ? history.map((item) => <HistoryItem key={item.date} {...item} />) : <p>사용·복구 이력이 없습니다.</p>}</div>}</article> }
function HistoryItem({ symbol, title, sub, date }: { symbol: string; title: string; sub: string; date: string }) { return <article className="history-item"><span>{symbol}</span><div><b>{title}</b><small>{sub}</small></div><time>{date}</time></article> }

export function MissionsPage() {
  const { region, openRegionDialog } = useAppState()
  return <section className="page-container narrow-page"><PageHeader title="내 지역 미션" description="참여한 미션의 진행도와 완료 보상을 확인하세요." action={<button className="region-button" onClick={openRegionDialog}>✦ {region} · 지역 변경</button>}><Breadcrumbs items={[{ label: '홈', to: '/' }, { label: '내 지역 미션' }]} /></PageHeader>
    <div className="tab-row"><button className="active">진행 중 <b>2</b></button><button>완료 <b>1</b></button></div><div className="mission-list"><Mission count="2 / 3" title="김해 문화 한 바퀴" details="김해 가야문화 체험 · 대성동고분박물관 해설 · 낙동강 생태 탐방" date="8. 31. 종료" /><Mission count="1 / 3" title="김해에서 세 번 만나기" details="김해시의 행사·체험을 서로 다른 유형 방문으로 채워 보세요." date="9. 15. 종료" /></div><Notice>안내&nbsp; 완료 보상은 미션이 종료되기 전까지만 수령할 수 있습니다.</Notice>
  </section>
}

function Mission({ count, title, details, date }: { count: string; title: string; details: string; date: string }) { return <article className="mission-card"><div className="mission-count"><small>CONTENT_SET</small><b>{count}</b><span>콘텐츠 방문</span></div><div><StatusPill>참여 중</StatusPill><h2>{title}</h2><p>{details}</p><small>참여일 2026. 08. 07.</small><b className="mission-end">{date}</b></div><Link className="button-outline" to="/stampbook">미션 상세</Link></article> }

export function StampbookPage() {
  const { region, openRegionDialog } = useAppState()
  const [selected, setSelected] = useState('김해 문화 한 바퀴')
  const books = [['김해 문화 한 바퀴', '진행 중', '3 / 4개 적립'], ['김해 로컬 산책', '시작 전', '0 / 3개 적립'], ['가야 역사 산책', '종료', '2 / 4개 적립']]
  return <section className="page-container narrow-page"><PageHeader title="내 스탬프북" description="방문으로 적립한 스탬프와 대상 콘텐츠를 확인하세요." action={<button className="region-button" onClick={openRegionDialog}>✦ {region} · 지역 변경</button>}><Breadcrumbs items={[{ label: '홈', to: '/' }, { label: '내 스탬프북' }]} /></PageHeader>
    <div className="stamp-layout"><aside><h3>내 스탬프북 3개</h3>{books.map(([title, status, count]) => <button key={title} onClick={() => setSelected(title)} className={selected === title ? 'selected' : ''}><span>{title}<small>스탬프북 #101 · 공개 중</small><b>{count}</b></span><StatusPill tone={status === '진행 중' ? 'green' : 'gray'}>{status}</StatusPill></button>)}</aside><section className="stamp-detail"><div className="stamp-title"><div><small>스탬프북 #101 · 김해시</small><h2>{selected}</h2></div><StatusPill>진행 중</StatusPill></div><div className="stamp-progress"><span>현재 적립</span><b>3 / 4</b></div><div className="stamp-circles">{['가야문화', '대성동', '낙동강', '다음 방문'].map((item, index) => <div key={item} className={index < 3 ? 'complete' : ''}><b>{index < 3 ? '✓' : '+'}</b><span>{item}</span></div>)}</div><div className="stamp-items">{[['김해 가야문화 체험', '적립 완료 · 8. 06.'], ['대성동고분박물관 해설', '적립 완료 · 8. 09.'], ['낙동강 생태 탐방', '적립 완료 · 8. 12.'], ['봉리단길 로컬 산책', '방문하면 적립']].map(([title, status]) => <p key={title}><span>{title}</span><b>{status}</b></p>)}</div><Notice>안내&nbsp; 대상 콘텐츠마다 유효한 방문 기록으로 스탬프가 한 번만 적립됩니다.</Notice></section></div><section className="recent-stamps"><h2>최근 스탬프 적립 이력</h2><div><HistoryItem symbol="✓" title="낙동강 생태 탐방" sub="방문 8. 12. 13:48 · 적립 14:02" date="" /><HistoryItem symbol="✓" title="대성동고분박물관 해설" sub="방문 8. 09. 10:51 · 적립 11:03" date="" /></div></section>
  </section>
}
