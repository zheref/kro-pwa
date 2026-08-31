<!-- GENERATED from bankai-core@v0.11.2/handbooks/uzf-core.md — DO NOT EDIT. Not CI drift-checked (shared file, outside the wired sync_canon job); re-run sync-canon or bankai-scf to refresh. -->
# UZF Core — Cross-Platform Architecture Handbook

**General-purpose, framework-agnostic.** These are the UZF (Unidirectional Z Flow)
rules that hold on **every** stack. Sasuke cites them as `UZF-{n}`. Each stack's
handbook (`stacks/<scenario>/architecture.md`) **refines** these with concrete
framework bindings and cites its own family (`SW-{n}` for Swift/TCA, `KT-{n}` for
Kotlin/Compose, …). A stack rule may tighten a `UZF-{n}` rule but never contradict
it; a genuine conflict is a `bankai:handbook-question` scope-routed to the canon lane
(`bankai:agent/yamamoto`, `CON-37`).

Source of truth this distills: the cross-platform canon (`GENERAL_UZF_ARCHITECTURE`)
plus the rules both KroApple (iOS) and KroAndroid enforce identically.

Rule numbers are **append-only and stable**.

---

## A. The core flow (normative)

**UZF-1 — One unidirectional loop.** Every feature runs exactly one loop:
**View → sends Event → Interactor (store) → runs Reducer → Reducer shifts State
(via a Shifter) and/or produces an Effect (via a Producer) → Effect invokes a
Service → resolves a Result → dispatches a completion Event back to the
Interactor → Reducer → Shifter → View observes the State change.** No other data
path is allowed (no view mutating state directly, no service writing state, no
effect bypassing the reducer).

**UZF-2 — Events name intent or signal, never mechanism.** Event/action cases use
the prefixes `userDid…` (user intent), `on…` (system/lifecycle), `on…Completed`
(effect resolution — success **and** failure unified in one event per UZF-3),
`child…Delegated…` (child→parent). Naming a case after the effect it triggers
(`fetchProfile`, `loadData`) is forbidden.

**UZF-3 — One completion event carries a Result.** An effect's success and failure
unify into a single `on…Completed(Result<Success, …Exception>)` event. Separate
`onSuccess`/`onFailure` events are forbidden. The error is a typed, user-facing
`…Exception`, never a raw platform error.

## B. Layering & artifacts

**UZF-4 — Stateful wrapper vs. pure renderer split.** Every UI feature separates a
**framework-aware, stateful wrapper** (holds/observes the store, mounts
navigation) from a **pure, framework-free renderer** that takes plain values +
intent callbacks and is previewable in isolation. The renderer must not depend on
the store/observation framework. (Binding names differ per stack — see the stack
handbook.)

**UZF-5 — Components are domain-less.** Reusable UI with no domain knowledge lives
in a design layer, uses idiomatic vanilla framework code, and does **not**
participate in UZF (no store, no domain types). Domain-bound reusable UI is a
Fragment, not a Component.

**UZF-6 — Co-locate a feature's artifacts.** A feature's wrapper, renderer,
Interactor/Feature, Selectors, Shifters, and Producer live together in one
feature folder. Cross-feature shared logic goes to a `library/`/core layer, never
a sibling feature. Cross-feature shared *in-memory state* — read by several
features to avoid prop-drilling — is a **Context** in that core layer (the one
shared-state artifact above feature level); it never holds a feature's own `State`.

**UZF-7 — Every artifact is active or passive.** Active artifacts decide (Reducer,
Repository, the store-bound wrapper). Passive artifacts react or transform (pure
renderer, Selector, Shifter, Mapper, Service operation). An artifact that blurs
the two is a finding.

## C. State, Shifters, Selectors

**UZF-8 — Domain models in State; wire-format out.** `State` holds domain types
only — never wire-format `…Response`, raw payloads, platform error/`Throwable`
types, or in-flight task handles. Map to domain before storing.

**UZF-9 — Model exclusive states as one type.** Two or more fields that represent a
single lifecycle (loading / loaded / failed) are modeled as one enum/sealed type,
not parallel optionals.

**UZF-10 — Shifters are pure.** State mutation with an invariant (≥2 fields
together), reused across arms, or worth unit-testing alone is extracted into a
Shifter (`with…`/`as…`/`apply…` naming). A Shifter reads no clock, randomness,
environment, dependency, or service — time and identity are passed in.

