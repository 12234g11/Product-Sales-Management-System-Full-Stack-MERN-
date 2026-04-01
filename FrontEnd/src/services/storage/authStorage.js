const TOKEN_KEY = "pms_token";
const USER_KEY = "pms_user";

export const authStorage = {
    getToken() {
        return localStorage.getItem(TOKEN_KEY) || "";
    },
    setToken(token) {
        localStorage.setItem(TOKEN_KEY, token);
    },
    removeToken() {
        localStorage.removeItem(TOKEN_KEY);
    },

    getUser() {
        try {
            const raw = localStorage.getItem(USER_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    },
    setUser(user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    },
    removeUser() {
        localStorage.removeItem(USER_KEY);
    },

    clear() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    },
    setWorkspace(ws) {
        localStorage.setItem("workspace", JSON.stringify(ws));
    },
    getWorkspace() {
        const x = localStorage.getItem("workspace");
        return x ? JSON.parse(x) : null;
    },
    removeWorkspace() {
        localStorage.removeItem("workspace");
    }

};
