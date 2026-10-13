#!/usr/bin/env bash
#
# scripts/test_hanten_gate.sh -- tests for scripts/hanten_gate.sh, the
# `hanten` review round that nen/gates.json names as the base reviewer.
#
# Every case is a pull request body and the exit code (and, for a failure,
# the row or reason) the gate must answer with. Nothing here touches GitHub.
# Run it directly, or through `make test-hanten-gate`; the Lint workflow runs
# it too, so the gate cannot drift away from its own tests.

set -u

cd "$(dirname "$0")/.." || exit 1

readonly GATE="scripts/hanten_gate.sh"

failures=0
checks=0
# Asserted at the end, so a silent skip cannot hide inside a green verdict.
EXPECTED_CHECKS=40

HEAD='## Adversarial review (hanten)'
TICK='- [x] Adversarial review settled — hanten · nobunaga: 2 findings, all disposed'
TABLE='| id | persona | rule | severity | file | disposition |
|---|---|---|---|---|---|'

# check <label> <expected exit> <expected text or ""> <body>
check() {
    local label=$1 want=$2 needle=$3 body=$4 out rc
    out=$(PR_BODY="$body" bash "$GATE" 2>&1); rc=$?
    checks=$((checks + 1))
    if [ "$rc" -ne "$want" ]; then
        echo "FAIL  $label: exit $rc, wanted $want"; echo "$out" | sed 's/^/      /'; failures=$((failures + 1)); return
    fi
    if [ -n "$needle" ]; then
        checks=$((checks + 1))
        if ! grep -qF -- "$needle" <<<"$out"; then
            echo "FAIL  $label: output lacks '$needle'"; echo "$out" | sed 's/^/      /'; failures=$((failures + 1)); return
        fi
    fi
    echo "ok    $label"
}

body() { printf '## What & why\n\nx\n\n%s\n\n%s\n%s\n\n## Completion checklist\n\n%s\n' "$HEAD" "$TABLE" "$1" "${2:-$TICK}"; }

check "settled table (fixed, pushed-back, deferred with an issue)" 0 "hanten: settled" "$(body '| no-01 | nobunaga | UZF-18 | high | `a.sh` | **fixed** — added the test |
| fe-02 | feitan | SEC-14 | low | `h.yml` | **pushed-back** — repo-wide follow-up |
| hi-03 | hisoka | UZF-26 | medium | `t.swift` | **deferred** — tracked as #621 |')"
check "no findings table at all" 0 "hanten: settled" "$(printf '%s\n\nNo scope found anything.\n\n%s\n' "$HEAD" "$TICK")"
check "an open row fails and names it" 1 "no-02" "$(body '| no-01 | n | R | low | f | **fixed** — x |
| no-02 | n | R | low | f | open |')"
check "an unsettled row fails" 1 "no-03" "$(body '| no-03 | n | R | low | f | unsettled |')"
check "an empty disposition fails" 1 "no-04" "$(body '| no-04 | n | R | low | f |  |')"
check "a keyword prefix is not a disposition" 1 "no-05" "$(body '| no-05 | n | R | low | f | fixed? no, still open |')"
check "a bare keyword without a reason fails" 1 "no reason given" "$(body '| no-06 | n | R | low | f | **fixed** |')"
check "deferred without a tracked item fails" 1 "without a tracked item" "$(body '| no-07 | n | R | low | f | **deferred** — later |')"
check "deferred with a URL passes" 0 "hanten: settled" "$(body '| no-08 | n | R | low | f | **deferred** — https://github.com/zheref/kro-pwa/issues/1 |')"
check "a bold Disposition header is still read" 1 "no-09" "$(printf '%s\n\n| id | **Disposition** |\n|---|---|\n| no-09 | open |\n\n%s\n' "$HEAD" "$TICK")"
check "a reordered disposition column is read" 1 "no-10" "$(printf '%s\n\n| disposition | id |\n|---|---|\n| open | no-10 |\n\n%s\n' "$HEAD" "$TICK")"
check "a pipeless table fails rather than being skipped" 1 "without leading pipes" "$(printf '%s\n\nid | disposition\n--|--\nno-11 | open\n\n%s\n' "$HEAD" "$TICK")"
check "a missing section fails" 1 "no '## Adversarial review (hanten)' section" "$(printf '## What & why\n\nx\n\n%s\n' "$TICK")"
check "an unticked checklist fails" 1 "does not tick" "$(body '| no-12 | n | R | low | f | **fixed** — x |' '- [ ] Adversarial review settled')"
check "an empty body exits 2" 2 "no body" ""
check "CRLF line endings are read" 0 "hanten: settled" "$(body '| no-13 | n | R | low | f | **fixed** — x |' | sed 's/$/\r/')"
check "a later table outside the section is ignored" 0 "hanten: settled" "$(body '| no-14 | n | R | low | f | **fixed** — x |')
| id | disposition |
|---|---|
| zz-1 | open |"

check "an indented table is still read" 1 "no-15" "$(printf '%s\n\n  | id | disposition |\n  |---|---|\n  | no-15 | open |\n\n%s\n' "$HEAD" "$TICK")"
check "a backticked disposition header is still read" 1 "no-16" "$(printf '%s\n\n| id | `disposition` |\n|---|---|\n| no-16 | open |\n\n%s\n' "$HEAD" "$TICK")"
check "the template's untouched header-only table fails" 1 "header and no rows" "$(printf '%s\n\n%s\n\n%s\n' "$HEAD" "$TABLE" "$TICK")"

if [ "$checks" -ne "$EXPECTED_CHECKS" ]; then
    echo "FAIL  ran $checks checks, expected $EXPECTED_CHECKS"; failures=$((failures + 1))
fi
if [ "$failures" -ne 0 ]; then echo "$failures failure(s)"; exit 1; fi
echo "all $checks checks passed"
