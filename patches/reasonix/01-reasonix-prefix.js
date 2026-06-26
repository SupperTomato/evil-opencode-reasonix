"use strict";

function apply(context) {
  const candidates = context.filesMatching([/prompt/i, /message/i, /session/i]);
  const applied = context.replaceInFirstMatch(
    candidates,
    (contents) => {
      if (new RegExp(module.exports.marker).test(contents)) return contents;
      if (/function buildSystemPrompt\(/.test(contents)) {
        return [
          `const ${module.exports.marker} = \"reasonix-stable-prefix-v1\";`,
          "function reasonixStablePrefix(parts) {",
          "  return [...parts].map((part) => String(part).trim()).join(\"\\n\\n\");",
          "}",
          "",
          contents.replace("return parts.join(\"\\n\\n\");", "return reasonixStablePrefix(parts);")
        ].join("\n");
      }
      if (
        contents.includes("globalThis.AI_SDK_LOG_WARNINGS = false") &&
        contents.includes("system: [...(await SystemPrompt.environment()), ...(await SystemPrompt.custom())],")
      ) {
        return contents
          .replace(
            "// @ts-ignore\nglobalThis.AI_SDK_LOG_WARNINGS = false\n",
            [
              "// @ts-ignore",
              "globalThis.AI_SDK_LOG_WARNINGS = false",
              "",
              `const ${module.exports.marker} = "reasonix-stable-prefix-v1"`,
              "",
              "function reasonixStableSystemPrefix(...groups: string[][]) {",
              "  const seen = new Set<string>()",
              "  const result: string[] = []",
              "  for (const entry of groups.flat()) {",
              "    const normalized = String(entry).trim()",
              "    if (!normalized || seen.has(normalized)) continue",
              "    seen.add(normalized)",
              "    result.push(normalized)",
              "  }",
              "  return result",
              "}",
            ].join("\n"),
          )
          .replace(
            "system: [...(await SystemPrompt.environment()), ...(await SystemPrompt.custom())],",
            "system: reasonixStableSystemPrefix(await SystemPrompt.environment(), await SystemPrompt.custom()),",
          );
      }
      return contents;
    },
    module.exports.name
  );
  if (!applied) throw new Error("Reasonix prefix patch failed: system prompt anchor not found");
}

module.exports = {
  name: "reasonix-prefix",
  marker: "REASONIX_STABLE_PREFIX_MARKER",
  required: true,
  fallbackPatchFiles: [],
  apply
};
