import axios from "axios";

export const axiosClient = axios.create({
  baseURL: "http://localhost:5001/api",
  headers: { "Content-Type": "application/json" },
  timeout: 20000,
});
