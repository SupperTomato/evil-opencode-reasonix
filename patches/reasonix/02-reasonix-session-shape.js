"use strict";

function patchProviderTransform(contents) {
  if (!contents.includes("export namespace ProviderTransform {")) return null;

  let next = contents;
  if (!new RegExp(module.exports.marker).test(next)) {
    next = next.replace(
      'import { iife } from "@/util/iife"\n',
      [
        'import { iife } from "@/util/iife"',
        "",
        `const ${module.exports.marker} = "reasonix-session-shape-v1"`,
        "",
        "function reasonixStableSchema(value: any, parentKey?: string): any {",
        "  if (Array.isArray(value)) {",
        '    const mapped = value.map((item) => reasonixStableSchema(item))',
        '    if ((parentKey === "required" || parentKey === "dependentRequired") && mapped.every((item) => item == null || ["string", "number", "boolean"].includes(typeof item))) {',
        "      return [...mapped].sort((a, b) => String(a).localeCompare(String(b)))",
        "    }",
        "    return mapped",
        "  }",
        "  if (!value || typeof value !== \"object\") return value",
        "  return Object.fromEntries(",
        "    Object.keys(value)",
        "      .sort()",
        "      .map((key) => [key, reasonixStableSchema(value[key], key)]),",
        "  )",
        "}",
      ].join("\n"),
    );
  }

  next = next.replace(
    "  export function options(\n    model: Provider.Model,\n    sessionID: string,\n    providerOptions?: Record<string, any>,\n  ): Record<string, any> {\n",
    "  export function options(\n    model: Provider.Model,\n    sessionID: string,\n    providerOptions?: Record<string, any>,\n    previousResponseId?: string,\n  ): Record<string, any> {\n",
  );
  next = next.replace(
    '    if (model.providerID === "openai" || providerOptions?.setCacheKey) {\n      result["promptCacheKey"] = sessionID\n    }\n',
    [
      '    if (',
      '      model.api.npm === "@ai-sdk/openai" ||',
      '      model.api.npm === "@ai-sdk/github-copilot" ||',
      '      model.providerID === "openai" ||',
      "      providerOptions?.setCacheKey",
      "    ) {",
      '      result["promptCacheKey"] = sessionID',
      "    }",
      "",
      '    if (previousResponseId && model.api.npm === "@ai-sdk/openai") {',
      '      result["previousResponseId"] = previousResponseId',
      "    }",
    ].join("\n"),
  );
  next = next.replace("    return schema\n", "    return reasonixStableSchema(schema)\n");
  return next !== contents ? next : null;
}

