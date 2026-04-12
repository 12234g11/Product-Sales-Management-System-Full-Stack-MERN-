import { useEffect, useMemo, useState } from "react";
import { usersApi } from "../api/usersApi";
import { useAuth } from "../../../App/providers/AuthProvider";

function formatDate(d) {
  try {
    return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" }).format(new Date(d));
  } catch {
    return "";
  }
}

function formatPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0%";

  try {
    return `${new Intl.NumberFormat("ar-EG", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(n)}%`;
  } catch {
    return `${n}%`;
  }
}

function roleLabel(role) {
  return role === "admin" ? "مدير" : "عامل";
}

function statusLabel(status) {
  return status === "active" ? "نشط" : "معطّل";
}

function UserFormModal({ show, busy, onClose, onSubmit }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "user" });

  useEffect(() => {
    if (show) setForm({ name: "", email: "", password: "", role: "user" });
  }, [show]);

  if (!show) return null;

  return (
    <>
      <div className="modal fade show" style={{ display: "block" }} tabIndex="-1" aria-modal="true" role="dialog">
        <div className="modal-dialog modal-fullscreen-sm-down" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">إضافة مستخدم</h5>
              <button className="btn-close ms-0 me-auto" onClick={onClose} aria-label="Close" />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSubmit(form);
              }}
            >
              <div className="modal-body d-grid gap-2">
                <div>
                  <label className="form-label">الاسم</label>
                  <input
                    className="form-control"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">الإيميل</label>
                  <input
                    className="form-control"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">كلمة المرور</label>
                  <input
                    className="form-control"
                    type="password"
                    minLength={6}
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    required
                  />
                  <div className="form-text">لا تقل عن 6 أحرف.</div>
                </div>

                <div>
                  <label className="form-label">الدور</label>
                  <select
                    className="form-select"
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  >
                    <option value="user">عامل</option>
                    <option value="admin">مدير</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={busy}>
                  إلغاء
                </button>
                <button className="btn btn-primary" disabled={busy}>
                  {busy ? "جاري الإضافة..." : "إضافة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="modal-backdrop fade show" onClick={onClose} />
    </>
  );
}

function DiscountLimitsModal({ show, busy, user, onClose, onSubmit }) {
  const [form, setForm] = useState({
    maxItemDiscountPercent: "0",
    maxInvoiceDiscountPercent: "0",
  });

  useEffect(() => {
    if (show) {
      setForm({
        maxItemDiscountPercent: String(user?.maxItemDiscountPercent ?? 0),
        maxInvoiceDiscountPercent: String(user?.maxInvoiceDiscountPercent ?? 0),
      });
    }
  }, [show, user]);

  if (!show) return null;

  return (
    <>
      <div className="modal fade show" style={{ display: "block" }} tabIndex="-1" aria-modal="true" role="dialog">
        <div className="modal-dialog modal-fullscreen-sm-down" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">تحديد حدود الخصم</h5>
              <button className="btn-close ms-0 me-auto" onClick={onClose} aria-label="Close" />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSubmit({
                  maxItemDiscountPercent: Number(form.maxItemDiscountPercent),
                  maxInvoiceDiscountPercent: Number(form.maxInvoiceDiscountPercent),
                });
              }}
            >
              <div className="modal-body d-grid gap-3">
                <div className="alert alert-info mb-0">
                  <div className="fw-semibold">{user?.name}</div>
                  <div className="small mt-1">{user?.email}</div>
                </div>

                <div>
                  <label className="form-label">الحد الأقصى لخصم الصنف (%)</label>
                  <input
                    className="form-control"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.maxItemDiscountPercent}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        maxItemDiscountPercent: e.target.value,
                      }))
                    }
                    required
                  />
                  <div className="form-text">قيمة من 0 إلى 100.</div>
                </div>

                <div>
                  <label className="form-label">الحد الأقصى لخصم الفاتورة (%)</label>
                  <input
                    className="form-control"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.maxInvoiceDiscountPercent}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        maxInvoiceDiscountPercent: e.target.value,
                      }))
                    }
                    required
                  />
                  <div className="form-text">قيمة من 0 إلى 100.</div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={busy}>
                  إلغاء
                </button>
                <button className="btn btn-primary" disabled={busy}>
                  {busy ? "جاري الحفظ..." : "حفظ الحدود"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="modal-backdrop fade show" onClick={onClose} />
    </>
  );
}

