/**
 * Prints the OAuth resources/scopes sent at sign-in (for debugging).
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(resolve(root, "frontend/.env"), "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    })
);

const apiResource = env.VITE_LOGTO_API_RESOURCE;
const orgEnabled = env.VITE_LOGTO_ORG_ENABLED === "true";

const signInScopes = [
  "profile",
  "email",
  "phone",
  "roles",
  "read:profile",
  "write:profile",
  ...(orgEnabled ? ["urn:logto:scope:organizations", "urn:logto:scope:organization_roles"] : []),
];

const signInResources = orgEnabled ? ["urn:logto:resource:organizations"] : [];

console.log("=== Sign-in OAuth parameters ===");
console.log(
  "resources at sign-in:",
  signInResources.length ? signInResources : "(none — API token fetched after login)"
);
console.log("getAccessToken resource:", apiResource);
console.log("scopes:", signInScopes.join(", "));
