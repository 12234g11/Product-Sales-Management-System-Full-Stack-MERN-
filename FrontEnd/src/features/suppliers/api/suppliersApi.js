import { axiosClient } from "../../../services/http/axiosClient";

function unwrap(res) {
  return res?.data?.data ?? res?.data;
}

export const suppliersApi = {
  async list(params = {}) {
    const res = await axiosClient.get("/suppliers", { params });
    return unwrap(res);
  },

  async create(payload) {
    const res = await axiosClient.post("/suppliers", payload);
    return unwrap(res);
  },

  async getById(id) {
    const res = await axiosClient.get(`/suppliers/${encodeURIComponent(id)}`);
    return unwrap(res);
  },

  async update(id, payload) {
    const res = await axiosClient.patch(`/suppliers/${encodeURIComponent(id)}`, payload);
    return unwrap(res);
  },

  async archive(id) {
    const res = await axiosClient.delete(`/suppliers/${encodeURIComponent(id)}`);
    return unwrap(res);
  },

  async restore(id) {
    const res = await axiosClient.patch(`/suppliers/${encodeURIComponent(id)}/restore`);
    return unwrap(res);
  },

  async autoComplete(query) {
    const res = await axiosClient.get("/suppliers/auto-complete", {
      params: { query },
    });
    return unwrap(res);
  },
};