import { Outlet, useLocation } from "react-router";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { FloatingChat } from "./components/FloatingChat";

export function Root() {
  const location = useLocation();
  const isChatPage = location.pathname === "/qa";

  // Hide footer on student pages: profile/dashboard, enrollment forms, and schedule
  const hideFooterPatterns = [
    /^\/qa$/,
    /^\/my-schedule(\/.*)?$/,
    /^\/my-enrollments(\/.*)?$/,
    /^\/student-dashboard(\/.*)?$/,
    /^\/enroll$/,
    /^\/hs-enrollment-form(\/.*)?$/,
    /^\/resubmit(\/.*)?$/,
    /^\/enrollment(\/.*)?$/,
  ];
  const shouldHideFooter = hideFooterPatterns.some((pattern) => pattern.test(location.pathname));

  return (
    <div className={`${isChatPage ? "h-dvh overflow-hidden" : "min-h-screen"} flex flex-col`}>
      <Navbar />
      {/* pt-16 lg:pt-20 offsets the fixed navbar height */}
      <div className="flex-1 min-h-0 pt-16 lg:pt-20">
        <Outlet />
      </div>
      {!shouldHideFooter && <Footer />}
      {!isChatPage && <FloatingChat />}
    </div>
  );
}