"use strict";

const fs = require("node:fs");
const { githubJson, resolveGitHubToken } = require("./lib/github");
const { EVIL_REPO } = require("./lib/source-resolution");

function fsOutput(key, value) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) return;
  fs.appendFileSync(outputPath, `${key}=${value}\n`);
}

async function main() {
  const token = resolveGitHubToken();
  const overrideTag = process.env.WORKFLOW_OVERRIDE_TAG;

  const [owner, repo] = EVIL_REPO.split("/");
  const release = overrideTag
    ? { tag_name: overrideTag }
    : await githubJson(token, `/repos/${owner}/${repo}/releases/latest`);

  const targetTag = release.tag_name;
  const repository = process.env.GITHUB_REPOSITORY;
  const releases = repository
    ? await githubJson(token, `/repos/${repository}/releases?per_page=100`)
    : [];
  const expectedTag = `reasonix-${targetTag}`;
  const alreadyBuilt = releases.some((item) => item.tag_name === expectedTag);
  const shouldBuild = !alreadyBuilt;

  process.stdout.write(`should_build=${shouldBuild}\n`);
  process.stdout.write(`evil_release_tag=${targetTag}\n`);
  process.stdout.write(`::notice::latest evil-opencode tag ${targetTag}; already built=${alreadyBuilt}\n`);

  fsOutput("should_build", shouldBuild ? "true" : "false");
  fsOutput("evil_release_tag", targetTag);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
