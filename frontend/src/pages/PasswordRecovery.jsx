import { SchoolName } from "../components/SchoolName";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { MapPin, Loader2, Eye, EyeOff, Lock, Check, X } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { API } from "../config/api";

export function PasswordRecovery({ reset = false }) {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const validToken = /^[a-f0-9]{64}$/.test(token);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const pwRules = {
    length: password.length >= 12,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (reset && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (reset && (!Object.values(pwRules).every(Boolean) || new TextEncoder().encode(password).length > 72)) {
      setError("Use at least 12 characters, 1 uppercase letter and 1 number (maximum 72 bytes).");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API}/auth/${reset ? "reset-password" : "forgot-password"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reset ? { token, password } : { email: email.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to process your request. Please try again.");
      setMessage(data.message);
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message || "Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-[#001840] via-[#102A71] to-[#001840] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 mb-3">
            <div className="bg-[#F5C400] w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"><MapPin className="w-7 h-7 text-[#001840]" /></div>
            <div className="text-left"><span className="font-bold text-2xl tracking-wide text-white">GabAI</span><p className="text-xs text-[#FFDC5F]"><SchoolName /></p></div>
          </Link>
        </div>
        <div className="bg-[#FFFDF0] rounded-2xl shadow-2xl p-6 sm:p-8 border-2 border-[#F5C400]/20">
          <h1 className="text-2xl font-bold text-[#001840] mb-2">{reset ? "Reset password" : "Forgot password?"}</h1>
          <p className="text-sm text-gray-600 mb-6">{reset ? "Choose a new password for your GabAI account." : "Enter your account email and we will send you a link to reset your password."}</p>
          {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {message && <p role="status" className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">{message}</p>}
          {reset && !validToken && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">This reset link is invalid. Please request a new link.</p>}
          {!message && (!reset || validToken) && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {reset ? <>
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-[#001840] font-semibold">New password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#102A71]" />
                    <Input id="new-password" type={showPassword ? "text" : "password"} placeholder="Create password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={12} autoComplete="new-password" required disabled={loading} className="pl-11 pr-11 h-12 border-[#102A71]/30 focus:border-[#102A71] focus:ring-[#102A71] text-base" aria-describedby="password-hint" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#102A71]">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                  </div>
                  <p id="password-hint" className="text-xs text-gray-600">Use at least 12 characters, 1 uppercase letter and 1 number (maximum 72 bytes).</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-[#001840] font-semibold">Confirm new password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#102A71]" />
                    <Input id="confirm-password" type={showConfirmPassword ? "text" : "password"} placeholder="Re-enter password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={12} autoComplete="new-password" required disabled={loading} className="pl-11 pr-11 h-12 border-[#102A71]/30 focus:border-[#102A71] focus:ring-[#102A71] text-base" />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#102A71] hover:text-[#001840] transition-colors">{showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                  </div>
                </div>
                {password.length > 0 && <div className="flex flex-wrap gap-x-5 gap-y-1.5 px-1" aria-live="polite">
                  {[
                    { met: pwRules.length, label: "At least 12 characters" },
                    { met: pwRules.uppercase, label: "1 uppercase letter" },
                    { met: pwRules.number, label: "1 number" },
                  ].map(({ met, label }) => <div key={label} className="flex items-center gap-1.5">
                    <span className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-colors ${met ? "bg-green-500" : "bg-gray-300"}`}>
                      {met ? <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} /> : <X className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                    </span>
                    <span className={`text-xs transition-colors ${met ? "text-green-700 font-medium" : "text-gray-500"}`}>{label}</span>
                  </div>)}
                </div>}
              </> : <div className="space-y-2">
                <Label htmlFor="recovery-email" className="text-[#001840] font-semibold">Email address</Label>
                <Input id="recovery-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your.email@example.com" autoComplete="email" maxLength={254} required disabled={loading} className="h-12" />
              </div>}
              <Button type="submit" disabled={loading} className="w-full h-12 bg-[#102A71] hover:bg-[#001840] text-white font-semibold">
                {loading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
                {loading ? "Please wait..." : reset ? "Reset password" : "Send reset link"}
              </Button>
            </form>
          )}
          {(reset || message) && <Link to="/forgot-password" onClick={() => { setMessage(""); setError(""); }} className="block text-center mt-5 text-sm font-medium text-[#102A71]">{reset ? "Request a new reset link" : "Use another email or request again"}</Link>}
          <Link to="/login" className="block text-center mt-5 text-sm font-semibold text-[#102A71] hover:text-[#001840]">Back to login</Link>
        </div>
      </div>
    </div>
  );
}
