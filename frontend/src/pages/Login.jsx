import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { MapPin, Eye, EyeOff, LogIn, Mail, Lock, AlertCircle, Loader2, CheckCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../contexts/AuthContext";
import { API } from "../config/api";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("google") === "error"
      ? params.get("message") || "Google sign-in failed. Please try again."
      : "";
  });
  const { login } = useAuth();
  const navigate = useNavigate();
  const googleCallbackHandled = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleStatus = params.get("google");
    if (!googleStatus || googleCallbackHandled.current) return;
    googleCallbackHandled.current = true;
    window.history.replaceState({}, "", window.location.pathname);

    if (googleStatus === "error") {
      return;
    }
    if (googleStatus !== "success") return;

    const finishGoogleLogin = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/google/session`, {
          credentials: "include",
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Google sign-in failed.");

        login(data.user, data.token);
        if (data.user.role === "admin") {
          navigate("/admin", { replace: true });
        } else if (data.user.role === "registrar") {
          navigate("/registrar", { replace: true });
        } else if (data.user.role === "teacher") {
          navigate("/teacher", { replace: true });
        } else {
          navigate("/my-enrollments", { replace: true });
        }
      } catch (err) {
        setError(err.message || "Google sign-in failed. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    finishGoogleLogin();
  }, [login, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.needsVerification) {
          navigate("/verify-email", { state: { email: data.email } });
          return;
        }
        throw new Error(data.message || "Login failed");
      }

      // Use auth context to update login state
      login(data.user, data.token);

      // Navigate based on role
      if (data.user.role === "admin") {
        navigate("/admin");
      } else if (data.user.role === "registrar") {
        navigate("/registrar");
      } else if (data.user.role === "teacher") {
        navigate("/teacher");
      } else {
        navigate("/my-enrollments");
      }
    } catch (err) {
      const msg = err.message || "";
      setError(msg || "Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-[#001840] via-[#102A71] to-[#001840] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo Header */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 mb-3">
            <div className="bg-[#F5C400] w-12 h-12 rounded-xl flex items-center justify-center shadow-lg">
              <MapPin className="w-7 h-7 text-[#001840]" />
            </div>
            <div className="text-left">
              <span className="font-bold text-2xl tracking-wide text-white">
                GabAI
              </span>
              <p className="text-xs text-[#FFDC5F] leading-none tracking-wider">
                Eastern Mindoro College, Inc.
              </p>
            </div>
          </Link>
          
          <p className="text-sm text-[#FFDC5F]"></p>
        </div>

        {/* Login Card */}
        <div className="bg-[#FFFDF0] rounded-2xl shadow-2xl p-6 sm:p-8 border-2 border-[#F5C400]/20">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#001840] font-semibold">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#102A71]" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11 h-12 border-[#102A71]/30 focus:border-[#102A71] focus:ring-[#102A71] text-base"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-[#001840] font-semibold"
              >
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#102A71]" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 pr-11 h-12 border-[#102A71]/30 focus:border-[#102A71] focus:ring-[#102A71] text-base"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#102A71] hover:text-[#001840] transition-colors"
                  tabIndex="-1"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#102A71] text-[#102A71] focus:ring-[#102A71]"
                />
                <span className="text-sm text-[#001840]">Remember me</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm text-[#102A71] hover:text-[#001840] font-medium transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-linear-to-r from-[#102A71] to-[#001840] hover:from-[#001840] hover:to-[#102A71] text-white font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Logging in...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Login
                </>
              )}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs font-medium text-gray-400">
            <span className="h-px flex-1 bg-gray-200" />
            OR
            <span className="h-px flex-1 bg-gray-200" />
          </div>
          <button
            type="button"
            onClick={() => window.location.assign(`${API}/auth/google?mode=login`)}
            disabled={loading}
            className="w-full h-12 inline-flex items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white text-[#001840] font-semibold hover:bg-gray-50 disabled:opacity-50"
          >
            <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5 shrink-0">
              <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11c-.5 2.5-1.9 4.6-4.1 6.1v5h6.6c3.9-3.6 6.1-8.8 6.1-14.8z" />
              <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5c-1.8 1.2-4.1 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.2C9.2 39.4 16 44 24 44z" />
              <path fill="#FBBC05" d="M12.6 27.7c-.4-1.2-.7-2.4-.7-3.7s.3-2.5.7-3.7v-5.2H5.8C4.3 18.1 3.5 21 3.5 24s.8 5.9 2.3 8.9l6.8-5.2z" />
              <path fill="#EA4335" d="M24 9.5c3 0 5.7 1 7.8 3l5.8-5.8C34.1 3.4 29.5 1 24 1 16 1 9.2 5.6 5.8 12.9l6.8 5.2C14.2 13.1 18.7 9.5 24 9.5z" />
            </svg>
            Continue with Google
          </button>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-[#001840]">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="text-[#102A71] hover:text-[#001840] font-semibold transition-colors"
              >
                Register here
              </Link>
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-4">
          <Link
            to="/"
            className="text-sm text-[#FFDC5F] hover:text-white transition-colors inline-flex items-center gap-1"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}