"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { parseArgs } = require("./lib/args");
const { readJson, writeJson, writeText } = require("./lib/fs");
const {
  CODEXPRO_BASH_MODE,
  CODEXPRO_TOOL_MODE,
  CODEXPRO_WRITE_MODE,
  buildCodexProGuide,
  buildCodexProManifest,
  mergeCodexProMcpConfig,
} = require("./lib/codexpro");

function readJsonIfPresent(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const workspace = args.workspace;
  if (!workspace) throw new Error("--workspace is required");

  const plan = args.plan ? readJson(args.plan) : {};
  const codexpro = {
    toolMode: plan.codexpro?.toolMode || CODEXPRO_TOOL_MODE,
    writeMode: plan.codexpro?.writeMode || CODEXPRO_WRITE_MODE,
    bashMode: plan.codexpro?.bashMode || CODEXPRO_BASH_MODE,
  };

  const mcpPath = path.join(workspace, ".mcp.json");
  const merged = mergeCodexProMcpConfig(readJsonIfPresent(mcpPath), codexpro);
  writeJson(mcpPath, merged);

  writeJson(
    path.join(workspace, ".reasonix-codexpro.json"),
    buildCodexProManifest(codexpro),
  );
  writeText(
    path.join(workspace, "docs", "codexpro-ohmyopenagent.md"),
    buildCodexProGuide(codexpro),
  );
}

main();
