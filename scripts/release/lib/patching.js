"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { ensureDir, findFiles } = require("./fs");

function createContext(workspaceRoot) {
  const patchLog = [];

  function projectFiles() {
    return findFiles(workspaceRoot, (filePath) => /\.(cjs|cts|js|json|jsx|mjs|mts|ts|tsx)$/.test(filePath));
  }

  function relative(filePath) {
    return path.relative(workspaceRoot, filePath);
  }

  function read(filePath) {
    return fs.readFileSync(filePath, "utf8");
  }

  function write(filePath, contents) {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, contents);
  }

  function replaceInFirstMatch(candidates, transform, label) {
    for (const filePath of candidates) {
      const before = read(filePath);
      const after = transform(before, filePath);
      if (typeof after === "string" && after !== before) {
        write(filePath, after);
        patchLog.push({ label, file: relative(filePath) });
        return { filePath, relative: relative(filePath) };
      }
    }
    return null;
  }

  function filesMatching(matchers) {
    return projectFiles().filter((filePath) => {
      const rel = relative(filePath);
      return matchers.some((matcher) => matcher.test(rel));
    });
  }

  function runGitApply(patchFilePath) {
    execFileSync("git", ["apply", "--3way", patchFilePath], {
      cwd: workspaceRoot,
      stdio: "pipe"
    });
    patchLog.push({ label: "git-apply", file: path.basename(patchFilePath) });
  }

  return {
    filesMatching,
    patchLog,
    projectFiles,
    read,
    relative,
    replaceInFirstMatch,
    runGitApply,
    workspaceRoot,
    write
  };
}

module.exports = { createContext };
