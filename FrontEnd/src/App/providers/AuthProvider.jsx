import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authStorage } from "../../services/storage/authStorage";
import { authApi } from "../../features/auth/api/authApi";
import { setUnauthorizedHandler } from "../../services/http/interceptors";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => authStorage.getToken());
  const [user, setUser] = useState(() => authStorage.getUser());
  const [workspace, setWorkspace] = useState(() => authStorage.getWorkspace?.() ?? null);
  const [loading, setLoading] = useState(false);

  const isAuthenticated = Boolean(token) && Boolean(user);

  const clearSession = () => {
    authStorage.clear();
    setToken("");
    setUser(null);
    setWorkspace(null);
  };

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession();
      window.location.assign("/login");
    });
  }, []);

  const login = async (payload) => {
    setLoading(true);
    try {
      const data = await authApi.login(payload);

      authStorage.setToken(data.token);
      authStorage.setUser(data.user);
      const ws =
        data.workspace ||
        (data.user?.workspaceName
          ? { id: data.user.workspaceId, name: data.user.workspaceName }
          : null);

      if (authStorage.setWorkspace) authStorage.setWorkspace(ws);
      setToken(data.token);
      setUser(data.user);
      setWorkspace(ws);

      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const register = async ({ workspaceName, name, email, password }) => {
    setLoading(true);
    try {
      const data = await authApi.register({ workspaceName, name, email, password });

      authStorage.setToken(data.token);
      authStorage.setUser(data.user);

      const ws =
        data.workspace ||
        (data.user?.workspaceName
          ? { id: data.user.workspaceId, name: data.user.workspaceName }
          : null);

      if (authStorage.setWorkspace) authStorage.setWorkspace(ws);

      setToken(data.token);
      setUser(data.user);
      setWorkspace(ws);

      return data.user;
    } finally {
      setLoading(false);
    }
  };

const logout = async () => {
  const ok = window.confirm("هل أنت متأكد أنك تريد تسجيل الخروج؟");
  if (!ok) return;

  setLoading(true);
  try {
    try { await authApi.logout(); } catch (_) {}
    clearSession();
    window.location.assign("/login");
  } finally {
    setLoading(false);
  }
};


  const value = useMemo(
    () => ({ token, user, workspace, isAuthenticated, loading, login, register, logout }),
    [token, user, workspace, isAuthenticated, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
