<!--
Thanks for the PR. CON-17: every PR carries `# What this changes for you` and
`## How to verify`; hatsu:shibari fills the rest from templates/pr-body.md.
-->

## Why



## How



# What this changes for you



## How to verify



## Evidence

<!--
UZF-26. One table per user-facing screen: STATES as columns, VARIANTS
(device · theme) as bold rows, one fixed-width image per cell with alt text
"state, variant". Images are the Playwright captures under
apps/web/e2e/__screenshots__/, mirrored to zheref/kro-assets by
scripts/pr_screenshots.sh. A logic-only change says so here instead.
-->

## Adversarial review (hanten)

<!--
The `hanten` check (scripts/hanten_gate.sh) reads this section; it is the
review round `nen pr ready` waits on (nen/gates.json, ruling 2026-10-05).
Keep the heading exactly as written. One row per finding. Disposition is
`**fixed** — what changed`, `**pushed-back** — the cited reason` or
`**deferred** — #<issue>`; anything else fails the check. No findings: say so
and leave the table out.
-->

| id | persona | rule | severity | file | disposition |
|---|---|---|---|---|---|

## Completion checklist (`.claude/rules/react-uzf-v1/12-session-completion-checklist.md`)

- [ ] Adversarial review settled — every hanten finding fixed, pushed back with a reason, or deferred to an issue
- [ ] `make lint && make typecheck && make test && make build` green locally
- [ ] Touched-file coverage ≥ 80% with the per-artifact test minimums met (≥3 stories and ≥3 render tests per Page/Fragment, ≥7 mocks per model)
- [ ] Mermaid diagram(s) in `docs/Features/<Feature>.md` current
- [ ] Feature spec current (language-agnostic; behaviour, not types)
- [ ] New user-visible behaviour is behind a feature flag (or N/A)
- [ ] Screenshots embedded under `## Evidence` for any UI change (or "no UI surface changed")

## Associated issues

<!-- One row per issue, canonical URL; `Closes #N` on its own line for every completes-row. -->

| Issue | Scope this PR implements | Merging this |
|---|---|---|

## Agent attribution

<!-- Every and only the agents that took part, with persona, contribution and evidence. Final heading. -->
