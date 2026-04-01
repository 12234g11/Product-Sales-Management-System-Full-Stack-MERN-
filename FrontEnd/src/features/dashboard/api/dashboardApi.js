import { axiosClient } from "../../../services/http/axiosClient";

function unwrap(res) {
  return res?.data?.data ?? res?.data;
}

// Build query params طبقًا لنوع فلتر واحد فقط
function buildFilterParams(filter = {}) {
  const mode = String(filter.mode || "last");

  if (mode === "today") return { preset: "today" };

  if (mode === "since_creation") return { preset: "since_creation" };

  if (mode === "date") {
    if (!filter.date) return {};
    return { date: filter.date };
  }

  if (mode === "range") {
    const p = {};
    if (filter.from) p.from = filter.from;
    if (filter.to) p.to = filter.to;
    return p;
  }

  // default: last
  const days = Math.max(1, Number(filter.days || 30));
  return { preset: "last", days };
}

export const dashboardApi = {
  async getOverview({ filter } = {}) {
    const res = await axiosClient.get("/dashboard/overview", {
      params: buildFilterParams(filter),
    });
    return unwrap(res);
  },

  async getSalesTrend({ filter } = {}) {
    const res = await axiosClient.get("/dashboard/charts/sales-trend", {
      params: buildFilterParams(filter),
    });
    return unwrap(res);
  },

  async getStockStatus({ filter } = {}) {
    const res = await axiosClient.get("/dashboard/charts/stock-status", {
      params: buildFilterParams(filter),
    });
    return unwrap(res);
  },
};