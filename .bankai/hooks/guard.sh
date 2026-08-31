#!/usr/bin/env bash
#
# Bankai anti-hallucination guard for kro-pwa.
#
# Runs as lefthook's `pre-commit` job and enforces three rules against what is
# actually staged. Each rule exists because an agent (or a tired human) reaches
# for it when a check is inconvenient:
#
#   1. No unjustified suppressions. A silenced diagnostic must say why in the
#      same line: `// biome-ignore lint/rule: reason` or
#      `// @ts-expect-error reason`. Blanket forms (`@ts-ignore`,
#      `@ts-nocheck`, `eslint-disable`) are never accepted.
#   2. Every NEW source file under `apps/web/src/**` or `packages/*/src/**`
#      arrives with a test: a sibling `*.spec.*` / `*.test.*`, or one under a
#      neighbouring `__tests__/`. A pure re-export barrel (`index.ts` with no
#      logic) is exempt, as are `*.d.ts`, stories and tests themselves.
#   3. No hardcoded credentials. Keys, secrets and tokens are read from the
#      environment; a literal in the diff fails the commit.
#
# Manual run: `.bankai/hooks/guard.sh` (reads the git index, changes nothing).
# `--no-verify` is not an escape hatch here — CI runs the same checks.

set -euo pipefail

RED=$'\033[31m'
YELLOW=$'\033[33m'
BOLD=$'\033[1m'
RESET=$'\033[0m'
if [ ! -t 2 ]; then
  RED=''
  YELLOW=''
  BOLD=''
  RESET=''
fi

violations=()

record() {
  violations+=("$1")
}

# Files whose *content* is allowed to contain the patterns below: this script
# documents them, the env template is placeholders by definition, and prose
# files are not code.
is_scan_exempt() {
  case "$1" in
    .bankai/hooks/guard.sh | .env.example | *.md | pnpm-lock.yaml) return 0 ;;
    *) return 1 ;;
  esac
}

added_lines() {
  # Only the '+' side of the staged diff, without the '+++' file header.
  git diff --cached --unified=0 --diff-filter=ACM -- "$1" |
    sed -n 's/^+\([^+].*\)$/\1/p;s/^+$//p'
}

# --------------------------------------------------------------------------
# Rules 1 and 3 — scanned over staged additions.
# --------------------------------------------------------------------------

SECRET_ASSIGNMENT='(SUPABASE_ANON_KEY|SUPABASE_[A-Z_]*KEY|API_?KEY|[A-Z_]*SECRET[A-Z_]*|ACCESS_TOKEN|PRIVATE_KEY)[[:space:]]*[:=][[:space:]]*[^[:space:]]'

# Every check below runs once per file over the whole block of added lines —
# never once per line. A pre-commit hook that takes half a minute is a hook
# people start bypassing.
while IFS= read -r file; do
  [ -n "$file" ] || continue
  is_scan_exempt "$file" && continue

  lines="$(added_lines "$file")"
  [ -n "$lines" ] || continue

  # -- Rule 1: unjustified suppressions -------------------------------------
  if printf '%s\n' "$lines" | grep -qE '@ts-nocheck'; then
    record "$file: blanket '@ts-nocheck' — type-check the file instead"
  fi
  if printf '%s\n' "$lines" | grep -qE '@ts-ignore'; then
    record "$file: '@ts-ignore' — use '@ts-expect-error <reason>' or fix the type"
  fi
  if printf '%s\n' "$lines" | grep -qE 'eslint-disable'; then
    record "$file: 'eslint-disable' — ESLint is gone; use a justified biome-ignore"
  fi
  if printf '%s\n' "$lines" | grep -qE '@ts-expect-error[[:space:]]*(\*/)?[[:space:]]*$'; then
    record "$file: '@ts-expect-error' with no reason — say why on the same line"
  fi
  if printf '%s\n' "$lines" |
    grep -E 'biome-ignore(-all|-start|-end)?[[:space:]]' |
    grep -qvE 'biome-ignore[a-z-]*[[:space:]]+[^:]+:[[:space:]]*[^[:space:]]'; then
    record "$file: 'biome-ignore' with no reason — 'biome-ignore <rule>: <why>'"
  fi

  # -- Rule 3: hardcoded secrets --------------------------------------------
  # Reading the value from the environment (or interpolating it) is the
  # correct shape and is not a finding.
  if printf '%s\n' "$lines" | grep -E "$SECRET_ASSIGNMENT" |
    grep -qvE 'process\.env|import\.meta\.env|\$\{|<[A-Za-z_-]+>'; then
    record "$file: looks like a hardcoded credential — read it from the environment"
  fi
done < <(git diff --cached --name-only --diff-filter=ACM)

# --------------------------------------------------------------------------
# Rule 2 — every new source file arrives with a test.
# --------------------------------------------------------------------------

# A barrel is a file that only re-exports: no declarations, no logic.
is_barrel() {
  local file="$1"
  case "$(basename "$file")" in
    index.ts | index.tsx) ;;
    *) return 1 ;;
  esac
  ! grep -qE '\b(function|class|=>|const[[:space:]]|let[[:space:]]|var[[:space:]])' "$file"
}

has_test_for() {
  local file="$1"
  local dir base stem
  dir="$(dirname "$file")"
  base="$(basename "$file")"
  stem="${base%.*}"

  local candidate
  for candidate in \
    "$dir/$stem.spec.ts" "$dir/$stem.spec.tsx" \
    "$dir/$stem.test.ts" "$dir/$stem.test.tsx" \
    "$dir/__tests__/$stem.spec.ts" "$dir/__tests__/$stem.spec.tsx" \
    "$dir/__tests__/$stem.test.ts" "$dir/__tests__/$stem.test.tsx"; do
    if [ -f "$candidate" ] || git ls-files --cached --error-unmatch "$candidate" >/dev/null 2>&1; then
      return 0
    fi
  done
  return 1
}

while IFS= read -r file; do
  [ -n "$file" ] || continue

  case "$file" in
    apps/web/src/*.ts | apps/web/src/*.tsx | packages/*/src/*.ts | packages/*/src/*.tsx) ;;
    *) continue ;;
  esac
  case "$file" in
    *.d.ts | *.spec.ts | *.spec.tsx | *.test.ts | *.test.tsx | *.stories.ts | *.stories.tsx) continue ;;
    */__tests__/*) continue ;;
  esac

  [ -f "$file" ] && is_barrel "$file" && continue

  if ! has_test_for "$file"; then
    record "$file: new source file with no test — add '$(basename "${file%.*}").spec.${file##*.}' beside it or under __tests__/"
  fi
done < <(git diff --cached --name-only --diff-filter=A)

# --------------------------------------------------------------------------

if [ ${#violations[@]} -gt 0 ]; then
  printf '%s\n' "${RED}${BOLD}Bankai guard: ${#violations[@]} violation(s) — commit refused.${RESET}" >&2
  printf '%s\n' '' >&2
  for violation in "${violations[@]}"; do
    printf '%s\n' "  ${RED}✗${RESET} ${violation}" >&2
  done
  printf '%s\n' '' >&2
  printf '%s\n' "${YELLOW}Fix the finding. Do not pass --no-verify: CI runs the same rules.${RESET}" >&2
  exit 1
fi

exit 0
