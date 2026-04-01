import { axiosClient } from "../../../services/http/axiosClient";

function unwrap(res) {
  return res?.data?.data ?? res?.data;
}

export const purchasesApi = {
  async list(params = {}) {
    const res = await axiosClient.get("/purchases", { params });
    return unwrap(res);
  },

  async create(payload) {
    const res = await axiosClient.post("/purchases", payload);
    return unwrap(res);
  },

  async getById(id) {
    const res = await axiosClient.get(`/purchases/${encodeURIComponent(id)}`);
    return unwrap(res);
  },

  async addItem(invoiceId, payload) {
    const res = await axiosClient.post(
      `/purchases/${encodeURIComponent(invoiceId)}/items`,
      payload
    );
    return unwrap(res);
  },

  async updateItem(invoiceId, itemId, payload) {
    const res = await axiosClient.patch(
      `/purchases/${encodeURIComponent(invoiceId)}/items/${encodeURIComponent(itemId)}`,
      payload
    );
    return unwrap(res);
  },

  async removeItem(invoiceId, itemId) {
    const res = await axiosClient.delete(
      `/purchases/${encodeURIComponent(invoiceId)}/items/${encodeURIComponent(itemId)}`
    );
    return unwrap(res);
  },

  async finalize(invoiceId) {
    const res = await axiosClient.post(`/purchases/${encodeURIComponent(invoiceId)}/finalize`);
    return unwrap(res);
  },
};