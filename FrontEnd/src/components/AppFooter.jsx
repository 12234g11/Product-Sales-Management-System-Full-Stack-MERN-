import { useAuth } from "../App/providers/AuthProvider";
import { APP_NAME, APP_VERSION, SUPPORT_PHONE, DEVELOPED_BY } from "../constants/app";

export default function AppFooter({ version = APP_VERSION }) {
  const { user } = useAuth();

  const workspaceName = user?.workspaceName || user?.workspace?.name || "Workspace";
  const year = new Date().getFullYear();

  return (
    <footer className="pms-footer" dir="rtl">
      <div className="container">
        <div className="pms-footer-inner text-center text-secondary">
          <div className="pms-footer-line">
            {APP_NAME} {version} • ساحة العمل: {workspaceName}
          </div>

          <div className="pms-footer-line">{DEVELOPED_BY}</div>

          <div className="pms-footer-line">
            لو في أي مشكلة تواصل:{" "}
            <a className="pms-footer-link" href={`tel:${SUPPORT_PHONE}`}>
              {SUPPORT_PHONE}
            </a>
          </div>

          <div className="pms-footer-line">© {year} جميع الحقوق محفوظة</div>
        </div>
      </div>
    </footer>
  );
}
