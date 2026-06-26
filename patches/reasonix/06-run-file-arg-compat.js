"use strict";

function apply(context) {
  const candidates = context.filesMatching([/cli\/cmd\/run/i]);
  if (candidates.length === 0) return;
  const applied = context.replaceInFirstMatch(
    candidates,
    (contents) => {
      if (new RegExp(module.exports.marker).test(contents)) return contents;
      const target = [
        '      .option("file", {',
        '        alias: ["f"],',
        '        type: "string",',
        '        array: true,',
        '        describe: "file(s) to attach to message",',
        "      })",
      ].join("\n");
      const replacement = [
        `      // ${module.exports.marker}: reasonix-run-file-arg-compat-v1`,
        '      .option("file", {',
        '        alias: ["f"],',
        '        type: "string",',
        "        nargs: 1,",
        '        array: true,',
        '        describe: "file(s) to attach to message",',
        "      })",
      ].join("\n");
      return contents.includes(target) ? contents.replace(target, replacement) : contents;
    },
    module.exports.name,
  );
  if (!applied) throw new Error("Run file-arg compatibility patch failed: run command anchor not found");
}

module.exports = {
  name: "run-file-arg-compat",
  marker: "REASONIX_RUN_FILE_ARG_COMPAT_MARKER",
  applicabilityMatchers: [/cli\/cmd\/run/i],
  required: true,
  fallbackPatchFiles: [],
  apply,
};
