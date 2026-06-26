"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createContext } = require("./lib/patching");
const { collectVerification } = require("./lib/verify");

const modules = [
  require("../../patches/evil/01-evil-minimal"),
  require("../../patches/reasonix/01-reasonix-prefix"),
  require("../../patches/reasonix/02-reasonix-session-shape"),
  require("../../patches/reasonix/03-reasonix-compaction"),
  require("../../patches/reasonix/04-reasonix-tool-output-hygiene"),
  require("../../patches/reasonix/05-plugin-loader-compat"),
  require("../../patches/reasonix/06-run-file-arg-compat"),
  require("../../patches/reasonix/07-auth-url-error-handling"),
  require("../../patches/reasonix/08-pr-merged-fallback"),
  require("../../patches/reasonix/09-bun-install-resilience"),
  require("../../patches/reasonix/10-mcp-add-persist"),
  require("../../patches/reasonix/11-github-reaction-cleanup")
];

test("patch modules rewrite a compatible source fixture", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "reasonix-patch-"));
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "fixture", scripts: { build: "node build.js" } }));
  fs.writeFileSync(path.join(root, "src", "prompt.ts"), [
    "export function buildSystemPrompt(parts) {",
    "  return parts.join(\"\\n\\n\");",
    "}"
  ].join("\n"));
  fs.writeFileSync(path.join(root, "src", "session.ts"), [
    "export function serializeSession(value) {",
    "  return JSON.stringify(value);",
    "}"
  ].join("\n"));
  fs.writeFileSync(path.join(root, "src", "compact.ts"), [
    "export function buildCompactSummary(items) {",
    "  return items.map((item) => item.summary).join(\"\\n\");",
    "}"
  ].join("\n"));
  fs.writeFileSync(path.join(root, "src", "tool-output.ts"), [
    "export function rememberToolOutput(output) {",
    "  return output;",
    "}"
  ].join("\n"));
  fs.writeFileSync(path.join(root, "bin.js"), "export const installCommand = 'update';\n");

  const context = createContext(root);
  for (const module of modules) module.apply(context);

  const verification = collectVerification(root);
  assert.equal(verification.ok, true);
});

