import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Eye, EyeOff, UserPlus, Mail, Lock, User, Phone, AlertCircle, Loader2, CheckCircle, Check, X } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { API } from "../config/api";

const NAME_PATTERN = /^[\p{L}\p{M}\s'\u2019-]+$/u;

export function SignUp() {
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    mobileNumber: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [registered, setRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const navigate = useNavigate();

  // Password requirement checks
  const pwRules = {
    length: formData.password.length >= 12,
    uppercase: /[A-Z]/.test(formData.password),
    number: /[0-9]/.test(formData.password),
  };
  const pwValid = Object.values(pwRules).every(Boolean);
  const showRules = formData.password.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Client-side validation
    const firstName = formData.firstName.trim();
    const middleName = formData.middleName.trim();
    const lastName = formData.lastName.trim();
    const mobileNumber = formData.mobileNumber.trim();

    if (!firstName) {
      setError("First name is required.");
      return;
    }
    if (!NAME_PATTERN.test(firstName) || !/\p{L}/u.test(firstName)) {
      setError("First name must contain letters, spaces, apostrophes or hyphens.");
      return;
    }
    if (firstName.length > 100) {
      setError("First name must be 100 characters or less.");
      return;
    }

    if (middleName) {
      if (!NAME_PATTERN.test(middleName) || !/\p{L}/u.test(middleName)) {
        setError("Middle name must contain letters, spaces, apostrophes or hyphens.");
        return;
      }
      if (middleName.length > 100) {
        setError("Middle name must be 100 characters or less.");
        return;
      }
    }

    if (!lastName) {
      setError("Last name is required.");
      return;
    }
    if (!NAME_PATTERN.test(lastName) || !/\p{L}/u.test(lastName)) {
      setError("Last name must contain letters, spaces, apostrophes or hyphens.");
      return;
    }
    if (lastName.length > 100) {
      setError("Last name must be 100 characters or less.");
      return;
    }

    const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ");
    if (fullName.length > 100) {
      setError("Combined full name must be 100 characters or less.");
      return;
    }

    if (!formData.email.trim()) {
      setError("Email is required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!mobileNumber) {
      setError("Mobile number is required.");
      return;
    }
    if (!/^09[0-9]{9}$/.test(mobileNumber)) {
      setError("Enter a valid mobile number: exactly 11 digits starting with 09.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match!");
      return;
    }
    if (!pwValid) {
      setError("Password does not meet the requirements.");
      return;
    }
    if (!agreedToTerms) {
      setError("Please agree to the terms and conditions");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: fullName,
          firstName,
          middleName: middleName || null,
          lastName,
          mobileNumber,
          email: formData.email.trim(),
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      setRegisteredEmail(formData.email);
      setRegistered(true);
      navigate("/verify-email", { state: { email: formData.email } });
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    if (id === "mobileNumber") {
      setFormData((prev) => ({
        ...prev,
        [id]: value.replace(/[^0-9]/g, "").slice(0, 11),
      }));
    } else if (id === "firstName" || id === "middleName" || id === "lastName") {
      setFormData((prev) => ({
        ...prev,
        [id]: value.slice(0, 100),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [id]: value,
      }));
    }
  };


  if (registered) {
    return (
      <div className="min-h-screen bg-linear-to-br from-[#001840] via-[#102A71] to-[#001840] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-[#FFFDF0] rounded-2xl shadow-2xl p-8 border-2 border-[#F5C400]/20">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-[#001840] mb-2">Check Your Email</h2>
            <p className="text-gray-600 mb-2">We sent a verification link to:</p>
            <p className="font-semibold text-[#102A71] mb-4">{registeredEmail}</p>
            <p className="text-sm text-gray-500 mb-6">Click the link in the email to verify your account. The link expires in 24 hours.</p>
            <Link to="/login" className="block w-full py-3 bg-[#102A71] text-white rounded-xl font-semibold hover:bg-[#001840] transition-all">
              Go to Login
            </Link>
            <button
              onClick={async () => {
                try {
                  await fetch(`${API}/auth/resend-verification`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: registeredEmail })
                  });
                  alert("Verification email resent!");
                } catch {
                  alert("Could not resend the verification email. Please try again.");
                }
              }}
              className="mt-3 text-sm text-[#102A71] hover:underline"
            >
              Resend verification email
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-linear-to-br from-[#001840] via-[#102A71] to-[#001840] flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Logo Header */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 mb-3">
            <img
              src="/GabAi_Logo.png"
              alt="GabAI Logo"
              className="w-12 h-12 rounded-xl object-contain shadow-lg"
            />
            <div className="text-left">
              <span className="font-bold text-2xl tracking-wide text-white">
                GabAI
              </span>
              <p className="text-xs text-[#FFDC5F] leading-none tracking-wider">
                Eastern Mindoro College, Inc.
              </p>
            </div>
          </Link>

        </div>

        {/* Sign Up Card */}
        <div className="bg-[#FFFDF0] rounded-2xl shadow-2xl p-6 sm:p-8 border-2 border-[#F5C400]/20">
          <h1 className="text-3xl font-bold text-[#001840] mt-4 mb-2 text-center">
            Create Your Account
          </h1>
          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 font-medium">{error}</p>
            </div>
          )}


          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name Fields: First, Middle, Last */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* First Name */}
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-[#001840] font-semibold">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#102A71]" />
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Juan"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="pl-11 h-12 border-[#102A71]/30 focus:border-[#102A71] focus:ring-[#102A71] text-base"
                    required
                    maxLength={100}
                    autoComplete="given-name"
                  />
                </div>
              </div>

              {/* Middle Name */}
              <div className="space-y-2">
                <Label htmlFor="middleName" className="text-[#001840] font-semibold">
                  Middle Name <span className="text-gray-400 font-normal">(Optional)</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#102A71]" />
                  <Input
                    id="middleName"
                    type="text"
                    placeholder="Reyes"
                    value={formData.middleName}
                    onChange={handleChange}
                    className="pl-11 h-12 border-[#102A71]/30 focus:border-[#102A71] focus:ring-[#102A71] text-base"
                    maxLength={100}
                    autoComplete="additional-name"
                  />
                </div>
              </div>

              {/* Last Name */}
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-[#001840] font-semibold">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#102A71]" />
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Dela Cruz"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="pl-11 h-12 border-[#102A71]/30 focus:border-[#102A71] focus:ring-[#102A71] text-base"
                    required
                    maxLength={100}
                    autoComplete="family-name"
                  />
                </div>
              </div>
            </div>

            {/* Email & Mobile Number Grid */}
            <div className="grid sm:grid-cols-2 gap-5">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#001840] font-semibold">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#102A71]" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-11 h-12 border-[#102A71]/30 focus:border-[#102A71] focus:ring-[#102A71] text-base"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Mobile Number Field */}
              <div className="space-y-2">
                <Label htmlFor="mobileNumber" className="text-[#001840] font-semibold">
                  Mobile Number <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#102A71]" />
                  <Input
                    id="mobileNumber"
                    type="tel"
                    inputMode="numeric"
                    placeholder="09171234567"
                    value={formData.mobileNumber}
                    onChange={handleChange}
                    className="pl-11 h-12 border-[#102A71]/30 focus:border-[#102A71] focus:ring-[#102A71] text-base"
                    required
                    maxLength={11}
                    autoComplete="tel"
                  />
                </div>
              </div>
            </div>

            {/* Password Grid */}
            <div className="grid sm:grid-cols-2 gap-5">
              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#001840] font-semibold">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#102A71]" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create password"
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-11 pr-11 h-12 border-[#102A71]/30 focus:border-[#102A71] focus:ring-[#102A71] text-base"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#102A71] hover:text-[#001840] transition-colors"
                    tabIndex="-1"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-[#001840] font-semibold">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#102A71]" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="pl-11 pr-11 h-12 border-[#102A71]/30 focus:border-[#102A71] focus:ring-[#102A71] text-base"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#102A71] hover:text-[#001840] transition-colors"
                    tabIndex="-1"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Password Requirements */}
            {showRules && (
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 px-1">
                {[
                  { met: pwRules.length, label: "At least 12 characters" },
                  { met: pwRules.uppercase, label: "1 uppercase letter" },
                  { met: pwRules.number, label: "1 number" },
                ].map(({ met, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-colors ${met ? "bg-green-500" : "bg-gray-300"}`}>
                      {met
                        ? <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                        : <X className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                      }
                    </span>
                    <span className={`text-xs transition-colors ${met ? "text-green-700 font-medium" : "text-gray-500"}`}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Terms & Conditions */}
            <div className="flex items-start gap-3 pt-2">
              <input
                type="checkbox"
                id="terms"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="w-5 h-5 rounded border-[#102A71] text-[#102A71] focus:ring-[#102A71] mt-0.5 shrink-0"
              />
              <label htmlFor="terms" className="text-sm text-[#001840] leading-tight">
                I agree to the{" "}
                <Link
                  to="/terms"
                  className="text-[#102A71] hover:text-[#001840] font-semibold transition-colors"
                >
                  Terms and Conditions
                </Link>{" "}
                and{" "}
                <Link
                  to="/privacy"
                  className="text-[#102A71] hover:text-[#001840] font-semibold transition-colors"
                >
                  Privacy Policy
                </Link>
              </label>
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
                  Creating account...
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5 mr-2" />
                  Create Account
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
            onClick={() => window.location.assign(`${API}/auth/google?mode=signup`)}
            className="w-full h-12 inline-flex items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white text-[#001840] font-semibold hover:bg-gray-50"
          >
            <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5 shrink-0">
              <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11c-.5 2.5-1.9 4.6-4.1 6.1v5h6.6c3.9-3.6 6.1-8.8 6.1-14.8z" />
              <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5c-1.8 1.2-4.1 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.2C9.2 39.4 16 44 24 44z" />
              <path fill="#FBBC05" d="M12.6 27.7c-.4-1.2-.7-2.4-.7-3.7s.3-2.5.7-3.7v-5.2H5.8C4.3 18.1 3.5 21 3.5 24s.8 5.9 2.3 8.9l6.8-5.2z" />
              <path fill="#EA4335" d="M24 9.5c3 0 5.7 1 7.8 3l5.8-5.8C34.1 3.4 29.5 1 24 1 16 1 9.2 5.6 5.8 12.9l6.8 5.2C14.2 13.1 18.7 9.5 24 9.5z" />
            </svg>
            Sign up with Google
          </button>

          {/* Sign In Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-[#001840]">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-[#102A71] hover:text-[#001840] font-semibold transition-colors"
              >
                Login here
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