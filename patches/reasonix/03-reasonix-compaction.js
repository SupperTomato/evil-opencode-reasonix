"use strict";

function patchLiveCompaction(contents) {
  if (!contents.includes("export namespace SessionCompaction {")) return null;
  let next = contents;
  if (!new RegExp(module.exports.marker).test(next)) {
    next = next.replace(
      "export namespace SessionCompaction {\n",
      [
        "export namespace SessionCompaction {",
        `  const ${module.exports.marker} = "reasonix-compaction-v1"`,
        "",
        "  type ReasonixResolvedContext = {",
        "    agent: any",
        "    system: string[]",
        "    tools: Record<string, any>",
        "    user: any",
        "  }",
        "",
        "  function reasonixStableCompactionPrompt(defaultPrompt: string, compacting: { prompt?: string; context: string[] }) {",
        "    if (compacting.prompt) return compacting.prompt.trim()",
        "    const stableContext = [...new Set(compacting.context.map((item) => item.trim()).filter(Boolean))].sort()",
        "    return [defaultPrompt.trim(), ...stableContext].join(\"\\n\\n\")",
        "  }",
      ].join("\n"),
    );
  }

  next = next.replace(
    "    auto: boolean\n  }) {\n",
    "    auto: boolean\n    resolved?: ReasonixResolvedContext\n  }) {\n",
  );
  next = next.replace(
    '    const promptText = compacting.prompt ?? [defaultPrompt, ...compacting.context].join("\\n\\n")',
    "    const promptText = reasonixStableCompactionPrompt(defaultPrompt, compacting)",
  );
  next = next.replace(
    "      user: userMessage,\n      agent,\n      abort: input.abort,\n      sessionID: input.sessionID,\n      tools: {},\n      system: [],\n      messages: [\n",
    [
      "      user: input.resolved?.user ?? userMessage,",
      "      agent: input.resolved?.agent ?? agent,",
      "      abort: input.abort,",
      "      sessionID: input.sessionID,",
      "      tools: input.resolved?.tools ?? {},",
      "      toolChoice: input.resolved ? \"none\" : undefined,",
      "      system: input.resolved?.system ?? [],",
      "      messages: [",
    ].join("\n"),
  );
  return next !== contents ? next : null;
}

function apply(context) {
  const applied = context.replaceInFirstMatch(
    context.filesMatching([/compact/i, /summary/i]),
    (contents) => {
      if (/function buildCompactSummary\(/.test(contents) && !new RegExp(module.exports.marker).test(contents)) {
        return [
          `const ${module.exports.marker} = \"reasonix-compaction-v1\";`,
          "function reasonixStableCompaction(items) {",
          "  return [...items].map((item) => item.summary).sort().join(\"\\n\");",
          "}",
          "",
          contents.replace("return items.map((item) => item.summary).join(\"\\n\");", "return reasonixStableCompaction(items);")
        ].join("\n");
      }
      return patchLiveCompaction(contents) ?? contents;
    },
    module.exports.name
  );
  if (!applied) throw new Error("Reasonix compaction patch failed: compaction anchor not found");
}

module.exports = {
  name: "reasonix-compaction",
  marker: "REASONIX_COMPACTION_MARKER",
  required: true,
  fallbackPatchFiles: [],
  apply
};
