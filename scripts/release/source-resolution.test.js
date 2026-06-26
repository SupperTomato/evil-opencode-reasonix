"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildCandidateRefs,
  buildUpstreamCandidateRefs,
  normalizeOpenCodeVersion,
  resolveUpstreamSourceRef,
  resolveSourcePlan
} = require("./lib/source-resolution");

test("normalizeOpenCodeVersion strips evil release suffixes", () => {
  assert.equal(normalizeOpenCodeVersion("v1.17.9-unguarded"), "v1.17.9");
  assert.equal(normalizeOpenCodeVersion("1.18.0"), "v1.18.0");
});

test("buildCandidateRefs includes tag and target commitish candidates", () => {
  const refs = buildCandidateRefs("v1.17.9-unguarded", { target_commitish: "release/1.17.9" });
  assert.ok(refs.includes("v1.17.9-unguarded"));
  assert.ok(refs.includes("v1.17.9"));
  assert.ok(refs.includes("release/1.17.9"));
  assert.ok(refs.includes("refs/heads/release/1.17.9"));
});

test("buildUpstreamCandidateRefs includes plain and github-prefixed variants", () => {
  assert.deepEqual(buildUpstreamCandidateRefs("v1.17.11-unguarded"), [
    "v1.17.11",
    "refs/tags/v1.17.11",
    "github-v1.17.11",
    "refs/tags/github-v1.17.11"
  ]);
});

test("resolveUpstreamSourceRef prefers an actual upstream tag ref", () => {
  const sourceRef = resolveUpstreamSourceRef({
    evilTag: "v1.17.11-unguarded",
    upstreamRefs: ["refs/tags/v1.17.11"]
  });
  assert.equal(sourceRef, "refs/tags/v1.17.11");
});

test("resolveUpstreamSourceRef can fall back to github-prefixed upstream tags", () => {
  const sourceRef = resolveUpstreamSourceRef({
    evilTag: "v1.17.11-unguarded",
    upstreamRefs: ["refs/tags/github-v1.17.11"]
  });
  assert.equal(sourceRef, "refs/tags/github-v1.17.11");
});

test("resolveSourcePlan prefers evil source ref when present", () => {
  const plan = resolveSourcePlan({
    evilTag: "v1.17.11-unguarded",
    evilRelease: { target_commitish: "main" },
    evilRefs: ["refs/tags/v1.17.11-unguarded", "refs/heads/main"],
    upstreamRefs: ["refs/tags/v1.17.11"],
    sourceMode: "auto"
  });
  assert.equal(plan.resolution, "evil-source");
  assert.equal(plan.applyMinimalEvilPatch, false);
});

test("resolveSourcePlan falls back to upstream when evil source ref is missing", () => {
  const plan = resolveSourcePlan({
    evilTag: "v1.17.9-unguarded",
    evilRelease: { target_commitish: "main" },
    evilRefs: ["refs/heads/dev"],
    upstreamRefs: ["refs/tags/v1.17.9"],
    sourceMode: "auto"
  });
  assert.equal(plan.resolution, "upstream-fallback");
  assert.equal(plan.upstream.sourceRef, "refs/tags/v1.17.9");
  assert.equal(plan.applyMinimalEvilPatch, true);
});

test("resolveSourcePlan fails closed when fallback upstream source cannot be resolved", () => {
  assert.throws(
    () =>
      resolveSourcePlan({
        evilTag: "v1.17.9-unguarded",
        evilRelease: { target_commitish: "main" },
        evilRefs: [],
        upstreamRefs: [],
        sourceMode: "auto"
      }),
    /Could not resolve upstream OpenCode source ref/
  );
});
