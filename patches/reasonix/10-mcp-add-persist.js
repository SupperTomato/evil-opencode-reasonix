"use strict";

function apply(context) {
  const candidates = context.filesMatching([/cli\/cmd\/mcp/i]);
  if (candidates.length === 0) return;
  const applied = context.replaceInFirstMatch(
    candidates,
    (contents) => {
      if (new RegExp(module.exports.marker).test(contents)) return contents;
      let next = contents;

      if (!next.includes("async function reasonixPersistMcpServer(")) {
        next = next.replace(
          'import { Global } from "../../global"\n',
          [
            'import { Global } from "../../global"',
            "",
            `async function ${module.exports.marker}(name: string, entry: Record<string, any>) {`,
            '  const configPath = path.join(Global.Path.config, "opencode.json")',
            "  const current = await Bun.file(configPath)",
            "    .json()",
            "    .catch(() => ({} as Record<string, any>))",
            '  const next = {',
            "    ...current,",
            '    $schema: current.$schema ?? "https://opencode.ai/config.json",',
            "    mcp: {",
            "      ...(current.mcp ?? {}),",
            "      [name]: entry,",
            "    },",
            "  }",
            "  await Bun.write(configPath, JSON.stringify(next, null, 2) + \"\\n\")",
            "}",
          ].join("\n"),
        );
      }

      next = next.replace(
        '      prompts.log.info(`Local MCP server "${name}" configured with command: ${command}`)\n      prompts.outro("MCP server added successfully")\n      return\n',
        [
          "      await REASONIX_MCP_ADD_PERSIST_MARKER(name, {",
          '        type: "local",',
          "        command: command.split(/\\s+/).filter(Boolean),",
          "      })",
          '      prompts.log.info(`Local MCP server "${name}" configured with command: ${command}`)',
          '      prompts.log.success(`Saved to ${path.join(Global.Path.config, "opencode.json")}`)',
          '      prompts.outro("MCP server added successfully")',
          "      return",
        ].join("\n"),
      );

      next = next.replace(
        [
          '          prompts.log.info(`Remote MCP server "${name}" configured with OAuth (client ID: ${clientId})`)',
          '          prompts.log.info("Add this to your opencode.json:")',
        ].join("\n"),
        [
          "          await REASONIX_MCP_ADD_PERSIST_MARKER(name, {",
          '            type: "remote",',
          "            url,",
          "            oauth: {",
          "              clientId,",
          "              ...(clientSecret ? { clientSecret } : {}),",
          "            },",
          "          })",
          '          prompts.log.info(`Remote MCP server "${name}" configured with OAuth (client ID: ${clientId})`)',
          '          prompts.log.info("Add this to your opencode.json:")',
        ].join("\n"),
      );

      next = next.replace(
        [
          '          prompts.log.info(`Remote MCP server "${name}" configured with OAuth (dynamic registration)`)',
          '          prompts.log.info("Add this to your opencode.json:")',
        ].join("\n"),
        [
          "          await REASONIX_MCP_ADD_PERSIST_MARKER(name, {",
          '            type: "remote",',
          "            url,",
          "            oauth: {},",
          "          })",
          '          prompts.log.info(`Remote MCP server "${name}" configured with OAuth (dynamic registration)`)',
          '          prompts.log.info("Add this to your opencode.json:")',
        ].join("\n"),
      );

      next = next.replace(
        '        prompts.log.info(`Remote MCP server "${name}" configured with URL: ${url}`)\n',
        [
          "        await REASONIX_MCP_ADD_PERSIST_MARKER(name, {",
          '          type: "remote",',
          "          url,",
          "          oauth: false,",
          "        })",
          '        prompts.log.info(`Remote MCP server "${name}" configured with URL: ${url}`)',
        ].join("\n"),
      );

      return next;
    },
    module.exports.name,
  );
  if (!applied) throw new Error("MCP add persist patch failed: mcp command anchor not found");
}

module.exports = {
  name: "mcp-add-persist",
  marker: "REASONIX_MCP_ADD_PERSIST_MARKER",
  applicabilityMatchers: [/cli\/cmd\/mcp/i],
  required: true,
  fallbackPatchFiles: [],
  apply,
};
