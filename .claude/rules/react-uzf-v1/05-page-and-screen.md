<!-- GENERATED from bankai-core@v0.11.2/handbooks/stacks/react-uzf-v1/rules/05-page-and-screen.md — DO NOT EDIT; change the handbook and re-run sync-canon. -->
<!-- Canonical source in bankai-core; product repos carry a generated mirror (CON-13). -->

# 05 — Page, Fragment, and Component (Render Layer)

## Repo-specific placeholders

- `kro` — the product these rules govern.
- `packages/core` — the shared package holding slices, selectors, shifters, producers,
  services, and mappers (see `02-store-setup.md`). The render layer imports *from* it; nothing
  in `packages/core` imports a render-layer file back.
- `packages/app` — the shared, target-agnostic package that holds every Page, Fragment,
  Adapter, and Component (e.g. `packages/app/src/features/…`). Both render targets consume it;
  neither owns a copy of it. This is what makes "one stack family, two render targets" concrete —
  Solito (cross-nav) and Tamagui (cross-UI) are what let a single `packages/app` file render
  correctly on both.
- `apps/web` — the Next.js App Router app directory. It contains **only** `app/**/page.tsx`
  (Server, passive) and `…PageClient.tsx` (thin Client wrapper) — the actual Page lives in
  `packages/app`.
- `apps/mobile (absent, this repo is web-only)` — the Expo Router app directory. It contains **only** thin `app/**/*.tsx`
  route files — the actual Page lives in `packages/app`.

---

A feature's render layer is **three artifacts, never one** (this three-tier split is `RC-61`,
stated at the family level in `../architecture.md`; refines `UZF-4`, `UZF-5`): a
domain-less **Component**, a domain-bound pure **Fragment** (or its list-row specialization, an
**Adapter**), and a stateful **Page**. The Page is the "framework-aware, stateful wrapper" `UZF-4`
requires — it alone calls *both* `useAppSelector` and `useAppDispatch`. The Fragment MAY call
`useAppSelector` for its own derived reads but MUST NEVER dispatch — it emits intent upward only
via callback props (`RC-15`). The Component is the "pure, framework-free renderer": it calls
neither hook and never imports `react-redux` or `library/hooks.ts` (`UZF-2`: the callback is the
single upward channel for intent).

On top of this three-tier split, each render target adds one more layer of platform plumbing
(Next.js's Server/Client boundary; Expo Router's route files) that exists **only** to get a Page
mounted — it carries no UZF logic of its own.

## Component — domain-less (`RC-14`; implements `UZF-5`)

A Component is reusable UI with **no domain knowledge**: a `Button`, a `Card`, a `Spinner`, an
`Avatar`. It takes primitive/generic props only — never a domain type (`Profile`, `Order`, …) —
and never touches the store.

- Lives in `packages/app/src/components/…`, built from Tamagui primitives so it renders
  identically on `apps/web` and `apps/mobile (absent, this repo is web-only)`.
- Signature: plain props + callbacks, e.g. `function Avatar({ uri, label, size }: AvatarProps)`.
  No `useAppSelector`, no `useAppDispatch`, no domain import.
- A Component that starts importing a domain type or a Feature's event union has stopped being a
  Component — extract the domain-bound part into a Fragment and keep the Component underneath it
  domain-less (`UZF-5`).

```tsx
// packages/app/src/components/Avatar.tsx
export interface AvatarProps {
    readonly uri:   string | null;
    readonly label: string;   // accessibility label, not a domain field
    readonly size?: number;
}

/** Domain-less. Never imports a domain type, a slice, or a store hook. */
export function Avatar({ uri, label, size = 48 }: AvatarProps) {
    if (!uri) return null;
    return <Image source={{ uri }} accessibilityLabel={label} style={{ width: size, height: size, borderRadius: size / 2 }} />;
}
```

## Fragment — domain-bound, pure (`RC-15`; implements `UZF-4`, `UZF-5`)

A Fragment is reusable UI that **does** know about a domain type or a feature's derived shape. It
MAY call `useAppSelector` (from `library/hooks.ts`) directly for its own derived reads, but it
MUST NEVER dispatch — every event it needs to raise is a callback prop supplied by its owning
Page, never a `useAppDispatch()` call of its own (`RC-15`). This is the artifact `UZF-5` names
explicitly: "Domain-bound reusable UI is a Fragment, not a Component."