test("patch modules rewrite a live-layout fixture modeled on evil-opencode", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "reasonix-live-patch-"));
  const sessionDir = path.join(root, "packages", "opencode", "src", "session");
  const providerDir = path.join(root, "packages", "opencode", "src", "provider");
  const pluginDir = path.join(root, "packages", "opencode", "src", "plugin");
  const bunDir = path.join(root, "packages", "opencode", "src", "bun");
  const cliDir = path.join(root, "packages", "opencode", "src", "cli", "cmd");
  fs.mkdirSync(sessionDir, { recursive: true });
  fs.mkdirSync(providerDir, { recursive: true });
  fs.mkdirSync(pluginDir, { recursive: true });
  fs.mkdirSync(bunDir, { recursive: true });
  fs.mkdirSync(cliDir, { recursive: true });

  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "fixture", scripts: { build: "node build.js" } }));
  fs.writeFileSync(
    path.join(sessionDir, "prompt.ts"),
    [
      "// @ts-ignore",
      "globalThis.AI_SDK_LOG_WARNINGS = false",
      "",
      "export namespace SessionPrompt {",
      "  export async function callProcessor(SystemPrompt, processor, MessageV2, sessionMessages, isLastStep, MAX_STEPS, session, tools, model) {",
      "    const resolvedTools = await resolveTools({",
      "      session,",
      "      tools,",
      "      model,",
      "      agent: { name: \"fixture\" },",
      "      processor,",
      "      userInvokedAgents: [],",
      "    })",
      "    return processor.process({",
      "      system: [...(await SystemPrompt.environment()), ...(await SystemPrompt.custom())],",
      "      messages: [",
      "        ...MessageV2.toModelMessage(sessionMessages),",
      "        ...(isLastStep ? [{ role: \"assistant\", content: MAX_STEPS }] : []),",
      "      ],",
      "      tools: resolvedTools,",
      "      model,",
      "    })",
      "  }",
      "",
      "  async function resolveTools(input: {",
      "    agent: any",
      "    model: any",
      "    session: any",
      "    tools?: Record<string, boolean>",
      "    processor: any",
      "    userInvokedAgents: string[]",
      "  }) {",
      "    const tools = { zeta: 1, alpha: 2 }",
      "    return tools",
      "  }",
      "}",
    ].join("\n"),
  );
  fs.writeFileSync(
    path.join(providerDir, "transform.ts"),
    [
      'import { iife } from "@/util/iife"',
      "",
      "export namespace ProviderTransform {",
      "  export function schema(model, schema) {",
      "    return schema",
      "  }",
      "}",
    ].join("\n"),
  );
  fs.writeFileSync(
    path.join(sessionDir, "compaction.ts"),
    [
      "export namespace SessionCompaction {",
      "  export async function process(compacting) {",
      '    const defaultPrompt = "default"',
      '    const promptText = compacting.prompt ?? [defaultPrompt, ...compacting.context].join("\\n\\n")',
      "    return promptText",
      "  }",
      "}",
    ].join("\n"),
  );
  fs.writeFileSync(
    path.join(sessionDir, "message-v2.ts"),
    [
      "export namespace MessageV2 {",
      "  export function toModelMessage(part) {",
      "    return {",
      '      output: part.state.time.compacted ? "[Old tool result content cleared]" : part.state.output,',
      "    }",
      "  }",
      "}",
    ].join("\n"),
  );
  fs.writeFileSync(
    path.join(pluginDir, "index.ts"),
    [
      "export async function load(plugin, input, hooks) {",
      "      const mod = await import(plugin)",
      "      // Prevent duplicate initialization when plugins export the same function",
      "      // as both a named export and default export (e.g., `export const X` and `export default X`).",
      "      // Object.entries(mod) would return both entries pointing to the same function reference.",
      "      const seen = new Set<PluginInstance>()",
      "      for (const [_name, fn] of Object.entries<PluginInstance>(mod)) {",
      "        if (seen.has(fn)) continue",
      "        seen.add(fn)",
      "        const init = await fn(input)",
      "        hooks.push(init)",
      "      }",
      "}",
    ].join("\n"),
  );
  fs.writeFileSync(
    path.join(bunDir, "index.ts"),
    [
      'import path from "path"',
      "export namespace BunProc {",
      '  const log = { warn() {} }',
      '  const parsed = { dependencies: {} as Record<string, string> }',
      '  const mod = path.join("cache", "node_modules", "fixture-plugin")',
      '  const pkg = "fixture-plugin"',
      '  const version = "latest"',
      "  async function install() {",
      "    await BunProc.run(args, {",
      "      cwd: Global.Path.cache,",
      "    }).catch((e) => {",
      "      throw new InstallFailedError(",
      "        { pkg, version },",
      "        {",
      "          cause: e,",
      "        },",
      "      )",
      "    })",
      "  }",
      "}",
    ].join("\n"),
  );
  fs.writeFileSync(
    path.join(cliDir, "github.ts"),
    [
      'const WORKFLOW_FILE = ".github/workflows/opencode.yml"',
      'const AGENT_USERNAME = "opencode-agent[bot]"',
      'const actor = "SupperTomato"',
      "const useGithubToken = true",
      "async function removeReaction() {",
      "  if (triggerCommentId) {",
      "    const reactions = await octoRest.rest.reactions.listForIssueComment({ owner, repo, comment_id: triggerCommentId!, content: AGENT_REACTION })",
      "    const eyesReaction = reactions.data.find((r) => r.user?.login === AGENT_USERNAME)",
      "    if (!eyesReaction) return",
      "    return await octoRest.rest.reactions.deleteForIssueComment({ owner, repo, comment_id: triggerCommentId!, reaction_id: eyesReaction.id })",
      "  }",
      "  const reactions = await octoRest.rest.reactions.listForIssue({ owner, repo, issue_number: issueId!, content: AGENT_REACTION })",
      "  const eyesReaction = reactions.data.find((r) => r.user?.login === AGENT_USERNAME)",
      "  if (!eyesReaction) return",
      "  await octoRest.rest.reactions.deleteForIssue({ owner, repo, issue_number: issueId!, reaction_id: eyesReaction.id })",
      "}",
    ].join("\n"),
  );
  fs.writeFileSync(
    path.join(cliDir, "mcp.ts"),
    [
      'import path from "path"',
      'import { Global } from "../../global"',
      "export const McpAddCommand = cmd({",
      '  command: "add",',
      "  async handler() {",
      '    const name = "fixture-mcp"',
      '    const command = "echo hi"',
      '    const clientId = "abc"',
      '    const clientSecret = "def"',
      '    const url = "https://example.com/mcp"',
      '    prompts.log.info(`Local MCP server "${name}" configured with command: ${command}`)',
      '    prompts.log.info(`Remote MCP server "${name}" configured with OAuth (client ID: ${clientId})`)',
      '    prompts.log.info(`Remote MCP server "${name}" configured with OAuth (dynamic registration)`)',
      '    prompts.log.info(`Remote MCP server "${name}" configured with URL: ${url}`)',
      "  }",
      "})",
    ].join("\n"),
  );
  fs.writeFileSync(
    path.join(cliDir, "run.ts"),
    [
      "export const RunCommand = cmd({",
      '  command: "run [message..]",',
      "  builder: (yargs) => {",
      "    return yargs",
      '      .option("file", {',
      '        alias: ["f"],',
      '        type: "string",',
      "        array: true,",
      '        describe: "file(s) to attach to message",',
      "      })",
      "  }",
      "})",
    ].join("\n"),
  );
  fs.writeFileSync(
    path.join(cliDir, "auth.ts"),
    [
      "async function auth(args, prompts, Auth, Bun) {",
      "  if (args.url) {",
      '    const wellknown = await fetch(`${args.url}/.well-known/opencode`).then((x) => x.json() as any)',
      '    prompts.log.info(`Running \\`${wellknown.auth.command.join(" ")}\\``)',
      "    const proc = Bun.spawn({",
      "      cmd: wellknown.auth.command,",
      '      stdout: "pipe",',
      "    })",
      "    const exit = await proc.exited",
      "    if (exit !== 0) {",
      '      prompts.log.error("Failed")',
      '      prompts.outro("Done")',
      "      return",
      "    }",
      "    const token = await new Response(proc.stdout).text()",
      "    await Auth.set(args.url, {",
      '      type: "wellknown",',
      "      key: wellknown.auth.env,",
      "      token: token.trim(),",
      "    })",
      '    prompts.log.success("Logged into " + args.url)',
      '    prompts.outro("Done")',
      "    return",
      "  }",
      "}",
    ].join("\n"),
  );
  fs.writeFileSync(
    path.join(cliDir, "pr.ts"),
    [
      "async function pr(prNumber, UI, $) {",
      "  const localBranchName = `pr/${prNumber}`",
      "  // Use gh pr checkout with custom branch name",
      "  const result = await $`gh pr checkout ${prNumber} --branch ${localBranchName} --force`.nothrow()",
      "",
      "  if (result.exitCode !== 0) {",
      '    UI.error(`Failed to checkout PR #${prNumber}. Make sure you have gh CLI installed and authenticated.`)',
      "    process.exit(1)",
      "  }",
      "}",
    ].join("\n"),
  );
  fs.writeFileSync(path.join(root, "bin.js"), "export const installCommand = 'update';\n");

  const context = createContext(root);
  for (const module of modules) module.apply(context);

  const verification = collectVerification(root);
  assert.equal(verification.ok, true);
  assert.match(
    fs.readFileSync(path.join(providerDir, "transform.ts"), "utf8"),
    /parentKey === "required" \|\| parentKey === "dependentRequired"/,
  );
  assert.match(
    fs.readFileSync(path.join(sessionDir, "prompt.ts"), "utf8"),
    /function reasonixStableToolMap/,
  );
  assert.match(
    fs.readFileSync(path.join(sessionDir, "message-v2.ts"), "utf8"),
    /function reasonixHistoryToolInput/,
  );
  assert.match(
    fs.readFileSync(path.join(sessionDir, "message-v2.ts"), "utf8"),
    /function reasonixPruneStaleReasoning/,
  );
  assert.match(
    fs.readFileSync(path.join(pluginDir, "index.ts"), "utf8"),
    /REASONIX_PLUGIN_LOADER_COMPAT_MARKER/,
  );
  assert.match(
    fs.readFileSync(path.join(cliDir, "run.ts"), "utf8"),
    /REASONIX_RUN_FILE_ARG_COMPAT_MARKER/,
  );
  assert.match(
    fs.readFileSync(path.join(cliDir, "run.ts"), "utf8"),
    /nargs: 1/,
  );
  assert.match(
    fs.readFileSync(path.join(cliDir, "auth.ts"), "utf8"),
    /REASONIX_AUTH_URL_ERROR_HANDLING_MARKER/,
  );
  assert.match(
    fs.readFileSync(path.join(cliDir, "pr.ts"), "utf8"),
    /REASONIX_PR_MERGED_FALLBACK_MARKER/,
  );
  assert.match(
    fs.readFileSync(path.join(bunDir, "index.ts"), "utf8"),
    /REASONIX_BUN_INSTALL_RESILIENCE_MARKER/,
  );
  assert.match(
    fs.readFileSync(path.join(cliDir, "mcp.ts"), "utf8"),
    /REASONIX_MCP_ADD_PERSIST_MARKER/,
  );
  assert.match(
    fs.readFileSync(path.join(cliDir, "github.ts"), "utf8"),
    /REASONIX_GITHUB_REACTION_CLEANUP_MARKER/,
  );
});
