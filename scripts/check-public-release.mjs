#!/usr/bin/env node
/**
 * Fail-closed PRE-FLIGHT gate for production publication.
 * A successful run only attests to explicit operator approvals; it does not
 * prove tokens were rotated, repository history purged, or app auth is safe.
 */
import { spawnSync } from "node:child_process";

const approvals = [
  "AMC8_RELEASE_SECRETS_ROTATED",
  "AMC8_RELEASE_AUTH_VERIFIED",
  "AMC8_RELEASE_CONTENT_QA_VERIFIED",
];

const tracked = spawnSync("git", ["ls-files", "-z"], {
  cwd: process.cwd(),
  encoding: "utf8",
});
if (tracked.error || tracked.status !== 0) {
  console.error("Release gate blocked: cannot check tracked repository paths.");
  process.exitCode = 1;
} else {
  const paths = tracked.stdout.split("\0").filter(Boolean);
  const exposed = paths.filter((file) =>
    /(^|\/)\.env(?:\.[^/]*)?\.local$|(^|\/)\.env$|(^|\/)\.env\.production$/.test(file),
  );
  if (exposed.length) {
    console.error("Release gate blocked: tracked local environment or secrets file detected.");
    for (const file of exposed) console.error(`  path: ${file}`);
    process.exitCode = 1;
  }
  const missing = approvals.filter((key) => process.env[key] !== "yes");
  if (missing.length) {
    console.error(`Release gate blocked: missing operator attestation: ${missing.join(", ")}`);
    process.exitCode = 1;
  }
  if (!process.exitCode) {
    console.log("Release gate passed (operator attestations supplied; review external security checks).");
  }
}