- Lives in `packages/app/src/fragments/<Feature>/<Feature>Fragment.tsx`.
- Signature: `function <Feature>Fragment(props: <Feature>FragmentProps)` where `<Feature>FragmentProps`
  holds already-selected, already-mapped values (never raw `RootState`, never a wire type) plus one
  callback per intent — e.g. `onTapEdit: () => void`, never the raw `dispatch`.
- No `useAppDispatch`, no `import { store }`, no import from `next/navigation` or `expo-router`.
  `useAppSelector` is allowed for a Fragment's own derived reads (`RC-15`) but is not required — a
  Fragment that takes fully pre-selected props stays snapshot- and Storybook-testable with zero
  Provider wrapping; one that calls `useAppSelector` needs a minimal store `Provider` in its
  story/test, same as the self-mounted case below.
- Composes Components underneath it; never imports another feature's Fragment (co-location,
  `UZF-6`) — cross-feature reuse goes through a Component or a promoted shared Fragment in a
  `library/`-equivalent layer, never a sibling feature folder.

```tsx
// packages/app/src/fragments/UserProfile/UserProfileFragment.tsx
import { Avatar } from "../../components/Avatar";
import type { Profile } from "@/models/Profile";
import type { ProfileException } from "@/models/ProfileException";

export interface UserProfileFragmentProps {
    readonly isLoading:  boolean;
    readonly profile:    Profile | null;
    readonly exception:  ProfileException | null;
    readonly fullName:   string;          // already selected — see UserProfileSelectors
    readonly showEmpty:  boolean;         // already selected
    readonly onRefresh:      () => void;
    readonly onTapEdit:      () => void;
    readonly onDismissError: () => void;
}

/**
 * Pure renderer. Domain-bound (knows `Profile`), but takes every value and every
 * intent as a prop/callback. No `useAppSelector`, no `useAppDispatch`, no store import.
 */
export function UserProfileFragment(props: UserProfileFragmentProps) {
    const { isLoading, profile, exception, fullName, showEmpty, onRefresh, onTapEdit, onDismissError } = props;
    return (
        <View>
            {isLoading && !profile && <Spinner />}
            {showEmpty && <Text>No profile available.</Text>}
            {profile && (
                <View>
                    <Avatar uri={profile.avatarUrl} label={fullName} />
                    <Text>{fullName}</Text>
                    <Pressable onPress={onTapEdit}><Text>Edit</Text></Pressable>
                </View>
            )}
            {exception && (
                <View role="alert">
                    <Text>{exception.message}</Text>
                    <Pressable onPress={onDismissError}><Text>Dismiss</Text></Pressable>
                </View>
            )}
            <Pressable onPress={onRefresh}><Text>Refresh</Text></Pressable>
        </View>
    );
}
```

### Adapter — a Fragment specialized for list rows (`RC-18`; refines `SYNTHESIS_REACT_NATIVE` §1)

An Adapter is the collection-row case of a Fragment: it renders one item of a `FlatList` /
`SectionList` / `FlashList` (RN/Expo) or a mapped array (web). Same purity rules as a Fragment,
plus two extras that exist purely for list-scroll performance:

- Wrapped in `React.memo` so an unrelated re-render of the parent list doesn't re-render every row.
- Its tap/press handler is `useCallback`-stabilized at the call site (or the Adapter itself takes an
  id-carrying callback, e.g. `onTap: (id: string) => void`, so the *same* function reference is
  passed to every row).

```tsx
// packages/app/src/adapters/ProfileRowAdapter.tsx
import { memo, useCallback } from "react";
import type { Profile } from "@/models/Profile";

interface Props {
    readonly profile: Profile;
    readonly onTap:   (id: string) => void;
}

export const ProfileRowAdapter = memo(function ProfileRowAdapter({ profile, onTap }: Props) {
    const handlePress = useCallback(() => onTap(profile.id), [onTap, profile.id]);
    return (
        <Pressable onPress={handlePress}>
            <Avatar uri={profile.avatarUrl} label={profile.displayName} size={40} />
            <Text>{profile.displayName}</Text>
        </Pressable>
    );
});
```

## Page — stateful container (`RC-37`; implements `UZF-4`)

The Page is the stateful container: it calls *both* `useAppSelector` and `useAppDispatch`
(typed, from `library/hooks.ts` per `02-store-setup.md`'s `RC-10` — never a raw `react-redux`
import). It selects state, dispatches lifecycle events, and renders the feature's Fragment,
passing it selected values as props and `dispatch(...)`-wrapping closures as callbacks. A Fragment
MAY also call `useAppSelector` for its own derived reads (`RC-15`), but it never dispatches — the
Page remains the only artifact in the tier that calls `useAppDispatch`.

