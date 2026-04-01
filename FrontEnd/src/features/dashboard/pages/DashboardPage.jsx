import { useMemo, useState } from "react";
import { useDashboard } from "../hooks/useDashboard";
import SalesTrendColumnChart from "../components/SalesTrendColumnChart";

function formatNumber(n) {
    return new Intl.NumberFormat("ar-EG").format(Number(n || 0));
}
function formatCurrency(n) {
    return new Intl.NumberFormat("ar-EG").format(Number(n || 0));
}
function formatDate(d) {
    if (!d) return "";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" }).format(dt);
}

// YYYY-MM-DD محلي (مناسب للـ input type=date)
function toLocalInputDate(d = new Date()) {
    const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return x.toISOString().slice(0, 10);
}
function arabicPeriodLabel(label) {
    const s = String(label || "").trim().toLowerCase();
    if (s === "today") return "اليوم";
    return label || "";
}
function StatCard({ title, value, sub, loading }) {
    return (
        <div className="col-12 col-md-6 col-xl-3">
            <div className="card h-100">
                <div className="card-body">
                    <div className="text-secondary small">{title}</div>
                    <div className="fs-4 fw-bold">{loading ? "..." : value}</div>
                    {sub ? <div className="small text-secondary">{sub}</div> : null}
                </div>
            </div>
        </div>
    );
}

