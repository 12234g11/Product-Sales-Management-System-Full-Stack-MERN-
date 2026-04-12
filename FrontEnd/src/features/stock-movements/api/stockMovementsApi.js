import { axiosClient } from "../../../services/http/axiosClient";

function unwrap(res) {
  return res?.data?.data ?? res?.data;
}

function cleanParams(params = {}) {
  const cleaned = {};

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;

    if (typeof value === "boolean") {
      if (value) cleaned[key] = true;
      return;
    }

    cleaned[key] = value;
  });

  return cleaned;
}

export const stockMovementsApi = {
  async list(params = {}) {
    const res = await axiosClient.get("/stock-movements", {
      params: cleanParams(params),
    });
    return unwrap(res);
  },

  async listForProduct(productId, params = {}) {
    const res = await axiosClient.get(
      `/products/${encodeURIComponent(productId)}/movements`,
      {
        params: cleanParams(params),
      }
    );
    return unwrap(res);
  },
};