- Lives in `packages/app/src/features/<Feature>/<Feature>Page.tsx`.
- Dispatches its mount/lifecycle event (`onViewLoaded`, `onAppeared`, …) in a `useEffect` keyed on
  its real inputs (route params, ids) — never an unconditional effect with an empty dependency
  array papering over a missing dependency.
- Owns zero markup of its own beyond the single call into its Fragment — if a Page grows a `<div>`/
  `<View>` tree of its own, that markup belongs in the Fragment (mirrors the Compose "Screen has
  no layout" rule, inverted: here it is the *stateful* half that must stay layout-free).
- May read a Selector (`UZF-11`) to derive a value it forwards as a prop — it does not re-derive
  that value again inside the Fragment.
- A Fragment MAY call `useAppSelector` directly for its own derived reads instead of receiving
  every value pre-selected as a prop (`RC-15`) — but it must never call `useAppDispatch`. The one
  narrow exception is a **self-mounted, parent-less Fragment** (e.g. a global toast host with no
  owning Page) — with no Page to dispatch on its behalf, it acts as its own container in that case
  and imports the typed hooks from `library/hooks.ts`, never a raw `react-redux` import.

```tsx
// packages/app/src/features/UserProfile/UserProfilePage.tsx
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/library/hooks";
import { onViewLoaded, userDidPullToRefresh, userDidTapEdit, userDidTapDismissException } from "./UserProfileFeature";
import { fetchProfileThunk, navigateToEditProfileThunk } from "./UserProfileProducer";
import { selectIsLoading, selectProfile, selectException, selectShouldShowEmptyState, selectFullName } from "./UserProfileSelectors";
import { UserProfileFragment } from "../../fragments/UserProfile/UserProfileFragment";

interface Props { readonly profileId: string; }

/**
 * Stateful container. Calls both useAppSelector and useAppDispatch; every lifecycle value is
 * derived from the slice's single `load: LoadState` field via named Selectors, never read as a
 * parallel `isLoading`/`profile`/`exception` field off state.
 */
export function UserProfilePage({ profileId }: Props) {
    const dispatch  = useAppDispatch();
    const isLoading = useAppSelector(selectIsLoading);
    const exception = useAppSelector(selectException);
    const profile   = useAppSelector(selectProfile);
    const showEmpty = useAppSelector(selectShouldShowEmptyState);
    const fullName  = useAppSelector(selectFullName);

    useEffect(() => {
        dispatch(onViewLoaded({ profileId }));
        dispatch(fetchProfileThunk({ profileId }));
    }, [dispatch, profileId]);

    return (
        <UserProfileFragment
            isLoading={isLoading}
            profile={profile}
            exception={exception}
            fullName={fullName}
            showEmpty={showEmpty}
            onRefresh={() => dispatch(userDidPullToRefresh())}
            onTapEdit={() => { dispatch(userDidTapEdit()); dispatch(navigateToEditProfileThunk({ profileId })); }}
            onDismissError={() => dispatch(userDidTapDismissException())}
        />
    );
}
```

---

## Next.js (App Router) — Server Page → Client Wrapper → Page

Next.js inserts one more layer above the Page, because App Router Server Components can't touch a
Redux store. Three files, three jobs (`RC-38`–`RC-40`; implements `SYNTHESIS_NEXTJS.md` §1 rules 1–3):

**RC-38 — `app/**/page.tsx` is a passive Server Component.** It resolves `params`, optionally
prefetches data with `cache: "no-store"`, and renders the Client Wrapper — nothing else. It never
imports `react-redux`, never calls a hook, never dispatches. An optional server-side prefetch is
allowed *only* because its result is handed down as a plain prop, never touched directly.

```tsx
// apps/web/app/profile/[id]/page.tsx
import { UserProfilePageClient } from "./UserProfilePageClient";

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    let initialProfile: unknown = null;
    try {
        const res = await fetch(`${process.env.API_BASE_URL}/profiles/${id}`, { cache: "no-store" });
        if (res.ok) initialProfile = await res.json();
    } catch { /* silent — the client Producer retries */ }
    return <UserProfilePageClient profileId={id} initialProfile={initialProfile} />;
}
```

**RC-39 — the Client Page Wrapper is ≤10 lines and forwards props only.** Named
`…PageClient.tsx`, marked `"use client"`. Its only job is importing the real Page from
`packages/app` and handing it the Server Page's props. This is the file where `"use client"`
is declared — the Page itself does not need to declare it again.

```tsx
// apps/web/app/profile/[id]/UserProfilePageClient.tsx
"use client";
import { UserProfilePage } from "packages/app/src/features/UserProfile/UserProfilePage";

interface Props { readonly profileId: string; readonly initialProfile: unknown; }
export function UserProfilePageClient({ profileId, initialProfile }: Props) {
    return <UserProfilePage profileId={profileId} initialProfile={initialProfile} />;
}
```

**RC-40 — the Page never imports Next.js APIs.** `packages/app`'s `…Page.tsx` must never import
`next/navigation`, `next/headers`, `next/image`, `next/link`, or `next/font` — those are platform
sugar that may only appear in `apps/web`'s route files (`page.tsx`, `layout.tsx`,
`…PageClient.tsx`). This is what keeps the same Page file mountable, unmodified, from
`apps/mobile (absent, this repo is web-only)`.

