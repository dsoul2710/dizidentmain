/**
 * Verifies local Logto + HMS config alignment (run: node scripts/verify-logto-local.mjs)
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, "frontend/.env");

function parseEnv(content) {
  const vars = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    vars[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return vars;
}

const env = parseEnv(readFileSync(envPath, "utf8"));
const apiResource = env.VITE_LOGTO_API_RESOURCE;
const apiBase = env.VITE_API_BASE?.replace(/\/+$/, "");
const logtoEndpoint = env.VITE_LOGTO_ENDPOINT?.replace(/\/+$/, "");
const appId = env.VITE_LOGTO_APP_ID;

console.log("=== Logto local config verification ===\n");
console.log("VITE_API_BASE:", apiBase);
console.log("VITE_LOGTO_API_RESOURCE:", apiResource);
console.log("VITE_LOGTO_APP_ID:", appId);
console.log("VITE_LOGTO_ENDPOINT:", logtoEndpoint);

let ok = true;

if (!apiResource) {
  console.error("FAIL: VITE_LOGTO_API_RESOURCE is missing");
  ok = false;
}

if (apiResource && apiBase && !apiResource.startsWith(apiBase)) {
  console.warn(
    "WARN: API resource identifier does not start with VITE_API_BASE (this is OK if intentional)"
  );
}

async function checkUrl(label, url) {
  try {
    const res = await fetch(url);
    console.log(`${label}: HTTP ${res.status}`);
    return res.ok;
  } catch (e) {
    console.error(`${label}: unreachable (${e.message})`);
    return false;
  }
}

const oidcOk = await checkUrl(
  "Logto OIDC discovery",
  `${logtoEndpoint}/oidc/.well-known/openid-configuration`
);
const healthOk = await checkUrl("Backend health", `${apiBase}/actuator/health`);

let meStatus = 0;
try {
  const meRes = await fetch(`${apiBase}/api/auth/me`);
  meStatus = meRes.status;
  console.log(`/api/auth/me (no token): HTTP ${meStatus}`);
  if (meStatus !== 401) {
    console.error("FAIL: expected 401 without Bearer token");
    ok = false;
  }
} catch (e) {
  console.error(`/api/auth/me: unreachable (${e.message})`);
  ok = false;
}

console.log("\n=== Logto Console checklist ===");
console.log(`1. API resources → Create → identifier: ${apiResource}`);
console.log("2. Mark as Default API");
console.log("3. SPA redirect URI: http://localhost:5173/callback");
console.log(`4. SPA App ID matches: ${appId}`);

console.log("\n=== Result ===");
if (ok && oidcOk && healthOk && meStatus === 401) {
  console.log("PASS — config aligned; create API resource in Logto if sign-in fails with invalid_target");
  process.exit(0);
} else {
  console.log("FAIL — fix issues above before testing sign-in");
  process.exit(1);
}
