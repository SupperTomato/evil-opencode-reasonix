"use strict";

const REASONIX_REPO = "SupperTomato/evil-opencode-reasonix";

function apply(context) {
  const candidates = context.filesMatching([/installation\/index\.ts$/i]);
  if (candidates.length === 0) return;

  const applied = context.replaceInFirstMatch(
    candidates,
    (contents) => {
      if (new RegExp(module.exports.marker).test(contents)) return contents;

      let next = contents;
      next = next.replace(
        'HttpClientRequest.get("https://opencode.ai/install")',
        `HttpClientRequest.get("https://raw.githubusercontent.com/${REASONIX_REPO}/main/install.sh")`,
      );
      next = next.replace(
        'HttpClientRequest.get("https://api.github.com/repos/winmin/evil-opencode/releases/latest").pipe(',
        `HttpClientRequest.get("https://api.github.com/repos/${REASONIX_REPO}/releases/latest").pipe(`,
      );
      next = next.replace(
        'return data.tag_name.replace(/^v/, "").replace(/-unguarded$/, "")',
        'return data.tag_name.replace(/^reasonix-v/, "").replace(/^v/, "").replace(/-unguarded$/, "")',
      );

      if (next === contents) return contents;
      return `// ${module.exports.marker}: reasonix-installer-targets-v1\n${next}`;
    },
    module.exports.name,
  );

  if (!applied) {
    throw new Error("Installer targets patch failed: installation index anchor not found");
  }
}

module.exports = {
  name: "installer-targets",
  marker: "REASONIX_INSTALLER_TARGETS_MARKER",
  applicabilityMatchers: [/installation\/index\.ts$/i],
  required: true,
  fallbackPatchFiles: [],
  apply,
};
