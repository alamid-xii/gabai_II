import { Outlet, useLocation } from "react-router";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { FloatingChat } from "./components/FloatingChat";

export function Root() {
  const location = useLocation();
  const isChatPage = location.pathname === "/qa";
  const isTourPage = location.pathname === "/ar-navigation";
  const isNoScrollPage = isChatPage;
  const isEnrollmentForm = /^\/(enroll|hs-enrollment-form|resubmit)(\/|$)/.test(location.pathname);

  // Hide footer on student pages, chat page, and virtual tour
  const hideFooterPatterns = [
    /^\/qa$/,
    /^\/ar-navigation$/,
    /^\/my-schedule(\/.*)?$/,
    /^\/my-enrollments(\/.*)?$/,
    /^\/student-dashboard(\/.*)?$/,
    /^\/profile$/,
    /^\/enroll$/,
    /^\/hs-enrollment-form(\/.*)?$/,
    /^\/resubmit(\/.*)?$/,
    /^\/enrollment(\/.*)?$/,
  ];
  const shouldHideFooter = hideFooterPatterns.some((pattern) => pattern.test(location.pathname));

  return (
    <div data-student-layout={shouldHideFooter || location.pathname === "/enrollment-guide" ? "true" : undefined}
      className={`${isNoScrollPage ? "h-dvh overflow-hidden" : isTourPage ? "min-h-dvh lg:h-dvh lg:overflow-hidden" : "min-h-dvh"} w-full min-w-0 flex flex-col`}>
      <Navbar />
      {/* pt-16 lg:pt-20 offsets the fixed navbar height */}
      <div className="flex-1 min-h-0 min-w-0 pt-16 lg:pt-20">
        <Outlet />
      </div>
      {!shouldHideFooter && <Footer />}
      {!isChatPage && !isEnrollmentForm && <FloatingChat />}
    </div>
  );
}
