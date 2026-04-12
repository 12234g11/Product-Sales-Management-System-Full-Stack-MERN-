import { axiosClient } from "../../../services/http/axiosClient";

function unwrap(res) {
  return res?.data?.data ?? res?.data;
}

function cleanParams(params = {}) {
  const cleaned = {};

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;

    if (typeof value === "boolean") {
      cleaned[key] = value;
      return;
    }

    cleaned[key] = value;
  });

  return cleaned;
}

export const productsApi = {
  async list(params = {}) {
    const res = await axiosClient.get("/products", {
      params: cleanParams(params),
    });
    return unwrap(res);
  },

  async search(params = {}) {
    const res = await axiosClient.get("/products/search", {
      params: cleanParams(params),
    });
    return unwrap(res);
  },

  async getLowStock(params = {}) {
    const res = await axiosClient.get("/products/low-stock", {
      params: cleanParams(params),
    });
    return unwrap(res);
  },

  async create(payload) {
    const res = await axiosClient.post("/products", payload);
    return unwrap(res);
  },

  async update(productId, payload) {
    const res = await axiosClient.put(`/products/${encodeURIComponent(productId)}`, payload);
    return unwrap(res);
  },

  async remove(productId) {
    const res = await axiosClient.delete(`/products/${encodeURIComponent(productId)}`);
    return unwrap(res);
  },

  async adjustStock(productId, payload) {
    const res = await axiosClient.patch(
      `/products/${encodeURIComponent(productId)}/adjust-stock`,
      payload
    );
    return unwrap(res);
  },

  async getMovements(productId, params = {}) {
    const res = await axiosClient.get(
      `/products/${encodeURIComponent(productId)}/movements`,
      {
        params: cleanParams(params),
      }
    );

    return unwrap(res)?.movements ?? unwrap(res);
  },

  async autoComplete(query) {
    const res = await axiosClient.get("/products/auto-complete", {
      params: cleanParams({ query }),
    });
    return unwrap(res);
  },

  async autoFill(params = {}) {
    const res = await axiosClient.get("/products/auto-fill", {
      params: cleanParams(params),
    });
    return unwrap(res);
  },
};