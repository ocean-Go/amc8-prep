import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const SCRIPT = resolve(import.meta.dirname, "../check-public-release.mjs");
const FLAGS = {
  AMC8_RELEASE_SECRETS_ROTATED: "yes",
  AMC8_RELEASE_AUTH_VERIFIED: "yes",
  AMC8_RELEASE_CONTENT_QA_VERIFIED: "yes",
};

function fixture(fn) {
  const dir = mkdtempSync(join(tmpdir(), "amc8-release-check-"));
  try {
    const init = spawnSync("git", ["init", "-q"], { cwd: dir, encoding: "utf8" });
    assert.equal(init.status, 0, init.stderr);
    writeFileSync(join(dir, "README.md"), "safe fixture\n");
    spawnSync("git", ["add", "README.md"], { cwd: dir });
    fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function run(dir, env = {}) {
  return spawnSync(process.execPath, [SCRIPT], {
    cwd: dir,
    encoding: "utf8",
    env: { ...process.env, AMC8_RELEASE_SECRETS_ROTATED: "", AMC8_RELEASE_AUTH_VERIFIED: "",
      AMC8_RELEASE_CONTENT_QA_VERIFIED: "", ...env },
  });
}

test("blocks a tracked local environment file even with manual approvals", () => {
  fixture((dir) => {
    writeFileSync(join(dir, ".env.local"), "PLACEHOLDER_TEST_ONLY=not-a-credential\n");
    const add = spawnSync("git", ["add", "-f", ".env.local"], { cwd: dir, encoding: "utf8" });
    assert.equal(add.status, 0, add.stderr);
    const result = run(dir, FLAGS);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /tracked local environment/i);
  });
});

test("fails closed until all three manual production release gates are approved", () => {
  fixture((dir) => {
    const result = run(dir, { AMC8_RELEASE_SECRETS_ROTATED: "yes" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /AUTH_VERIFIED/);
    assert.match(result.stderr, /CONTENT_QA_VERIFIED/);
  });
});

test("passes clean git tree when all explicit release gates are attested", () => {
  fixture((dir) => {
    const result = run(dir, FLAGS);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /release gate passed/i);
  });
});
