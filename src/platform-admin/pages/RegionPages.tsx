import { useMemo, useState } from "react"
import { ApiError, apiRequest } from "../../admin/api"
import {
  AsyncState,
  ApiErrorMessage,
  Field,
  Modal,
  PageHeader,
  Pagination,
  formatDate,
  usePlatformData,
} from "../PlatformComponents"
import type { PlatformRegion } from "../types"

const createReasons = [
  ["PILOT_REGION_ADDITION", "시범 지역 추가"],
  ["SERVICE_AREA_EXPANSION", "서비스 제공 지역 확대"],
  ["ADMINISTRATIVE_REORGANIZATION", "행정구역 개편"],
] as const

const publishReasons = [
  ["REGION_LAUNCH", "지역 운영 개시"],
  ["REGION_REOPEN", "지역 운영 재개"],
  ["REGION_PREPARATION", "공개 전 준비 상태 전환"],
  ["ADMINISTRATIVE_REORGANIZATION", "행정구역 개편"],
] as const

export default function RegionListPage() {
  const [filter, setFilter] = useState<"all" | "public" | "private">("all")
  const [page, setPage] = useState(1)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<PlatformRegion | null>(null)
  const path =
    filter === "all"
      ? "/api/v1/platform-admin/regions"
      : `/api/v1/platform-admin/regions?isPublic=${filter === "public"}`
  const state = usePlatformData<{ regions: PlatformRegion[] }>(path)
  const sorted = useMemo(
    () =>
      [...(state.data?.regions ?? [])].sort((a, b) =>
        a.name.localeCompare(b.name, "ko"),
      ),
    [state.data],
  )
  const pageSize = 8
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const rows = sorted.slice((page - 1) * pageSize, page * pageSize)

  const selectFilter = (next: typeof filter) => {
    setFilter(next)
    setPage(1)
  }
  return (
    <main className="pa-content">
      <PageHeader
        title="지역 관리"
        description="전체 지역의 공개 상태와 활성 지역 관리자를 확인합니다."
        action={
          <button
            className="pa-button pa-button-primary"
            onClick={() => setCreating(true)}
          >
            ＋ 새 지역 생성
          </button>
        }
      />
      <div className="pa-toolbar">
        <div className="pa-chips">
          {(["all", "public", "private"] as const).map((value) => (
            <button
              key={value}
              className={filter === value ? "active" : ""}
              onClick={() => selectFilter(value)}
            >
              {value === "all"
                ? "전체"
                : value === "public"
                  ? "공개·운영"
                  : "비공개·준비"}
            </button>
          ))}
        </div>
        <span>이름 가나다순</span>
      </div>
      <AsyncState state={state} empty={(data) => data.regions.length === 0}>
        {() => (
          <>
            <section className="pa-list">
              {rows.map((region) => (
                <article
                  className="pa-list-row pa-region-row"
                  key={region.regionId}
                >
                  <span
                    className={`pa-badge pa-badge-${
                      region.isPublic ? "green" : "yellow"
                    }`}
                  >
                    {region.isPublic ? "공개·운영" : "비공개·준비"}
                  </span>
                  <div>
                    <strong>
                      {region.name} · {region.regionCode}
                    </strong>
                    <small>
                      지역 ID {region.regionId} · 활성 지역 관리자{" "}
                      {region.regionAdminCount}명
                    </small>
                  </div>
                  <div className="pa-row-date">
                    <small>생성 {formatDate(region.createdAt)}</small>
                    <small>수정 {formatDate(region.updatedAt)}</small>
                  </div>
                  <button
                    className="pa-button pa-button-outline"
                    onClick={() => setEditing(region)}
                  >
                    {region.isPublic ? "비공개 전환" : "지역 공개"}
                  </button>
                </article>
              ))}
            </section>
            <Pagination page={page} total={totalPages} onChange={setPage} />
          </>
        )}
      </AsyncState>
      {creating && (
        <CreateRegionModal
          onClose={() => setCreating(false)}
          onSuccess={() => {
            setCreating(false)
            state.reload()
          }}
        />
      )}
      {editing && (
        <RegionStatusModal
          region={editing}
          onClose={() => setEditing(null)}
          onSuccess={() => {
            setEditing(null)
            state.reload()
          }}
        />
      )}
    </main>
  )
}

function CreateRegionModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [regionCode, setRegionCode] = useState("")
  const [name, setName] = useState("")
  const [reasonCode, setReasonCode] = useState(createReasons[0][0])
  const [evidenceReference, setEvidenceReference] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError("")
    try {
      await apiRequest("/api/v1/platform-admin/regions", {
        method: "POST",
        body: JSON.stringify({
          regionCode,
          name,
          reasonCode,
          evidenceReference,
        }),
      })
      onSuccess()
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "지역을 생성하지 못했습니다.",
      )
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <Modal
      title="새 지역 생성"
      description="새 지역은 생성 직후 비공개·준비 상태로 저장됩니다."
      onClose={onClose}
    >
      <form className="pa-drawer-form" onSubmit={submit}>
        <Field
          label="지역 코드 *"
          help="영문자로 시작, 영숫자·하이픈 / 서버에서 대문자로 저장됩니다."
        >
          <input
            value={regionCode}
            onChange={(event) =>
              setRegionCode(event.target.value.toUpperCase())
            }
            maxLength={50}
            pattern="[A-Za-z][A-Za-z0-9-]*"
            required
          />
        </Field>
        <Field label="지역 이름 *">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={100}
            required
          />
        </Field>
        <Field label="생성 사유 *">
          <select
            value={reasonCode}
            onChange={(event) => setReasonCode(event.target.value)}
          >
            {createReasons.map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="증빙 참조 *"
          help={`개인정보·토큰·비밀값을 입력하지 마세요. · ${evidenceReference.length}/500`}
        >
          <textarea
            value={evidenceReference}
            onChange={(event) => setEvidenceReference(event.target.value)}
            maxLength={500}
            required
          />
        </Field>
        <ApiErrorMessage error={error} />
        <div className="pa-form-actions">
          <button type="button" className="pa-button" onClick={onClose}>
            취소
          </button>
          <button className="pa-button pa-button-primary" disabled={submitting}>
            {submitting ? "생성 중…" : "비공개 지역 생성"}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function RegionStatusModal({
  region,
  onClose,
  onSuccess,
}: {
  region: PlatformRegion
  onClose: () => void
  onSuccess: () => void
}) {
  const nextPublic = !region.isPublic
  const [reasonCode, setReasonCode] = useState(
    nextPublic ? "REGION_LAUNCH" : "REGION_PREPARATION",
  )
  const [evidenceReference, setEvidenceReference] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError("")
    try {
      await apiRequest(
        `/api/v1/platform-admin/regions/${region.regionId}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({
            isPublic: nextPublic,
            reasonCode,
            evidenceReference,
          }),
        },
      )
      onSuccess()
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "공개 상태를 변경하지 못했습니다.",
      )
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <Modal
      title="공개 여부 변경"
      description={`${region.name} · ${region.regionCode}`}
      onClose={onClose}
    >
      <form className="pa-drawer-form" onSubmit={submit}>
        <div className="pa-status-flow">
          <span
            className={`pa-badge pa-badge-${
              region.isPublic ? "green" : "yellow"
            }`}
          >
            현재 {region.isPublic ? "공개·운영" : "비공개·준비"}
          </span>
          <b>→</b>
          <span
            className={`pa-badge pa-badge-${nextPublic ? "green" : "yellow"}`}
          >
            목표 {nextPublic ? "공개·운영" : "비공개·준비"}
          </span>
        </div>
        <Field label="변경 사유 *">
          <select
            value={reasonCode}
            onChange={(event) => setReasonCode(event.target.value)}
          >
            {publishReasons.map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="증빙 참조 *">
          <textarea
            value={evidenceReference}
            onChange={(event) => setEvidenceReference(event.target.value)}
            maxLength={500}
            required
          />
        </Field>
        {!nextPublic && (
          <div className="pa-notice pa-notice-orange">
            <strong>비공개 전환 제한</strong>
            <span>
              비삭제 콘텐츠가 있는 지역은 전환이 제한될 수 있습니다. 충돌 시
              최신 상태를 다시 조회합니다.
            </span>
          </div>
        )}
        <ApiErrorMessage error={error} />
        <div className="pa-form-actions">
          <button type="button" className="pa-button" onClick={onClose}>
            취소
          </button>
          <button
            className={`pa-button ${
              nextPublic ? "pa-button-primary" : "pa-button-danger"
            }`}
            disabled={submitting}
          >
            {submitting
              ? "변경 중…"
              : nextPublic
                ? "공개로 전환"
                : "비공개로 전환"}
          </button>
        </div>
      </form>
    </Modal>
  )
}
