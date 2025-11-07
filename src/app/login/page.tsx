/**
 * Login Page Component
 * 
 * Handles user authentication with client-side form validation.
 * Features real-time validation feedback and accessibility support.
 */

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useToastContext } from "@/contexts/ToastContext";

/**
 * Validation Errors Interface
 * 
 * Type-safe structure for form validation errors.
 */
interface ValidationErrors {
  email?: string;
  password?: string;
}

/**
 * Login Page Component
 * 
 * Displays login form with client-side validation and real-time error feedback.
 * Handles form submission, authentication, and navigation to dashboard.
 */
export default function LoginPage() {
  const router = useRouter(); // Next.js router for navigation
  const toast = useToastContext(); // Toast notifications context
  const [email, setEmail] = useState(""); // Email input state
  const [password, setPassword] = useState(""); // Password input state
  const [error, setError] = useState(""); // Server error message
  const [loading, setLoading] = useState(false); // Loading state during login
  const [showPassword, setShowPassword] = useState(false); // Toggle password visibility
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({}); // Client-side validation errors

  /**
   * Email Validation Function
   * 
   * Validates email format using regex pattern.
   * Returns error message if invalid, undefined if valid.
   * 
   * @param emailValue - Email string to validate
   * @returns Error message or undefined
   */
  function validateEmail(emailValue: string): string | undefined {
    if (!emailValue) {
      return "Email is required"; // Empty email error
    }
    // Email regex pattern: must contain @ and domain with TLD
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue)) {
      return "Please enter a valid email address"; // Invalid format error
    }
    return undefined; // Valid email
  }

  /**
   * Password Validation Function
   * 
   * Validates password length (minimum 6 characters).
   * Returns error message if invalid, undefined if valid.
   * 
   * @param passwordValue - Password string to validate
   * @returns Error message or undefined
   */
  function validatePassword(passwordValue: string): string | undefined {
    if (!passwordValue) {
      return "Password is required"; // Empty password error
    }
    if (passwordValue.length < 6) {
      return "Password must be at least 6 characters"; // Too short error
    }
    return undefined; // Valid password
  }

  /**
   * Form Validation Function
   * 
   * Validates all form fields and sets validation errors.
   * Returns true if form is valid, false otherwise.
   * 
   * @returns True if form is valid, false otherwise
   */
  function validateForm(): boolean {
    const errors: ValidationErrors = {};
    const emailError = validateEmail(email); // Validate email
    const passwordError = validatePassword(password); // Validate password

    // Collect all validation errors
    if (emailError) errors.email = emailError;
    if (passwordError) errors.password = passwordError;

    setValidationErrors(errors); // Update validation errors state
    return Object.keys(errors).length === 0; // Return true if no errors
  }

  /**
   * Form Submit Handler
   * 
   * Handles form submission, validates input, calls login API,
   * and navigates to dashboard on success.
   * 
   * @param e - Form submit event
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); // Prevent default form submission
    setError(""); // Clear previous errors
    
    // Validate form before submission
    if (!validateForm()) {
      return; // Stop if validation fails
    }

    setLoading(true); // Show loading state

    try {
      // Call login API endpoint
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }), // Send credentials
      });

      const data = await res.json();

      if (res.ok) {
        // Login successful, navigate to dashboard
        router.push("/dashboard");
        router.refresh(); // Refresh router state
      } else {
        // Login failed, show error message
        setError(data.error || "Login failed");
      }
    } catch (e: unknown) {
      // Network error or other exception
      const error = e instanceof Error ? e : new Error("Network error");
      setError("Network error. Please try again.");
    } finally {
      setLoading(false); // Always stop loading
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center p-4">
      <div className="bg-gray-900/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500 border border-gray-800/50">
        <div className="text-center mb-6">
          <div className="inline-block mb-1">
            <Image
              src="/kandco-symbol.png"
              alt="Company Logo"
              width={120}
              height={120}
              className="object-contain mx-auto"
              priority
            />
          </div>
          <h1 className="text-2xl font-semibold text-white mb-1 tracking-tight">
            K&Co FinOps Portal
          </h1>
          <p className="text-gray-400 text-xs font-medium">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-200 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (validationErrors.email) {
                    const error = validateEmail(e.target.value);
                    setValidationErrors((prev) => ({ ...prev, email: error }));
                  }
                }}
                onBlur={() => {
                  const error = validateEmail(email);
                  setValidationErrors((prev) => ({ ...prev, email: error }));
                }}
                className={`w-full border rounded-lg px-3 py-2.5 pl-9 text-sm text-white placeholder:text-gray-500 bg-gray-800/50 hover:border-gray-600 focus:outline-none focus:ring-2 transition-all ${
                  validationErrors.email
                    ? "border-red-600/50 focus:ring-red-600/50 focus:border-red-600/50"
                    : "border-gray-700/50 focus:ring-blue-600/50 focus:border-blue-600/50"
                }`}
                required
                placeholder="admin@kco.dev"
                disabled={loading}
                aria-invalid={!!validationErrors.email}
                aria-describedby={validationErrors.email ? "email-error" : undefined}
              />
              {validationErrors.email && (
                <p id="email-error" className="mt-1 text-xs text-red-400" role="alert">
                  {validationErrors.email}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-200 mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (validationErrors.password) {
                    const error = validatePassword(e.target.value);
                    setValidationErrors((prev) => ({ ...prev, password: error }));
                  }
                }}
                onBlur={() => {
                  const error = validatePassword(password);
                  setValidationErrors((prev) => ({ ...prev, password: error }));
                }}
                className={`w-full border rounded-lg px-3 py-2.5 pl-9 pr-9 text-sm text-white placeholder:text-gray-500 bg-gray-800/50 hover:border-gray-600 focus:outline-none focus:ring-2 transition-all ${
                  validationErrors.password
                    ? "border-red-600/50 focus:ring-red-600/50 focus:border-red-600/50"
                    : "border-gray-700/50 focus:ring-blue-600/50 focus:border-blue-600/50"
                }`}
                required
                placeholder="Enter your password"
                disabled={loading}
                aria-invalid={!!validationErrors.password}
                aria-describedby={validationErrors.password ? "password-error" : undefined}
              />
              {validationErrors.password && (
                <p id="password-error" className="mt-1 text-xs text-red-400" role="alert">
                  {validationErrors.password}
                </p>
              )}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-950/40 border border-red-800/50 text-red-300 rounded-lg text-xs animate-in slide-in-from-top-2 duration-300 flex items-start gap-2">
              <svg className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="flex-1 text-xs">{error}</span>
              <button
                onClick={() => setError("")}
                className="text-red-400 hover:text-red-300 transition-colors flex-shrink-0"
                type="button"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white py-2.5 rounded-lg transition-all duration-200 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl disabled:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 focus:ring-offset-gray-900 relative overflow-hidden group"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>Signing in...</span>
              </span>
            ) : (
              <span className="relative z-10">Sign In</span>
            )}
            <span className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>
          </button>
        </form>

        <div className="mt-5 pt-5 border-t border-gray-800/50">
          <p className="text-xs text-gray-400 text-center mb-2.5 font-semibold uppercase tracking-wider">Test Accounts</p>
          <div className="space-y-1.5">
            {[
              { role: "Admin", email: "admin@kco.dev", bgColor: "bg-red-600/10 hover:bg-red-600/20", borderColor: "border-red-600/30", textColor: "text-red-400" },
              { role: "Analyst", email: "analyst@kco.dev", bgColor: "bg-blue-600/10 hover:bg-blue-600/20", borderColor: "border-blue-600/30", textColor: "text-blue-400" },
              { role: "Viewer", email: "viewer@kco.dev", bgColor: "bg-green-600/10 hover:bg-green-600/20", borderColor: "border-green-600/30", textColor: "text-green-400" },
            ].map((account) => (
              <button
                key={account.role}
                type="button"
                onClick={() => {
                  setEmail(account.email);
                  setPassword("Passw0rd!");
                }}
                className={`w-full p-2 rounded-lg border ${account.bgColor} ${account.borderColor} ${account.textColor} text-xs font-medium transition-all duration-200`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs">{account.role}</span>
                  <span className="opacity-80 text-xs">{account.email}</span>
                </div>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 text-center mt-2.5">
            Password: <code className="bg-gray-800/50 text-gray-300 px-1.5 py-0.5 rounded border border-gray-700/50 text-xs font-mono">Passw0rd!</code>
          </p>
        </div>
      </div>
    </div>
  );
}
