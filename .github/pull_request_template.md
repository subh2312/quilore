<!-- Target branch must be `dev`. Never open a PR into `main` unless the user explicitly asked for it. -->

## What
<!-- Files/modules touched, in 1-2 lines. -->

## Why
<!-- Which requirement, bug, or section of AGENTS.md / docs/Quilore.md this addresses. -->

## How
<!-- Approach taken, and any alternative you considered and rejected. -->

## Checklist
- [ ] Branch is named after the agent/tool that did the work (`cursor`, `copilot`, `claude`, `gemini`, `codex`, ...)
- [ ] Base branch is `dev`, not `main`
- [ ] Reused existing code/components where possible instead of duplicating
- [ ] No new abstraction/config beyond what this task needs
- [ ] Follows the Locked Architecture boundary and `docs/Quilore.md` §3/§4 (System Architecture / Design System)
- [ ] Added a matching entry to `docs/agent-log.md`