export default function DashboardPage() {
    // فلتر UI
    const [mode, setMode] = useState("last30"); // last7,last14,last30,last60,custom,sinceCreation,today,date,range
    const [customDays, setCustomDays] = useState(30);

    const [singleDate, setSingleDate] = useState(toLocalInputDate(new Date()));

    const [fromDate, setFromDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 6);
        return toLocalInputDate(d);
    });
    const [toDate, setToDate] = useState(toLocalInputDate(new Date()));

    // Build filter object for API
    const filter = useMemo(() => {
        if (mode === "today") return { mode: "today" };
        if (mode === "sinceCreation") return { mode: "since_creation" };
        if (mode === "date") return { mode: "date", date: singleDate };
        if (mode === "range") return { mode: "range", from: fromDate, to: toDate };

        if (mode === "custom") return { mode: "last", days: Math.max(1, Number(customDays || 1)) };
        if (mode === "last7") return { mode: "last", days: 7 };
        if (mode === "last14") return { mode: "last", days: 14 };
        if (mode === "last60") return { mode: "last", days: 60 };
        // default last30
        return { mode: "last", days: 30 };
    }, [mode, customDays, singleDate, fromDate, toDate]);

    const { overview, salesTrend, stockStatus, loading, error, refresh, createdAt } =
        useDashboard({ filter });

    const metaLabelRaw = overview?.meta?.label || "";
    const metaLabel = arabicPeriodLabel(metaLabelRaw);
    const headerSub = metaLabel ? `نظرة عامة على النظام + ${metaLabel}` : "نظرة عامة على النظام";

    const trendRows = useMemo(() => salesTrend?.series || [], [salesTrend]);
    const stockRows = useMemo(() => stockStatus?.series || [], [stockStatus]);

    const totalStockGroups = useMemo(() => {
        const total = stockRows.reduce((sum, x) => sum + Number(x.value || 0), 0);
        return total || 0;
    }, [stockRows]);

    const translateStockLabel = (label) => {
        if (label === "Out of Stock") return "نفد المخزون";
        if (label === "Below Min Stock") return "أقل من الحد الأدنى";
        if (label === "In Stock") return "متوفر";
        return label;
    };

    // الأقسام + الفترة تحت عنوان القسم
    const sections = useMemo(() => {
        const o = overview || {};
        const inv = o.inventory || {};
        const sales = o.sales || {};
        const purchases = o.purchases || {};
        const returns = o.returns || {};
        const profit = o.profit || {};
        const users = o.users || {};

        const period = arabicPeriodLabel(o?.meta?.label || "");
        const nowText = "حتى الآن";

        return [
            {
                title: "المخزون والمنتجات",
                periodText: nowText,
                cards: [
                    { key: "productsCount", title: "عدد المنتجات", value: formatNumber(inv.productsCount) },
                    { key: "categoriesCount", title: "عدد التصنيفات", value: formatNumber(inv.categoriesCount) },
                    { key: "totalStockUnits", title: "إجمالي وحدات المخزون", value: formatNumber(inv.totalStockUnits) },
                    { key: "outOfStockCount", title: "منتجات نفد مخزونها", value: formatNumber(inv.outOfStockCount) },

                    { key: "belowMinStockCount", title: "منتجات أقل من الحد الأدنى", value: formatNumber(inv.belowMinStockCount) },
                    { key: "inStockCount", title: "منتجات متوفرة", value: formatNumber(inv.inStockCount) },
                    { key: "inventoryPurchaseValue", title: "قيمة شراء المخزون", value: formatCurrency(inv.inventoryPurchaseValue) },
                    { key: "inventorySaleValue", title: "قيمة بيع المخزون", value: formatCurrency(inv.inventorySaleValue) },

                    {
                        key: "inventoryPotentialProfit",
                        title: "ربح متوقع (على المخزون)",
                        value: formatCurrency(inv.inventoryPotentialProfit),
                        sub: inv.noMinStockCount ? `بدون حد أدنى: ${formatNumber(inv.noMinStockCount)}` : "",
                    },
                ],
            },
            {
                title: "المبيعات",
                periodText: period,
                cards: [
                    { key: "salesInvoicesCount", title: "عدد فواتير البيع", value: formatNumber(sales.salesInvoicesCount) },
                    { key: "salesRevenue", title: "إجمالي المبيعات", value: formatCurrency(sales.salesRevenue) },
                    { key: "netRevenue", title: "صافي المبيعات", value: formatCurrency(sales.netRevenue), sub: "المبيعات - المرتجعات" },
                ],
            },
            {
                title: "المشتريات",
                periodText: period,
                cards: [
                    { key: "purchaseInvoicesCount", title: "عدد فواتير الشراء", value: formatNumber(purchases.purchaseInvoicesCount) },
                    { key: "purchaseSpend", title: "إجمالي مصروف الشراء", value: formatCurrency(purchases.purchaseSpend) },
                ],
            },
            {
                title: "المرتجعات",
                periodText: period,
                cards: [
                    { key: "returnsCount", title: "عدد المرتجعات", value: formatNumber(returns.returnsCount) },
                    { key: "refundTotal", title: "إجمالي مبلغ المرتجعات", value: formatCurrency(returns.refundTotal) },
                    { key: "refundRestockedTotal", title: "مبلغ (أُعيد للمخزون)", value: formatCurrency(returns.refundRestockedTotal) },
                    { key: "refundDamagedTotal", title: "مبلغ (تالف)", value: formatCurrency(returns.refundDamagedTotal) },
                ],
            },
            {
                title: "الأرباح",
                periodText: period,
                cards: [
                    { key: "cogsEstimated", title: "تكلفة مبيعات (تقديري)", value: formatCurrency(profit.cogsEstimated) },
                    { key: "realizedProfitEstimated", title: "ربح فعلي (تقديري)", value: formatCurrency(profit.realizedProfitEstimated) },
                ],
            },
            {
                title: "المستخدمين",
                periodText: nowText,
                cards: [
                    { key: "usersTotal", title: "عدد المستخدمين", value: formatNumber(users.usersTotal) },
                    { key: "adminsCount", title: "عدد الأدمن", value: formatNumber(users.adminsCount) },
                    { key: "workersCount", title: "عدد العاملين", value: formatNumber(users.workersCount) },
                    { key: "activeUsersCount", title: "مفعّلين", value: formatNumber(users.activeUsersCount) },
                    { key: "disabledUsersCount", title: "غير مفعّلين", value: formatNumber(users.disabledUsersCount) },
                ],
            },
        ];
    }, [overview]);

    return (
        <>
            <div className="dashboard-page">
                <div className="dashboard-surface p-3 p-md-4">
                    <div className="dashboard-inner">
                        <div className="container-fluid p-0">
                            {/* Mobile Header + Filters */}
                            <div className="d-md-none mb-3">
                                <div className="mb-2">
                                    <h3 className="m-0">لوحة التحكم</h3>
                                    <div className="text-secondary small">{headerSub}</div>

                                    {createdAt && (
                                        <div className="text-secondary small mt-1">
                                            تاريخ الإنشاء: {formatDate(createdAt)}
                                        </div>
                                    )}
                                </div>

                                <div className="d-grid gap-2">
                                    <select
                                        className="form-select form-select-sm"
                                        value={mode}
                                        onChange={(e) => setMode(e.target.value)}
                                    >
                                        <option value="last7">آخر 7 أيام</option>
                                        <option value="last14">آخر 14 يوم</option>
                                        <option value="last30">آخر 30 يوم</option>
                                        <option value="last60">آخر 60 يوم</option>
                                        <option value="custom">عدد أيام (مخصص)</option>
                                        <option value="sinceCreation">منذ الإنشاء</option>
                                        <option value="today">اليوم</option>
                                        <option value="date">تاريخ محدد</option>
                                        <option value="range">من - إلى</option>
                                    </select>

                                    {mode === "custom" && (
                                        <div className="input-group input-group-sm">
                                            <span className="input-group-text">عدد الأيام</span>
                                            <input
                                                className="form-control"
                                                type="number"
                                                min={1}
                                                value={customDays}
                                                onChange={(e) => setCustomDays(Number(e.target.value))}
                                            />
                                        </div>
                                    )}

                                    {mode === "date" && (
                                        <div className="input-group input-group-sm">
                                            <span className="input-group-text">التاريخ</span>
                                            <input
                                                className="form-control"
                                                type="date"
                                                value={singleDate}
                                                onChange={(e) => setSingleDate(e.target.value)}
                                            />
                                        </div>
                                    )}

                                    {mode === "range" && (
                                        <div className="d-grid gap-2">
                                            <div className="input-group input-group-sm">
                                                <span className="input-group-text">من</span>
                                                <input
                                                    className="form-control"
                                                    type="date"
                                                    value={fromDate}
                                                    onChange={(e) => setFromDate(e.target.value)}
                                                />
                                            </div>
                                            <div className="input-group input-group-sm">
                                                <span className="input-group-text">إلى</span>
                                                <input
                                                    className="form-control"
                                                    type="date"
                                                    value={toDate}
                                                    onChange={(e) => setToDate(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <button className="btn btn-outline-primary btn-sm" onClick={refresh}>
                                        تحديث
                                    </button>
                                </div>
                            </div>

                            {/* Desktop Header + Filters */}
                            <div className="d-none d-md-flex flex-row-reverse justify-content-between align-items-center mb-3">
                                <div>
                                    <h3 className="m-0">لوحة التحكم</h3>
                                    <div className="text-secondary small">{headerSub}</div>
                                    {createdAt && (
                                        <div className="text-secondary small mt-1">
                                            تاريخ الإنشاء: {formatDate(createdAt)}
                                        </div>
                                    )}
                                </div>

                                <div className="d-flex flex-row-reverse gap-2 align-items-center">
                                    <select
                                        className="form-select form-select-sm"
                                        style={{ width: 220 }}
                                        value={mode}
                                        onChange={(e) => setMode(e.target.value)}
                                    >
                                        <option value="last7">آخر 7 أيام</option>
                                        <option value="last14">آخر 14 يوم</option>
                                        <option value="last30">آخر 30 يوم</option>
                                        <option value="last60">آخر 60 يوم</option>
                                        <option value="custom">عدد أيام (مخصص)</option>
                                        <option value="sinceCreation">منذ الإنشاء</option>
                                        <option value="today">اليوم</option>
                                        <option value="date">تاريخ محدد</option>
                                        <option value="range">من - إلى</option>
                                    </select>

                                    {mode === "custom" && (
                                        <div className="input-group input-group-sm" style={{ width: 200 }}>
                                            <span className="input-group-text">عدد الأيام</span>
                                            <input
                                                className="form-control"
                                                type="number"
                                                min={1}
                                                value={customDays}
                                                onChange={(e) => setCustomDays(Number(e.target.value))}
                                            />
                                        </div>
                                    )}

                                    {mode === "date" && (
                                        <div className="input-group input-group-sm" style={{ width: 240 }}>
                                            <span className="input-group-text">التاريخ</span>
                                            <input
                                                className="form-control"
                                                type="date"
                                                value={singleDate}
                                                onChange={(e) => setSingleDate(e.target.value)}
                                            />
                                        </div>
                                    )}

                                    {mode === "range" && (
                                        <>
                                            <div className="input-group input-group-sm" style={{ width: 220 }}>
                                                <span className="input-group-text">من</span>
                                                <input
                                                    className="form-control"
                                                    type="date"
                                                    value={fromDate}
                                                    onChange={(e) => setFromDate(e.target.value)}
                                                />
                                            </div>
                                            <div className="input-group input-group-sm" style={{ width: 220 }}>
                                                <span className="input-group-text">إلى</span>
                                                <input
                                                    className="form-control"
                                                    type="date"
                                                    value={toDate}
                                                    onChange={(e) => setToDate(e.target.value)}
                                                />
                                            </div>
                                        </>
                                    )}

                                    <button className="btn btn-outline-primary btn-sm" onClick={refresh}>
                                        تحديث
                                    </button>
                                </div>
                            </div>

                            {error && <div className="alert alert-danger">{error}</div>}

                            {/* Sections + Cards */}
                            {sections.map((sec) => (
                                <div key={sec.title} className="mb-3">
                                    {/* ✅ الهيدر يمين + تحته الفترة */}
                                    <div className="d-flex justify-content-start mb-2">
                                        <div className="text-end">
                                            <h5 className="m-0">{sec.title}</h5>
                                            <div className="text-secondary small mt-1">{sec.periodText || ""}</div>
                                        </div>
                                    </div>

                                    <div className="row g-3">
                                        {sec.cards.map((c) => (
                                            <StatCard
                                                key={c.key}
                                                title={c.title}
                                                value={c.value}
                                                sub={c.sub}
                                                loading={loading}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {/* Trend + Stock */}
                            <div className="row g-3">
                                {/* Sales Trend */}
                                <div className="col-12 col-lg-8">
                                    <div className="card h-100">
                                        <div className="card-body">
                                            {/* ✅ الهيدر يمين + تحته الفترة */}
                                            <div className="d-flex justify-content-start mb-2">
                                                <div className="text-end">
                                                    <h5 className="m-0">اتجاه المبيعات</h5>
                                                    <div className="text-secondary small mt-1">{metaLabel}</div>
                                                </div>
                                            </div>

                                            <SalesTrendColumnChart rows={trendRows} loading={loading} />

                                            <div className="small text-secondary mt-2">
                                                * الأعمدة: الإيراد لكل يوم خلال الفترة المحددة.
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Stock Status */}
                                <div className="col-12 col-lg-4">
                                    <div className="card h-100">
                                        <div className="card-body">
                                            {/* ✅ الهيدر يمين + تحته الفترة/حتى الآن */}
                                            <div className="d-flex justify-content-start mb-2">
                                                <div className="text-end">
                                                    <h5 className="m-0">حالة المخزون</h5>
                                                    <div className="text-secondary small mt-1">
                                                        {arabicPeriodLabel(stockStatus?.meta?.label) || "حتى الآن"}                                                    </div>
                                                </div>
                                            </div>

                                            {loading ? (
                                                <div className="text-center py-4">جاري التحميل...</div>
                                            ) : (
                                                <div className="d-grid gap-3">
                                                    {stockRows.map((x) => {
                                                        const percent = totalStockGroups
                                                            ? Math.round((Number(x.value || 0) / totalStockGroups) * 100)
                                                            : 0;

                                                        return (
                                                            <div key={x.label}>
                                                                <div className="d-flex justify-content-between flex-row-reverse">
                                                                    <div className="fw-semibold">{translateStockLabel(x.label)}</div>
                                                                    <div className="text-secondary small">
                                                                        {formatNumber(x.value)} ({percent}%)
                                                                    </div>
                                                                </div>
                                                                <div className="progress" style={{ height: 8 }}>
                                                                    <div className="progress-bar" style={{ width: `${percent}%` }} />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {!loading && totalStockGroups === 0 && (
                                                <div className="alert alert-warning mt-3 mb-0">
                                                    لا توجد منتجات مسجلة بعد.
                                                </div>
                                            )}

                                            {!loading && Number(stockStatus?.extra?.noMinStock || 0) > 0 && (
                                                <div className="small text-secondary mt-3">
                                                    * منتجات بدون حد أدنى (minStock):{" "}
                                                    {formatNumber(stockStatus.extra.noMinStock)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}