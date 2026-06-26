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
            ].join("\n"),
          )
          .replace(
            '                output: part.state.time.compacted ? "[Old tool result content cleared]" : part.state.output,',
            '                output: part.state.time.compacted ? "[Old tool result content cleared]" : reasonixHistoryToolOutput(part.state.output),',
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
