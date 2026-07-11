import React from "react";

/**
 * Shown when Logto sign-in succeeded but the account is not linked to an HMS user yet.
 */
export default function LogtoAccountPendingPage({ user, onLogout, onRetry }) {
  const logtoSub = user?.logtoSub || "—";

  return (
    <div className="auth bg-base d-flex flex-wrap min-vh-100">
      <div className="auth-right py-32 px-24 d-flex flex-column justify-content-center w-100">
        <div className="max-w-560-px mx-auto w-100 text-center">
          <img src="/images/logo.png" alt="DiziDental" className="mb-32 max-w-200-px" />
          <h4 className="mb-12">Account setup pending</h4>
          <p className="text-secondary-light mb-24">
            You signed in with Logto successfully, but this account is not linked to a
            DiziDental HMS profile yet. An administrator must link your Logto user to an
            existing mobile number and role.
          </p>

          <div className="p-16 radius-12 bg-neutral-50 text-start mb-24">
            <p className="mb-8">
              <strong>Logto user ID:</strong>{" "}
              <code className="text-sm">{user?.logtoSub || logtoSub}</code>
            </p>
            <p className="mb-0 text-sm text-secondary-light">
              Admin API:{" "}
              <code>POST /api/admin/logto/users/link?logtoUserId=…&amp;mobile=…&amp;role=…</code>
            </p>
          </div>

          <div className="d-flex gap-12 justify-content-center flex-wrap">
            <button type="button" className="btn btn-primary" onClick={onRetry}>
              Check again
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={onLogout}>
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
