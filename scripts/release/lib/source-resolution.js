"use strict";

const EVIL_REPO = "winmin/evil-opencode";
const UPSTREAM_REPO = "anomalyco/opencode";

function normalizeOpenCodeVersion(tag) {
  const cleaned = tag.trim();
  const match = cleaned.match(/^(v?\d+\.\d+\.\d+)/);
  if (!match) throw new Error(`Could not derive upstream OpenCode version from tag: ${tag}`);
  return match[1].startsWith("v") ? match[1] : `v${match[1]}`;
}

function buildUpstreamCandidateRefs(tag) {
  const normalized = normalizeOpenCodeVersion(tag);
  const alternate = `github-${normalized}`;
  return [
    normalized,
    `refs/tags/${normalized}`,
    alternate,
    `refs/tags/${alternate}`
  ];
}

function buildCandidateRefs(tag, release) {
  const normalized = normalizeOpenCodeVersion(tag);
  const candidates = new Set([tag, normalized, `refs/tags/${tag}`, `refs/tags/${normalized}`]);
  if (release && typeof release.target_commitish === "string" && release.target_commitish) {
    candidates.add(release.target_commitish);
    candidates.add(`refs/heads/${release.target_commitish}`);
  }
  return [...candidates];
}

function resolveUpstreamSourceRef({ evilTag, upstreamRefs }) {
  const candidates = buildUpstreamCandidateRefs(evilTag);
  if (!Array.isArray(upstreamRefs)) {
    return normalizeOpenCodeVersion(evilTag);
  }

  const matchedRef = candidates.find((candidate) => upstreamRefs.includes(candidate));
  if (!matchedRef) {
    throw new Error(
      `Could not resolve upstream OpenCode source ref for ${evilTag}; checked candidates: ${candidates.join(", ")}`
    );
  }
  return matchedRef;
}

function resolveSourcePlan({ evilTag, evilRelease, evilRefs, upstreamRefs, sourceMode }) {
  const upstreamTag = resolveUpstreamSourceRef({ evilTag, upstreamRefs });
  const candidates = buildCandidateRefs(evilTag, evilRelease);
  const matchedRef = candidates.find((candidate) => evilRefs.includes(candidate));
  const forceFallback = sourceMode === "force-upstream-fallback";
  const preferEvil = sourceMode !== "force-upstream-fallback";
  const useEvilSource = Boolean(matchedRef && preferEvil);

  return {
    evilReleaseTag: evilTag,
    upstreamTag,
    sourceMode,
    resolution: useEvilSource ? "evil-source" : "upstream-fallback",
    evil: {
      repo: EVIL_REPO,
      releaseTag: evilTag,
      releaseTarget: evilRelease ? evilRelease.target_commitish : null,
      sourceRef: useEvilSource ? matchedRef : null,
      candidateRefs: candidates
    },
    upstream: {
      repo: UPSTREAM_REPO,
      sourceRef: upstreamTag
    },
    applyMinimalEvilPatch: forceFallback || !useEvilSource
  };
}

module.exports = {
  EVIL_REPO,
  UPSTREAM_REPO,
  buildCandidateRefs,
  buildUpstreamCandidateRefs,
  normalizeOpenCodeVersion,
  resolveUpstreamSourceRef,
  resolveSourcePlan
};
