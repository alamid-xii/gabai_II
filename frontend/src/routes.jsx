import { createBrowserRouter } from "react-router";
import { Root } from "./Root";
import { Home } from "./pages/Home";
import { QAChat } from "./pages/QAChat";
import { EnrollmentGuide } from "./pages/EnrollmentGuide";
import { Login } from "./pages/Login";
import { SignUp } from "./pages/SignUp";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { RegistrarDashboard } from "./pages/registrar/RegistrarDashboard";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: "qa", Component: QAChat },
      { path: "enrollment-guide", Component: EnrollmentGuide },
    ],
  },
  // Standalone pages without Root layout
  { path: "/login", Component: Login },
  { path: "/signup", Component: SignUp },
  { path: "/admin", Component: AdminDashboard },
  { path: "/registrar", Component: RegistrarOverview },
  { path: "/registrar/enrollments", Component: () => <RegistrarDashboard initialTab="enrollments" /> },
  { path: "/registrar/students", Component: () => <RegistrarDashboard initialTab="students" /> },
  { path: "/registrar/scheduling", Component: () => <RegistrarDashboard initialTab="ssc" /> },
  { path: "/registrar/schedules", Component: () => <RegistrarDashboard initialTab="schedules" /> },
  { path: "/registrar/sections", Component: () => <RegistrarDashboard initialTab="sections" /> },
]);