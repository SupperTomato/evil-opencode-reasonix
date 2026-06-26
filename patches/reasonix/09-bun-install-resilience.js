"use strict";

function apply(context) {
  const candidates = context.filesMatching([/bun\/index/i]);
  if (candidates.length === 0) return;
  const applied = context.replaceInFirstMatch(
    candidates,
    (contents) => {
      if (new RegExp(module.exports.marker).test(contents)) return contents;
      const target = [
        "    await BunProc.run(args, {",
        "      cwd: Global.Path.cache,",
        "    }).catch((e) => {",
        "      throw new InstallFailedError(",
        "        { pkg, version },",
        "        {",
        "          cause: e,",
        "        },",
        "      )",
        "    })",
      ].join("\n");
      const replacement = [
        `    // ${module.exports.marker}: reasonix-bun-install-resilience-v1`,
        "    await BunProc.run(args, {",
        "      cwd: Global.Path.cache,",
        "    }).catch(async (e) => {",
        "      const existingPkg = await Bun.file(path.join(mod, \"package.json\")).json().catch(() => null)",
        "      const resolvedExisting = parsed.dependencies[pkg] ?? existingPkg?.version",
        "      if (existingPkg && (version === \"latest\" || resolvedExisting === version)) {",
        "        log.warn(\"bun add failed after package materialized; reusing installed package\", {",
        "          pkg,",
        "          version,",
        "          resolvedExisting,",
        "        })",
        "        return",
        "      }",
        "      throw new InstallFailedError(",
        "        { pkg, version },",
        "        {",
        "          cause: e,",
        "        },",
        "      )",
        "    })",
      ].join("\n");
      return contents.includes(target) ? contents.replace(target, replacement) : contents;
    },
    module.exports.name,
  );
  if (!applied) throw new Error("Bun install resilience patch failed: bun install anchor not found");
}

module.exports = {
  name: "bun-install-resilience",
  marker: "REASONIX_BUN_INSTALL_RESILIENCE_MARKER",
  applicabilityMatchers: [/bun\/index/i],
  required: true,
  fallbackPatchFiles: [],
  apply,
};
