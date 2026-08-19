import { useMemo, useState } from "react"
import { ApiError, apiRequest } from "../../admin/api"
import {
  ApiErrorMessage,
  AsyncState,
  Field,
  Modal,
  PageHeader,
  StatusBadge,
  formatDate,
  usePlatformData,
} from "../PlatformComponents"
import type { PlatformUser } from "../types"

export default function AdminAccountPage() {
  const state = usePlatformData<{ users: PlatformUser[] }>(
    "/api/v1/platform-admin/users",
  )
  const [creating, setCreating] = useState(false)
  const [deactivating, setDeactivating] = useState<PlatformUser | null>(null)
  const [deactivatingById, setDeactivatingById] = useState(false)
  const administrators = useMemo(
    () =>
      (state.data?.users ?? []).filter((user) =>
        user.roleAssignments.some(
          (assignment) => assignment.role === "PLATFORM_ADMIN",
        ),
      ),
    [state.data],
  )
  return (
    <main className="pa-content">
      <PageHeader
        title="전체 관리자 계정"
        description="최고 관리자만 전체 관리자 계정을 생성하거나 비활성화할 수 있습니다."
        action={
          <div className="pa-header-actions">
            <button
              className="pa-button pa-button-danger-outline"
              onClick={() => setDeactivatingById(true)}
            >
              계정 비활성화
            </button>
            <button
              className="pa-button pa-button-primary"
              onClick={() => setCreating(true)}
            >
              ＋ 전체 관리자 계정 생성
            </button>
          </div>
        }
      />
      <div className="pa-notice pa-notice-orange">
        <strong>최고 관리자 전용</strong>
        <span>
          현재 백엔드는 관리자 등급 조회값을 제공하지 않습니다. 생성·비활성화
          권한은 요청 시 서버가 최종 검증하며, 비활성화 대상은 사용자 ID로
          지정합니다.
        </span>
      </div>
      <AsyncState state={state} empty={() => administrators.length === 0}>
        {() => (
          <section className="pa-list">
            {administrators.map((user) => (
              <article className="pa-list-row pa-admin-row" key={user.userId}>
                <span className="pa-account-avatar">관</span>
                <div>
                  <strong>{user.name}</strong>
                  <small>
                    {user.loginIdentifier} · 사용자 ID {user.userId}
                  </small>
                </div>
                <StatusBadge value="ACTIVE" />
                <span>{formatDate(user.createdAt)}</span>
                <button
                  className="pa-button pa-button-danger-outline"
                  onClick={() => setDeactivating(user)}
                >
                  비활성화
                </button>
              </article>
            ))}
          </section>
        )}
      </AsyncState>
      {creating && (
        <CreateAdminModal
          onClose={() => setCreating(false)}
          onSuccess={() => {
            setCreating(false)
            state.reload()
          }}
        />
      )}
      {deactivating && (
        <DeactivateAdminModal
          user={deactivating}
          onClose={() => setDeactivating(null)}
          onSuccess={() => {
            setDeactivating(null)
            state.reload()
          }}
        />
      )}
      {deactivatingById && (
        <DeactivateAdminModal
          onClose={() => setDeactivatingById(false)}
          onSuccess={() => {
            setDeactivatingById(false)
            state.reload()
          }}
        />
      )}
    </main>
  )
}

function CreateAdminModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    phone: "",
    grade: "PLATFORM_ADMIN",
    reasonCode: "ADMIN_ACCOUNT_CREATION",
    evidenceReference: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const update = (field: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [field]: value }))
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError("")
    try {
      await apiRequest("/api/v1/platform-admin/admin-accounts", {
        method: "POST",
        body: JSON.stringify(form),
      })
      onSuccess()
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "계정을 생성하지 못했습니다.",
      )
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <Modal
      title="전체 관리자 계정 생성"
      description="계정 생성 즉시 활성화되며 해당 등급의 권한을 사용할 수 있습니다."
      onClose={onClose}
    >
      <form className="pa-drawer-form pa-form-grid" onSubmit={submit}>
        <Field label="이메일 *">
          <input
            type="email"
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
            required
          />
        </Field>
        <Field label="이름 *">
          <input
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            maxLength={50}
            required
          />
        </Field>
        <Field label="전화번호 *">
          <input
            value={form.phone}
            onChange={(event) =>
              update("phone", event.target.value.replace(/[^0-9-]/g, ""))
            }
            placeholder="010-1234-5678"
            required
          />
        </Field>
        <Field label="관리자 등급 *">
          <select
            value={form.grade}
            onChange={(event) => update("grade", event.target.value)}
          >
            <option value="PLATFORM_ADMIN">플랫폼 관리자</option>
            <option value="SUPER_ADMIN">최고 관리자</option>
          </select>
        </Field>
        <Field
          label="임시 비밀번호 *"
          help="8~64자, 영문·숫자·특수문자를 모두 포함해야 합니다."
        >
          <input
            type="password"
            value={form.password}
            onChange={(event) => update("password", event.target.value)}
            minLength={8}
            maxLength={64}
            required
          />
        </Field>
        <Field label="생성 사유 코드 *">
          <input
            value={form.reasonCode}
            onChange={(event) =>
              update("reasonCode", event.target.value.toUpperCase())
            }
            pattern="[A-Z][A-Z0-9_]*"
            maxLength={100}
            required
          />
        </Field>
        <Field label="증빙 참조 *">
          <textarea
            value={form.evidenceReference}
            onChange={(event) =>
              update("evidenceReference", event.target.value)
            }
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
            {submitting ? "생성 중…" : "계정 생성"}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function DeactivateAdminModal({
  user,
  onClose,
  onSuccess,
}: {
  user?: PlatformUser
  onClose: () => void
  onSuccess: () => void
}) {
  const [userId, setUserId] = useState(user?.userId ?? "")
  const [reasonCode, setReasonCode] = useState("ADMIN_ACCOUNT_DEACTIVATION")
  const [evidenceReference, setEvidenceReference] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError("")
    try {
      await apiRequest(
        `/api/v1/platform-admin/admin-accounts/${userId}/deactivate`,
        {
          method: "POST",
          body: JSON.stringify({ reasonCode, evidenceReference }),
        },
      )
      onSuccess()
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "계정을 비활성화하지 못했습니다.",
      )
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <Modal
      title="전체 관리자 계정 비활성화"
      description={
        user
          ? `${user.name} · ${user.loginIdentifier}`
          : "비활성화할 전체 관리자 계정의 사용자 ID를 입력합니다."
      }
      onClose={onClose}
    >
      <form className="pa-drawer-form" onSubmit={submit}>
        <div className="pa-notice pa-notice-danger">
          <strong>즉시 접근 차단</strong>
          <span>
            비활성화 후 해당 계정은 전체 관리자 기능을 사용할 수 없습니다.
          </span>
        </div>
        <Field label="사용자 ID *">
          <input
            value={userId}
            onChange={(event) =>
              setUserId(event.target.value.replace(/\D/g, ""))
            }
            inputMode="numeric"
            disabled={Boolean(user)}
            required
          />
        </Field>
        <Field label="비활성화 사유 코드 *">
          <input
            value={reasonCode}
            onChange={(event) =>
              setReasonCode(event.target.value.toUpperCase())
            }
            pattern="[A-Z][A-Z0-9_]*"
            maxLength={100}
            required
          />
        </Field>
        <Field label="증빙 참조 *">
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
          <button className="pa-button pa-button-danger" disabled={submitting}>
            {submitting ? "처리 중…" : "계정 비활성화"}
          </button>
        </div>
      </form>
    </Modal>
  )
}
