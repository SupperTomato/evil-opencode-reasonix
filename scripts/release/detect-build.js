"use strict";

const { parseArgs } = require("./lib/args");
const { writeJson } = require("./lib/fs");
const { detectBuildPlan } = require("./detect-build.testable");

function main() {
  const args = parseArgs(process.argv.slice(2));
  const workspace = args.workspace;
  const output = args.output;
  if (!workspace || !output) throw new Error("--workspace and --output are required");
  writeJson(output, detectBuildPlan(workspace));
}

main();
