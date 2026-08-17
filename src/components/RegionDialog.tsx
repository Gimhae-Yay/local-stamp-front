import { useState } from 'react'

const regions = [
  ['김해시', '경상남도'],
  ['동해시', '강원특별자치도'],
  ['강릉시', '강원특별자치도'],
  ['고양시', '경기도'],
  ['수원시', '경기도'],
]

export default function RegionDialog({ region, onSelect, onClose }: { region: string; onSelect: (region: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const visibleRegions = regions.filter(([name]) => name.includes(query))
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="region-dialog" role="dialog" aria-modal="true" aria-labelledby="region-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="dialog-heading">
          <h2 id="region-title">서비스 지역 선택</h2>
          <p>지역을 바꾸면 목록이 갱신됩니다.</p>
        </div>
        <label className="region-search">
          <span>⌕</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="시·군·구 이름으로 검색" autoFocus />
        </label>
        <p className="dialog-section-label">서비스 지역</p>
        <div className="region-options">
          {visibleRegions.map(([name, province]) => (
            <button
              key={name}
              className={`region-option${name === region ? ' selected' : ''}`}
              onClick={() => { onSelect(name); onClose() }}
            >
              <span className="region-mark">✦</span>
              <span><strong>{name}</strong><small>{province}</small></span>
              {name === region && <b>✓</b>}
            </button>
          ))}
        </div>
        <p className="dialog-footnote">새로운 지역을 계속 추가하고 있어요. 원하는 지역의 행사·체험은 해당 지자체 서비스 시작 후 확인할 수 있습니다.</p>
      </section>
    </div>
  )
}
