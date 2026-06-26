"use strict";

const path = require("node:path");
const { parseArgs } = require("./lib/args");
const { readJson, writeJson } = require("./lib/fs");
const { collectVerification } = require("./lib/verify");

function main() {
  const args = parseArgs(process.argv.slice(2));
  const workspace = args.workspace;
  if (!workspace) throw new Error("--workspace is required");

  const verification = collectVerification(workspace);
  writeJson(path.join(workspace, ".reasonix-verification.json"), verification);
  if (!verification.ok) throw new Error(`Verification failed: ${JSON.stringify(verification.results)}`);

  if (args.plan) {
    const plan = readJson(args.plan);
    console.log(`verified ${plan.evilReleaseTag} using ${plan.resolution}`);
  }
}

main();
