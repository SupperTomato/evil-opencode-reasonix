"use strict";

function apply(context) {
  const candidates = context.filesMatching([/tool-output/i, /tool/i, /message/i, /session/i]);
  const applied = context.replaceInFirstMatch(
    candidates,
    (contents) => {
      if (new RegExp(module.exports.marker).test(contents)) return contents;
      if (/function rememberToolOutput\(/.test(contents)) {
        return [
          `const ${module.exports.marker} = \"reasonix-tool-output-v1\";`,
          "function shrinkToolOutput(output) {",
          "  const text = String(output);",
          "  return text.length <= 4000 ? text : `${text.slice(0, 4000)}\\n...[truncated by Reasonix hygiene]`;",
          "}",
          "",
          contents.replace("return output;", "return shrinkToolOutput(output);")
        ].join("\n");
      }
      if (
        contents.includes("export namespace MessageV2 {") &&
        contents.includes('output: part.state.time.compacted ? "[Old tool result content cleared]" : part.state.output,')
      ) {
        return contents
          .replace(
            "export namespace MessageV2 {\n",
            [
              "export namespace MessageV2 {",
              `  const ${module.exports.marker} = "reasonix-tool-output-v1"`,
              "",
              "  function reasonixHistoryToolOutput(output: string) {",
              "    const text = String(output)",
              "    if (text.length <= 4000) return text",
              "    return `${text.slice(0, 4000)}\\n...[truncated by Reasonix hygiene]`",
              "  }",
              "",
              "  function reasonixPruneStaleReasoning<T>(messages: T[]): T[] {",
              "    let lastUser = -1",
              "    for (let index = messages.length - 1; index >= 0; index--) {",
              '      if ((messages[index] as any)?.info?.role === "user") {',
              "        lastUser = index",
              "        break",
              "      }",
              "    }",
              "    if (lastUser < 0) return messages",
              "    return messages.map((message, index) => {",
              "      const candidate = message as any",
              '      if (index > lastUser || candidate?.info?.role !== "assistant" || !Array.isArray(candidate?.parts)) return message',
              '      if (candidate.parts.some((part: any) => part.type === "tool")) return message',
              '      const parts = candidate.parts.filter((part: any) => part.type !== "reasoning")',
              "      return parts.length === candidate.parts.length ? message : ({ ...candidate, parts } as T)",
              "    })",
              "  }",
              "",
              "  function reasonixHistoryToolInput(input: any): any {",
              "    if (Array.isArray(input)) return input.map(reasonixHistoryToolInput)",
              "    if (!input || typeof input !== \"object\") {",
              "      if (typeof input === \"string\" && input.length > 300) {",
              "        const lines = (input.match(/\\n/g) ?? []).length",
              "        return `[…shrunk: ${input.length} chars, ${lines} lines — see original tool call in session data]`",
              "      }",
              "      return input",
              "    }",
              "    return Object.fromEntries(",
              "      Object.entries(input).map(([key, value]) => [key, reasonixHistoryToolInput(value)]),",
              "    )",
              "  }",
            ].join("\n"),
          )
          .replace(
            "  export function toModelMessage(input: WithParts[]): ModelMessage[] {\n    const result: UIMessage[] = []\n\n    for (const msg of input) {\n",
            "  export function toModelMessage(input: WithParts[]): ModelMessage[] {\n    const reasonixInput = reasonixPruneStaleReasoning(input)\n    const result: UIMessage[] = []\n\n    for (const msg of reasonixInput) {\n",
          )
          .replace(
            "                input: part.state.input,\n",
            "                input: reasonixHistoryToolInput(part.state.input),\n",
          )
          .replace(
            '                output: part.state.time.compacted ? "[Old tool result content cleared]" : part.state.output,',
            '                output: part.state.time.compacted ? "[Old tool result content cleared]" : reasonixHistoryToolOutput(part.state.output),',
          )
          .replace(
            "                input: part.state.input,\n",
            "                input: reasonixHistoryToolInput(part.state.input),\n",
          );
      }
      return contents;
    },
    module.exports.name
  );
  if (!applied) throw new Error("Reasonix tool-output patch failed: tool-output anchor not found");
}

module.exports = {
  name: "reasonix-tool-output-hygiene",
  marker: "REASONIX_TOOL_OUTPUT_MARKER",
  required: true,
  fallbackPatchFiles: [],
  apply
};
