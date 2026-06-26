"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { readJson } = require("./lib/fs");

function detectPackageManager(workspace) {
  if (fs.existsSync(path.join(workspace, "bun.lock")) || fs.existsSync(path.join(workspace, "bun.lockb"))) return "bun";
  if (fs.existsSync(path.join(workspace, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(workspace, "yarn.lock"))) return "yarn";
  return "npm";
}

function parsePackageManagerVersion(packageManagerField, manager) {
  if (typeof packageManagerField !== "string") return null;
  const prefix = `${manager}@`;
  if (!packageManagerField.startsWith(prefix)) return null;
  return packageManagerField.slice(prefix.length) || null;
}

function commandRunner(packageManager) {
  return packageManager === "bun" ? "bun" : packageManager;
}

function buildScriptCommand(packageManager, script, cwdRelative) {
  const runner = commandRunner(packageManager);
  if (packageManager === "bun" && cwdRelative) return [runner, "run", "--cwd", cwdRelative, script];
  return [runner, "run", script];
}

function detectBuildPlan(workspace) {
  const packageJson = readJson(path.join(workspace, "package.json"));
  const scripts = packageJson.scripts || {};
  const packageManager = detectPackageManager(workspace);
  const packageManagerVersion = parsePackageManagerVersion(packageJson.packageManager, packageManager);
  const install = packageManager === "bun"
    ? ["bun", "install", "--frozen-lockfile"]
    : packageManager === "pnpm"
      ? ["pnpm", "install", "--frozen-lockfile"]
      : packageManager === "yarn"
      ? ["yarn", "install", "--immutable"]
        : ["npm", "ci"];
  let build = scripts.build ? buildScriptCommand(packageManager, "build") : null;
  let test = scripts.test ? buildScriptCommand(packageManager, "test") : null;

  if (!build) {
    const opencodePackagePath = path.join(workspace, "packages", "opencode", "package.json");
    if (fs.existsSync(opencodePackagePath)) {
      const opencodePackageJson = readJson(opencodePackagePath);
      const opencodeScripts = opencodePackageJson.scripts || {};
      if (opencodeScripts.build) build = buildScriptCommand(packageManager, "build", "packages/opencode");
      if (opencodeScripts.typecheck) {
        test = buildScriptCommand(packageManager, "typecheck", "packages/opencode");
      } else if (opencodeScripts.test) {
        test = buildScriptCommand(packageManager, "test", "packages/opencode");
      }
    }
  }

  if (!build) throw new Error("Could not detect a build command from package.json scripts");
  return { packageManager, packageManagerVersion, install, build, test };
}

module.exports = { detectBuildPlan };
