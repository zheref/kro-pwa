#!/usr/bin/env bash
#
# pr_screenshots.sh — mirror this branch's recorded landing/app PNG captures to
# the public kro-assets host and print ready-to-paste UZF-26 table cells for the
# PR description.
#
# UZF-26 (bankai-core) · nen/contract.json -> project.evidence (mechanism
# public-mirror). The captures are Playwright screenshots recorded from mock /
# stubbed data by apps/web/e2e/*-shots.spec.ts into
# apps/web/e2e/__screenshots__/<suite>/<scene>.png and committed in git. They are
# mirrored to the PUBLIC zheref/kro-assets repo under kro-pwa/pr-<n>/ and
# referenced via SHA-pinned raw URLs, which GitHub's anonymous image proxy
# renders inline — the same shape zheref/KroApple and zheref/KroAndroid use.
#
# SIDE EFFECT — one-way public disclosure. This PUSHES the PNGs to a public
# repo. Once pushed they are PERMANENTLY public (git history and any fork or
# clone persists a later delete). Only captures rendered from mock fixtures /
# stubbed services may ever be mirrored — never a capture of real data. The
# script confirms before pushing unless -y is passed.
#
# Prerequisites:
#   • SSH push access to zheref/kro-assets
#   • an authenticated gh CLI (for `gh pr view`)
#   • an OPEN PR on the current branch (its number is the kro-assets folder)
#
# Usage: scripts/pr_screenshots.sh [-y|--yes] [base-ref]   (base default: origin/main)
set -euo pipefail

ASSUME_YES=0
BASE="origin/main"
for arg in "$@"; do
    case "$arg" in
        -y|--yes) ASSUME_YES=1 ;;
        *) BASE="$arg" ;;
    esac
done

ASSETS_SLUG="zheref/kro-assets"
ASSETS_REMOTE="git@github.com:${ASSETS_SLUG}.git"
SHOTS_ROOT="apps/web/e2e/__screenshots__"

if ! git rev-parse --verify --quiet "${BASE}^{commit}" >/dev/null; then
    echo "error: base ref '${BASE}' not found. Fetch it first (e.g. 'git fetch origin main')." >&2
    exit 2
fi

origin_url="$(git remote get-url origin)"
repo_name="$(printf '%s' "$origin_url" | sed -E 's#.*[/:]##; s#\.git$##')"

pr_num="$(gh pr view --json number --jq '.number' 2>/dev/null || true)"
if [ -z "$pr_num" ]; then
    echo "error: no open PR for the current branch — needed for the kro-assets 'pr-<n>' path." >&2
    echo "Push the branch and open its PR first, then re-run." >&2
    exit 3
fi

# Capture PNGs added/modified on this branch vs BASE (NUL-safe; skip deletions).
snaps=()
while IFS= read -r -d '' path; do
    case "$path" in
        "${SHOTS_ROOT}"/*.png) snaps+=("$path") ;;
    esac
done < <(git diff -z --name-only --diff-filter=ACMR "${BASE}...HEAD" -- '*.png')

if [ "${#snaps[@]}" -eq 0 ]; then
    echo "No capture PNGs under ${SHOTS_ROOT} changed vs ${BASE}."
    echo "If this PR changes a rendered surface, record its captures (apps/web/e2e/*-shots.spec.ts)"
    echo "and commit the PNGs. If it is logic-only, say so under ## Evidence in the PR."
    exit 0
fi

sorted=()
while IFS= read -r -d '' p; do sorted+=("$p"); done < <(printf '%s\0' "${snaps[@]}" | sort -z)
snaps=("${sorted[@]}")

scene_of() {
    # {suite}-{scene}: the suite is the directory under __screenshots__, so two
    # suites with a same-named scene never collide on the destination filename.
    local rel="${1#"${SHOTS_ROOT}"/}"
    local suite="${rel%%/*}"
    local b; b="$(basename "$1" .png)"
    if [ "$suite" = "$rel" ]; then printf '%s' "$b"; else printf '%s-%s' "$suite" "$b"; fi
}

# --- Confirmation gate (one-way public disclosure) ---
echo "About to PUBLISH these capture PNGs to the PUBLIC repo ${ASSETS_SLUG} (permanent):" >&2
for p in "${snaps[@]}"; do echo "  ${repo_name}/pr-${pr_num}/$(scene_of "$p").png  ←  $p" >&2; done
echo "They must be MOCK-fixture renders only (never real data) — this cannot be undone." >&2
if [ "$ASSUME_YES" -ne 1 ]; then
    if [ ! -t 0 ]; then
        echo "error: refusing to push without confirmation (no TTY). Re-run with -y once you've confirmed the images are mock-only." >&2
        exit 4
    fi
    printf 'Publish to the public host? [y/N] ' >&2
    read -r ans
    case "$ans" in y|Y|yes) ;; *) echo "aborted." >&2; exit 1 ;; esac
fi

# --- Mirror + push ---
# Blobless + sparse clone: kro-assets is an append-only, world-readable mirror
# of every Kro product's snapshot PNGs and only grows. Fetch metadata without
# blob contents, skip the tip checkout, cone-sparse to this PR's folder only
# (KroApple #410 reproduced a stalled full clone on CI).
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

sparse_path="${repo_name}/pr-${pr_num}"
git clone -q --filter=blob:none --no-checkout --depth 1 "$ASSETS_REMOTE" "$work/a"
(
    cd "$work/a"
    git sparse-checkout init --cone
    git sparse-checkout set "$sparse_path"
    git checkout -q
)
destdir="$work/a/${sparse_path}"
mkdir -p "$destdir"
for p in "${snaps[@]}"; do
    cp "$p" "$destdir/$(scene_of "$p").png"
done
(
    cd "$work/a"
    git add -A
    if ! git diff --cached --quiet; then
        git -c commit.gpgsign=false commit -q -m "${repo_name} #${pr_num} captures"
        # No delta compression on the push: PNGs are already compressed and a
        # delta search over the blobless clone's promisor blobs could lazy-fetch them.
        git -c pack.window=0 -c pack.depth=0 push -q origin HEAD
    fi
)
assets_sha="$(cd "$work/a" && git rev-parse HEAD)"
base_url="https://raw.githubusercontent.com/${ASSETS_SLUG}/${assets_sha}/${repo_name}/pr-${pr_num}"

echo "----- pushed to ${ASSETS_SLUG}@${assets_sha}; UZF-26 cells for the PR's ## Evidence table -----"
echo
echo "_Recorded Playwright captures (UZF-26), mock/stubbed data. Hosted in the public [\`kro-assets\`](https://github.com/${ASSETS_SLUG}) repo at ${assets_sha}._"
echo
echo "Cell shape: width 180 for a phone, 320 for a wide screen; alt text is 'state, variant'."
for p in "${snaps[@]}"; do
    s="$(scene_of "$p")"
    w=320; case "$s" in *mobile*|*phone*|*390*) w=180 ;; esac
    printf '%s\t<img src="%s/%s.png" width="%s" alt="%s">\n' "$s" "$base_url" "$s" "$w" "$s"
done
