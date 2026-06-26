"use strict";

function apply(context) {
  const candidates = context.filesMatching([/plugin\/index/i]);
  if (candidates.length === 0) return;
  const applied = context.replaceInFirstMatch(
    candidates,
    (contents) => {
      if (new RegExp(module.exports.marker).test(contents)) return contents;
      const target = [
        "      const mod = await import(plugin)",
        "      // Prevent duplicate initialization when plugins export the same function",
        "      // as both a named export and default export (e.g., `export const X` and `export default X`).",
        "      // Object.entries(mod) would return both entries pointing to the same function reference.",
        "      const seen = new Set<PluginInstance>()",
        "      for (const [_name, fn] of Object.entries<PluginInstance>(mod)) {",
        "        if (seen.has(fn)) continue",
        "        seen.add(fn)",
        "        const init = await fn(input)",
        "        hooks.push(init)",
        "      }",
      ].join("\n");
      const replacement = [
        `      const ${module.exports.marker} = "reasonix-plugin-loader-compat-v1"`,
        "      const mod = await import(plugin)",
        "      // Only callable exports are plugin factories; some plugins expose metadata objects as defaults.",
        "      // Deduplicate identical factory functions when they are exported under multiple names.",
        "      const seen = new Set<PluginInstance>()",
        "      for (const [_name, exported] of Object.entries(mod)) {",
        "        if (typeof exported !== \"function\") continue",
        "        const fn = exported as PluginInstance",
        "        if (seen.has(fn)) continue",
        "        seen.add(fn)",
        "        const init = await fn(input)",
        "        hooks.push(init)",
        "      }",
      ].join("\n");
      return contents.includes(target) ? contents.replace(target, replacement) : contents;
    },
    module.exports.name,
  );
  if (!applied) throw new Error("Plugin loader compatibility patch failed: loader anchor not found");
}

module.exports = {
  name: "plugin-loader-compat",
  marker: "REASONIX_PLUGIN_LOADER_COMPAT_MARKER",
  applicabilityMatchers: [/plugin\/index/i],
  required: true,
  fallbackPatchFiles: [],
  apply,
};
