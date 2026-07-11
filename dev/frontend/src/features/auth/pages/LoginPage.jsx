import React, { useState } from "react";
import { useLogto } from "@logto/react";
import api from "@/api/client";
import {
  LOGTO_CALLBACK_URI,
  LOGTO_ENABLED,
  LEGACY_AUTH_ENABLED,
} from "@/config/logto";
import { useAuthSession } from "@/features/auth/context/AuthSessionProvider";

export default function LoginPage() {
  const { signIn, isAuthenticated } = useLogto();
  const { loginLegacy, user } = useAuthSession();
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (user || isAuthenticated) {
    return null;
  }

  const handleLegacySubmit = async (e) => {
    e.preventDefault();
    if (!mobile || !password) {
      alert("Please enter mobile and password");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/login", { mobile, password });
      loginLegacy(res.data);
    } catch (err) {
      console.error(err);
      alert("Login failed. Please check mobile/password.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogtoSignIn = () => {
    signIn(LOGTO_CALLBACK_URI);
  };

  return (
    <section className="auth bg-base d-flex flex-wrap">
      <div className="auth-left d-lg-block d-none">
        <div className="d-flex align-items-center flex-column h-100 justify-content-center">
          <img src="/images/auth/auth-img.png" alt="Clinic login" />
        </div>
      </div>
      <div className="auth-right py-32 px-24 d-flex flex-column justify-content-center">
        <div className="max-w-464-px mx-auto w-100">
          <div>
            <a href="/" className="mb-40 max-w-290-px d-inline-block">
              <img src="/images/logo.png" alt="Clinic Dashboard" />
            </a>
            <h4 className="mb-12">Sign In to your Account</h4>
            <p className="mb-32 text-secondary-light text-lg">
              Welcome back! Sign in with Logto or use legacy credentials.
            </p>
          </div>

          {LOGTO_ENABLED && (
            <>
              <button
                type="button"
                className="btn btn-primary text-sm btn-sm px-12 py-16 w-100 radius-12"
                onClick={handleLogtoSignIn}
              >
                Sign in with Logto
              </button>
              {LEGACY_AUTH_ENABLED && (
                <p className="text-center text-secondary-light my-16 text-sm">or continue with mobile</p>
              )}
            </>
          )}

          {LEGACY_AUTH_ENABLED && (
            <form onSubmit={handleLegacySubmit}>
              <div className="icon-field mb-16">
                <span className="icon top-50 translate-middle-y">
                  <i className="ri-smartphone-line"></i>
                </span>
                <input
                  type="text"
                  className="form-control h-56-px bg-neutral-50 radius-12"
                  placeholder="Mobile number"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  required={!LOGTO_ENABLED}
                />
              </div>
              <div className="position-relative mb-20">
                <div className="icon-field">
                  <span className="icon top-50 translate-middle-y">
                    <i className="ri-lock-2-line"></i>
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="form-control h-56-px bg-neutral-50 radius-12"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={!LOGTO_ENABLED}
                  />
                </div>
                <button
                  type="button"
                  className="toggle-password ri-eye-line cursor-pointer position-absolute end-0 top-50 translate-middle-y me-16 text-secondary-light"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                ></button>
              </div>

              <button
                type="submit"
                className="btn btn-outline-primary text-sm btn-sm px-12 py-16 w-100 radius-12 mt-16"
                disabled={loading}
              >
                {loading ? "Logging in..." : "Legacy Sign In"}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
