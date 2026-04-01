import { axiosClient } from "../../../services/http/axiosClient";

function unwrap(res) {
  return res?.data?.data ?? res?.data;
}

export const productsApi = {
  async getAll() {
    const res = await axiosClient.get("/products");
    return unwrap(res);
  },

  async search({ id, name, category }) {
    const res = await axiosClient.get("/products/search", {
      params: {
        id: id || undefined,
        name: name || undefined,
        category: category || undefined,
      },
    });
    return unwrap(res);
  },

  async create(payload) {
    const res = await axiosClient.post("/products", payload);
    return unwrap(res);
  },

  async update(oldId, payload) {
    const res = await axiosClient.put(`/products/${encodeURIComponent(oldId)}`, payload);
    return unwrap(res);
  },

  async remove(id) {
    const res = await axiosClient.delete(`/products/${encodeURIComponent(id)}`);
    return unwrap(res);
  },

  async autoComplete(query) {
    const res = await axiosClient.get("/products/auto-complete", {
      params: { query },
    });
    return unwrap(res);
  },

  async autoFill({ id, name }) {
    const res = await axiosClient.get("/products/auto-fill", {
      params: { id, name },
    });
    return unwrap(res);
  },

  async getLowStock() {
    const res = await axiosClient.get("/products/low-stock");
    return unwrap(res);
  },

  async adjustStock(id, payload) {
    const res = await axiosClient.patch(`/products/${encodeURIComponent(id)}/adjust-stock`, payload);
    return unwrap(res);
  },

  async getMovements(id, params = {}) {
    const res = await axiosClient.get(`/products/${encodeURIComponent(id)}/movements`, {
      params,
    });
    return unwrap(res);
  },
};