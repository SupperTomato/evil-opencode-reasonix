"use strict";

module.exports = [
  require("./01-reasonix-prefix"),
  require("./02-reasonix-session-shape"),
  require("./03-reasonix-compaction"),
  require("./04-reasonix-tool-output-hygiene"),
  require("./05-plugin-loader-compat"),
  require("./06-run-file-arg-compat"),
  require("./07-auth-url-error-handling"),
  require("./08-pr-merged-fallback"),
  require("./09-bun-install-resilience"),
  require("./10-mcp-add-persist")
];
