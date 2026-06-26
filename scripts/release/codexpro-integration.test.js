"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const {
  CODEXPRO_FULL_TOOL_NAMES,
  isOmoCompatibleCodexProConfig,
} = require("./lib/codexpro");

const repoRoot = path.resolve(__dirname, "..", "..");

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

test("integrate-codexpro writes OMO-compatible MCP config, manifest, and docs", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "reasonix-codexpro-"));
  const workspace = path.join(root, "workspace");
  const planPath = path.join(root, "plan.json");

  fs.mkdirSync(workspace, { recursive: true });
  writeJson(planPath, {
    codexpro: {
      version: "0.28.5",
      toolMode: "full",
      writeMode: "handoff",
      bashMode: "off",
    },
  });

  execFileSync(
    "node",
    [path.join(repoRoot, "scripts", "release", "integrate-codexpro.js"), "--plan", planPath, "--workspace", workspace],
    { stdio: "pipe" },
  );

  const mcp = JSON.parse(fs.readFileSync(path.join(workspace, ".mcp.json"), "utf8"));
  const manifest = JSON.parse(fs.readFileSync(path.join(workspace, ".reasonix-codexpro.json"), "utf8"));
  const guide = fs.readFileSync(path.join(workspace, "docs", "codexpro-ohmyopenagent.md"), "utf8");

  assert.equal(isOmoCompatibleCodexProConfig(mcp), true);
  assert.equal(manifest.toolMode, "full");
  assert.equal(manifest.writeMode, "handoff");
  assert.equal(manifest.bashMode, "off");
  assert.deepEqual(manifest.expectedTools, CODEXPRO_FULL_TOOL_NAMES);
  assert.match(guide, /codex_context/);
  assert.match(guide, /oh-my-openagent/);
});

test("integrate-codexpro preserves existing MCP servers while adding codexpro", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "reasonix-codexpro-merge-"));
  const workspace = path.join(root, "workspace");

  fs.mkdirSync(workspace, { recursive: true });
  writeJson(path.join(workspace, ".mcp.json"), {
    mcpServers: {
      existing: {
        type: "stdio",
        command: "existing-server",
        args: ["--flag"],
      },
    },
  });

  execFileSync(
    "node",
    [path.join(repoRoot, "scripts", "release", "integrate-codexpro.js"), "--workspace", workspace],
    { stdio: "pipe" },
  );

  const mcp = JSON.parse(fs.readFileSync(path.join(workspace, ".mcp.json"), "utf8"));
  assert.equal(mcp.mcpServers.existing.command, "existing-server");
  assert.equal(mcp.mcpServers.codexpro.command, "codexpro-mcp");
});
