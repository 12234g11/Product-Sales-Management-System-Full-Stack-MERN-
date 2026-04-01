import { useEffect, useState } from "react";

export default function EditWorkspaceNameModal({
    show,
    currentName,
    loading,
    error,
    onClose,
    onSave,
}) {
    const [name, setName] = useState(currentName || "");

    useEffect(() => {
        if (show) {
            setName(currentName || "");
        }
    }, [show, currentName]);

    useEffect(() => {
        if (!show) return undefined;

        const handleEsc = (e) => {
            if (e.key === "Escape" && !loading) {
                onClose?.();
            }
        };

        const oldOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", handleEsc);

        return () => {
            document.body.style.overflow = oldOverflow;
            document.removeEventListener("keydown", handleEsc);
        };
    }, [show, loading, onClose]);

    if (!show) return null;

    const trimmedName = String(name || "").trim();

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave?.(trimmedName);
    };

    return (
        <>
            <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content bg-dark text-white border-secondary">
                        <form onSubmit={handleSubmit}>
                            <div className="modal-header border-secondary position-relative">
                                <h5 className="modal-title mb-0">تغيير اسم المحل</h5>

                                <button
                                    type="button"
                                    className="btn-close btn-close-white position-absolute top-50 start-0 translate-middle-y ms-2"
                                    aria-label="إغلاق"
                                    onClick={onClose}
                                    disabled={loading}
                                />
                            </div>

                            <div className="modal-body">
                                <label htmlFor="workspace-name-input" className="form-label">
                                    الاسم الجديد
                                </label>

                                <input
                                    id="workspace-name-input"
                                    type="text"
                                    className="form-control bg-black text-white border-secondary"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="اكتب اسم المحل"
                                    maxLength={60}
                                    autoFocus
                                    disabled={loading}
                                />

                                <div className="form-text text-light mt-2" style={{ opacity: 0.8 }}>
                                    الاسم لازم يكون بين 2 و 60 حرف
                                </div>

                                {error ? <div className="alert alert-danger mt-3 mb-0 py-2">{error}</div> : null}
                            </div>

                            <div className="modal-footer border-secondary">
                                <button
                                    type="button"
                                    className="btn btn-outline-light"
                                    onClick={onClose}
                                    disabled={loading}
                                >
                                    إلغاء
                                </button>

                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={loading || trimmedName.length < 2 || trimmedName.length > 60}
                                >
                                    {loading ? "جارٍ الحفظ..." : "حفظ"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <div className="modal-backdrop fade show" onClick={loading ? undefined : onClose} />
        </>
    );
}