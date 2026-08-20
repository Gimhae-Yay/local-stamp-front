import { useState } from "react";
import { ApiError, apiRequest, storedUserId } from "../../admin/api";
import {
  ApiErrorMessage,
  AsyncState,
  Field,
  Modal,
  PageHeader,
  StatusBadge,
  formatDate,
  usePlatformData,
} from "../PlatformComponents";

import type { PlatformAdminAccount } from "../types";

export default function AdminAccountPage() {
  const currentUserId = storedUserId();
  const state = usePlatformData<{ adminAccounts: PlatformAdminAccount[] }>(
    "/api/v1/platform-admin/admin-accounts",
  );
  const [creating, setCreating] = useState(false);
  const [deactivating, setDeactivating] = useState<PlatformAdminAccount | null>(null);
  const administrators = state.data?.adminAccounts ?? [];
  return (
    <main className="pa-content">
      <PageHeader
        title="전체 관리자 계정"
        description="최고 관리자만 전체 관리자 계정을 생성하거나 비활성화할 수 있습니다."
        action={
          <div className="pa-header-actions">
            <button className="pa-button pa-button-primary" onClick={() => setCreating(true)}>
              ＋ 전체 관리자 계정 생성
            </button>
          </div>
        }
      />
      <div className="pa-notice pa-notice-orange">
        <strong>최고 관리자 전용</strong>
        <span>활성·비활성 전체 관리자 계정을 확인하고 계정별 작업을 수행할 수 있습니다.</span>
      </div>
      <AsyncState state={state} empty={(value) => value.adminAccounts.length === 0}>
        {() => (
          <section className="pa-list">
            {administrators.map((account) => (
              <article className="pa-list-row pa-admin-row" key={account.userId}>
                <span className="pa-account-avatar">관</span>
                <div>
                  <strong>{account.name}</strong>
                  <small>
                    {account.loginIdentifier} · 사용자 ID {account.userId}
                  </small>
                </div>
                <div className="pa-admin-meta">
                  <StatusBadge
                    value={account.grade}
                    label={account.grade === "SUPER_ADMIN" ? "최고 관리자" : "플랫폼 관리자"}
                  />
                  <StatusBadge value={account.status} />
                </div>
                <span>
                  {account.status === "INACTIVE"
                    ? `비활성화 ${formatDate(account.inactivatedAt)}`
                    : `생성 ${formatDate(account.createdAt)}`}
                </span>
                <button
                  className="pa-button pa-button-danger-outline"
                  onClick={() => setDeactivating(account)}
                  disabled={account.status !== "ACTIVE" || account.userId === currentUserId}
                >
                  {account.userId === currentUserId
                    ? "현재 계정"
                    : account.status === "ACTIVE"
                      ? "비활성화"
                      : "비활성화됨"}
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
            setCreating(false);

            state.reload();
          }}
        />
      )}
      {deactivating && (
        <DeactivateAdminModal
          user={deactivating}
          onClose={() => setDeactivating(null)}
          onSuccess={() => {
            setDeactivating(null);

            state.reload();
          }}
        />
      )}
    </main>
  );
}

function CreateAdminModal({
  onClose,

  onSuccess,
}: {
  onClose: () => void;

  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    email: "",

    password: "",

    name: "",

    phone: "",

    grade: "PLATFORM_ADMIN",

    reasonCode: "ADMIN_ACCOUNT_CREATION",

    evidenceReference: "",
  });

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");

  const update = (field: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    const phoneDigits = form.phone.replace(/\D/g, "");

    if (!/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9])[!-~]{8,64}$/.test(form.password)) {
      setError("비밀번호에는 영문자·숫자·특수문자가 모두 포함되어야 합니다.");

      return;
    }

    if (!/^\d{10,11}$/.test(phoneDigits)) {
      setError("전화번호는 숫자 10~11자리로 입력해 주세요.");

      return;
    }

    setSubmitting(true);

    setError("");

    try {
      await apiRequest("/api/v1/platform-admin/admin-accounts", {
        method: "POST",

        body: JSON.stringify(form),
      });

      onSuccess();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "계정을 생성하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

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
            onChange={(event) => update("phone", event.target.value.replace(/[^0-9-]/g, ""))}
            placeholder="010-1234-5678"
            inputMode="tel"
            minLength={10}
            maxLength={13}
            required
          />
        </Field>
        <Field label="관리자 등급 *">
          <select value={form.grade} onChange={(event) => update("grade", event.target.value)}>
            <option value="PLATFORM_ADMIN">플랫폼 관리자</option>
            <option value="SUPER_ADMIN">최고 관리자</option>
          </select>
        </Field>
        <Field label="임시 비밀번호 *" help="8~64자, 영문·숫자·특수문자를 모두 포함해야 합니다.">
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
            onChange={(event) => update("reasonCode", event.target.value.toUpperCase())}
            pattern="[A-Z][A-Z0-9_]*"
            maxLength={100}
            required
          />
        </Field>
        <Field label="증빙 참조 *">
          <textarea
            value={form.evidenceReference}
            onChange={(event) => update("evidenceReference", event.target.value)}
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
  );
}

function DeactivateAdminModal({
  user,

  onClose,

  onSuccess,
}: {
  user: PlatformAdminAccount;

  onClose: () => void;

  onSuccess: () => void;
}) {
  const userId = user.userId;
  const [reasonCode, setReasonCode] = useState("ADMIN_ACCOUNT_DEACTIVATION");

  const [evidenceReference, setEvidenceReference] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    setSubmitting(true);

    setError("");

    try {
      await apiRequest(
        `/api/v1/platform-admin/admin-accounts/${user.userId}/deactivate`,

        {
          method: "POST",

          body: JSON.stringify({ reasonCode, evidenceReference }),
        },
      );

      onSuccess();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "계정을 비활성화하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="전체 관리자 계정 비활성화"
      description={`${user.name} · ${user.loginIdentifier}`}
      onClose={onClose}
    >
      <form className="pa-drawer-form" onSubmit={submit}>
        <div className="pa-notice pa-notice-danger">
          <strong>즉시 접근 차단</strong>
          <span>비활성화 후 해당 계정은 전체 관리자 기능을 사용할 수 없습니다.</span>
        </div>
        <Field label="사용자 ID *">
          <input value={userId} inputMode="numeric" disabled required />
        </Field>
        <Field label="비활성화 사유 코드 *">
          <input
            value={reasonCode}
            onChange={(event) => setReasonCode(event.target.value.toUpperCase())}
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
  );
}
