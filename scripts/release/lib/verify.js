"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { findFiles } = require("./fs");
const evilModules = require("../../../patches/evil");
const reasonixModules = require("../../../patches/reasonix");

function scanWorkspace(workspaceRoot) {
  return findFiles(workspaceRoot, (filePath) => /\.(cjs|js|json|jsx|mjs|mts|ts|tsx)$/.test(filePath)).map((filePath) => ({
    path: filePath,
    relative: path.relative(workspaceRoot, filePath),
    contents: fs.readFileSync(filePath, "utf8")
  }));
}

function hasPattern(files, predicate) {
  return files.some(predicate);
}

function verifyModuleMarker(files, module) {
  return hasPattern(files, (file) => new RegExp(module.marker).test(file.contents));
}

function detectEvilBase(files) {
  return hasPattern(
    files,
    (file) => /evil-opencode|unguarded|lazycodex|oh-my-opencode/i.test(file.contents),
  );
}

function collectEvilBaseState(workspaceRoot) {
  const files = scanWorkspace(workspaceRoot);
  return {
    hasEvilMarkers: evilModules.every((module) => verifyModuleMarker(files, module)),
    hasEvilSignals: detectEvilBase(files),
  };
}

function collectVerification(workspaceRoot) {
  const files = scanWorkspace(workspaceRoot);
  const evilLayerPresent =
    evilModules.every((module) => verifyModuleMarker(files, module)) ||
    detectEvilBase(files);
  const installerTargetCheck = hasPattern(files, (file) => /install-local|update|uninstall/i.test(file.contents));

  const results = {
    evilLayerPresent,
    installerTargetCheck
  };

  for (const module of reasonixModules) {
    results[module.marker] = verifyModuleMarker(files, module);
  }

  return {
    ok: Object.values(results).every(Boolean),
    results
  };
}

module.exports = { collectEvilBaseState, collectVerification };
