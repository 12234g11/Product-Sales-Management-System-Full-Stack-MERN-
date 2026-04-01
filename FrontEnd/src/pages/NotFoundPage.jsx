import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="container" style={{ paddingTop: 40 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>الصفحة غير موجودة</h2>
        <Link to="/" style={{ textDecoration: "underline" }}>العودة للرئيسية</Link>
      </div>
    </div>
  );
}
