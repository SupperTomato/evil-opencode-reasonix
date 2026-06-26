# Evil OpenCode Reasonix

This repo builds a release pipeline on top of `winmin/evil-opencode`.

It does three things:

- watches `winmin/evil-opencode` releases
- resolves the matching source state or falls back to upstream OpenCode when needed
- applies a Reasonix cache-preservation patch layer before building and releasing

## Cache Audit

Live upstream research found three cache-hit behaviors that matter for current OpenCode-based releases:

- OpenAI Responses multi-turn continuity via persisted `previous_response_id`
- broader `promptCacheKey` wiring for SDK-based OpenAI and GitHub Copilot providers
- cache-aligned compaction so the compaction request reuses the same cached prefix as the main loop

The current `winmin/evil-opencode` `v1.17.11-unguarded` release already carries basic prompt-cache markers, but it does not include all of the later cache-hit behavior above. This repo patches those missing behaviors in a release-safe second layer.

## Validation

Local validation:

```bash
npm test
```

Live validation performed against `winmin/evil-opencode` `v1.17.11-unguarded`:

- source resolution succeeds
- Reasonix patch application succeeds
- release verification succeeds
- patched `packages/opencode` passes `bun run --cwd packages/opencode typecheck`
