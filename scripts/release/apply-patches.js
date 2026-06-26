"use strict";

const path = require("node:path");
const { parseArgs } = require("./lib/args");
const { readJson, writeJson } = require("./lib/fs");
const { createContext } = require("./lib/patching");
const { collectEvilBaseState } = require("./lib/verify");

const reasonixModules = require("../../patches/reasonix");
const evilModules = require("../../patches/evil");

function applyModule(module, context, fallbackDir) {
  try {
    module.apply(context);
    return { name: module.name, status: "applied", fallbackUsed: false };
  } catch (error) {
    const fallbackPatchFiles = module.fallbackPatchFiles || [];
    if (fallbackPatchFiles.length === 0) {
      throw error;
    }
    for (const relativePatchFile of fallbackPatchFiles) {
      const patchPath = path.join(fallbackDir, relativePatchFile);
      context.runGitApply(patchPath);
    }
    return {
      name: module.name,
      status: "applied",
      fallbackUsed: true,
      failure: error.message
    };
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const plan = readJson(args.plan);
  const workspace = args.workspace;
  if (!workspace) throw new Error("--workspace is required");

  const context = createContext(workspace);
  const appliedModules = [];
  const fallbackDir = path.join(__dirname, "../../patches");

  if (plan.applyMinimalEvilPatch) {
    for (const module of evilModules) {
      appliedModules.push(applyModule(module, context, fallbackDir));
    }
  } else {
    const evilBaseState = collectEvilBaseState(workspace);
    if (!evilBaseState.hasEvilSignals && !evilBaseState.hasEvilMarkers) {
      throw new Error(
        "Evil base check failed: source resolution selected evil-source but the workspace does not appear to contain the evil-opencode layer",
      );
    }
  }
  for (const module of reasonixModules) {
    appliedModules.push(applyModule(module, context, fallbackDir));
  }

  writeJson(path.join(workspace, ".reasonix-patch-log.json"), {
    appliedAt: new Date().toISOString(),
    patches: context.patchLog,
    modules: appliedModules
  });
}

main();
