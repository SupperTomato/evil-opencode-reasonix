"use strict";

const CODEXPRO_VERSION = "0.28.5";
const CODEXPRO_TOOL_MODE = "full";
const CODEXPRO_WRITE_MODE = "handoff";
const CODEXPRO_BASH_MODE = "off";

const CODEXPRO_FULL_TOOL_NAMES = [
  "server_config",
  "codexpro_self_test",
  "codexpro_inventory",
  "load_skill",
  "list_workspaces",
  "open_current_workspace",
  "open_workspace",
  "workspace_snapshot",
  "tree",
  "search",
  "read",
  "write",
  "edit",
  "bash",
  "git_status",
  "git_diff",
  "show_changes",
  "read_handoff",
  "codex_context",
  "export_pro_context",
  "handoff_to_agent",
  "handoff_to_codex",
];

function buildCodexProMcpConfig(options = {}) {
  const toolMode = options.toolMode || CODEXPRO_TOOL_MODE;
  const writeMode = options.writeMode || CODEXPRO_WRITE_MODE;
  const bashMode = options.bashMode || CODEXPRO_BASH_MODE;
  const root = options.root || ".";
  const allowRoot = options.allowRoot || ".";

  return {
    mcpServers: {
      codexpro: {
        type: "stdio",
        command: "codexpro-mcp",
        args: [
          "--root",
          root,
          "--allow-root",
          allowRoot,
          "--tool-mode",
          toolMode,
          "--write",
          writeMode,
          "--bash",
          bashMode,
        ],
      },
    },
  };
}

function mergeCodexProMcpConfig(existingConfig, options = {}) {
  const next = existingConfig && typeof existingConfig === "object" ? { ...existingConfig } : {};
  next.mcpServers = {
    ...(next.mcpServers && typeof next.mcpServers === "object" ? next.mcpServers : {}),
    ...buildCodexProMcpConfig(options).mcpServers,
  };
  return next;
}

function buildCodexProManifest(options = {}) {
  const toolMode = options.toolMode || CODEXPRO_TOOL_MODE;
  const writeMode = options.writeMode || CODEXPRO_WRITE_MODE;
  const bashMode = options.bashMode || CODEXPRO_BASH_MODE;

  return {
    version: CODEXPRO_VERSION,
    integration: "omo-mcp-sidecar",
    toolMode,
    writeMode,
    bashMode,
    expectedTools:
      toolMode === "full"
        ? CODEXPRO_FULL_TOOL_NAMES
        : [],
  };
}

function buildCodexProGuide(options = {}) {
  const toolMode = options.toolMode || CODEXPRO_TOOL_MODE;
  const writeMode = options.writeMode || CODEXPRO_WRITE_MODE;
  const bashMode = options.bashMode || CODEXPRO_BASH_MODE;

  return `# CodexPro With oh-my-openagent

This release ships a CodexPro MCP template for \`oh-my-openagent\` and OpenCode.

## Supported CodexPro Profile

- CodexPro version: \`${CODEXPRO_VERSION}\`
- Tool mode: \`${toolMode}\`
- Write mode: \`${writeMode}\`
- Bash mode: \`${bashMode}\`

## Why Full Mode

This integration uses CodexPro full mode so \`codex_context\` is available to OMO/OpenCode
alongside \`read_handoff\`, \`export_pro_context\`, and \`handoff_to_agent\`.

The recommended runtime posture is still conservative:

- keep CodexPro writes in handoff mode by default
- keep CodexPro bash disabled by default
- let OMO/OpenCode native tools handle normal execution
- use CodexPro for bundled context, durable handoff state, and exported planning bundles

Important nuance: CodexPro full mode still advertises the full tool catalog, including
\`write\`, \`edit\`, and \`bash\`. The \`write\` and \`bash\` modes are enforced when those
tools are called; they are not removed from the full-mode tool list.

## Generated MCP Config

The workspace root contains a generated \`.mcp.json\` entry named \`codexpro\`.
OMO can load it through its normal runtime MCP merge path.

## Recommended OMO Flow

1. Install CodexPro:

\`\`\`bash
npm install -g codexpro
\`\`\`

2. Confirm the MCP server is available:

\`\`\`bash
codexpro-mcp --help
\`\`\`

3. Start OpenCode with \`oh-my-openagent\` enabled.

4. Use CodexPro-backed tools inside OMO for:

- \`codex_context\`
- \`workspace_snapshot\`
- \`show_changes\`
- \`read_handoff\`
- \`export_pro_context\`
- \`handoff_to_agent\`

5. Keep normal editing/execution in OpenCode/OMO unless you intentionally widen the CodexPro profile.
`;
}

function isOmoCompatibleCodexProConfig(config) {
  if (!config || typeof config !== "object") return false;
  const entry = config.mcpServers && config.mcpServers.codexpro;
  if (!entry || typeof entry !== "object") return false;
  if (entry.type !== "stdio") return false;
  if (typeof entry.command !== "string" || entry.command.length === 0) return false;
  if (!Array.isArray(entry.args) || entry.args.some((item) => typeof item !== "string")) return false;
  return true;
}

module.exports = {
  CODEXPRO_BASH_MODE,
  CODEXPRO_FULL_TOOL_NAMES,
  CODEXPRO_TOOL_MODE,
  CODEXPRO_VERSION,
  CODEXPRO_WRITE_MODE,
  buildCodexProGuide,
  buildCodexProManifest,
  buildCodexProMcpConfig,
  isOmoCompatibleCodexProConfig,
  mergeCodexProMcpConfig,
};
