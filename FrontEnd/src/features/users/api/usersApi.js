import { axiosClient } from "../../../services/http/axiosClient";

function unwrap(res) {
  return res?.data?.data ?? res?.data;
}

export const usersApi = {
  async getAll() {
    const res = await axiosClient.get("/users");
    return unwrap(res);
  },

  async create({ name, email, password, role }) {
    const res = await axiosClient.post("/users", { name, email, password, role });
    return unwrap(res);
  },

  async updateStatus(userId, status) {
    const id = encodeURIComponent(userId);
    const res = await axiosClient.patch(`/users/${id}/status`, { status });
    return unwrap(res);
  },

  async disable(userId) {
    return this.updateStatus(userId, "disabled");
  },

  async enable(userId) {
    return this.updateStatus(userId, "active");
  },

  async deletePermanently(userId) {
    const id = encodeURIComponent(userId);
    const res = await axiosClient.delete(`/users/${id}`);
    return unwrap(res);
  },
};
