import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "../contexts/authState";
import { roleHome } from "../utils/roleHome";

const AUTH_PAGES = new Set(["/login", "/signup", "/forgot-password", "/reset-password", "/verify-email"]);

export function ScrollToTop() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  useEffect(() => {
    if (!isLoggedIn || !user) return;

    const home = user.profileCompleted === false ? "/complete-profile" : roleHome(user.role);
    const isStaff = Boolean(user.role && user.role !== "student");

    if (AUTH_PAGES.has(pathname) || (isStaff && pathname === "/")) {
      navigate(home, { replace: true });
      return;
    }

    // Push multiple history buffer entries on the dashboard so even rapid double/triple clicks on Back never reach /login
    if (pathname === home) {
      if (!window.history.state?.gabaiGuard) {
        window.history.replaceState({ ...window.history.state, gabaiGuard: 1 }, "", home);
        window.history.pushState({ gabaiGuard: 2 }, "", home);
        window.history.pushState({ gabaiGuard: 3 }, "", home);
      }
    }

    const handlePopState = () => {
      const currentPath = window.location.pathname;
      const hitAuthPage = AUTH_PAGES.has(currentPath);
      const staffLeftPortal = isStaff && !currentPath.startsWith(`/${user.role}`) && currentPath !== "/complete-profile";
      const onHomeDashboard = pathname === home && currentPath === home;

      if (hitAuthPage || staffLeftPortal || onHomeDashboard) {
        window.history.pushState({ gabaiGuard: 3 }, "", home);
        if (window.location.pathname !== home) {
          navigate(home, { replace: true });
        }
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isLoggedIn, user, pathname, navigate]);

  return null;
}
