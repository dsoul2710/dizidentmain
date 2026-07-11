/**
 * Pluggable access-token provider set by AuthSessionProvider (Logto).
 */
let tokenProvider = null;

export function setLogtoTokenProvider(fn) {
  tokenProvider = fn;
}

export async function getLogtoAccessToken() {
  if (!tokenProvider) {
    return null;
  }
  try {
    return await tokenProvider();
  } catch (err) {
    console.warn("Failed to get Logto access token", err);
    return null;
  }
}