**UZF-11 — Selectors are pure and derived-only.** Every value the renderer reads
that is *derived* from state is a `…Selector` computed purely from `State`. A
Selector never reads a dependency/service and has no side effects. Prefer derived
computation over storing redundant data (store a cache only with an inline
`// Redundancy: <reason>` note).

## D. Effects & Producers

**UZF-12 — Reducers are pure; no inline effects.** A reducer computes the next
state and/or *describes* an effect to run — it performs no I/O, launches no
concurrency, and contains no inline effect closures. Effects come only from a
Producer. The reducer's return value is an **Outcome** — one of four shapes
(*idle*, *state-only*, *effect-only*, or *both* a new state and an effect) — built
via factory helpers, never assembled by hand.

**UZF-13 — No service calls from a reducer.** Network, persistence, filesystem,
clock, and randomness never appear in a reducer. They live behind a dependency-
injected Service/Client/Provider. (A synchronous local `Provider` is the sole
service-tier type a reducer may read directly.)

**UZF-14 — Effects never throw; they resolve a Result.** A Producer-built effect
normalizes every outcome into `Result<Success, …Exception>` and dispatches a
single completion event. Cancellation is the only permitted silent exit. Throwing
out of an effect is forbidden.

**UZF-15 — Producers are state-free factories.** A Producer takes the specific
inputs an effect needs (ids, params, dependencies) — never the whole `State` — and
returns an effect. It performs no I/O at construction and is unit-testable in
isolation.

## E. Services & dependencies

**UZF-16 — External systems sit behind a DI'd Service with a stub.** Every network/
persistence/system boundary is an injected Service/Client with a deterministic
stub/preview/test double. Reducers and Producers receive **only** the services
they use (segregation by feature, not by domain). The only stateful service-tier
artifact is a Repository, introduced solely to coordinate services or hold a
required cache — empty/placeholder Repositories are forbidden. A **Task** — a
cancellable, trackable unit of in-flight work — is owned by a Repository, never by
a reducer or the UI.

**UZF-17 — Wire types cross the boundary; a Mapper converts to domain.** Service
operations return `…Response` wire types; a Mapper (`toDomain`/`fromDomain`/
`toException`) converts to domain inside the Producer. Domain types are never
serialization-annotated; wire types never gain UI/identity conformances.

## F. Testing

**UZF-18 — Per-artifact test minimums.** ≥3 scenario tests per non-trivial reducer
arm; ≥3 tests per Shifter and per Selector; ≥3 tests per Producer method / Mapper
function; ≥3 renderer previews **and** ≥3 matching snapshot tests (built from
mock data, no store); ≥7 domain-model mocks (3 convenient, 1 neutral, 3
inconvenient) in a build-excluded mocks file.

**UZF-19 — Coverage floor on touched files.** Every file added or modified carries
≥80% line coverage. Exemptions (pure snapshot-covered UI, generated code, mock/DI
module files) are noted in the PR.

