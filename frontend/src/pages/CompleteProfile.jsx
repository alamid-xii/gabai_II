import { Navigate, useNavigate } from "react-router";
import { LogOut, UserRound } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { ProfileDetailsForm } from "../components/ProfileDetailsForm";
import { SchoolName } from "../components/SchoolName";

export function CompleteProfile() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  if (user?.profileCompleted !== false) return <Navigate to="/my-enrollments" replace />;
  return <main className="min-h-screen bg-linear-to-br from-[#001840] via-[#102A71] to-[#001840] flex items-center justify-center p-4 py-10">
    <div className="w-full max-w-xl">
      <div className="text-center mb-6"><p className="text-2xl font-bold text-white">GabAI</p><p className="text-xs text-[#FFDC5F] mt-1"><SchoolName /></p></div>
      <section className="rounded-2xl bg-[#FFFDF0] p-6 sm:p-8 shadow-xl border border-[#F5C400]/20">
        <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#102A71]/10 text-[#102A71]"><UserRound size={25} /></span>
        <h1 className="text-2xl font-bold text-[#001840]">Complete your profile</h1>
        <p className="mt-2 mb-5 text-sm text-gray-600">Add your name and mobile number to finish setting up your account. You can review these details later in Profile.</p>
        <p className="mb-6 break-all rounded-lg bg-white px-3 py-2 text-sm text-gray-600">Signed in as <span className="font-medium text-[#001840]">{user?.email}</span></p>
        <ProfileDetailsForm user={user} submitLabel="Save and continue" onSaved={(savedUser) => { updateUser(savedUser); navigate("/my-enrollments", { replace: true }); }} />
        <button type="button" onClick={logout} className="mt-6 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#001840]"><LogOut size={15} />Sign out</button>
      </section>
    </div>
  </main>;
}
