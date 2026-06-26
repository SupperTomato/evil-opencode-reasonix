"use strict";

function apply(context) {
  const candidates = context.filesMatching([/bin\.(cjs|js|mjs|ts)$/i, /oh-my-opencode/i]);
  const applied = context.replaceInFirstMatch(
    candidates,
    (contents) => {
      if (new RegExp(module.exports.marker).test(contents)) return contents;
      return `const ${module.exports.marker} = \"evil-layer-present-v1\";\n${contents}`;
    },
    module.exports.name
  );
  if (!applied) throw new Error("Could not apply minimal evil patch; no CLI wrapper file matched");
}

module.exports = {
  name: "evil-minimal",
  marker: "REASONIX_EVIL_LAYER_MARKER",
  required: true,
  fallbackPatchFiles: [],
  apply
};
