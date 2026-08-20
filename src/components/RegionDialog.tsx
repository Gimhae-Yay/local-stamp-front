import { useState } from "react";

export interface RegionOption {
  regionId: string;
  regionCode: string;
  name: string;
}

export default function RegionDialog({
  regions,
  regionId,
  onSelect,
  onClose,
}: {
  regions: RegionOption[];
  regionId: string;
  onSelect: (region: RegionOption) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const visibleRegions = regions.filter((region) => region.name.includes(query.trim()));

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="region-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="region-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="dialog-heading">
          <h2 id="region-title">서비스 지역 선택</h2>
          <p>지역을 바꾸면 목록이 갱신됩니다.</p>
        </div>
        <label className="region-search">
          <span>⌕</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="시·군·구 이름으로 검색"
            autoFocus
          />
        </label>
        <p className="dialog-section-label">서비스 지역</p>
        <div className="region-options">
          {visibleRegions.map((item) => (
            <button
              key={item.regionId}
              className={`region-option${item.regionId === regionId ? " selected" : ""}`}
              onClick={() => {
                onSelect(item);
                onClose();
              }}
            >
              <span className="region-mark">✦</span>
              <span>
                <strong>{item.name}</strong>
              </span>
              {item.regionId === regionId && <b>✓</b>}
            </button>
          ))}
          {visibleRegions.length === 0 && <p>검색 결과가 없습니다.</p>}
        </div>
        <p className="dialog-footnote">
          새로운 지역을 계속 추가하고 있어요. 원하는 지역의 행사·체험은 해당 지자체 서비스 시작 후
          확인할 수 있습니다.
        </p>
      </section>
    </div>
  );
}
