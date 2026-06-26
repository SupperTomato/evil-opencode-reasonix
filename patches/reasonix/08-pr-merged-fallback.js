"use strict";

function apply(context) {
  const candidates = context.filesMatching([/cli\/cmd\/pr/i]);
  if (candidates.length === 0) return;
  const applied = context.replaceInFirstMatch(
    candidates,
    (contents) => {
      if (new RegExp(module.exports.marker).test(contents)) return contents;
      const target = "const result = await $`gh pr checkout ${prNumber} --branch ${localBranchName} --force`.nothrow()";
      const replacement = [
        `// ${module.exports.marker}: reasonix-pr-merged-fallback-v1`,
        "let result = await $`gh pr checkout ${prNumber} --branch ${localBranchName} --force`.nothrow()",
        "",
        "        if (result.exitCode !== 0) {",
        "          const fallbackInfo = await $`gh pr view ${prNumber} --json state,mergeCommit`.nothrow()",
        "          if (fallbackInfo.exitCode === 0) {",
        "            const prInfo = JSON.parse(fallbackInfo.text())",
        '            const mergeOid = prInfo?.mergeCommit?.oid',
        '            if (prInfo?.state === "MERGED" && mergeOid) {',
        "              const fetchResult = await $`git fetch origin ${mergeOid}`.nothrow()",
        "              if (fetchResult.exitCode === 0) {",
        "                const checkoutResult = await $`git checkout -B ${localBranchName} ${mergeOid}`.nothrow()",
        "                if (checkoutResult.exitCode === 0) {",
        "                  result = checkoutResult",
        "                }",
        "              }",
        "            }",
        "          }",
        "        }",
      ].join("\n");
      return contents.includes(target) ? contents.replace(target, () => replacement) : contents;
    },
    module.exports.name,
  );
  if (!applied) throw new Error("PR merged fallback patch failed: pr command anchor not found");
}

module.exports = {
  name: "pr-merged-fallback",
  marker: "REASONIX_PR_MERGED_FALLBACK_MARKER",
  applicabilityMatchers: [/cli\/cmd\/pr/i],
  required: true,
  fallbackPatchFiles: [],
  apply,
};