function patchLegacySerializeSession(contents) {
  if (!/function serializeSession\(/.test(contents)) return null;
  if (new RegExp(module.exports.marker).test(contents)) return null;
  return [
    `const ${module.exports.marker} = "reasonix-session-shape-v1";`,
    "function stableJsonStringify(value) {",
    '  return JSON.stringify(value, value && typeof value === "object" ? Object.keys(value).sort() : undefined);',
    "}",
    "",
    contents.replace("return JSON.stringify(value);", "return stableJsonStringify(value);")
  ].join("\n");
}

function patchLlm(contents) {
  if (!contents.includes("export namespace LLM {")) return null;
  let next = contents;
  next = next.replace(
    "    tools: Record<string, Tool>\n    retries?: number\n  }\n",
    "    tools: Record<string, Tool>\n    retries?: number\n    toolChoice?: \"auto\" | \"required\" | \"none\"\n    lastResponseId?: string\n  }\n",
  );
  next = next.replace(
    "      ProviderTransform.options(input.model, input.sessionID, provider.options),\n",
    "      ProviderTransform.options(input.model, input.sessionID, provider.options, input.lastResponseId),\n",
  );
  next = next.replace(
    "      tools,\n      maxOutputTokens,\n",
    "      tools,\n      toolChoice: input.toolChoice,\n      maxOutputTokens,\n",
  );
  return next !== contents ? next : null;
}

function patchSession(contents) {
  if (!contents.includes("export namespace Session {")) return null;
  let next = contents;
  next = next.replace(
    "      revert: z\n",
    "      lastResponseId: z.string().optional(),\n      revert: z\n",
  );
  return next !== contents ? next : null;
}

function patchProcessor(contents) {
  if (!contents.includes("export namespace SessionProcessor {")) return null;
  const anchor = "                  SessionSummary.summarize({\n                    sessionID: input.sessionID,\n                    messageID: input.assistantMessage.parentID,\n                  })\n";
  if (!contents.includes(anchor)) return null;
  const insertion = [
    anchor.trimEnd(),
    "                  const responseId = value.providerMetadata?.openai?.responseId",
    '                  if (typeof responseId === "string" && responseId.length > 0) {',
    "                    await Session.update(input.sessionID, (draft) => {",
    "                      draft.lastResponseId = responseId",
    "                    })",
    "                  }",
  ].join("\n");
  const next = contents.replace(anchor, `${insertion}\n`);
  return next !== contents ? next : null;
}

function patchPrompt(contents) {
  if (!contents.includes("export namespace SessionPrompt {")) return null;
  let next = contents;
  if (!next.includes("function reasonixStableToolMap(")) {
    next = next.replace(
      "export namespace SessionPrompt {\n",
      [
        "export namespace SessionPrompt {",
        "  function reasonixStableToolMap<T>(tools: Record<string, T>) {",
        "    return Object.fromEntries(",
        "      Object.entries(tools).sort(([left], [right]) => left.localeCompare(right)),",
        "    ) as Record<string, T>",
        "  }",
        "",
      ].join("\n"),
    );
  }
  next = next.replace(
    "      const result = await SessionCompaction.process({\n          messages: msgs,\n          parentID: lastUser.id,\n          abort,\n          sessionID,\n          auto: task.auto,\n        })\n",
    [
      "      const compactionAgent = await Agent.get(lastUser.agent)",
      "      const compactionResolved = {",
      "        system: reasonixStableSystemPrefix(await SystemPrompt.environment(), await SystemPrompt.custom()),",
      "        tools: await resolveTools({",
      "          agent: compactionAgent,",
      "          session,",
      "          model,",
      "          tools: lastUser.tools,",
      "        }),",
      "        agent: compactionAgent,",
      "        user: lastUser,",
      "      }",
      "      const result = await SessionCompaction.process({",
      "          messages: msgs,",
      "          parentID: lastUser.id,",
      "          abort,",
      "          sessionID,",
      "          auto: task.auto,",
      "          resolved: compactionResolved,",
      "        })",
    ].join("\n"),
  );
  next = next.replace(
    "        })        if (result === \"stop\") break\n",
    "        })\n        if (result === \"stop\") break\n",
  );
  next = next.replace(
    "        tools: lastUser.tools,\n        processor,\n        userInvokedAgents,\n      })\n",
    "        tools: lastUser.tools,\n        processor,\n        userInvokedAgents,\n      })\n",
  );
  next = next.replace(
    "        tools: lastUser.tools,\n        processor,\n        userInvokedAgents,\n      })\n",
    "        tools: lastUser.tools,\n        processor,\n        userInvokedAgents,\n      })\n",
  );
  next = next.replace(
    "        tools,\n        model,\n      })\n",
    "        tools,\n        model,\n        lastResponseId: session.lastResponseId,\n      })\n",
  );
  next = next.replace(
    "  async function resolveTools(input: {\n    agent: Agent.Info\n    model: Provider.Model\n    session: Session.Info\n    tools?: Record<string, boolean>\n    processor: SessionProcessor.Info\n    userInvokedAgents: string[]\n  }) {\n",
    "  async function resolveTools(input: {\n    agent: Agent.Info\n    model: Provider.Model\n    session: Session.Info\n    tools?: Record<string, boolean>\n    processor?: SessionProcessor.Info\n    userInvokedAgents?: string[]\n  }) {\n",
  );
  next = next.replace(
    "      messageID: input.processor.message.id,\n",
    '      messageID: input.processor?.message.id ?? "reasonix-compaction",\n',
  );
  next = next.replace(
    "      extra: { model: input.model, userInvokedAgents: input.userInvokedAgents },\n",
    "      extra: { model: input.model, userInvokedAgents: input.userInvokedAgents ?? [] },\n",
  );
  next = next.replace(
    "        const match = input.processor.partFromToolCall(options.toolCallId)\n",
    "        const match = input.processor?.partFromToolCall(options.toolCallId)\n",
  );
  next = next.replace(
    "          tool: { messageID: input.processor.message.id, callID: options.toolCallId },\n",
    '          tool: { messageID: input.processor?.message.id ?? "reasonix-compaction", callID: options.toolCallId },\n',
  );
  next = next.replace(
    "              messageID: input.processor.message.id,\n",
    '              messageID: input.processor?.message.id ?? "reasonix-compaction",\n',
  );
  next = next.replace(
    "          sessionID: input.session.id,\n          callID: ctx.callID,\n",
    '          sessionID: input.session.id,\n          callID: ctx.callID,\n',
  );
  next = next.replace("    return tools\n", "    return reasonixStableToolMap(tools)\n");
  return next !== contents ? next : null;
}

function apply(context) {
  let applied = false;

  const transforms = [
    { matchers: [/session/i, /history/i], transform: patchLegacySerializeSession, label: `${module.exports.name}:legacy-session` },
    { matchers: [/provider/i, /transform/i], transform: patchProviderTransform, label: `${module.exports.name}:provider-transform` },
    { matchers: [/session/i, /llm/i], transform: patchLlm, label: `${module.exports.name}:llm` },
    { matchers: [/session/i, /index/i], transform: patchSession, label: `${module.exports.name}:session` },
    { matchers: [/session/i, /processor/i], transform: patchProcessor, label: `${module.exports.name}:processor` },
    { matchers: [/session/i, /prompt/i], transform: patchPrompt, label: `${module.exports.name}:prompt` },
  ];

  for (const item of transforms) {
    const result = context.replaceInFirstMatch(
      context.filesMatching(item.matchers),
      (contents) => item.transform(contents) ?? contents,
      item.label,
    );
    applied = Boolean(result) || applied;
  }

  if (!applied) throw new Error("Reasonix session-shape patch failed: cache/session anchors not found");
}

module.exports = {
  name: "reasonix-session-shape",
  marker: "REASONIX_SESSION_SHAPE_MARKER",
  required: true,
  fallbackPatchFiles: [],
  apply
};
