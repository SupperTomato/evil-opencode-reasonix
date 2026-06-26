"use strict";

function apply(context) {
  const candidates = context.filesMatching([/cli\/cmd\/github/i]);
  if (candidates.length === 0) return;
  const applied = context.replaceInFirstMatch(
    candidates,
    (contents) => {
      if (new RegExp(module.exports.marker).test(contents)) return contents;
      let next = contents;

      if (!next.includes("function reasonixReactionOwners(")) {
        next = next.replace(
          'const WORKFLOW_FILE = ".github/workflows/opencode.yml"\n',
          [
            'const WORKFLOW_FILE = ".github/workflows/opencode.yml"',
            "",
            "function reasonixReactionOwners(actor: string | undefined, useGithubToken: boolean) {",
            "  const owners = new Set([AGENT_USERNAME])",
            "  if (useGithubToken && actor) owners.add(actor)",
            "  return owners",
            "}",
            "",
          ].join("\n"),
        );
      }

      let markerInserted = false;
      next = next.replace(
        /^(\s*)const eyesReaction = reactions\.data\.find\(\(r\) => r\.user\?\.login === AGENT_USERNAME\)$/gm,
        (_match, indent) => {
          const lines = [
            `${indent}const reactionOwners = reasonixReactionOwners(actor, useGithubToken)`,
            markerInserted
              ? null
              : `${indent}const ${module.exports.marker} = "reasonix-github-reaction-cleanup-v1"`,
            `${indent}const eyesReaction = reactions.data.find((r) => reactionOwners.has(r.user?.login ?? ""))`,
          ].filter(Boolean);
          markerInserted = true;
          return lines.join("\n");
        },
      );

      return next;
    },
    module.exports.name,
  );
  if (!applied) throw new Error("GitHub reaction cleanup patch failed: github command anchor not found");
}

module.exports = {
  name: "github-reaction-cleanup",
  marker: "REASONIX_GITHUB_REACTION_CLEANUP_MARKER",
  applicabilityMatchers: [/cli\/cmd\/github/i],
  required: true,
  fallbackPatchFiles: [],
  apply,
};
