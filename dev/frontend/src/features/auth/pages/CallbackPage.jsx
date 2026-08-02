import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useHandleSignInCallback } from "@logto/react";
import { LOGTO_API_RESOURCE, LOGTO_ENABLED } from "@/config/logto";

function getOAuthErrorHelp(error, description) {
  if (error !== "invalid_target") {
    return null;
  }

  return (
    <div className="text-start max-w-560-px mx-auto mt-16 p-16 radius-12 bg-neutral-50">
      <p className="mb-8">
        <strong>Logto Console checklist</strong>
      </p>
      <ol className="mb-8 ps-20">
        <li>
          API identifier must be exactly: <code>{LOGTO_API_RESOURCE}</code>
        </li>
        <li>Delete any duplicate API resource with a wrong identifier</li>
        <li>Mark the correct one as <strong>Default API</strong></li>
        <li>Permissions: <code>read:profile</code>, <code>write:profile</code></li>
        <li>SPA CORS: match your frontend origin</li>
        <li>Clear browser site data and retry</li>
      </ol>
      {description && (
        <p className="text-secondary-light text-sm mb-0">{description}</p>
      )}
    </div>
  );
}

function LogtoCallbackHandler() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlError = searchParams.get("error");
  const urlErrorDescription = searchParams.get("error_description");

  const { isLoading, error } = useHandleSignInCallback(() => {
    navigate("/", { replace: true });
  });

  const oauthError = urlError || error?.error;
  const oauthDescription =
    urlErrorDescription || error?.error_description || error?.message;

  if (oauthError || error) {
    const help = getOAuthErrorHelp(oauthError, oauthDescription);

    return (
      <div className="p-32 text-center">
        <h4>Sign-in failed</h4>
        {help || (
          <p className="text-secondary-light">{oauthDescription || "Unknown error"}</p>
        )}
        <button type="button" className="btn btn-primary mt-16" onClick={() => navigate("/login")}>
          Back to login
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-32 text-center">
        <p>Completing sign-in…</p>
      </div>
    );
  }

  return null;
}

export default function CallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!LOGTO_ENABLED) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  if (!LOGTO_ENABLED) {
    return null;
  }

  return <LogtoCallbackHandler />;
}
