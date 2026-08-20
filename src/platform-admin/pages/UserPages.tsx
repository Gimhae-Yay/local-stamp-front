import { useMemo, useState } from "react";
import { ApiError, apiRequest } from "../../admin/api";
import {
  ApiErrorMessage,
  AsyncState,
  Field,
  Modal,
  PageHeader,
  Pagination,
  StatusBadge,
  formatDate,
  usePlatformData,
} from "../PlatformComponents";
import type { PlatformRegion, PlatformUser } from "../types";

type RoleMode = "REGION_ADMIN" | "NONE";

export default function UserListPage() {
  const state = usePlatformData<{ users: PlatformUser[] }>("/api/v1/platform-admin/users");
  const regions = usePlatformData<{ regions: PlatformRegion[] }>("/api/v1/platform-admin/regions");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"users" | "admins">("users");
  const [selected, setSelected] = useState<PlatformUser | null>(null);
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (state.data?.users ?? []).filter((user) => {
      const isPlatformAdmin = user.roleAssignments.some(
        (assignment) => assignment.role === "PLATFORM_ADMIN",
      );
      if ((tab === "admins") !== isPlatformAdmin) return false;
      return (
        !normalized ||
        `${user.name} ${user.loginIdentifier} ${user.userId}`.toLowerCase().includes(normalized)
      );
    });
  }, [query, state.data, tab]);
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const chooseTab = (value: typeof tab) => {
    setTab(value);
    setPage(1);
  };

  return (
    <main className="pa-content">
      <PageHeader
        title="계정·권한 관리"
        description="활성 일반 계정의 현재 역할과 담당 지역을 확인합니다."
      />
      <div className="pa-tabs">
        <button className={tab === "users" ? "active" : ""} onClick={() => chooseTab("users")}>
          일반 사용자·지역 관리자 역할
        </button>
        <button className={tab === "admins" ? "active" : ""} onClick={() => chooseTab("admins")}>
          ▣ 전체 관리자 계정
        </button>
      </div>
      <div className="pa-toolbar">
        <div className="pa-search">
          <span>⌕</span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="이름, 이메일 또는 사용자 ID 검색"
          />
        </div>
        <span>최근 생성순</span>
      </div>
      <AsyncState state={state} empty={() => rows.length === 0}>
        {() => (
          <>
            <section className="pa-list">
              {rows.map((user) => {
                const regionRole = user.roleAssignments.find(
                  (assignment) => assignment.role === "REGION_ADMIN",
                );
                const displayRole = regionRole ?? user.roleAssignments[0];
                return (
                  <article
                    className={`pa-list-row pa-user-row ${
                      selected?.userId === user.userId ? "selected" : ""
                    }`}
                    key={user.userId}
                  >
                    <div>
                      <strong>{user.name}</strong>
                      <small>{user.loginIdentifier}</small>
                    </div>
                    <div>
                      <small>사용자 ID</small>
                      <strong>{user.userId}</strong>
                    </div>
                    <div>
                      {displayRole ? (
                        <StatusBadge value={displayRole.role} />
                      ) : (
                        <StatusBadge value="NONE" label="역할 없음" />
                      )}
                      <small>
                        {regionRole
                          ? `${regionRole.regionName} · 지역 ${regionRole.regionId}`
                          : "활성 역할 배정 없음"}
                      </small>
                    </div>
                    <div>
                      <small>생성</small>
                      <span>{formatDate(user.createdAt)}</span>
                    </div>
                    <button
                      className="pa-button pa-button-outline"
                      onClick={() => setSelected(user)}
                    >
                      역할 변경
                    </button>
                  </article>
                );
              })}
            </section>
            <Pagination page={page} total={totalPages} onChange={setPage} />
          </>
        )}
      </AsyncState>
      {selected && (
        <RoleModal
          user={selected}
          regions={regions.data?.regions ?? []}
          onClose={() => setSelected(null)}
          onSuccess={() => {
            setSelected(null);
            state.reload();
          }}
        />
      )}
    </main>
  );
}

