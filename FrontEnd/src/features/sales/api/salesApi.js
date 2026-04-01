import { axiosClient } from "../../../services/http/axiosClient";

function unwrap(res) {
  return res?.data?.data ?? res?.data;
}

export const salesApi = {
  async create({ id, name, quantity }) {
    const res = await axiosClient.post("/sales", { id, name, quantity });
    return unwrap(res);
  },

  async getAll() {
    const res = await axiosClient.get("/sales");
    return unwrap(res);
  },

  async getToday() {
    const res = await axiosClient.get("/sales/today");
    return unwrap(res);
  },

  async search(params) {
    const res = await axiosClient.get("/sales/search", { params });
    return unwrap(res);
  },

  async remove(saleId) {
    const res = await axiosClient.delete(`/sales/${encodeURIComponent(saleId)}`);
    return unwrap(res);
  },
};
