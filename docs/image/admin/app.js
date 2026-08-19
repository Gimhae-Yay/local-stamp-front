(() => {
  "use strict";

  const $ = (value) => value;

  const badge = (text, tone = "") => `<span class="badge ${tone}">${text}</span>`;
  const button = (text, kind = "", extra = "") => `<button type="button" class="btn ${kind} ${extra}">${text}</button>`;
  const gradeLabels = {
    SUPER_ADMIN: "최고 관리자",
    PLATFORM_ADMIN: "플랫폼 관리자"
  };
  const gradeLabel = (grade) => gradeLabels[grade] || grade;

  const header = (grade = null, accountLabel = "admin@localstamp.kr") => `
    <header class="app-header">
      <div class="brand">
        <div class="brand-mark">S</div>
        <div class="brand-name">Local Stamp</div>
        <span class="console-pill">전체 관리자 콘솔</span>
      </div>
      <div class="account">
        ${grade ? '<span class="account-avatar">관</span>' : ''}
        <span>${accountLabel}</span>
        ${grade ? `<span class="grade-pill">${gradeLabel(grade)}</span>` : ''}
        <span class="chevron" aria-hidden="true">⌄</span>
      </div>
    </header>`;

  const pageHead = ({ title, description, status = "", action = "" }) => `
    <div class="page-head">
      <div>
        <div class="page-title-line"><h1>${title}</h1>${status}</div>
        <p>${description}</p>
      </div>
      ${action}
    </div>`;

  const field = (label, value, options = {}) => {
    const { full = false, help = "", type = "input", rows = 3, choices = [] } = options;
    let control;
    if (type === "select") {
      const selectChoices = choices.length > 0 ? choices : [value];
      control = `<select class="control" aria-label="${label}">${selectChoices.map((choice) => `<option${choice === value ? " selected" : ""}>${choice}</option>`).join("")}</select>`;
    } else if (type === "textarea") {
      control = `<textarea class="control" rows="${rows}" readonly aria-label="${label}">${value}</textarea>`;
    } else if (type === "password") {
      control = `<input class="control" type="password" value="${value}" readonly aria-label="${label}">`;
    } else {
      control = `<input class="control" type="text" value="${value}" readonly aria-label="${label}">`;
    }
    return `<div class="field ${full ? "full" : ""}"><label>${label}</label>${control}${help ? `<div class="help">${help}</div>` : ""}</div>`;
  };

  const kv = (entries, two = false) => `
    <div class="kv ${two ? "two" : ""}">
      ${entries.map(([label, value]) => `<div class="kv-row"><span class="kv-label">${label}</span><span class="kv-value">${value}</span></div>`).join("")}
    </div>`;

  const summaries = (items) => `
    <div class="summary-grid">
      ${items.map(({ label, value, metric = false }) => `<div class="card summary-card"><div class="summary-label">${label}</div><div class="summary-value ${metric ? "metric" : ""}">${value}</div></div>`).join("")}
    </div>`;

  const emptyState = (title, copy, action) => result({
    title,
    copy,
    tone: "info",
    action: button(action, "outline")
  });

  const timeline = (items) => `
    <div class="timeline">
      ${items.map((item, index) => `
        <div class="timeline-entry ${item.tone || ""}">
          <span class="timeline-dot">${item.number || ""}</span>
          <div class="timeline-title">${item.title}</div>
          <div class="timeline-copy">${item.copy}</div>
          ${item.id ? `<div class="timeline-id">${item.id}</div>` : ""}
        </div>`).join("")}
    </div>`;

  const result = ({ title, copy, tone = "", action = "", details = "" }) => `
    <div class="result ${tone}">
      <div class="result-heading"><span class="result-icon">${tone === "danger" ? "!" : tone === "info" || tone === "orange" ? "i" : "✓"}</span><span>${title}</span></div>
      ${copy ? `<div class="result-copy">${copy}</div>` : ""}
      ${details ? `<div class="mt8">${details}</div>` : ""}
      ${action ? `<div class="mt12">${action}</div>` : ""}
    </div>`;

  const canvas = (content, options = {}) => {
    const { portrait = false, grade = null, accountLabel = grade ? "admin@localstamp.kr" : "관리자 계정", classes = "" } = options;
    return `<section class="canvas ${portrait ? "portrait" : "wide"} ${classes}" data-wireframe-ready="true">${header(grade, accountLabel)}${content}</section>`;
  };

  const accountPopover = (grade) => `
    <aside class="account-popover">
      <div class="popover-profile">
        <span class="account-avatar">관</span>
        <div><div class="popover-title">플랫폼 전체 관리자</div><div class="popover-meta">admin@localstamp.kr · ${gradeLabel(grade)}</div></div>
      </div>
      <div class="popover-section"><h3>플랫폼 운영</h3><div class="menu-item active">⌂ 운영 홈</div><div class="menu-item">⌖ 지역 관리</div></div>
      <div class="popover-section"><h3>계정·권한</h3><div class="menu-item">♙ 일반 사용자·지역 관리자 역할</div></div>
      <div class="popover-section"><h3>거래 예외</h3><div class="menu-item">▣ 결제 불일치</div><div class="menu-item">↺ 환불 실패</div><div class="menu-item">↯ 수동 전액 환불</div></div>
      ${grade === "SUPER_ADMIN" ? '<div class="popover-section"><h3>최고 관리자 전용</h3><div class="menu-item"><span>▣ 전체 관리자 계정</span><span>전용</span></div></div>' : ""}
    </aside>`;

  const homeScreen = (grade) => {
    const superAdmin = grade === "SUPER_ADMIN";
    const content = `
      <main class="content">
        <div class="breadcrumb"><strong>전체 관리자</strong></div>
        ${pageHead({ title: "플랫폼 운영", description: "지역, 계정·권한, 거래 예외를 한 곳에서 관리합니다." })}
        <div class="cards-3">
          <article class="card nav-card"><div class="nav-icon">⌖</div><h2>지역 관리</h2><p>전체 지역의 공개 상태와 활성 지역 관리자 수를 확인하고 운영 상태를 변경합니다.</p><div class="nav-link">지역 관리로 이동 →</div></article>
          <article class="card nav-card"><div class="nav-icon">♙</div><h2>계정·권한 관리</h2><p>일반 사용자의 역할과 담당 지역을 확인하고 지역 관리자 역할을 변경합니다.</p><div class="nav-link">계정·권한 관리로 이동 →</div>${superAdmin ? '<div class="exclusive-link">▣ 최고 관리자 · 전체 관리자 계정</div>' : ""}</article>
          <article class="card nav-card"><div class="nav-icon">↯</div><h2>거래 예외 관리</h2><p>결제 불일치와 환불 실패를 오래된 순서로 확인하고 필요한 조치를 수행합니다.</p><div class="nav-link">거래 예외 관리로 이동 →</div></article>
        </div>
        <div class="notice orange"><strong>운영 범위 안내</strong>현재 계약으로 확인 가능한 지역·권한·거래 예외 업무만 제공합니다. 매출·성장·지역 성과·감사 통계는 표시하지 않습니다.</div>
      </main>
      ${accountPopover(grade)}`;
    return canvas(content, { grade });
  };

  const regionListBase = (active = "전체", subdued = false) => `
    <div class="toolbar">
      <div class="chips">${["전체", "공개·운영", "비공개·준비"].map((item) => `<span class="chip ${item === active ? "active" : ""}">${item}</span>`).join("")}</div>
      <span class="sort-note">이름 가나다순</span>
    </div>
    <div class="list" ${subdued ? 'style="opacity:.42"' : ""}>
      <div class="list-row region-row">${badge("공개·운영", "green")}<div><div class="row-title">김해시 · GIMHAE</div><div class="row-sub">지역 ID 101 · 활성 지역 관리자 3명</div></div><div class="row-sub">생성 2026.06.10 09:00<br>수정 2026.08.13 16:22</div>${button("비공개 전환", "outline small")}</div>
      <div class="list-row region-row">${badge("비공개·준비", "yellow")}<div><div class="row-title">밀양시 · MIRYANG</div><div class="row-sub">지역 ID 104 · 활성 지역 관리자 0명</div></div><div class="row-sub">생성 2026.08.12 10:00<br>수정 2026.08.12 10:00</div>${button("지역 공개", "outline small")}</div>
    </div>`;

  const regionCreate = () => canvas(`
    <div class="drawer-layout">
      <main class="drawer-base">
        <div class="breadcrumb">전체 관리자 › <strong>지역 관리</strong></div>
        ${pageHead({ title: "지역 관리", description: "전체 지역의 공개 상태와 활성 관리자를 확인합니다." })}
        ${regionListBase("전체", true)}
      </main>
      <aside class="drawer-panel">
        <h2>새 지역 생성</h2><p>새 지역은 생성 직후 <strong>비공개·준비</strong> 상태로 저장됩니다.</p>
        <div class="form-grid">
          ${field("지역 코드 *", "YANGSAN", { help: "영문자로 시작, 영숫자·하이픈 / 대문자 저장" })}
          ${field("지역 이름 *", "양산시")}
          ${field("생성 사유 *", "서비스 제공 지역 확대", { full: true, type: "select" })}
          ${field("증빙 참조 *", "운영 협의 문서 OPS-2026-0814", { full: true, type: "textarea", help: "개인정보·토큰·비밀값을 입력하지 마세요. · 24/500" })}
        </div>
        <div class="form-actions">${button("취소")}${button("비공개 지역 생성", "primary")}</div>
        ${result({ title: "지역 생성 완료", copy: "지역 ID 105 · YANGSAN · 양산시 · 비공개·준비 · 생성 2026.08.14 15:10", action: button("지역 목록으로 이동", "success-outline wide-button") })}
      </aside>
    </div>`, { portrait: true, grade: "PLATFORM_ADMIN" });

  const regionEmpty = () => canvas(`
    <main class="content">
      <div class="breadcrumb">전체 관리자 › <strong>지역 관리</strong></div>
      ${pageHead({ title: "지역 관리", description: "전체 지역의 공개 상태와 활성 관리자를 확인합니다.", action: button("＋ 새 지역 생성", "primary") })}
      <div class="toolbar"><div class="chips"><span class="chip">전체</span><span class="chip active">공개·운영</span><span class="chip">비공개·준비</span></div><span class="sort-note">이름 가나다순</span></div>
      ${emptyState("공개·운영 지역이 없습니다", "선택한 공개 상태에 해당하는 지역이 없습니다. 전체 지역 또는 다른 상태를 확인하세요.", "전체 지역 보기")}
    </main>`, { portrait: true, grade: "PLATFORM_ADMIN" });

  const regionStatus = (mode = "unpublish") => {
    const publish = mode === "publish";
    const unchanged = mode === "public-unchanged";
    const conflict = mode === "unpublish-conflict";
    const currentPublic = !publish;
    const targetPublic = publish || unchanged;
    const regionId = publish || unchanged ? "104" : "101";
    const regionName = publish || unchanged ? "밀양시 · MIRYANG" : "김해시 · GIMHAE";
    const status = currentPublic ? "공개·운영" : "비공개·준비";
    const resultStatus = targetPublic ? "공개·운영" : "비공개·준비";
    const current = badge(`현재 ${status}`, currentPublic ? "green" : "yellow");
    const target = badge(`목표 ${resultStatus}`, targetPublic ? "green" : "yellow");
    const action = targetPublic ? "공개로 전환" : "비공개로 전환";
    const reason = targetPublic ? "지역 운영 개시" : "공개 전 준비 상태 전환";
    const resultPanel = conflict
      ? result({ title: "비공개 전환 불가", copy: "비삭제 콘텐츠가 있는 지역은 비공개로 전환할 수 없습니다. 기존 공개·운영 상태를 유지하고 최신 상태를 다시 조회했습니다.", tone: "danger", action: button("최신 지역 상태 확인", "outline") })
      : unchanged
        ? result({ title: "이미 공개·운영 상태입니다.", copy: "동일한 공개 상태 요청이므로 지역과 변경 이력을 수정하지 않았습니다.", tone: "info", action: button("지역 목록으로 이동") })
        : result({ title: "변경 완료", copy: `지역 ID ${regionId} · ${resultStatus} · 2026.08.14 ${publish ? "15:40" : "14:32"}`, action: button("지역 목록으로 이동", "success-outline") });
    return canvas(`
      <main class="content">
        <div class="breadcrumb">전체 관리자 › <strong>지역 관리</strong></div>
        ${pageHead({ title: "지역 관리", description: "서버 응답 후 목록 상태를 다시 반영합니다.", action: button("＋ 새 지역 생성", "primary") })}
        <div class="toolbar"><div class="chips"><span class="chip">전체</span><span class="chip ${currentPublic ? "active" : ""}">공개·운영</span><span class="chip ${currentPublic ? "" : "active"}">비공개·준비</span></div><span class="sort-note">이름 가나다순</span></div>
        <section class="panel"><div class="inline space-between"><div>${badge(status, currentPublic ? "green" : "yellow")}<div class="section-title mt8">${regionName}</div><div class="row-sub">지역 ID ${regionId} · 활성 지역 관리자 ${currentPublic ? "3" : "0"}명</div></div>${button(targetPublic ? "지역 공개" : "비공개 전환", "outline")}</div>${kv([["생성 시각", currentPublic ? "2026.06.10 09:00" : "2026.08.12 10:00"], ["수정 시각", currentPublic ? "2026.08.13 16:22" : "2026.08.12 10:00"]], true)}</section>
        <section class="panel mt16"><h2 class="section-title">공개 여부 변경</h2><div class="status-flow">${current}<span class="status-arrow">→</span>${target}</div><div class="form-grid one">${field("변경 사유 *", reason, { type: "select" })}${field("증빙 참조 *", targetPublic ? "서비스 공개 승인 OPS-2026-0814" : "운영 전환 검토 OPS-2026-0813", { type: "textarea" })}</div>${targetPublic ? '<div class="notice info"><strong>공개 안내</strong>공개 후 방문자에게 지역과 공개 콘텐츠가 노출됩니다.</div>' : '<div class="notice warning"><strong>비공개 전환 제한</strong>비삭제 콘텐츠가 있는 지역은 비공개로 전환할 수 없습니다. 제한되면 기존 공개 상태를 유지하고 최신 상태를 다시 조회합니다.</div>'}<div class="form-actions">${button("취소")}${button(action, targetPublic ? "primary" : "danger")}</div></section>
        ${resultPanel}
      </main>`, { portrait: true, grade: "PLATFORM_ADMIN" });
  };

  const userRows = (selectedId = null) => {
    const users = [
      ["9021", "김민지", "minji.kim@example.com", "지역 관리자", "김해시 · 지역 101", "2026.08.13 14:20", "green"],
      ["9018", "박서준", "seojun.park@example.com", "방문자", "담당 지역 없음", "2026.08.12 10:05", ""],
      ["9015", "이하늘", "haneul.lee@example.com", "역할 없음", "활성 역할 배정 없음", "2026.08.11 16:40", "yellow"],
      ["9009", "최유진", "yujin.choi@example.com", "운영자", "밀양시 · 읽기 전용", "2026.08.10 09:15", ""]
    ];
    return `<div class="list">${users.map(([id, name, email, role, region, created, tone]) => `<div class="list-row user-row ${selectedId === id ? "selected" : ""}"><div><div class="row-title">${name}</div><div class="row-sub">${email}</div></div><div><div class="row-sub">사용자 ID</div><div class="row-value">${id}</div></div><div>${badge(role, tone)}<div class="row-sub">${region}</div></div><div class="row-sub">생성<br>${created}</div>${button("역할 변경", "outline small")}</div>`).join("")}</div>`;
  };

  const roleListHeader = (superAdmin) => `
    <div class="breadcrumb">전체 관리자 › <strong>계정·권한 관리</strong></div>
    ${pageHead({ title: "계정·권한 관리", description: "활성 일반 계정의 현재 역할과 담당 지역을 확인합니다." })}
    <div class="tabs"><span class="tab active">일반 사용자·지역 관리자 역할</span>${superAdmin ? '<span class="tab">▣ 전체 관리자 계정</span>' : ""}</div>
    <div class="toolbar"><span class="sort-note">검색·필터 없음</span><span class="sort-note">최근 생성순</span></div>`;

  const roleManagement = (grade, mode = "reassign") => {
    const superAdmin = grade === "SUPER_ADMIN";
    if (mode === "list") {
      return canvas(`<main class="content">${roleListHeader(superAdmin)}${userRows()}</main>`, { grade });
    }
    if (mode === "empty") {
      return canvas(`<main class="content">${roleListHeader(superAdmin)}${emptyState("활성 일반 계정이 없습니다", "역할을 확인하거나 변경할 수 있는 활성 일반 계정이 없습니다.", "운영 홈으로 이동")}</main>`, { grade });
    }
    const appoint = mode === "appoint";
    const unchanged = mode === "reassign-unchanged";
    const revokeConflict = mode === "revoke-conflict";
    const revoke = mode === "revoke" || revokeConflict;
    const selectedId = appoint ? "9015" : "9021";
    const panelTitle = appoint ? "지역 관리자 신규 임명" : revoke ? "지역 관리자 역할 회수" : unchanged ? "지역 관리자 역할 유지" : "지역 관리자 역할 변경";
    const panelDesc = appoint ? "지역 관리자 신규 임명 후 즉시 권한이 활성화됩니다." : revoke ? "선택한 사용자의 지역 관리자 역할을 회수합니다." : unchanged ? "현재 담당 지역으로 역할을 다시 요청한 결과를 확인합니다." : "지역 관리자 임명·재배정·회수만 수행할 수 있습니다.";
    const person = appoint ? "이하늘 · haneul.lee@example.com" : "김민지 · minji.kim@example.com";
    const currentBadge = appoint ? badge("현재 역할 없음", "yellow") : badge("현재 지역 관리자", "green");
    const currentRegion = appoint ? "활성 역할 배정 없음" : "김해시 · 지역 101";
    const target = appoint ? "지역 관리자 신규 임명" : revoke ? "지역 관리자 역할 회수" : unchanged ? "현재 지역 역할 유지" : "다른 지역으로 재배정";
    const reason = appoint ? "지역 관리자 신규 임명" : revoke ? "지역 관리자 역할 회수" : unchanged ? "현재 담당 지역 재확인" : "담당 지역 변경";
    const evidence = appoint ? "신규 임명 승인 ROLE-2026-41" : revoke ? "역할 회수 승인 ROLE-2026-42" : unchanged ? "현재 역할 확인 ROLE-2026-43" : "담당 지역 변경 승인 문서 ROLE-2026-33";
    const actionText = appoint ? "신규 임명 요청" : revoke ? "역할 회수 실행" : "역할 변경 요청";
    const resultTitle = appoint ? "신규 임명 완료" : revoke ? "역할 회수 완료" : "재배정 완료";
    const resultCopy = appoint ? "임명 ID 3013 · 역할 지역 관리자 · 지역 ID 104 · 상태 활성 · 변경 시각 2026.08.14 15:34" : revoke ? "변경 ID 3013 · 상태 회수됨 · 기존 역할 지역 관리자 → 역할 없음 · 기존 지역 ID 101 · 회수 시각 2026.08.14 15:36" : "변경 ID 3012 · 지역 관리자 · 밀양시 · 활성 · 변경 시각 2026.08.14 15:32";
    const restrictionTitle = appoint ? "임명 후 권한" : unchanged ? "동일 지역 재요청" : "마지막 관리자 보호";
    const restrictionCopy = appoint
      ? "신규 임명 후 해당 지역의 관리 권한이 즉시 활성화됩니다."
      : unchanged
        ? "현재 담당 지역과 같은 지역을 요청하면 새 배정을 만들지 않고 기존 활성 배정을 그대로 반환합니다."
      : revoke
        ? "비삭제 콘텐츠가 있는 지역의 마지막 활성 지역 관리자는 회수할 수 없습니다. 제한되면 기존 역할을 유지하고 사용자 상태를 다시 조회합니다."
        : "비삭제 콘텐츠가 있는 기존 지역의 마지막 활성 지역 관리자는 다른 지역으로 재배정할 수 없습니다. 제한되면 기존 역할과 담당 지역을 유지합니다.";
    const resultState = unchanged
      ? result({ title: "기존 역할 배정 유지", copy: "역할 배정 ID 3011 · 역할 지역 관리자 · 기존 지역 ID 101 · 상태 활성 · 기존 배정 시각 유지", tone: "info", action: button("사용자 목록으로 이동", "outline wide-button") })
      : revokeConflict
        ? result({ title: "역할 회수 불가", copy: "비삭제 콘텐츠가 있는 지역의 마지막 활성 지역 관리자입니다. 기존 역할을 유지하고 최신 사용자 상태를 다시 조회했습니다.", tone: "danger", action: button("최신 사용자 상태 확인", "outline wide-button") })
        : result({ title: resultTitle, copy: resultCopy, action: button("사용자 목록으로 이동", "success-outline wide-button") });
    return canvas(`
      <div class="role-shell">
        <main class="role-list-pane">${roleListHeader(superAdmin)}${userRows(selectedId)}</main>
        <aside class="role-form-pane"><h2>${panelTitle}</h2><p>${panelDesc}</p>
          <div class="card user-summary"><div class="row-title">${person}</div><div class="row-sub">사용자 ID ${selectedId}</div><div class="inline mt8">${currentBadge}<span class="row-sub">${currentRegion}</span></div></div>
          <div class="form-grid one">${field("변경 목표 *", target, { type: "select" })}${appoint || (!revoke) ? field("대상 지역 *", unchanged ? "김해시 · 지역 ID 101" : "밀양시 · 지역 ID 104", { type: "select" }) : ""}${field("변경 사유 *", reason)}${field("증빙 참조 *", evidence, { type: "textarea", help: "개인정보·토큰·비밀값을 입력하지 마세요." })}</div>
          <div class="notice ${appoint || unchanged ? "info" : "warning"}"><strong>${restrictionTitle}</strong>${restrictionCopy}</div>
          <div class="form-actions">${button("취소")}${button(actionText, revoke ? "danger" : "primary")}</div>
          ${resultState}
        </aside>
      </div>`, { grade });
  };

  const superAdminAccounts = (mode = "created") => {
    const deactivated = mode === "deactivated";
    return canvas(`
      <main class="content">
      <div class="breadcrumb">전체 관리자 › 계정·권한 관리 › <strong>전체 관리자 계정</strong></div>
      ${pageHead({ title: "계정·권한 관리", description: "고권한 계정을 생성하거나, 알고 있는 사용자 ID로 활성 계정을 비활성화합니다." })}
      <div class="tabs"><span class="tab">일반 사용자·지역 관리자 역할</span><span class="tab active">▣ 전체 관리자 계정</span></div>
      <div class="super-grid">
        <section class="panel"><div class="inline space-between"><h2 class="section-title">계정 생성</h2>${badge("최고 관리자 전용", "orange")}</div><div class="form-grid">${field("이메일 *", "platform.admin@example.com")}${field("비밀번호 *", "Admin!2026Secure", { type: "password", help: "8~64자 · 영문/숫자/특수문자" })}${field("이름 *", "플랫폼 관리자")}${field("전화번호 *", "01012345678")}${field("등급 *", "플랫폼 관리자", { type: "select", choices: ["플랫폼 관리자", "최고 관리자"] })}${field("계정 생성 사유 *", "신규 플랫폼 관리자 계정 발급")}${field("증빙 참조 *", "계정 발급 승인 ADMIN-2026-0814", { full: true, type: "textarea" })}</div><div class="form-actions">${button("고권한 계정 생성", "primary")}</div>${deactivated ? "" : result({ title: "계정 생성 완료", details: kv([["사용자 ID", "12004"], ["플랫폼 관리자 배정 ID", "801"], ["등급", "플랫폼 관리자"], ["상태", "활성"], ["생성 시각", "2026.08.14 15:30"]], true), action: button("계정·권한으로 이동", "outline") })}</section>
        <section class="panel"><div class="inline space-between"><h2 class="section-title">계정 비활성화</h2>${badge("위험 작업", "red")}</div><p class="row-sub mb12">${deactivated ? "비활성화 결과를 확인합니다." : "비활성화할 계정 ID를 입력하세요."}</p>${deactivated
          ? `${result({ title: "계정 비활성화 완료", details: kv([["사용자 ID", "12004"], ["플랫폼 관리자 배정 ID", "801"], ["등급", "플랫폼 관리자"], ["상태", "비활성"], ["비활성화 시각", "2026.09.01 10:20"]]), action: button("계정·권한으로 이동", "outline wide-button") })}<div class="notice"><strong>종료 상태</strong>비활성화된 고권한 배정은 재활성화할 수 없습니다.</div>`
          : `<div class="form-grid one">${field("대상 사용자 ID *", "12004")}${field("계정 비활성화 사유 *", "관리자 권한 종료")}${field("증빙 참조 *", "권한 종료 승인 ADMIN-2026-0901", { type: "textarea" })}</div><div class="notice danger"><strong>비활성화 불가</strong>자기 자신 · 마지막 활성 최고 관리자 · 이미 비활성인 대상</div><div class="form-actions">${button("관리자 계정 비활성화", "danger")}</div><div class="notice"><strong>지원하지 않는 액션</strong>재활성화 · 등급 변경 · 비밀번호 초기화 · 삭제</div>`}</section>
      </div>
      </main>`, { grade: "SUPER_ADMIN" });
  };

  const transactionHeader = (tab, description) => `
    <div class="breadcrumb">전체 관리자 › <strong>거래 예외 관리</strong></div>
    ${pageHead({ title: "거래 예외 관리", description, action: button("↯ 수동 전액 환불", "primary") })}
    <div class="tabs"><span class="tab ${tab === "payment" ? "active" : ""}">결제 불일치</span><span class="tab ${tab === "refund" ? "active" : ""}">환불 실패</span></div>`;

  const paymentList = (empty = false) => canvas(`
    <main class="content">
      ${transactionHeader("payment", "오래된 미처리 결제 불일치부터 확인합니다.")}
      <div class="toolbar"><div class="chips"><span class="chip ${empty ? "" : "active"}">미처리</span><span class="chip ${empty ? "active" : ""}">문제없음 종결</span><span class="chip">환불 요청</span></div><span class="sort-note">오래된 감지순</span></div>
      ${empty
        ? emptyState("문제없음 종결 내역이 없습니다", "선택한 상태의 결제 불일치가 없습니다. 기본 필터로 돌아가 미처리 건을 확인하세요.", "미처리 결제 불일치 보기")
        : `<div class="list">${[["4401", "금액 불일치", "77103", "38,000원", "2026.08.11 09:14"], ["4407", "지연 승인", "77188", "17,000원", "2026.08.12 21:03"], ["4410", "결제 대상 불일치", "77201", "24,000원", "2026.08.13 08:41"]].map(([id, type, payment, amount, time]) => `<div class="list-row payment-row">${badge("미처리", "red")}<div><div class="row-title">불일치 ID ${id}</div><div class="row-sub">결제 ID ${payment}</div></div><div><div class="row-title">${amount}</div><div class="row-sub">${type}</div></div>${button("상세 ›", "outline small")}<div class="row-sub">감지 ${time}</div></div>`).join("")}</div>`}
    </main>`, { portrait: true, grade: "PLATFORM_ADMIN" });

  const refundList = (empty = false) => canvas(`
    <main class="content">
      ${transactionHeader("refund", "실패·불명확 환불을 최근 변경이 오래된 순으로 확인합니다.")}
      <div class="toolbar"><div class="chips"><span class="chip ${empty ? "" : "active"}">확인 필요 전체</span><span class="chip">환불 실패</span><span class="chip">결과 확인 필요</span><span class="chip">요청 접수</span><span class="chip">처리 중</span><span class="chip ${empty ? "active" : ""}">환불 완료</span></div><span class="sort-note">오래 대기한 순</span></div>
      ${empty
        ? emptyState("환불 완료 내역이 없습니다", "선택한 상태의 환불이 없습니다. 확인 필요 전체로 돌아가 실패·불명확 환불을 확인하세요.", "확인 필요 환불 보기")
        : `<div class="list">${[["환불 실패", "red", "5508", "77103", "38,000원", "66011", "2/3", "2026.08.11 09:20", "2026.08.12 10:32"], ["결과 확인 필요", "yellow", "5512", "77188", "17,000원", "66043", "1/3", "2026.08.13 09:05", "2026.08.13 09:05"], ["환불 실패", "red", "5514", "77201", "24,000원", "66055", "3/3", "2026.08.13 11:30", "2026.08.13 12:44"]].map(([status, tone, id, payment, amount, reservation, count, requested, updated]) => `<div class="list-row refund-row">${badge(status, tone)}<div><div class="row-title">환불 ID ${id}</div><div class="row-sub">결제 ID ${payment}</div></div><div><div class="row-title">${amount}</div><div class="row-sub">예약 ID ${reservation} · 시도 ${count}</div></div>${button("상세 ›", "outline small")}<div class="row-sub">요청 ${requested}<br>변경 ${updated}</div></div>`).join("")}</div>`}
      ${empty ? "" : '<div class="notice warning"><strong>조회 안내</strong>실패 또는 결과 확인이 필요한 환불을 함께 표시합니다.</div>'}
    </main>`, { portrait: true, grade: "PLATFORM_ADMIN" });

  const discrepancyInfo = () => `<section class="panel"><h2 class="section-title">불일치·결제 정보</h2>${kv([["결제 ID", "77103"], ["예약 선점 ID", "33008"], ["주문 ID", "ORD-20260811-77A"], ["PortOne 결제 ID", "pay_port_91K"], ["결제 상태", '<span class="red-text">불일치</span>']])}</section>`;

  const discrepancyTimeline = (action = null) => {
    const items = [
      { title: "승인 확인 요청 · 금액 불일치", copy: "관측 35,000원 · 불일치 · 08.11 09:14", id: "결제 검증 ID 9101" },
      { title: "웹훅 · 외부 승인", copy: "관측 38,000원 · 일치 · 08.11 09:16", id: "결제 검증 ID 9102" },
      action || { title: "수동 조치 없음", copy: "미처리 상태 · 조사 필요" }
    ];
    return `<section class="panel"><h2 class="section-title">서버 검증 · 수동 조치 이력</h2>${timeline(items)}</section>`;
  };

  const discrepancyDetail = (state) => {
    const isOpen = state === "OPEN";
    const resolved = state === "RESOLVED_NO_ISSUE";
    const tone = resolved ? "green" : state === "REFUND_REQUESTED" ? "orange" : "red";
    const stateLabel = resolved ? "문제없음 종결" : state === "REFUND_REQUESTED" ? "환불 요청" : "미처리";
    const action = resolved ? { title: "조치 ID 7001 · 문제없음 종결", copy: "증빙 VERIFY-2026-4401<br>사유 외부 승인 금액과 최종 금액 일치 확인<br>조치 시각 2026.08.14 15:24" } : state === "REFUND_REQUESTED" ? { title: "조치 ID 7002 · 전액 환불 요청", copy: "증빙 REFUND-2026-4401<br>사유 결제 금액 불일치 전액 환불<br>조치 시각 2026.08.14 15:28" } : null;
    return canvas(`
      <main class="content">
        <div class="breadcrumb">거래 예외 관리 › 결제 불일치 › <strong>#4401</strong></div>
        ${pageHead({ title: "결제 불일치 #4401", description: "검증 근거와 기존 조치를 확인한 뒤 처리 방법을 결정합니다.", status: badge(stateLabel, tone) })}
        ${summaries([{ label: "유형", value: "금액 불일치" }, { label: "최종 금액", value: "38,000원", metric: true }, { label: "감지 시각", value: "08.11 · 09:14" }])}
        <div class="detail-grid">${discrepancyInfo()}${discrepancyTimeline(action)}</div>
        ${isOpen ? `<div class="action-bar"><div><strong>미처리 상태 조치</strong><div class="action-copy">종결 후 결제는 불일치, 예약 상태는 유지됩니다.</div></div><div class="split-actions">${button("전액 환불 요청", "danger-outline")}${button("문제없음으로 종결", "primary")}</div></div><section class="panel mt12"><h2 class="section-title">문제없음 종결 패널</h2><div class="form-grid">${field("증빙 참조 *", "VERIFY-2026-4401")}${field("사유 *", "외부 승인 금액과 최종 금액 일치 확인")}</div></section>` : resolved ? result({ title: "문제없음 종결 완료", copy: "외부 승인 금액과 최종 금액이 일치하여 결제 불일치 이슈가 종결되었습니다.", action: button("결제 불일치 목록으로 이동", "outline wide-button") }) : result({ title: "전액 환불 요청 완료", copy: "해당 건은 전액 환불 요청이 완료되어 환불 요청 상태로 업데이트되었습니다. 환불 처리 결과는 환불 실패 탭에서 확인할 수 있습니다.", tone: "orange", action: button("환불 실패 탭으로 이동", "outline") })}
      </main>`, { portrait: true, grade: "PLATFORM_ADMIN" });
  };

  const manualRefund = (status = "failed") => {
    const states = {
      requested: { title: "환불 요청 접수", tone: "info", label: "요청 접수", action: "환불 실패 목록으로 이동 →" },
      processing: { title: "외부 환불 처리 중", tone: "info", label: "처리 중", action: "환불 상세로 이동 →" },
      succeeded: { title: "전액 환불 완료", tone: "", label: "환불 완료", action: "거래 예외 목록으로 이동 →" },
      failed: { title: "환불 처리 실패", tone: "danger", label: "실패", action: "환불 실패 상세로 이동 →" },
      discrepant: { title: "환불 결과 확인 필요", tone: "orange", label: "결과 확인 필요", action: "환불 실패 상세로 이동 →" }
    };
    const state = states[status];
    return canvas(`
      <main class="content">
        <div class="breadcrumb">거래 예외 관리 › <strong>수동 전액 환불</strong></div>
        ${pageHead({ title: "수동 전액 환불", description: "결제 ID와 증빙·사유로 전액 환불을 요청합니다." })}
        <div class="notice danger"><strong>전액 환불만 가능합니다.</strong>부분 환불·환불 취소는 제공하지 않으며 제출 시 외부 호출이 발생합니다.</div>
        <section class="panel mt16"><div class="form-grid one">${field("결제 ID *", "77103", { help: "결제 불일치 상세에서 진입해 미리 채워진 값" })}${field("증빙 참조 *", "고객지원 승인 문서 CS-2026-188", { type: "textarea" })}${field("환불 사유 *", "금액 불일치 결제 전액 환불", { type: "textarea" })}</div><div class="form-actions">${button("취소")}${button("외부 호출 후 전액 환불", "danger")}</div></section>
        ${result({ title: state.title, tone: state.tone, details: kv([["환불 ID", "5508"], ["결제 ID", "77103"], ["환불 금액", "38,000원"], ["현재 상태", state.label], ["요청 시각", "2026.08.14 14:52"]], true), action: button(state.action, "outline") })}
        <div class="notice"><strong>응답 상태 반영</strong>서버가 반환한 현재 환불 상태를 표시하며, 같은 결제에 기존 환불이 있으면 그 상태가 그대로 표시됩니다.</div>
      </main>`, { portrait: true, grade: "PLATFORM_ADMIN" });
  };

  const refundInfo = () => `<section class="panel"><h2 class="section-title">환불·결제 정보</h2>${kv([["환불 ID", "5512"], ["결제 ID", "77188"], ["예약 ID", "66043"], ["주문 ID", "ORD-20260813-1M2"], ["PortOne 결제 ID", "pay_port_1M2"], ["최종 결제 금액", "17,000원"]])}</section>`;

  const attemptItems = (mode) => {
    const one = { number: "1", tone: mode === "processing" ? "blue" : "gray", title: "시도 1 · 시스템", copy: mode === "processing" ? "환불 시도 ID 8801 · PortOne 취소 ID cancel_7Y1<br>결과 응답 수신 · 외부 상태 처리 중 · 시각 2026.08.13 09:05:10" : "환불 시도 ID 8801 · PortOne 취소 ID 없음<br>결과 응답 없음 · 실패 사유 응답 시간 초과 · 외부 상태 확인 불가 · 시각 2026.08.13 09:05:10" };
    if (mode === "requested") return [{ number: "i", tone: "gray", title: "외부 호출 대기 중", copy: "외부 호출 시도를 시작하지 않았습니다.<br>현재 0 / 3" }];
    if (mode === "discrepant" || mode === "processing") return [one];
    if (mode === "succeeded-confirmed" || mode === "failed-confirmed") return [one];
    if (mode === "discrepant-retry") {
      return [one, { number: "2", tone: "gray", title: "시도 2 · 플랫폼 관리자", copy: "환불 시도 ID 8802 · PortOne 취소 ID 없음<br>결과 응답 없음 · 실패 사유 응답 시간 초과 · 외부 상태 확인 불가 · 시각 2026.08.13 09:18:20" }];
    }
    const two = { number: "2", tone: "red", title: "시도 2 · 플랫폼 관리자", copy: "환불 시도 ID 8802 · PortOne 취소 ID cancel_7Y2<br>결과 응답 수신 · 응답 미수신 사유 없음 · 외부 상태 실패 · 시각 2026.08.13 09:05:45" };
    if (mode === "failed-retryable") return [one, two];
    const threeSucceeded = mode === "succeeded-retry";
    const three = { number: "3", tone: threeSucceeded ? "green" : "red", title: "시도 3 · 플랫폼 관리자", copy: threeSucceeded ? "환불 시도 ID 8803 · PortOne 취소 ID cancel_7Y3<br>결과 응답 수신 · 응답 미수신 사유 없음 · 외부 상태 환불 완료 · 시각 2026.08.13 09:18:20" : "환불 시도 ID 8803 · PortOne 취소 ID cancel_7Y3<br>결과 응답 수신 · 응답 미수신 사유 없음 · 외부 상태 실패 · 시각 2026.08.13 09:06:25" };
    return [one, two, three];
  };

  const refundDetail = (mode) => {
    const meta = {
      "discrepant": ["환불 실패 #5512", "결과 불일치", "yellow", "1 / 3", "환불·결제 정보와 외부 시도 이력을 확인하고 실제 결과를 확정합니다."],
      "failed-retryable": ["환불 실패 #5512", "실패", "red", "2 / 3", "환불·결제 정보와 외부 시도 이력을 확인하고 실제 결과를 확인합니다."],
      "failed-exhausted": ["환불 실패 #5512", "실패", "red", "3 / 3", "환불·결제 정보와 외부 시도 이력을 확인하고 실제 결과를 확인합니다."],
      "requested": ["환불 실패 #5512", "요청 접수", "blue", "0 / 3", "환불 요청이 접수되어 외부 호출을 기다리고 있습니다."],
      "processing": ["환불 처리 중 #5512", "처리 중", "blue", "1 / 3", "환불 요청이 외부 결제 시스템으로 전송되어 처리 중입니다. 결과를 확인 중입니다."],
      "succeeded-confirmed": ["환불 실패 #5512", "성공", "green", "1 / 3", "환불·결제 정보와 외부 시도 이력을 확인하고 결과 확정을 완료했습니다."],
      "failed-confirmed": ["환불 실패 #5512", "실패", "red", "1 / 3", "외부 미처리를 확인해 실패로 확정했습니다. 기존 외부 호출 시도는 그대로 보존됩니다."],
      "discrepant-retry": ["환불 실패 #5512", "결과 불일치", "yellow", "2 / 3", "재시도 응답을 받지 못했습니다. 외부 결과를 다시 확인해 확정해야 합니다."],
      "succeeded-retry": ["환불 실패 #5512", "성공", "green", "3 / 3", "환불·결제 정보와 외부 시도 이력을 확인하고 실제 결과를 확인합니다."]
    }[mode];
    const [title, status, tone, count, description] = meta;
    const complete = mode.startsWith("succeeded");
    const completedAt = complete ? (mode === "succeeded-confirmed" ? "2026.08.13 · 09:12" : "2026.08.13 · 09:18") : "미기록";
    const timelinePanel = `<section class="panel"><h2 class="section-title">외부 호출 시도 타임라인</h2>${timeline(attemptItems(mode))}</section>`;
    let lower;
    if (mode === "discrepant" || mode === "discrepant-retry") {
      lower = `<section class="panel compact-form"><div class="inline space-between"><h2 class="section-title">외부 결과 확정</h2>${badge("결과 불일치 전용", "yellow")}</div><div class="form-grid">${field("확정 상태 *", "성공", { type: "select", choices: ["성공", "실패"] })}${field("증빙 참조 *", "PORTONE-CS-8821")}${field("확정 사유 *", "PortOne 고객지원에서 환불 완료 확인", { full: true, type: "textarea" })}</div><div class="notice success"><strong>성공 확정</strong>완료 시각을 기록하고 이후 재시도할 수 없습니다.<br><strong>실패 확정</strong>완료 시각을 기록하지 않으며 남은 횟수 안에서 재시도할 수 있습니다.</div><div class="form-actions">${button("외부 결과 확정", "primary")}</div></section>`;
    } else if (mode === "failed-retryable") {
      lower = `<div class="detail-grid"><div class="notice danger"><strong>실패 상태</strong>외부 호출 2회 시도 모두 실패했습니다.<br>새 외부 호출을 시작할 수 있습니다. (남은 시도: 1회)</div><div class="result danger"><div class="result-heading"><span>환불 재시도 가능</span></div><div class="summary-value">현재 시도 <span class="red-text">2 / 3</span></div><div class="result-copy">요청 본문 없이 새 외부 호출을 시작합니다.</div><div class="form-actions">${button("환불 재시도", "danger")}</div></div></div>`;
    } else if (mode === "failed-exhausted") {
      lower = `<div class="detail-grid"><div class="notice danger"><strong>재시도 횟수 소진</strong>전체 외부 호출 최대 3회를 모두 사용했습니다.</div><div class="action-bar"><div><strong>추가 재시도 불가</strong><div class="action-copy">현재 외부 호출 시도는 3/3입니다.</div></div>${button("재시도 불가 · 3/3", "disabled")}</div></div>`;
    } else if (mode === "requested") {
      lower = `${result({ title: "환불 요청 접수 · 외부 호출 대기", copy: "환불 요청이 정상적으로 접수되었습니다. 첫 외부 호출 전 상태이며 자동 재시도는 수행하지 않습니다. (현재 0 / 3)", tone: "info" })}<div class="action-bar">${button("환불 실패 목록으로 이동", "blue-outline")}</div>`;
    } else if (mode === "processing") {
      lower = `${result({ title: "외부 환불 처리 중 · 응답 수신", copy: "외부 결제 시스템의 처리 중 응답을 수신했습니다. 최종 결과는 최신 환불 상태를 다시 조회해 확인합니다. (현재 1 / 3)", tone: "info" })}<div class="action-bar">${button("최신 환불 상태 확인", "blue-outline")}</div>`;
    } else if (mode === "succeeded-confirmed") {
      lower = `${result({ title: "외부 결과 확정 완료 · 성공", copy: "관리자가 외부 결과를 확인하고 최종 결과를 확정했습니다.", details: kv([["확정 증거", "PORTONE-CONFIRM-5512"], ["확정 일시", "2026.08.13 09:12"]], true) })}<div class="action-bar center">${button("환불 실패 목록으로 이동 ›", "wide-button")}</div>`;
    } else if (mode === "failed-confirmed") {
      lower = `${result({ title: "외부 결과 확정 완료 · 실패", copy: "외부 호출이 실제로 처리되지 않았음을 확인했습니다. 완료 시각은 기록하지 않고 기존 시도 1건을 그대로 보존합니다.", tone: "orange", details: kv([["확정 증거", "PORTONE-CONFIRM-5513"], ["확정 일시", "2026.08.13 09:12"]], true) })}<div class="action-bar"><div><strong>환불 재시도 가능</strong><div class="action-copy">현재 시도 1 / 3 · 요청 본문 없이 새 외부 호출을 시작합니다.</div></div>${button("환불 재시도", "danger")}</div>`;
    } else {
      lower = `<div class="detail-grid"><div>${result({ title: "환불 재시도 완료 · 성공", copy: "재시도 결과 외부 환불 완료", action: button("환불 실패 목록으로 이동", "success-outline") })}</div><div></div></div>`;
    }
    return canvas(`
      <main class="content">
        <div class="breadcrumb">거래 예외 관리 › 환불 실패 › <strong>#5512</strong></div>
        ${pageHead({ title, description, status: badge(status, tone) })}
        ${summaries([{ label: "환불 금액", value: "17,000원", metric: true }, { label: "외부 호출 시도", value: count, metric: true }, { label: "요청 시각", value: `2026.08.13 · 09:05<br><span class="row-sub">완료 시각 ${completedAt}</span>` }])}
        <div class="detail-grid"><div>${refundInfo()}</div>${timelinePanel}</div>
        ${lower}
      </main>`, { grade: "PLATFORM_ADMIN" });
  };

  const commonErrors = () => {
    const errorCard = (code, title, copy, action, symbol, orange = false) => `<article class="error-card"><div class="error-icon ${orange ? "orange" : ""}">${symbol}</div><div><div class="error-code ${orange ? "orange" : ""}">${code}</div><h2>${title}</h2><p>${copy}</p>${button(`${action}　→`, "outline")}</div></article>`;
    return canvas(`
      <main class="content">
        <div class="breadcrumb">전체 관리자 › <strong>공통 오류 상태</strong></div>
        ${pageHead({ title: "공통 오류 상태", description: "API 오류 코드에 따라 안전한 다음 행동을 안내합니다." })}
        <div class="error-grid">
          ${errorCard("400 · 입력값 오류", "입력 내용을 확인해 주세요", "형식·필수값·길이를 확인하고 입력 내용을 유지한 채 수정합니다.", "입력 화면으로 돌아가기", "!")}
          ${errorCard("401 · 인증 필요", "로그인이 필요합니다", "세션이 만료되었거나 인증 정보가 없습니다.", "로그인으로 이동", "▣")}
          ${errorCard("403 · 접근 권한 없음", "이 작업을 수행할 권한이 없습니다", "현재 관리자 등급으로 허용되지 않은 기능입니다.", "운영 홈으로 이동", "×")}
          ${errorCard("404 · 대상 없음", "요청한 대상을 찾을 수 없습니다", "삭제되었거나 접근 가능한 범위를 벗어났습니다.", "목록으로 이동", "⌕", true)}
          ${errorCard("409 · 현재 상태 충돌", "현재 상태에서는 처리할 수 없습니다", "중복 요청·선행 변경·정책 제한을 확인하고 최신 상태를 다시 조회합니다.", "최신 상태 확인", "↻", true)}
          ${errorCard("500 · 서버 오류", "일시적인 오류가 발생했습니다", "입력값을 유지하고 잠시 후 다시 시도합니다.", "안전하게 다시 시도", "!" )}
        </div>
        <div class="notice"><strong>ⓘ 오류 코드 기준 분기</strong>민감한 서버 상세 메시지는 노출하지 않습니다.</div>
      </main>`, { grade: "PLATFORM_ADMIN", classes: "compact-errors" });
  };

  const screens = {
    "01-admin-home-navigation": () => homeScreen("SUPER_ADMIN"),
    "01b-admin-home-navigation-platform-admin": () => homeScreen("PLATFORM_ADMIN"),
    "02a-region-create": regionCreate,
    "02b-region-status-change": () => regionStatus("unpublish"),
    "02c-region-private-ready": () => regionStatus("publish"),
    "02d-region-public-unchanged": () => regionStatus("public-unchanged"),
    "02e-region-status-conflict": () => regionStatus("unpublish-conflict"),
    "02f-region-list-empty": regionEmpty,
    "03-account-role-management": () => roleManagement("SUPER_ADMIN", "reassign"),
    "03b-account-role-management-platform-admin": () => roleManagement("PLATFORM_ADMIN", "reassign"),
    "03c-account-role-management-appoint": () => roleManagement("PLATFORM_ADMIN", "appoint"),
    "03d-account-role-management-revoke": () => roleManagement("PLATFORM_ADMIN", "revoke"),
    "03e-account-role-management-revoke-conflict": () => roleManagement("PLATFORM_ADMIN", "revoke-conflict"),
    "03f-account-role-management-empty": () => roleManagement("PLATFORM_ADMIN", "empty"),
    "03g-account-role-management-unchanged": () => roleManagement("PLATFORM_ADMIN", "reassign-unchanged"),
    "04-super-admin-accounts": superAdminAccounts,
    "04b-super-admin-account-deactivated": () => superAdminAccounts("deactivated"),
    "05a-payment-discrepancy-list": paymentList,
    "05b-refund-failure-list": refundList,
    "05c-payment-discrepancy-list-empty": () => paymentList(true),
    "05d-refund-failure-list-empty": () => refundList(true),
    "06a-payment-discrepancy-detail": () => discrepancyDetail("OPEN"),
    "06b-manual-full-refund": manualRefund,
    "06c-payment-discrepancy-detail-resolved-no-issue": () => discrepancyDetail("RESOLVED_NO_ISSUE"),
    "06d-payment-discrepancy-detail-refund-requested": () => discrepancyDetail("REFUND_REQUESTED"),
    "06e-manual-full-refund-requested": () => manualRefund("requested"),
    "06f-manual-full-refund-processing": () => manualRefund("processing"),
    "06g-manual-full-refund-succeeded": () => manualRefund("succeeded"),
    "06h-manual-full-refund-discrepant": () => manualRefund("discrepant"),
    "07-refund-failure-detail": () => refundDetail("discrepant"),
    "07b-refund-failure-detail-failed-retryable": () => refundDetail("failed-retryable"),
    "07c-refund-failure-detail-failed-exhausted": () => refundDetail("failed-exhausted"),
    "07d-refund-failure-detail-requested": () => refundDetail("requested"),
    "07e-refund-failure-detail-processing": () => refundDetail("processing"),
    "07f-refund-failure-detail-succeeded-confirmed": () => refundDetail("succeeded-confirmed"),
    "07g-refund-failure-detail-succeeded-retry": () => refundDetail("succeeded-retry"),
    "07h-refund-failure-detail-failed-confirmed": () => refundDetail("failed-confirmed"),
    "07i-refund-failure-detail-discrepant-retry": () => refundDetail("discrepant-retry"),
    "08-common-error-states": commonErrors
  };

  const params = new URLSearchParams(window.location.search);
  const selected = params.get("screen") || "01-admin-home-navigation";
  const render = screens[selected] || screens["01-admin-home-navigation"];
  document.getElementById("app").innerHTML = render();
  document.title = `${selected} · Local Stamp 관리자 와이어프레임`;
  window.__WIREFRAME_READY__ = true;
})();
