import { createContext, useContext, useState, useEffect } from "react";
import { LogoutModal } from "../components/LogoutModal";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
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
        const response = await fetch("http://localhost:3000/api/auth/me", {
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
      await fetch("http://localhost:3000/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
