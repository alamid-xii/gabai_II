import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router";
import { CheckCircle2, XCircle, Loader2, Mail, MapPin, RefreshCw } from "lucide-react";
import { API } from "../config/api";

export function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Email can be passed via navigation state (from SignUp) or query param fallback
  const emailFromState = location.state?.email || "";
  const [email, setEmail] = useState(emailFromState);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef([]);

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleOtpChange = (index, value) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1); // take last char if pasted multiple
    setOtp(next);
    // Auto-advance
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = [...otp];
    for (let i = 0; i < 6; i++) next[i] = pasted[i] || "";
    setOtp(next);
    // Focus last filled or last box
    const lastIndex = Math.min(pasted.length, 5);
    inputRefs.current[lastIndex]?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length < 6) { setErrorMsg("Please enter the complete 6-digit OTP."); return; }
    if (!email) { setErrorMsg("Email address is missing. Please go back and register again."); return; }

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch(`${API}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: code }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus("success");
      } else {
        setErrorMsg(data.message || "Incorrect OTP. Please try again.");
        setStatus("idle");
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setStatus("idle");
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResendCooldown(60);
    setErrorMsg("");
    setOtp(["", "", "", "", "", ""]);
    inputRefs.current[0]?.focus();
    try {
      await fetch(`${API}/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch { /* silent */ }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-[#001840] via-[#102A71] to-[#001840] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="bg-[#F5C400] w-12 h-12 rounded-xl flex items-center justify-center shadow-lg">
              <MapPin className="w-7 h-7 text-[#001840]" />
            </div>
            <div className="text-left">
              <span className="font-bold text-2xl tracking-wide text-white">GabAI</span>
              <p className="text-xs text-[#FFDC5F] leading-none tracking-wider">Eastern Mindoro College</p>
            </div>
          </Link>
        </div>

        <div className="bg-[#FFFDF0] rounded-2xl shadow-2xl p-8 border-2 border-[#F5C400]/20 text-center">

          {/* SUCCESS STATE */}
          {status === "success" ? (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-[#001840] mb-2">Email Verified!</h2>
              <p className="text-gray-600 mb-6">Your account is now active. You can log in and start your enrollment.</p>
              <Link
                to="/login"
                className="block w-full py-3 bg-[#102A71] text-white rounded-xl font-semibold hover:bg-[#001840] transition-all"
              >
                Log In Now
              </Link>
            </>
          ) : (
            <>
              {/* ICON */}
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-[#102A71]" />
              </div>
              <h2 className="text-2xl font-bold text-[#001840] mb-1">Check Your Email</h2>
              <p className="text-gray-500 text-sm mb-1">We sent a 6-digit OTP to</p>
              <p className="font-semibold text-[#102A71] mb-5 text-sm break-all">{email || "your email address"}</p>

              {/* OTP BOXES */}
              <div className="flex justify-center gap-2 mb-5" onPaste={handlePaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => inputRefs.current[i] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    className="w-11 h-14 text-center text-2xl font-bold border-2 border-[#102A71]/30 rounded-xl focus:border-[#102A71] focus:outline-none focus:ring-2 focus:ring-[#102A71]/20 bg-white text-[#001840] transition-all"
                  />
                ))}
              </div>

              {/* ERROR */}
              {errorMsg && (
                <div className="flex items-center gap-2 bg-red-50 border-l-4 border-red-500 rounded-lg p-3 mb-4 text-left">
                  <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <p className="text-sm text-red-800">{errorMsg}</p>
                </div>
              )}

              {/* VERIFY BUTTON */}
              <button
                onClick={handleVerify}
                disabled={status === "loading" || otp.join("").length < 6}
                className="w-full py-3 bg-[#102A71] text-white rounded-xl font-semibold hover:bg-[#001840] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {status === "loading" ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Verifying...</>
                ) : (
                  "Verify OTP"
                )}
              </button>

              {/* RESEND */}
              <div className="mt-4">
                {resendCooldown > 0 ? (
                  <p className="text-sm text-gray-400">Resend OTP in {resendCooldown}s</p>
                ) : (
                  <button
                    onClick={handleResend}
                    className="text-sm text-[#102A71] hover:underline inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Resend OTP
                  </button>
                )}
              </div>

              <p className="text-xs text-gray-400 mt-4">OTP expires in 10 minutes</p>
            </>
          )}
        </div>

        <div className="text-center mt-4">
          <Link to="/" className="text-sm text-[#FFDC5F] hover:text-white transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