**RC-41 — `app/layout.tsx` is a passive Server Component; `app/providers.tsx` is the one Client
Component that wires Store + Theme + Navigation.** Anything stateful — `<StoreProvider>`,
`next-themes`'s `<ThemeProvider>`, `initializeNavigationService(...)` bound to `next/navigation`'s
`useRouter()` — lives in `providers.tsx`, never in `layout.tsx` (implements `SYNTHESIS_NEXTJS.md`
§1 rule 4).

```tsx
// apps/web/app/providers.tsx
"use client";
import { Provider as StoreProvider } from "react-redux";
import { ThemeProvider } from "next-themes";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { makeStore } from "packages/core/src/library/store";
import { initializeNavigationService } from "packages/app/src/navigation/NavigationService";

export function Providers({ children }: { children: React.ReactNode }) {
    const [store] = useState(() => makeStore());
    const router = useRouter();
    useEffect(() => {
        initializeNavigationService({ push: router.push, replace: router.replace, back: router.back });
    }, [router]);
    return <StoreProvider store={store}><ThemeProvider attribute="class" defaultTheme="system" enableSystem>{children}</ThemeProvider></StoreProvider>;
}
```

**RC-42 — SSR-prefetched data enters the slice through a dedicated `on…Hydrated` event, never by
bypassing the Shifter.** The Page dispatches `onInitialProfileHydrated({ raw: initialProfile })`
on mount alongside its normal fetch; a `withRehydrated…` Shifter runs the same Mapper the Producer
uses, so a malformed SSR payload degrades to "no-op, the client refetch repairs it" rather than
corrupting `State` (implements `UZF-17`; the Shifter/Mapper contract itself is covered in the
state/shifters rule file, not here — this file only owns *where* the Page dispatches it).

**RC-43 — Server Actions and route handlers are Producers, not Page logic.** A `"use server"`
function called from a Page, or an `app/api/**/route.ts` handler, must call `Service`s and return
a `Result<T, …Exception>` (or a JSON body derived from one) — it never touches the store, and the
Page dispatches the resolved `Result` through a normal completion event rather than trusting the
action's return value directly (implements `UZF-3`, `UZF-14`; full Producer contract lives in the
services/producers rule files).

## Expo Router / React Native — Route file → Page

Expo Router inserts a thinner layer than Next.js — there is no Server/Client split, only a
route-file boundary (`RC-44`–`RC-46`; implements `SYNTHESIS_EXPO.md` §1, `SYNTHESIS_REACT_NATIVE.md` §1).

**RC-44 — `app/**/*.tsx` route files are route bindings only, never Pages.** A route file's entire
job is: read route params via `useLocalSearchParams()`, forward them as plain props to the Page
imported from `packages/app`, ≤10 lines. It never imports `useAppSelector`/`useAppDispatch`,
never renders markup of its own.

```tsx
// apps/mobile (absent, this repo is web-only)/app/profile/[id].tsx
import { useLocalSearchParams } from "expo-router";
import { UserProfilePage } from "packages/app/src/features/UserProfile/UserProfilePage";

export default function ProfileRoute() {
    const { id } = useLocalSearchParams<{ id: string }>();
    if (!id) return null;   // defensive: never render a Page without its required identity
    return <UserProfilePage profileId={id} />;
}
```

**RC-45 — `app/_layout.tsx` is the single platform-binding point.** It is the *only* file allowed
to import both Expo Router's imperative `router` and the Store/Theme/Service bindings —
`initializeNavigationService(...)` is called here, exactly once. Every other file — Page, Fragment,
Adapter, Component, reducer, shifter, selector, producer — is forbidden from importing
`expo-router`'s `router`, `useRouter`, or `useNavigation` directly.