function RoleModal({
  user,
  regions,
  onClose,
  onSuccess,
}: {
  user: PlatformUser;
  regions: PlatformRegion[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const current = user.roleAssignments.find((assignment) => assignment.role === "REGION_ADMIN");
  const [role, setRole] = useState<RoleMode>(current ? "REGION_ADMIN" : "REGION_ADMIN");
  const [regionId, setRegionId] = useState(current?.regionId ?? regions[0]?.regionId ?? "");
  const [reasonCode, setReasonCode] = useState(
    current ? "REGION_ADMIN_REASSIGNMENT" : "REGION_ADMIN_APPOINTMENT",
  );
  const [evidenceReference, setEvidenceReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const changeRole = (next: RoleMode) => {
    setRole(next);
    setReasonCode(
      next === "NONE"
        ? "REGION_ADMIN_REVOCATION"
        : current
          ? "REGION_ADMIN_REASSIGNMENT"
          : "REGION_ADMIN_APPOINTMENT",
    );
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await apiRequest(`/api/v1/platform-admin/users/${user.userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({
          role,
          regionId: role === "REGION_ADMIN" ? regionId : null,
          reasonCode,
          evidenceReference,
        }),
      });
      onSuccess();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "역할을 변경하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Modal
      title="지역 관리자 역할 변경"
      description="지역 관리자 임명·재배정·회수만 수행할 수 있습니다."
      onClose={onClose}
    >
      <form className="pa-drawer-form" onSubmit={submit}>
        <div className="pa-target-card">
          <strong>
            {user.name} · {user.loginIdentifier}
          </strong>
          <small>사용자 ID {user.userId}</small>
          <div>
            {current ? (
              <>
                <StatusBadge value="REGION_ADMIN" />
                <span>
                  {current.regionName} · 지역 {current.regionId}
                </span>
              </>
            ) : (
              <StatusBadge value="NONE" label="현재 역할 없음" />
            )}
          </div>
        </div>
        <Field label="변경 목표 *">
          <select value={role} onChange={(event) => changeRole(event.target.value as RoleMode)}>
            <option value="REGION_ADMIN">
              {current ? "다른 지역으로 재배정" : "지역 관리자 신규 임명"}
            </option>
            {current && <option value="NONE">지역 관리자 역할 회수</option>}
          </select>
        </Field>
        {role === "REGION_ADMIN" && (
          <Field label="대상 지역 *">
            <select value={regionId} onChange={(event) => setRegionId(event.target.value)} required>
              {regions.map((region) => (
                <option key={region.regionId} value={region.regionId}>
                  {region.name} · 지역 ID {region.regionId}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="변경 사유 코드 *" help="영문 대문자와 밑줄만 입력합니다.">
          <input
            value={reasonCode}
            onChange={(event) => setReasonCode(event.target.value.toUpperCase())}
            maxLength={100}
            pattern="[A-Z][A-Z0-9_]*"
            required
          />
        </Field>
        <Field label="증빙 참조 *" help="개인정보·토큰·비밀값을 입력하지 마세요.">
          <textarea
            value={evidenceReference}
            onChange={(event) => setEvidenceReference(event.target.value)}
            maxLength={500}
            required
          />
        </Field>
        <div className="pa-notice pa-notice-orange">
          <strong>마지막 관리자 보호</strong>
          <span>
            비삭제 콘텐츠가 있는 기존 지역의 마지막 활성 지역 관리자는 재배정하거나 회수할 수
            없습니다.
          </span>
        </div>
        <ApiErrorMessage error={error} />
        <div className="pa-form-actions">
          <button type="button" className="pa-button" onClick={onClose}>
            취소
          </button>
          <button
            className={`pa-button ${role === "NONE" ? "pa-button-danger" : "pa-button-primary"}`}
            disabled={submitting}
          >
            {submitting ? "요청 중…" : role === "NONE" ? "역할 회수 실행" : "역할 변경 요청"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
