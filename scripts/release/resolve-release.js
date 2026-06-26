"use strict";

const { parseArgs } = require("./lib/args");
const { writeJson } = require("./lib/fs");
const { githubJson, resolveGitHubToken } = require("./lib/github");
const {
  EVIL_REPO,
  UPSTREAM_REPO,
  normalizeOpenCodeVersion,
  resolveSourcePlan
} = require("./lib/source-resolution");

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const evilTag = args["evil-tag"];
  const sourceMode = args["source-mode"] || "auto";
  const output = args.output;
  if (!evilTag || !output) throw new Error("--evil-tag and --output are required");

  const token = resolveGitHubToken();

  const [owner, repo] = EVIL_REPO.split("/");
  const [upstreamOwner, upstreamRepo] = UPSTREAM_REPO.split("/");
  const upstreamVersion = normalizeOpenCodeVersion(evilTag);
  const [release, tags, branches, upstreamTags, upstreamGithubTags] = await Promise.all([
    githubJson(token, `/repos/${owner}/${repo}/releases/tags/${encodeURIComponent(evilTag)}`),
    githubJson(token, `/repos/${owner}/${repo}/git/matching-refs/tags/`),
    githubJson(token, `/repos/${owner}/${repo}/git/matching-refs/heads/`),
    githubJson(token, `/repos/${upstreamOwner}/${upstreamRepo}/git/matching-refs/tags/${encodeURIComponent(upstreamVersion)}`),
    githubJson(token, `/repos/${upstreamOwner}/${upstreamRepo}/git/matching-refs/tags/${encodeURIComponent(`github-${upstreamVersion}`)}`)
  ]);

  const evilRefs = [...tags, ...branches].map((entry) => entry.ref);
  const upstreamRefs = [...upstreamTags, ...upstreamGithubTags].map((entry) => entry.ref);
  const plan = resolveSourcePlan({ evilTag, evilRelease: release, evilRefs, upstreamRefs, sourceMode });
  writeJson(output, plan);
  console.log(JSON.stringify(plan, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