**UZF-20 — Tests name a real scenario.** `test_<event>_<condition>_<expectation>`
(or the platform's idiom). Names like `test_state`/`test_works` are rejected.

## G. Documentation, flags & process

**UZF-21 — Language-agnostic feature spec.** Every feature that owns a feature flag
or a top-level entry point has a spec at `docs/Features/<Name>.md` describing
behavior only — no file paths, type names, or framework terms — with diagrams as
fenced mermaid code blocks inside the spec. Behavior changes update the spec (and
its diagram) in the same change. One flag = one spec; the spec body is
cross-platform canon, platform notes go under a `## <Platform> notes` subsection.

**UZF-22 — New user-visible behavior is flag-wrapped.** New user-visible behavior
is reachable only behind a feature flag registered in the platform's flag
registry with a status-quo default (usually disabled for greenfield). Internal
refactors and bug fixes need no flag.

**UZF-23 — Session-completion gate.** A change is not "done" until: touched-file
coverage ≥80% with the UZF-18 minimums met, the feature spec + mermaid diagram are
current, and new user-visible behavior is flag-wrapped. Refuse to declare done
with any item open unless the author waives it in writing with a reason. The
UZF-26 visual evidence is **not** a freely-waivable coverage item — its only two
sanctioned incompletenesses are the UZF-26 *bankai-mode timed deferral* (no
snapshot-capable runner yet — a tracked IOU with a mandatory true-up) and a
*demonstrated capture-tooling gap* (the tooling provably cannot capture a specific
scene — a tracked, skipped scene), never an arbitrary written waiver.

**Infra/process-dependency propagation is part of "done" (`CON-21`).** If the change bumped a
**shared infra/process dependency that CI resolves per-branch** — a pinned reusable-workflow
tag, a tool/runtime/SDK version, or a shared config/secret contract — the session is not
complete until that bump has **cascaded to every live `integration/*` branch** (and thereby the
feature branches off them), or an explicit, reasoned deferral is noted (e.g. no integration
branch is live). A **trunk-only repin is not a completed bump** — it silently strands every
in-flight epic on the old version (`CON-21` gives the trunk-first → cascade → inherit-by-rebase
procedure).

**UZF-24 — Migration is by encapsulation, not rewrite.** Legacy (non-UZF) code is
wrapped behind UZF Service interfaces and converted **by edge** — only the
artifacts a PR touches are converted (events first, then state, then view). The
seam is documented in the PR; a screen is retired only when its last legacy
artifact is replaced.

**UZF-25 — Database changes are repo-canon, idempotent, and applied by CI — never
by an agent in-session.** Structural DB changes (schema, RLS policies, views,
functions, grants, seed) are captured as idempotent migration files in the repo —
the repo is the source of truth and the live (shared) database never drifts from it.

**Authoring and applying are separate concerns.** The authoring agent writes the
idempotent migration file and ships it in the PR; reviewers (Sasuke/Tenma) review the
**file** — correctness and idempotency — never a live apply. **No builder or reviewer
agent holds database credentials, and the review loop never blocks on an in-session
apply it cannot perform.** (The earlier "apply to the live project in the same
session" phrasing assumed the loop had credentials; on a credential-free builder that
produced an unbreakable 3-round stall — a reviewer correctly blocking on an apply no
agent in the loop could do. That is resolved: the loop's job is the file.)

**Application is a deterministic CI pipeline (`db-migrate`), not an LLM.** On a
migration-touching PR it stands up an **isolated per-PR preview environment** — schema
replayed from the migration files (canon) plus a **sanitized/anonymized clone of prod
data** — so the human validates the change there for **G2**, in either delivery mode;
on merge to `main` it applies the pending migrations to **prod** and back-queries to
confirm. Preview environments are **capped for cost** (a small concurrent limit;
`docs/SETUP.md`). Backend authz/input rules are Tenma's lane (`SEC-{n}`); the migration
*discipline* is a UZF practice, and the apply *machinery* is `db-migrate` (deterministic
CI, scoped Supabase creds, no agent access).

**The prod ledger is a SUBSET of the repo — checked at G2, not discovered after the
merge.** "The live database never drifts from the repo" has a precise, checkable form:
every version recorded in prod's `supabase_migrations.schema_migrations` still exists in
`supabase/migrations/`. When it does not — a hand-applied or renumbered version that was
never in git — `supabase db push` **refuses to apply anything at all**, so one orphaned
remote version silently blocks *every* future migration, not merely the one that
introduced it. **A PR whose prod-ledger parity check fails is not merge-ready**, and a
**failed prod apply reports on the merged PR** (labelled `bankai:db-apply-failed`) rather
than living only as a red run on the default branch. Repairing the ledger needs prod
credentials, so it is a **human** action, never an agent's (`docs/SETUP.md` Part C step 7).
**Subset, deliberately — not "prefix".** The invariant is set containment, with **no claim
about ordering or contiguity**: a repo may legitimately carry a version *earlier* than one
prod has already applied (a migration authored on a long-lived branch and merged later), and
`db push` applies it without complaint. Saying "prefix" would assert a contiguity property
nothing checks and Supabase does not require — the exact `CON-39` failure of describing a
guarantee stronger than the mechanism delivers. If out-of-order authoring ever needs
constraining, that is a **separate** rule with its own check, not a word in this one.
*Why this is stated rather than assumed:* on `zheref/KroApple` four such versions blocked
**every** prod apply from 2026-07-21 to 2026-08-22. Nothing caught it — the per-PR preview
replays the repo's migrations onto a fresh branch and never compares the prod ledger, so
G2 saw green; the only failure signal was a red run nobody opens; and a 37-child epic's
delivery PR merged believing its migrations were live. The direction matters: a check that
asks only *"which repo migrations are unapplied?"* reports the symptom and is blind to the
cause (`bankai-core#543`).

**The migration history is self-bootstrapping — replay from empty reproduces the whole schema.**
The preview environment builds its schema by replaying the migration files against an *empty*
database, so the file history must, on its own, create **every** object the live schema has — no
table, type, function, RLS policy, or grant may exist in prod that no migration file creates. A
repo that canonizes migrations *after* its live schema already exists (foundational objects
created out-of-band — e.g. in the provider dashboard) has a history that is **not**
self-bootstrapping: replay fails on the first migration that references an uncreated object
(`relation "public.X" does not exist`). Closing that gap is a **baseline migration**, authored
once from the *live* schema — a human (or the credentialed apply step) runs the provider's
schema-pull/diff (`supabase db pull` / `supabase db diff --linked`) against prod to generate an accurate
`CREATE …` baseline, dated **before** the earliest incremental migration — never a hand-guessed
`CREATE TABLE` (guessing the real column set reintroduces the very drift that canon exists to
prevent). Until the baseline lands, the `db-migrate` preview correctly **fails** — it never fakes
a green on an un-buildable schema; a builder that hits it (it cannot author the baseline blind,
having no prod credentials) files a `bankai:handbook-question`, and the fix is the baseline, never
weakening the pipeline. **The `db-migrate` preview branch build IS the self-bootstrapping check** —
a preview that cannot stand up the schema from files alone is exactly that signal.

**A migration's version prefix is globally unique — a real timestamp to the second, asserted
against the trunk.** The version prefix (`YYYYMMDDHHMMSS`) is the migration ledger's **primary
key** (`schema_migrations`), so two files sharing one collide with a duplicate-key failure. Two
rules keep them unique: **(1)** the prefix is the **actual authoring time to the second** — never
a zeroed `…000000` time component (a `YYYYMMDD000000` convention makes every same-day pair
collide); and **(2)** because an epic-only migration and a concurrently-landed **trunk** migration
are invisible to each other's diffs (neither author sees the other's file), uniqueness must hold
**across the trunk and every in-flight `integration/*` branch**, not just within one branch. A
collision is otherwise undetectable at authoring and surfaces **late** — only when a `CON-21`
cascade merges both onto one branch, as a `schema_migrations_pkey` preview failure on **unrelated
sibling** PRs. So the pipeline **asserts it at review time**: `db-migrate` (or a CI lint) checks
each migration-touching PR's new version prefixes against the live migration set (the trunk **and** every in-flight `integration/*` branch) and **fails
the authoring PR** on any duplicate — catching it where it was introduced, never letting it
detonate downstream. (The uniqueness *check* is machinery; canon requires it exists.)

**Migration status is legible, never implicit.** What is applied where is verifiable at every
step: the `db-migrate` preview report names each PR's migration files (pending on prod, applied
on that PR's preview branch), and the coordinator's final `integration/<epic> → main` PR
itemizes the **epic's** migrations + their prod-apply status as a true-up before the human's G2 —
so "what's pending on prod vs a preview branch, per PR and per epic" is always answerable, and
prod cannot silently drift from the client code shipping alongside it (`docs/SETUP.md` has the
runbook).

**UZF-26 — UI changes carry visual evidence from their tests.** A change that adds
or alters a rendered UI surface carries the images produced by its
snapshot / visual-regression tests (required by UZF-18) in the PR description —
one entry per user-visible state the branch actually adds or re-records,
mirroring **that** set 1:1 (never a static inventory of the page's total states —
under the Files-changed-tab mechanism below an unchanged golden does not even
appear in the diff, so "1:1" means the branch's changed/added scenes, not the
page's full `@Preview`/snapshot count). The default mechanism is an
**embedded** image, hosted per the *Hosting* section below; a stack with **no
registered public-assets-mirror** for that hosting mechanism instead **names**
each scene and points the reviewer at its committed snapshot path in the PR's
**Files changed** tab (a stack rule states which mechanism it uses and never
mixes the two within one rule) — either way the recorded test images **are**
the screenshots — never separately-staged captures — so the visual evidence
cannot silently drift from what the tests assert, and a reviewer can judge the
change without building. A change with no rendered UI surface (logic-only) is
exempt, stated in the PR.

**Presentation — one table per screen, states across the columns.** The
`## Screenshots` section is laid out, not merely embedded: **one table per
top-level user-facing screen** (Detail, Edit, each relation screen, …),
**titled with the issue(s) that composed that screen**, with the changed
user-visible states (typical / empty / loading / failure / not-editable /
overflow / …) as its **columns** — horizontal space, never a tall stack of
images. Each screen gets one row of cells, one per state, carrying that
state's evidence in the stack's own hosting mechanism: an embedded image under
the *Hosting* mechanism below, or the scene's name plus its committed
**Files changed** path under the *Files-changed-tab alternative* below. A
change touching a single scene may use a one-column table rather than
inventing a second shape. This layout is a stack-agnostic requirement of
UZF-26 itself, not one builder's private template — every agent opening a UI
PR follows it (`agents/_conventions.md`).

The mandate never weakens: the fix for "I can't record baselines" is a
snapshot-capable runner, not a missing screenshot. The engineer that builds UI
therefore runs on a runner that can record the stack's snapshots (device-snapshot
stacks — e.g. swiftui/Xcode — on a self-hosted macOS runner; JVM stacks —
compose/Paparazzi — on Linux). **Bankai-mode timed deferral (the first exception — no runner).**
A UI child PR targeting `integration/epic-<N>` MAY *declare* deferred screenshots
**only** when no snapshot-capable runner is available at child-review time — a
tracked IOU in the PR body naming the deferred states and the reason, not a waiver.
The screenshots are then **mandatory and blocking at the final
`integration/<epic> → main` PR** (where the snapshot job runs), which the coordinator verifies before
the human's G2. On any `main`-targeted PR — including that final one, and every
shikai-mode PR — missing or undeclared screenshots are a hard completeness finding.

**Demonstrated capture-tooling gap (the second, narrow exception).** Distinct from
the runner deferral above: a snapshot-capable runner IS available, but the capture
tooling **demonstrably cannot** produce a specific scene's image — proven, not
assumed. When a scene renders deterministically blank/incorrect across **multiple
genuine capture strategies** (documented in the PR), that one scene may be **waived**
rather than block the gate — but only as a *tracked, visible* skip, never a blank
pretending to be evidence. Mark the scene **skipped in the suite** (`XCTSkip`, or the
stack's equivalent) with a reason string that **references a tracked capture-tooling
issue**, and list it in the PR body per scene with the strategies tried. This keeps
the build / `CON-19` gate green and the visual set honest (a skipped scene is
visibly absent), while the tracked issue **owns the real fix** — capturing that view
— so the waiver is temporary, not permanent. Guardrails: it covers only the specific
un-capturable **scene(s)**, never a whole component's coverage; **"demonstrated"
means multiple documented attempts**, never "hard" or "didn't try"; the tracking
issue is **mandatory** (an un-tracked skip is a completeness finding); and it is
**not** a substitute for the runner deferral. A reviewer accepts a waiver that meets
this bar and rejects one that doesn't. `CON-19`'s build gate then passes on the
skipped scene, and Roy's missing-step handling (`CON-11`) routes any *un*-waived
capture failure to its owner + Naruto rather than wedging the wave.

**Hosting — the associated public assets repo (GitHub), the default mechanism.**
Product repos are
typically **private**, and GitHub's inline-image proxy fetches **anonymously**:
a private repo's own `raw.githubusercontent.com` image URLs return `404` to that
proxy and render as broken, and `user-attachments` uploads (the only alternative)
have **no API**. Therefore every consuming repo has an **associated public assets
repo** (shared per product family — e.g. `<product>-assets` with a
`<repo>/pr-<n>/` layout — or dedicated per repo). The snapshot PNGs are mirrored
there and referenced from the PR description via **SHA-pinned**
`raw.githubusercontent.com` URLs, which — being public — are anonymously
fetchable and render inline. Because the assets repo is world-readable, **only
mock-fixture images may be mirrored** (never a screenshot rendered from real
data — data minimization). A consuming repo automates the mirror-and-reference
step and documents the exact repo/layout in its own rules; this rule fixes both
the expectation **and** the pattern.

Three properties of this hosting model the consuming repo must respect:

- **One-way / permanent.** A push to the public host is irreversible — a later
  delete does not retract it (git history, forks, clones, and the SHA-pinned URL
  persist). An accidental non-mock image is an **incident** (rotate/notify), not
  a delete — so the mirror step **confirms before pushing** (a technical gate,
  not documentation-only) and the host allows only mock-fixture images.
- **No auto-tracking (drift).** The embedded reference is pinned to the assets
  commit's SHA, a **separate artifact** from the product-repo commit. It does
  **not** follow later snapshot changes, so **re-mirroring and re-pasting is
  mandatory** whenever a snapshot changes after the block was pasted — the
  product repo's own history is not sufficient to tell whether the block is
  current.
- **Append-only.** The assets repo is not pruned — old SHAs must keep resolving
  for historical PR descriptions; state this retention as a decision, not an
  oversight.

**The Files-changed-tab alternative — no registered mirror.** A stack schema
requiring a mirror binding no registered consumer actually has fails
`sync_canon` closed on that unbound token — a stack MAY instead have its rule
point the reviewer at the snapshot's **committed path** in the PR's own
**Files changed** tab, which GitHub renders natively under the viewer's repo
permissions (no anonymous fetch, no camo, nothing to mirror or pin a SHA
against). This is not a weaker evidence bar: the same 1:1 scene mapping, the
same mock-fixture-only constraint (data minimization), and the same two
sanctioned incompletenesses (bankai-mode timed deferral, demonstrated
capture-tooling gap) apply identically — only the *hosting* mechanism differs,
and a stack rule picks one mechanism and states it, never both. A stack that
later stands up its own public assets-mirror may adopt the embedded-image
mechanism above instead.

---

## Severity guidance (for Sasuke's verdict)

| Severity | Use when a finding… |
| --- | --- |
| `critical` | Breaks the architecture's guarantees: an inline effect, a service call in a reducer, a wire type in State, a thrown effect, or the renderer importing the store framework. Blocks merge. |
| `high` | Violates a rule in a way that causes bugs or untestability (missing completion-event Result, no Producer for an effect, no stateful/pure split). Blocks merge. |
| `medium` | Real deviation with a clear fix and limited blast radius (missing Selector purity, a Shifter that should be inlined or vice-versa). |
| `low` / `nit` | Style-adjacent within the rules; never blocks. |

A finding that no `UZF-{n}` (or the applicable stack rule) covers is a
`bankai:handbook-question` scope-routed to the canon lane (`bankai:agent/yamamoto`,
`CON-37`) — reviewers never improvise policy.

## UZF-27 · Vocabulary — the UZF ↔ framework glossary

UZF names roles, not framework types. Use UZF naming on instances and child types even when the
framework names the type differently (*convention over override*). A reviewer/agent rejects prose
that deviates from these role verbs; each stack handbook binds the role to its concrete syntax.

| UZF role | What it is | Framework examples |
| --- | --- | --- |
| **Event** | a user intent (`userDid…`) or system/lifecycle signal (`on…`) | TCA `Action`, Redux action, a Compose UI event |
| **Interactor** | the *instance* of the store that intercepts events | `StoreOf<…Feature>`; a store-bound object |
| **Reducer** | pure "next state and/or effect" decision — no I/O | TCA `@Reducer`, Redux reducer, an `update` fn |
| **Shifter** | pure state mutation (`apply…`) or identity re-shape (`as…`) | a `mutating func`, a `with…` builder |
| **Selector** | pure derived read from State (`…Selector`) | a computed property, reselect |
| **Producer** | factory that builds an Effect (`produce…Effect`) | an async-thunk creator |
| **Effect** | deferred side-effecting work dispatching one completion Event | TCA `Effect`, a thunk, a saga |
| **Service / Client** | a DI'd external boundary with a deterministic double | `@DependencyClient`, a repository interface |
| **Provider** | a *stateless* local fast-read helper a reducer MAY call directly | config/env/cache accessor |
| **Repository** | the *only* stateful service-tier artifact (cache / coordination) | a `final class …Repository` |
| **Mapper** | pure wire↔domain converter (`toDomain`/`fromDomain`) | a boundary mapper |
| **Response** | a wire/serialization type — never stored in State | a `Codable` DTO |
| **Result** | the built-in success/failure container an effect resolves | `Result<Success, …Exception>` |
| **Exception** | a typed, user-facing failure (not a raw platform error) | a `LocalizedError` enum |
| **Outcome** | the reducer's return — *idle* / *state-only* / *effect-only* / *both* | a tagged union built by factory helpers |
| **Context** | cross-feature shared in-memory state (avoids prop-drilling) | a shared store slice / environment object |
| **Task** | a cancellable, trackable unit of work owned by a Repository | a structured-concurrency task handle |

## Cross-framework role mapping (informative)

The same UZF loop, named per stack. **SwiftUI + TCA** (KroApple) and **Jetpack
Compose** (KroAndroid) are the live reference products. **React + Redux Toolkit**
(Next.js web) and **React Native / Expo** (mobile) are first-class scaffold targets
that **share one state-logic tier** (the RTK store, slices, reducers, selectors,
thunks, services, mappers in a `packages/core` — a path in a scaffolded product's monorepo, not in bankai-core) under two UI layers — so they are
one stack family with two render targets, not two stacks. Flutter + Bloc is listed
for orientation only (no active target). This table is the concept-level Rosetta;
concrete bindings and the enforceable rules live in each stack handbook
(`SW-{n}` / `KT-{n}`; the React `RC-{n}` family in `stacks/react-uzf-v1/`).

| UZF role | SwiftUI + TCA | Jetpack Compose | React + Redux Toolkit (Next.js) | React Native / Expo | Flutter + Bloc *(informative)* |
|---|---|---|---|---|---|
| Interactor (store instance) | `StoreOf<…Feature>` | `…Feature : Feature<S,E,U>` (Hilt VM) | configured RTK `store` + feature `slice` | same RTK `store`/`slice` (shared core) | `…Bloc` |
| State | `@ObservableState struct State` | `data class …State` → `StateFlow` | slice `…State` (Immer draft) | same slice state | `…State` + `copyWith` |
| Event | `enum Action` | `sealed interface …Event` | slice `actions` + thunks | same slice actions | `sealed class …Event` |
| Reducer (pure) | `Reduce { … }` | pure `reduce(state,event): Outcome` | slice `reducers` + `extraReducers` | shared reducers | `on<Event>` handlers |
| Shifter (`with…`) | `extension State { func with… }` | `fun State.with…()` | `withFoo(state,args)` (Immer producer) | same | `with…()` extension |
| Selector | `var …Selector` | top-level `select…(state)` | `createSelector` (reselect) | same selectors | `…Selector` / `BlocSelector` |
| Producer → Effect | `produce…Effect()` → `Effect` | `…Producer` → `Flow`/`Thunk` effect | `createAsyncThunk` factory → thunk | same async-thunk | injected `…Producer` → `Future` |
| Service (+ stub) | `struct …Client` (`liveValue`/`previewValue`) | `interface …Service` + `Live…`/`Stubbed…` | `…Service` interface + live/stub, injected | same service (RN transport) | `abstract …Service` + impls |
| Stateful wrapper ∥ pure renderer (UZF-4) | `…Screen` + pure `…View` | `…Screen` (Hilt) + stateless `…Page` | route/page container + pure fn component | RN screen container + pure component | `…Page` (Stateless) + Bloc builder |
| One-shot UI effect | nav effect / delegate | `…UiEffect` `SharedFlow(replay=0)` | dispatched nav action / effect middleware | `navigation.dispatch` / RN event | `BlocListener` side |
| Mapper (wire↔domain) | `toDomain`/`fromDomain` | `toDomain`/`fromDomain` | same (inside the thunk) | same | boundary mapper |

> **Web ∥ mobile share the core.** For a target that ships both (Scenario 1: Expo +
> Next.js), the scaffold emits the RTK state-logic tier **once** in the product monorepo's `packages/core`
> and two UI shells; cross-UI component sharing is **Solito** (navigation) + **Tamagui**
> (styling). The React `RC-{n}` stack handbook (`stacks/react-uzf-v1/`) binds these concretely; UZF-4's
> wrapper/renderer split maps to a route/screen *container* (owns the store hooks,
> `useSelector`/`useDispatch`, navigation) versus a **pure function component** (props +
> callbacks only, no store access) — the same passive-renderer rule as every other stack.
