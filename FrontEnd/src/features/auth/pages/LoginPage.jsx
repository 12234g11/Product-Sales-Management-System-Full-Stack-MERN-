import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../App/providers/AuthProvider";
import { APP_NAME } from "../../../constants/app";

export default function LoginPage() {
  const nav = useNavigate();
  const { login, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    try {
      const user = await login({ email, password });
      if (user.role === "admin") nav("/dashboard", { replace: true });
      else nav("/sales/new", { replace: true });
    } catch (error) {
      setErr(error.userMessage || "فشل تسجيل الدخول");
    }
  };

  return (
    <form onSubmit={onSubmit} className="d-grid gap-3">
      <div className="text-center">
        <div className="text-secondary small">أهلًا بيك في</div>
        <div className="fw-bold text-white">{APP_NAME}</div>
        <div className="text-secondary small">سجّل دخولك وكمل شغلك بسهولة</div>
      </div>

      <h4 className="m-0">تسجيل الدخول</h4>

      {err && <div className="alert alert-danger m-0">{err}</div>}

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
            required
          />

          <button
            className="btn btn-outline-secondary"
            type="button"
            onClick={() => setShowPass((v) => !v)}
          >
            <i className={`bi ${showPass ? "bi-eye-slash" : "bi-eye"}`} />
          </button>
        </div>
      </div>

      <button className="btn btn-primary" disabled={loading}>
        {loading ? (
          <>
            <span className="spinner-border spinner-border-sm me-2" role="status" />
            جاري الدخول...
          </>
        ) : (
          "دخول"
        )}
      </button>

      <div className="small">
        أول مرة؟{" "}
        <Link to="/signup" className="text-decoration-underline">
          إنشاء ساحة عمل.
        </Link>
      </div>
    </form>
  );
}
