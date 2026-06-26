"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { collectVerification } = require("./lib/verify");

test("collectVerification fails when required markers are missing", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "reasonix-verify-"));
  fs.writeFileSync(path.join(root, "bin.js"), "export const installCommand = 'update';\n");
  const verification = collectVerification(root);
  assert.equal(verification.ok, false);
  assert.equal(verification.results.REASONIX_STABLE_PREFIX_MARKER, false);
  assert.equal(verification.results.codexproManifestPresent, false);
  assert.equal(verification.results.codexproOmoCompatibilityCheck, false);
});
