import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "../contexts/authState";
import { roleHome } from "../utils/roleHome";

const AUTH_PAGES = new Set(["/login", "/signup", "/forgot-password", "/reset-password", "/verify-email"]);

export function ScrollToTop() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();
  const guardCountRef = useRef(0);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  useEffect(() => {
    if (!isLoggedIn || !user) {
      guardCountRef.current = 0;
      return;
    }

    const home = user.profileCompleted === false ? "/complete-profile" : roleHome(user.role);
    const isStaff = Boolean(user.role && user.role !== "student");

    if (AUTH_PAGES.has(pathname) || (isStaff && pathname === "/")) {
      navigate(home, { replace: true });
      return;
    }

    // Arm history entries ONLY inside a genuine user gesture (pointerdown/keydown)
    // so Chrome's History Manipulation Intervention marks them as user-activated
    // and never skips the site back to google.com.
    const armUserGestureGuard = () => {
      if (window.location.pathname === home && guardCountRef.current < 2) {
        window.history.pushState({ ...window.history.state, gabaiGuard: Date.now() }, "", window.location.href);
        guardCountRef.current += 1;
      }
    };

    const handlePopState = () => {
      guardCountRef.current = Math.max(0, guardCountRef.current - 1);
      const currentPath = window.location.pathname;
      const hitAuthPage = AUTH_PAGES.has(currentPath);
      const staffLeftPortal = isStaff && !currentPath.startsWith(`/${user.role}`) && currentPath !== "/complete-profile";

      if (hitAuthPage || staffLeftPortal) {
        navigate(home, { replace: true });
      }
    };

    window.addEventListener("pointerdown", armUserGestureGuard, { passive: true });
    window.addEventListener("keydown", armUserGestureGuard, { passive: true });
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("pointerdown", armUserGestureGuard);
      window.removeEventListener("keydown", armUserGestureGuard);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isLoggedIn, user, pathname, navigate]);

  return null;
}
