import { axiosClient } from "../../../services/http/axiosClient";

function unwrap(res) {
  return res?.data?.data ?? res?.data;
}

export const authApi = {
  async register({ workspaceName, name, email, password }) {
    const res = await axiosClient.post("/auth/register", {
      workspaceName,
      name,
      email,
      password,
    });
    return unwrap(res);
  },

  async login({ email, password }) {
    const res = await axiosClient.post("/auth/login", { email, password });
    return unwrap(res);
  },

  async logout() {
    const res = await axiosClient.post("/auth/logout");
    return unwrap(res);
  },
};
