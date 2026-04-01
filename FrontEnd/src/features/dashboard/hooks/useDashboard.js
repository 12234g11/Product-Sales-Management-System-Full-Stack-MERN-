import { useEffect, useMemo, useState } from "react";
import { dashboardApi } from "../api/dashboardApi";

export function useDashboard({ filter } = {}) {
  const [overview, setOverview] = useState(null);
  const [salesTrend, setSalesTrend] = useState(null);
  const [stockStatus, setStockStatus] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const params = useMemo(() => ({ filter }), [filter]);

  const refresh = async () => {
    setLoading(true);
    setError("");

    try {
      const [o, t, s] = await Promise.all([
        dashboardApi.getOverview({ filter: params.filter }),
        dashboardApi.getSalesTrend({ filter: params.filter }),
        dashboardApi.getStockStatus({ filter: params.filter }),
      ]);

      setOverview(o);
      setSalesTrend(t);
      setStockStatus(s);
    } catch (e) {
      setError(e?.userMessage || "حصل خطأ أثناء تحميل بيانات الداشبورد");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  return {
    overview,
    salesTrend,
    stockStatus,
    loading,
    error,
    refresh,
    createdAt: overview?.meta?.workspaceCreatedAt ?? null,
  };
}