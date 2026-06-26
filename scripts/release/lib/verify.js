"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { findFiles } = require("./fs");
const {
  CODEXPRO_BASH_MODE,
  CODEXPRO_FULL_TOOL_NAMES,
  CODEXPRO_TOOL_MODE,
  CODEXPRO_WRITE_MODE,
  isOmoCompatibleCodexProConfig,
} = require("./codexpro");
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
  if (Array.isArray(module.applicabilityMatchers) && module.applicabilityMatchers.length > 0) {
    const applicable = files.some((file) => module.applicabilityMatchers.some((matcher) => matcher.test(file.relative)));
    if (!applicable) return true;
  }
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

function collectVerification(workspaceRoot, options = {}) {
  const requireCodexPro = options.requireCodexPro !== false;
  const files = scanWorkspace(workspaceRoot);
  const evilLayerPresent =
    evilModules.every((module) => verifyModuleMarker(files, module)) ||
    detectEvilBase(files);
  const installerTargetCheck = hasPattern(files, (file) => /install-local|update|uninstall/i.test(file.contents));
  const codexproManifestPath = path.join(workspaceRoot, ".reasonix-codexpro.json");
  const codexproMcpPath = path.join(workspaceRoot, ".mcp.json");
  const codexproGuidePath = path.join(workspaceRoot, "docs", "codexpro-ohmyopenagent.md");

  let codexproManifest = null;
  let codexproMcp = null;
  try {
    if (fs.existsSync(codexproManifestPath)) codexproManifest = JSON.parse(fs.readFileSync(codexproManifestPath, "utf8"));
  } catch {
    codexproManifest = null;
  }
  try {
    if (fs.existsSync(codexproMcpPath)) codexproMcp = JSON.parse(fs.readFileSync(codexproMcpPath, "utf8"));
  } catch {
    codexproMcp = null;
  }

  const results = {
    evilLayerPresent,
    installerTargetCheck,
    codexproManifestPresent: requireCodexPro ? Boolean(codexproManifest) : true,
    codexproMcpPresent: requireCodexPro ? Boolean(codexproMcp) : true,
    codexproGuidePresent: requireCodexPro ? fs.existsSync(codexproGuidePath) : true,
    codexproToolModeCheck: requireCodexPro ? codexproManifest?.toolMode === CODEXPRO_TOOL_MODE : true,
    codexproWriteModeCheck: requireCodexPro ? codexproManifest?.writeMode === CODEXPRO_WRITE_MODE : true,
    codexproBashModeCheck: requireCodexPro ? codexproManifest?.bashMode === CODEXPRO_BASH_MODE : true,
    codexproToolCatalogCheck: requireCodexPro
      ? Array.isArray(codexproManifest?.expectedTools) &&
        codexproManifest.expectedTools.join(",") === CODEXPRO_FULL_TOOL_NAMES.join(",")
      : true,
    codexproOmoCompatibilityCheck: requireCodexPro ? isOmoCompatibleCodexProConfig(codexproMcp) : true,
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
