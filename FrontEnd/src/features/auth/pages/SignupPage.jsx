import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../App/providers/AuthProvider";
import { APP_NAME } from "../../../constants/app";

export default function SignupPage() {
  const nav = useNavigate();
  const { register, loading } = useAuth();

  const [workspaceName, setWorkspaceName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    try {
      const user = await register({ workspaceName, name, email, password });
      if (user.role === "admin") nav("/dashboard", { replace: true });
      else nav("/sales/new", { replace: true });
    } catch (error) {
      setErr(error.userMessage || "فشل إنشاء الحساب");
    }
  };

  return (
    <form onSubmit={onSubmit} className="d-grid gap-3">
      <div className="text-center">
        <div className="text-secondary small">مرحبًا بك في</div>
        <div className="fw-bold text-white">{APP_NAME}</div>
        <div className="text-secondary small">أنشئ ساحة عمل وابدأ الإدارة من مكان واحد</div>
      </div>

      <h4 className="m-0">إعداد مساحة العمل (مسؤول النظام).</h4>

      {err && <div className="alert alert-danger m-0">{err}</div>}

      <div>
        <label className="form-label">اسم ساحة العمل</label>
        <input
          className="form-control"
          value={workspaceName}
          onChange={(e) => setWorkspaceName(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="form-label">اسم الأدمن</label>
        <input
          className="form-control"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="form-label">الإيميل</label>
        <input
          className="form-control"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
        />
      </div>

      <div>
        <label className="form-label">كلمة المرور</label>

        <div className="input-group">
          <input
            className="form-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={showPass ? "text" : "password"}
            minLength={6}
            required
          />

          <button
            className="btn btn-outline-secondary"
            type="button"
            onClick={() => setShowPass((v) => !v)}
            aria-label={showPass ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
          >
            <i className={`bi ${showPass ? "bi-eye-slash" : "bi-eye"}`} />
          </button>
        </div>

        <div className="form-text text-white">لا تقل عن 6 أحرف.</div>
      </div>

      <button className="btn btn-primary" disabled={loading}>
        {loading ? (
          <>
            <span className="spinner-border spinner-border-sm ms-2" role="status" aria-hidden="true" />
            جاري الإنشاء...
          </>
        ) : (
          "إنشاء"
        )}
      </button>

      <div className="small">
        لديك حساب؟{" "}
        <Link to="/login" className="text-decoration-underline">
          تسجيل الدخول
        </Link>
      </div>
    </form>
  );
}
