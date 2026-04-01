import { axiosClient } from "../../../services/http/axiosClient";

export async function updateWorkspaceNameApi(name) {
  const trimmedName = String(name || "").trim();

  const response = await axiosClient.patch("/workspaces/name", {
    name: trimmedName,
  });

  return response?.data?.data?.workspace || null;
}