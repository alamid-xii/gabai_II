import { roleHome } from "../utils/roleHome";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../contexts/authState";

export function ProtectedRoute({ children, requireAdmin = false, role, allowIncompleteProfile = false }) {
  const { user, isLoggedIn, loading } = useAuth();
  const { pathname } = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-[#001840] via-[#102A71] to-[#001840]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#F5C400] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  const expectedRole = role || (requireAdmin ? "admin"
    : pathname.startsWith("/registrar") ? "registrar"
    : pathname.startsWith("/teacher") ? "teacher"
    : (pathname === "/complete-profile" || pathname.startsWith("/enrollment/")) ? null : "student");
  if (expectedRole && user?.role !== expectedRole) {
    return <Navigate to={roleHome(user?.role)} replace />;
  }

  if (user?.profileCompleted === false && !allowIncompleteProfile) {
    return <Navigate to="/complete-profile" replace />;
  }

  return children;
}

export function PublicOnlyRoute({ children }) {
  const { user, isLoggedIn, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (isLoggedIn && user) {
    const target = user.profileCompleted === false ? "/complete-profile" : roleHome(user.role);
    return <Navigate to={target} replace />;
  }

  return children;
}

