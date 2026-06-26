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
  require("../../patches/reasonix/04-reasonix-tool-output-hygiene")
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
  fs.mkdirSync(sessionDir, { recursive: true });
  fs.mkdirSync(providerDir, { recursive: true });

  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "fixture", scripts: { build: "node build.js" } }));
  fs.writeFileSync(
    path.join(sessionDir, "prompt.ts"),
    [
      "// @ts-ignore",
      "globalThis.AI_SDK_LOG_WARNINGS = false",
      "",
      "export async function callProcessor(SystemPrompt, processor, MessageV2, sessionMessages, isLastStep, MAX_STEPS) {",
      "  return processor.process({",
      "    system: [...(await SystemPrompt.environment()), ...(await SystemPrompt.custom())],",
      "    messages: [",
      "      ...MessageV2.toModelMessage(sessionMessages),",
      "      ...(isLastStep ? [{ role: \"assistant\", content: MAX_STEPS }] : []),",
      "    ],",
      "  })",
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
  fs.writeFileSync(path.join(root, "bin.js"), "export const installCommand = 'update';\n");

  const context = createContext(root);
  for (const module of modules) module.apply(context);

  const verification = collectVerification(root);
  assert.equal(verification.ok, true);
});
