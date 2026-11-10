import { useState, useEffect } from "react";
import { LogoutModal } from "../components/LogoutModal";
import { API } from "../config/api";

import { AuthContext } from "./authState";

function getInitialStoredUser() {
  try {
    const token = localStorage.getItem("token");
    const rawUser = localStorage.getItem("user");
    if (!token || !rawUser) return null;
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (!payload?.exp || payload.exp * 1000 <= Date.now()) return null;
    return JSON.parse(rawUser);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const initialUser = getInitialStoredUser();
  const [user, setUser] = useState(initialUser);
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(initialUser));
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      const storedToken = localStorage.getItem("token");
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API}/auth/me`, {
          credentials: "include",
          headers: { Authorization: `Bearer ${storedToken}` },
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            localStorage.removeItem("user");
            localStorage.removeItem("token");
          }
          return;
        }

        const data = await response.json();
        if (!cancelled && data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
          setUser(data.user);
          setIsLoggedIn(true);
        }
      } catch (error) {
        console.error("Session restore failed:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    restoreSession();
    return () => { cancelled = true; };
  }, []);

  const clearSession = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
    setIsLoggedIn(false);
  };

  // Recheck expiry on a timer and when returning to a background tab.
  useEffect(() => {
    if (!isLoggedIn) return;
    const checkSession = () => {
      const token = localStorage.getItem("token");
      try {
        const payload = token && JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
        if (!payload?.exp || payload.exp * 1000 <= Date.now()) clearSession();
      } catch {
        clearSession();
      }
    };
    const onStorage = (event) => {
      if (event.key === "token" || event.key === null) {
        setUser(null);
        setIsLoggedIn(false);
        window.location.assign("/login");
      }
    };
    checkSession();
    const interval = window.setInterval(checkSession, 15000);
    window.addEventListener("focus", checkSession);
    document.addEventListener("visibilitychange", checkSession);
    window.addEventListener("storage", onStorage);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", checkSession);
      document.removeEventListener("visibilitychange", checkSession);
      window.removeEventListener("storage", onStorage);
    };
  }, [isLoggedIn]);

  const login = (userData, token) => {
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", token);
    setUser(userData);
    setIsLoggedIn(true);
  };

  // Trigger custom logout confirmation modal
  const logout = () => {
    setShowLogoutModal(true);
    return false;
  };

  // Perform actual logout when confirmed in modal
  const confirmLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch(`${API}/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
    } catch (error) {
      console.error("Logout API error:", error);
    } finally {
      clearSession();
      setLoggingOut(false);
      setShowLogoutModal(false);
      window.location.href = "/";
    }
  };

  // Patch a subset of user fields (e.g. after profile update)
  const updateUser = (patch) => {
    setUser(prev => {
      const updated = { ...prev, ...patch };
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });
  };

  const value = {
    user,
    isLoggedIn,
    loading,
    login,
    logout,
    confirmLogout,
    updateUser,
    clearSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <LogoutModal
        isOpen={showLogoutModal}
        user={user}
        loading={loggingOut}
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </AuthContext.Provider>
  );
}

