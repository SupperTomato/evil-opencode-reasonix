"use strict";

const fs = require("node:fs");
const path = require("node:path");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function listFiles(rootDir) {
  const files = [];
  function walk(currentDir) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".git") continue;
        walk(fullPath);
        continue;
      }
      files.push(fullPath);
    }
  }
  walk(rootDir);
  return files;
}

function findFiles(rootDir, predicate) {
  return listFiles(rootDir).filter(predicate);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, value);
}

function copyFileIfPresent(fromPath, toPath) {
  if (!fs.existsSync(fromPath)) return false;
  ensureDir(path.dirname(toPath));
  fs.copyFileSync(fromPath, toPath);
  return true;
}

module.exports = {
  copyFileIfPresent,
  ensureDir,
  findFiles,
  listFiles,
  readJson,
  writeJson,
  writeText
};
