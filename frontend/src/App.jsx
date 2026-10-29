import { BrowserRouter, Routes, Route } from "react-router";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ScrollToTop } from "./components/ScrollToTop";
import { Root } from "./Root";
import { Home } from "./pages/Home";
import { About } from "./pages/About";
import { QAChat } from "./pages/QAChat";
import { ARNavigation } from "./pages/ARNavigation";
import { EnrollmentGuide } from "./pages/EnrollmentGuide";
import { Login } from "./pages/Login";
import { PasswordRecovery } from "./pages/PasswordRecovery";
import { CompleteProfile } from "./pages/CompleteProfile";
import { StudentProfile } from "./pages/student/StudentProfile";
import { SignUp } from "./pages/SignUp";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminProfile } from "./pages/admin/AdminProfile";
import { RegistrarDashboard } from "./pages/registrar/RegistrarDashboard";
import { RegistrarProfile } from "./pages/registrar/RegistrarProfile";
import { TeacherProfile } from "./pages/teacher/TeacherProfile";
import { HSEnrollmentForm } from "./pages/student/HSEnrollmentForm";
import { MyEnrollments } from "./pages/student/MyEnrollments";
import { MySchedule } from "./pages/student/MySchedule";
import { EnrollmentDetail } from "./pages/student/EnrollmentDetail";
import { AdminEnrollments } from "./pages/admin/AdminEnrollments";
import { LevelSelection } from "./pages/student/LevelSelection";
import { StudentDashboard } from "./pages/student/StudentDashboard";
import { SectionManagement } from "./pages/admin/SectionManagement";
import { ResubmitPage } from "./pages/student/ResubmitPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { TeacherSections } from "./pages/teacher/TeacherSections";
import { TeacherClasses } from "./pages/teacher/TeacherClasses";
import { TeacherSchedule } from "./pages/teacher/TeacherSchedule";
import { Toaster } from "sonner";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Toaster richColors position="top-right" />
        <Routes>
          {/* Pages with Navbar + Footer layout */}
          <Route element={<Root />}>
            <Route path="profile" element={<ProtectedRoute><StudentProfile /></ProtectedRoute>} />
            <Route index element={<Home />} />
            <Route path="about" element={<About />} />
            <Route path="qa" element={<QAChat />} />
            <Route path="ar-navigation" element={<ARNavigation />} />
            <Route path="enrollment-guide" element={<EnrollmentGuide />} />
            <Route
              path="enroll"
              element={
                <ProtectedRoute>
                  <LevelSelection />
                </ProtectedRoute>
              }
            />
            <Route
              path="hs-enrollment-form"
              element={
                <ProtectedRoute>
                  <HSEnrollmentForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="hs-enrollment-form/:id"
              element={
                <ProtectedRoute>
                  <HSEnrollmentForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="my-enrollments"
              element={
                <ProtectedRoute>
                  <MyEnrollments />
                </ProtectedRoute>
              }
            />
            <Route
              path="my-schedule"
              element={
                <ProtectedRoute>
                  <MySchedule />
                </ProtectedRoute>
              }
            />
            <Route
              path="resubmit/:id"
              element={
                <ProtectedRoute>
                  <ResubmitPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="student-dashboard"
              element={
                <ProtectedRoute>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="student-dashboard/:id"
              element={
                <ProtectedRoute>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Standalone pages without layout */}
          <Route path="/login" element={<Login />} />
          <Route path="/complete-profile" element={<ProtectedRoute allowIncompleteProfile><CompleteProfile /></ProtectedRoute>} />
          <Route path="/forgot-password" element={<PasswordRecovery />} />
          <Route path="/reset-password" element={<PasswordRecovery reset />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/signup" element={<SignUp />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/profile"
            element={
              <ProtectedRoute requireAdmin>
                <AdminProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/registrar"
            element={
              <ProtectedRoute>
                <RegistrarDashboard initialTab="overview" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/registrar/profile"
            element={
              <ProtectedRoute>
                <RegistrarProfile />
              </ProtectedRoute>
            }
          />
          <Route path="/registrar/enrollments" element={<ProtectedRoute><RegistrarDashboard initialTab="enrollments" /></ProtectedRoute>} />
          <Route path="/registrar/students" element={<ProtectedRoute><RegistrarDashboard initialTab="students" /></ProtectedRoute>} />
          <Route path="/registrar/scheduling" element={<ProtectedRoute><RegistrarDashboard initialTab="ssc" /></ProtectedRoute>} />
          <Route path="/registrar/schedules" element={<ProtectedRoute><RegistrarDashboard initialTab="schedules" /></ProtectedRoute>} />
          <Route path="/registrar/sections" element={<ProtectedRoute><RegistrarDashboard initialTab="sections" /></ProtectedRoute>} />
          <Route
            path="/registrar/enrollment/:id"
            element={
              <ProtectedRoute>
                <RegistrarDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher"
            element={
              <ProtectedRoute>
                <TeacherSections />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/profile"
            element={
              <ProtectedRoute>
                <TeacherProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/sections"
            element={
              <ProtectedRoute>
                <TeacherSections />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/classes"
            element={
              <ProtectedRoute>
                <TeacherClasses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/schedule"
            element={
              <ProtectedRoute>
                <TeacherSchedule />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/enrollments"
            element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard initialTab="enrollments" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/sections"
            element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard initialTab="sections" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/logs"
            element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard initialTab="logs" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/enrollment/:id"
            element={
              <ProtectedRoute>
                <EnrollmentDetail />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
