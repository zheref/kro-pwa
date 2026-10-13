#!/usr/bin/env bash
#
# hanten_gate.sh — the `hanten` review round, as a check (ruling 2026-10-05)
#
# Copilot and Cursor Bugbot ran out of review credits, so an AI bot round can
# no longer be what CON-32(b) waits on. nen/gates.json now names `hanten` as
# the one base reviewer, and this script is that reviewer's round: it passes
# when the pull request body records a settled hanten review and fails when it
# does not. `nen pr ready` counts a SUCCESS of the `hanten` check as the round.
#
# WHAT IT ATTESTS: the body, not the review. Whoever can edit the body can
# write a passing section; the check makes an unsettled or missing review
# visible, and the merge stays a human (or maintainer-delegated) decision.
#
# Settled means all of:
#   1. a `## Adversarial review (hanten)` section exists;
#   2. every row of its findings table — any table in the section whose header
#      has a `disposition` column, bold or not — carries a disposition that is
#      exactly `fixed`, `pushed-back` or `deferred` followed by its reason
#      (`**fixed** — what changed`); a `deferred` row must also cite the
#      tracked item (`#123` or a URL). An empty, `open` or `unsettled`
#      disposition fails, naming the row. Table rows must start with `|`;
#      a pipe table written without its leading pipe fails rather than being
#      silently skipped. Leading indentation is ignored and a header cell
#      may be bold or backticked;
#   3. the completion checklist ticks `Adversarial review settled`.
# A section with no findings table is accepted: a change no scope found
# anything in is settled by saying so. A findings table with a header and no
# rows is not — it is the template left untouched, and it fails.
#
# Input: $PR_BODY when set, else stdin.
# Exit 0 settled, 1 not settled, 2 no body at all.
#
set -u

if [ -n "${PR_BODY+x}" ]; then
    body=$PR_BODY
elif [ ! -t 0 ]; then
    body=$(cat)
else
    body=""
fi
body=$(tr -d '\r' <<<"$body")

if [ -z "$body" ]; then
    echo "::error::hanten: the pull request has no body, so no hanten review is recorded"
    exit 2
fi

fail=0
flag() { echo "::error::hanten: $1"; fail=1; }

if ! grep -qE '^## Adversarial review \(hanten\)' <<<"$body"; then
    flag "no '## Adversarial review (hanten)' section in the body"
fi

# The hanten section: from its heading to the next `## ` heading.
section=$(awk '
    /^## / { inside = ($0 ~ /^## Adversarial review \(hanten\)/); next }
    inside { sub(/^[ \t]+/, ""); print }
' <<<"$body")

# The disposition column is found by its header name, so a reordered table
# still reads right. Every verdict is printed as `ok`, or as the row id.
verdicts=$(awk -F'|' '
    function trim(s) { gsub(/^[ \t*`]+|[ \t*`]+$/, "", s); return s }
    BEGIN { idcol = 2 }
    function close_table() { if (col && rows == 0) print "EMPTY"; col = 0; rows = 0 }
    !/^\|/ {
        close_table(); idcol = 2
        if (tolower($0) ~ /disposition/ && $0 ~ /\|/) print "PIPELESS"
        next
    }
    !col {
        for (i = 1; i <= NF; i++) {
            h = tolower(trim($i))
            if (h == "disposition") col = i
            if (h == "id") idcol = i
        }
        next
    }
    /^\|[ \t:|-]+$/ { next }
    {
        rows++
        id = trim($idcol); if (id == "") id = "(unnamed row)"
        d = $col; gsub(/\*/, "", d); sub(/^[ \t]+/, "", d)
        kw = tolower(d)
        if (kw ~ /^(fixed|pushed-back|deferred)([ \t]+[-—:–][ \t]*[^ \t]|[ \t]*$)/) {
            if (kw ~ /^deferred/ && d !~ /#[0-9]+|https?:\/\//) print id " (deferred without a tracked item)"
            else if (kw ~ /^(fixed|pushed-back|deferred)[ \t]*$/) print id " (no reason given)"
            else print "ok"
        } else {
            print id
        }
    }
    END { close_table() }
' <<<"$section")

if grep -q '^PIPELESS$' <<<"$verdicts"; then
    flag "a findings table in the hanten section is written without leading pipes; write every row as '| … |'"
fi
if grep -q '^EMPTY$' <<<"$verdicts"; then
    flag "the findings table has a header and no rows; delete it and say no scope found anything, or add the findings"
fi
unsettled=$(grep -v -e '^ok$' -e '^PIPELESS$' -e '^EMPTY$' <<<"$verdicts" | grep -v '^$')
if [ -n "$unsettled" ]; then
    flag "unsettled findings: $(tr '\n' ';' <<<"$unsettled" | sed 's/;$//')"
fi

if ! grep -qiE '^[[:space:]]*- \[x\] Adversarial review settled' <<<"$body"; then
    flag "the checklist does not tick 'Adversarial review settled'"
fi

[ "$fail" -eq 0 ] && echo "hanten: settled"
exit "$fail"