```tsx
// apps/mobile (absent, this repo is web-only)/app/_layout.tsx
import { Stack, router } from "expo-router";
import { Provider as StoreProvider } from "react-redux";
import { makeStore } from "packages/core/src/library/store";
import { AppThemeProvider } from "packages/app/src/theme/AppThemeProvider";
import { initializeNavigationService } from "packages/app/src/navigation/NavigationService";
import { useEffect, useState } from "react";

export default function RootLayout() {
    const [store] = useState(() => makeStore());
    useEffect(() => {
        initializeNavigationService({
            push:    (path, params) => router.push({ pathname: path, params }),
            replace: (path, params) => router.replace({ pathname: path, params }),
            back:    () => router.back(),
        });
    }, []);
    return <StoreProvider store={store}><AppThemeProvider><Stack screenOptions={{ headerShown: false }} /></AppThemeProvider></StoreProvider>;
}
```

**RC-46 — the same Page mounts under both a Next.js Client Wrapper and an Expo route file
unmodified.** Because the Page never imports `next/*` or `expo-router`, and because Solito
supplies the cross-target navigation primitive a Page may use directly for declarative links (the
`NavigationService` above is for the *imperative* calls a Producer makes), a single
`packages/app/src/features/<Feature>/<Feature>Page.tsx` is the one file both `apps/web` and
`apps/mobile (absent, this repo is web-only)` render — this is the concrete meaning of "one stack family, two render targets."

## Storybook & preview minimums (`RC-11`; implements `UZF-18`, `UZF-26`)

Every Page and every Fragment ships **≥ 3 stories** (`<Name>.stories.tsx`, co-located) mirroring
the reducer's principal states — at minimum `loading`, `loaded`, `errored` — each built from the
feature's mock `State`/props, never hand-rolled inline. Each story has a matching snapshot/
interaction test; a story with no matching test is not visual evidence (this is the stack's
binding for `UZF-26`, spelled out fully in `12-session-completion-checklist.md`'s `RC-11`). A Page's
story wraps it in `makeStore({...})` with `preloadedState`; a Fragment's story needs no `Provider`
at all — that gap is itself the proof the split holds.

## Forbidden

- Calling `useAppDispatch` from a Fragment, Adapter, or Component (`RC-15`, `RC-18`) — outside the
  single narrow exception in `RC-37` (a parent-less, self-mounted Fragment). A Fragment MAY call
  `useAppSelector` for its own derived reads; an Adapter or Component calls neither hook.
- A Fragment, Adapter, or Component that imports a raw `react-redux` `useSelector`/`useDispatch`,
  bypassing `library/hooks.ts` (ties to `02-store-setup.md`'s `RC-10`).
- A Page with markup of its own beyond the single call into its Fragment (`RC-37`).
- A Component that imports a domain type (`Profile`, `Order`, …) or a Feature's event union
  (`RC-14`; it has become a Fragment and must move).
- A `FlatList`/`SectionList`/`FlashList` row renderer that is not `React.memo`-wrapped, or whose
  tap handler is a fresh closure on every parent render instead of a stable, id-carrying callback
  (`RC-18`).
- A `app/**/page.tsx` (Next.js) containing `useState`, `useEffect`, `useAppDispatch`, or
  `useAppSelector` (`RC-38`).
- A `.tsx` under `packages/app/src/features/…` that imports `next/navigation`, `next/headers`,
  `next/image`, `next/link`, or `next/font` (`RC-40`).
- A `"use client"` Client Page Wrapper that does anything beyond importing the Page and forwarding
  props — no hooks, no markup, no logic (`RC-39`).
- Reading a Redux store or dispatching from `app/layout.tsx`, or wiring Store/Theme/Navigation
  anywhere other than `app/providers.tsx` (`RC-41`).
- A Server Action or route handler that returns a bare value instead of a `Result`, or that is
  called and trusted directly by a Page without going through a completion event (`RC-43`).
- Page logic written directly inside an Expo Router route file (`app/profile/[id].tsx`) instead of
  being delegated to a Page under `packages/app` (`RC-44`).
- Importing `expo-router`'s `router`, `useRouter`, or `useNavigation` from any file other than
  `app/_layout.tsx` (`RC-45`).
- A Page, Fragment, Adapter, or Component with no Storybook story, or a story with no matching
  snapshot/interaction test (`RC-11`).