function ConfirmStatusModal({ show, busy, user, nextStatus, onClose, onConfirm }) {
  if (!show) return null;

  const isDisable = nextStatus === "disabled";
  return (
    <>
      <div className="modal fade show" style={{ display: "block" }} tabIndex="-1" aria-modal="true" role="dialog">
        <div className="modal-dialog modal-fullscreen-sm-down" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{isDisable ? "تعطيل مستخدم" : "تفعيل مستخدم"}</h5>
              <button className="btn-close ms-0 me-auto" onClick={onClose} aria-label="Close" />
            </div>

            <div className="modal-body">
              هل تريد {isDisable ? "تعطيل" : "تفعيل"} المستخدم:
              <div className="mt-2">
                <span className="fw-bold">{user?.name}</span>{" "}
                <span className="text-secondary">({user?.email})</span>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline-secondary" onClick={onClose} disabled={busy}>
                إلغاء
              </button>
              <button
                className={`btn ${isDisable ? "btn-danger" : "btn-success"}`}
                onClick={onConfirm}
                disabled={busy}
              >
                {busy ? "جاري التنفيذ..." : isDisable ? "تعطيل" : "تفعيل"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="modal-backdrop fade show" onClick={onClose} />
    </>
  );
}

function ConfirmDeleteModal({ show, busy, user, onClose, onConfirm }) {
  if (!show) return null;

  return (
    <>
      <div className="modal fade show" style={{ display: "block" }} tabIndex="-1" aria-modal="true" role="dialog">
        <div className="modal-dialog modal-fullscreen-sm-down" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">حذف نهائي</h5>
              <button className="btn-close ms-0 me-auto" onClick={onClose} aria-label="Close" />
            </div>

            <div className="modal-body">
              <div className="alert alert-warning mb-2">
                تحذير: سيتم حذف المستخدم نهائيًا من ساحة العمل ولن يظهر في القائمة.
              </div>
              هل تريد حذف المستخدم:
              <div className="mt-2">
                <span className="fw-bold">{user?.name}</span>{" "}
                <span className="text-secondary">({user?.email})</span>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline-secondary" onClick={onClose} disabled={busy}>
                إلغاء
              </button>
              <button className="btn btn-danger" onClick={onConfirm} disabled={busy}>
                {busy ? "جاري الحذف..." : "حذف نهائي"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="modal-backdrop fade show" onClick={onClose} />
    </>
  );
}

export default function UsersPage() {
  const { user: me } = useAuth();

  const [data, setData] = useState({ ownerUserId: null, users: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [showCreate, setShowCreate] = useState(false);

  const [showStatus, setShowStatus] = useState(false);
  const [nextStatus, setNextStatus] = useState("disabled");

  const [showDelete, setShowDelete] = useState(false);
  const [showDiscountLimits, setShowDiscountLimits] = useState(false);

  const [target, setTarget] = useState(null);

  const refresh = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await usersApi.getAll();
      setData({
        ownerUserId: res?.ownerUserId,
        users: Array.isArray(res?.users) ? res.users : [],
      });
    } catch (e) {
      setErr(e.userMessage || "فشل تحميل المستخدمين");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const ownerId = data.ownerUserId;
  const users = data.users;

  const activeCount = useMemo(() => users.filter((u) => u.status === "active").length, [users]);

  const create = async (payload) => {
    setBusy(true);
    setErr("");
    try {
      await usersApi.create(payload);
      setShowCreate(false);
      await refresh();
    } catch (e) {
      setErr(e.userMessage || "فشل إضافة المستخدم");
    } finally {
      setBusy(false);
    }
  };

  const openStatusModal = (u, status) => {
    setTarget(u);
    setNextStatus(status);
    setShowStatus(true);
  };

  const openDeleteModal = (u) => {
    setTarget(u);
    setShowDelete(true);
  };

  const openDiscountLimitsModal = (u) => {
    setTarget(u);
    setShowDiscountLimits(true);
  };

  const submitStatus = async () => {
    setBusy(true);
    setErr("");
    try {
      const id = target._id || target.id;
      await usersApi.updateStatus(id, nextStatus);
      setShowStatus(false);
      await refresh();
    } catch (e) {
      setErr(e.userMessage || "فشل تغيير حالة المستخدم");
    } finally {
      setBusy(false);
    }
  };

  const submitDiscountLimits = async (payload) => {
    setBusy(true);
    setErr("");
    try {
      const id = target._id || target.id;
      await usersApi.updateDiscountLimits(id, payload);
      setShowDiscountLimits(false);
      await refresh();
    } catch (e) {
      setErr(e.userMessage || "فشل تحديث حدود الخصم");
    } finally {
      setBusy(false);
    }
  };

  const submitDelete = async () => {
    setBusy(true);
    setErr("");
    try {
      const id = target._id || target.id;
      await usersApi.deletePermanently(id);
      setShowDelete(false);
      await refresh();
    } catch (e) {
      setErr(e.userMessage || "فشل حذف المستخدم");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="d-md-none mb-3">
        <div className="mb-2">
          <h3 className="m-0 text-white">المستخدمين</h3>
          <div className="text-white mt-2 small">
            النشطين: {activeCount} • الإجمالي: {users.length}
          </div>
        </div>

        <div className="row g-2">
          <div className="col-6">
            <button className="btn btn-primary w-100" onClick={() => setShowCreate(true)}>
              إضافة مستخدم
            </button>
          </div>
          <div className="col-6">
            <button className="btn btn-outline-secondary w-100" onClick={refresh} disabled={loading}>
              تحديث
            </button>
          </div>
        </div>
      </div>

      <div className="d-none d-md-flex flex-row-reverse justify-content-between align-items-center mb-3">
        <div>
          <h3 className="m-0 text-white">المستخدمين</h3>
          <div className="text-white mt-2 small">
            النشطين: {activeCount} • الإجمالي: {users.length}
          </div>
        </div>

        <div className="d-flex flex-row-reverse gap-2">
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            إضافة مستخدم
          </button>
          <button className="btn btn-outline-secondary" onClick={refresh} disabled={loading}>
            تحديث
          </button>
        </div>
      </div>

      {err && <div className="alert alert-danger">{err}</div>}

      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-4">جاري التحميل...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-4 text-secondary">لا يوجد مستخدمين</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle text-nowrap">
                <thead>
                  <tr>
                    <th className="text-end">الاسم</th>
                    <th className="text-end">الإيميل</th>
                    <th className="text-end">الدور</th>
                    <th className="text-end">الحالة</th>
                    <th className="text-end">حد خصم الصنف</th>
                    <th className="text-end">حد خصم الفاتورة</th>
                    <th className="text-end">تاريخ الإنشاء</th>
                    <th className="text-end"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isOwner = ownerId && String(ownerId) === String(u._id);
                    const isMe = me?.id && String(me.id) === String(u._id);

                    const canEdit = !isMe && !isOwner;
                    const isActive = u.status === "active";

                    return (
                      <tr key={u._id}>
                        <td className="text-end">
                          <div className="fw-semibold">
                            {u.name}{" "}
                            {isOwner && <span className="badge text-bg-info ms-2">المؤسس</span>}
                            {isMe && <span className="badge text-bg-secondary ms-2">أنت</span>}
                          </div>
                        </td>

                        <td className="text-end">{u.email}</td>

                        <td className="text-end">
                          <span className={`badge ${u.role === "admin" ? "text-bg-primary" : "text-bg-secondary"}`}>
                            {roleLabel(u.role)}
                          </span>
                        </td>

                        <td className="text-end">
                          <span className={`badge ${isActive ? "text-bg-success" : "text-bg-danger"}`}>
                            {statusLabel(u.status)}
                          </span>
                        </td>

                        <td className="text-end">
                          <span className="badge text-bg-warning">
                            {formatPercent(u.maxItemDiscountPercent)}
                          </span>
                        </td>

                        <td className="text-end">
                          <span className="badge text-bg-dark">
                            {formatPercent(u.maxInvoiceDiscountPercent)}
                          </span>
                        </td>

                        <td className="text-end small text-secondary">{formatDate(u.createdAt)}</td>

                        <td className="text-end">
                          <div className="d-flex flex-row-reverse gap-2 justify-content-end flex-wrap flex-md-nowrap">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              disabled={busy}
                              onClick={() => openDiscountLimitsModal(u)}
                            >
                              حدود الخصم
                            </button>

                            {isActive ? (
                              <button
                                className="btn btn-sm btn-outline-danger"
                                disabled={busy || !canEdit}
                                onClick={() => openStatusModal(u, "disabled")}
                              >
                                تعطيل
                              </button>
                            ) : (
                              <button
                                className="btn btn-sm btn-outline-success"
                                disabled={busy || !canEdit}
                                onClick={() => openStatusModal(u, "active")}
                              >
                                تفعيل
                              </button>
                            )}

                            <button
                              className="btn btn-sm btn-danger"
                              disabled={busy || !canEdit}
                              onClick={() => openDeleteModal(u)}
                            >
                              حذف نهائي
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <UserFormModal show={showCreate} busy={busy} onClose={() => setShowCreate(false)} onSubmit={create} />

      <DiscountLimitsModal
        show={showDiscountLimits}
        busy={busy}
        user={target}
        onClose={() => setShowDiscountLimits(false)}
        onSubmit={submitDiscountLimits}
      />

      <ConfirmStatusModal
        show={showStatus}
        busy={busy}
        user={target}
        nextStatus={nextStatus}
        onClose={() => setShowStatus(false)}
        onConfirm={submitStatus}
      />

      <ConfirmDeleteModal
        show={showDelete}
        busy={busy}
        user={target}
        onClose={() => setShowDelete(false)}
        onConfirm={submitDelete}
      />
    </div>
  );
}