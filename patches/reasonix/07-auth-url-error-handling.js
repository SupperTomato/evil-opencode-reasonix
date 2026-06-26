"use strict";

function apply(context) {
  const candidates = context.filesMatching([/cli\/cmd\/auth/i]);
  if (candidates.length === 0) return;
  const applied = context.replaceInFirstMatch(
    candidates,
    (contents) => {
      if (new RegExp(module.exports.marker).test(contents)) return contents;
      const target = 'const wellknown = await fetch(`${args.url}/.well-known/opencode`).then((x) => x.json() as any)';
      const replacement = [
        `// ${module.exports.marker}: reasonix-auth-url-error-handling-v1`,
        "let wellknown: any",
        "try {",
        '  wellknown = await fetch(`${args.url}/.well-known/opencode`).then((x) => {',
        '    if (!x.ok) throw new Error(`Failed to fetch provider metadata: ${x.status} ${x.statusText}`)',
        "    return x.json() as any",
        "  })",
        "} catch (error) {",
        '  prompts.log.error(error instanceof Error ? error.message : "Failed to reach provider metadata endpoint")',
        '  prompts.outro("Done")',
        "  return",
        "}",
      ].join("\n");
      return contents.includes(target) ? contents.replace(target, replacement) : contents;
    },
    module.exports.name,
  );
  if (!applied) throw new Error("Auth URL error handling patch failed: auth command anchor not found");
}

module.exports = {
  name: "auth-url-error-handling",
  marker: "REASONIX_AUTH_URL_ERROR_HANDLING_MARKER",
  applicabilityMatchers: [/cli\/cmd\/auth/i],
  required: true,
  fallbackPatchFiles: [],
  apply,
};
