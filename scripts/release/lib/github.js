"use strict";

const { execFileSync } = require("node:child_process");

function resolveGitHubToken() {
  const envToken = process.env.GITHUB_TOKEN;
  if (envToken) return envToken;

  try {
    const token = execFileSync("gh", ["auth", "token"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim();
    if (token) return token;
  } catch (error) {
    // Fall through to the explicit error below so callers get a stable message.
  }

  throw new Error("GitHub authentication is required; set GITHUB_TOKEN or authenticate with `gh auth login`");
}

async function githubJson(token, apiPath) {
  const response = await fetch(`https://api.github.com${apiPath}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "evil-opencode-reasonix-pipeline"
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API ${apiPath} failed: ${response.status} ${text}`);
  }

  return response.json();
}

module.exports = { githubJson, resolveGitHubToken };
