# Evil OpenCode Reasonix Pipeline

This workspace now contains a fresh GitHub Actions scaffold that:

- polls `winmin/evil-opencode` releases
- resolves the preferred source ref from `winmin/evil-opencode`
- falls back to `anomalyco/opencode` plus a minimal evil patch when source refs are unavailable
- applies four Reasonix patch modules
- supports `git apply --3way` fallback hooks for modules that later need raw patch files
- verifies the required invariants before any release is published
- opens a repair PR with diagnostics instead of shipping a partial patch

## Files

- `.github/workflows/poll-evil-opencode.yml`
- `.github/workflows/build-and-release.yml`
- `scripts/release/*.js`
- `patches/evil/*.js`
- `patches/reasonix/*.js`

## Current Limit

The patch modules are implemented as source-anchored codemods with fixture-backed tests. They are ready for a repo that matches the expected anchors, and they intentionally fail closed when those anchors drift so the repair PR path can trigger.

## Local Verification

Run:

```bash
npm test
```
