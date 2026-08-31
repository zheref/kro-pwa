# 07 — UX Flows

The flows are KroApple's. This file records **which** flows web must reproduce, the
platform-mapping contract that decides how each is presented at a given width, and the web-only
seams. Step-by-step behaviour lives in `zheref/KroApple` `docs/Features/*.md` — restating it
here would fork canon.

There is no Figma file for Kro Web. **The Apple app is the design reference**; the `zheref.io`
glass recipe supplies the web material where Apple ships first-party material we cannot use.

## The platform-mapping contract

Fixed, and the same contract for every flow:

| Viewport | Mirrors | Shell |
|---|---|---|
| **Mobile** | iPhone | Flat tab bar: Plan · Do · Earn, plus a Search affordance |
| **Desktop** | macOS | Sidebar: My Day / All Tasks, a Workflow section, a bottom Settings section, a Lists section — including the macOS-only "Today" / "My Day" / "Jot Down" / "Execute" / "Adjust" naming |

The binding decision table is KroApple's `KroUI/Do/DoSurfaceLayout.swift` idiom×width matrix,
ported by the shell child (#13) as the responsive contract.

**Same content, different container.** Sheets on mobile ↔ popovers on desktop, at canonical
desktop sizes: Inbox 560×620, Visibility 460×560, Profile w300, Do notifications 380×440 min.
Choosing a different container for the same content is a divergence, not a judgement call.

## The flows

| Flow | Entry | What it must do | Canon |
|---|---|---|---|
| **Do / My Day** | tab bar · sidebar "Today" | Lanes in canonical order — Suggestions → Reminders → Events → Now → Overdue → Due Soon → Expired → Next → Anytime → Completed Today. The **Now hero lane** holds an odd count with the top-scoring card centred and enlarged. Rings exclude expired items and are unaffected by visibility filters. Header counts "N left today". | `Do`, `DayProgressRings` |
| **Plan** | tab bar · sidebar | Timeline (60 px/hour grid), list, and in-tab priority-matrix mode. Hold-or-double-tap empty canvas → dashed hour ghost snapped to the nearest quarter hour, prompt opens pre-set to Event. Hold a block → edit mode: start/end/body drags snapping to 15 min (min duration 15 min) with live reflow. **Past events are read-only.** | `Plan` |
| **Session** | Do card · pill · direct route | Sheet phases → running → conclusion. Conclusion offers Complete Task / Start New / Break. An early finish below **30 %** of target records an aborted attempt. Pause + reload restores wall-clock-correct remaining time. | `Session` |
| **Capture** | FAB · keyboard | Capturing an **Event** routes to Plan (day selected, list mode, highlighted). **Task / Reminder / Habit** open the Inbox. **"Add for Today"** pre-fills the next 15-minute slot and shows an ~8 s Undo toast. | `Inbox`, `ActiveToast` |
| **Inbox** | sidebar · sheet/popover | The staging area capture feeds; items leave it by triage or by scheduling. | `Inbox` |
| **Triage** | Inbox | Value ≥3 auto-promotes to the Important row, preserving urgency. Increasing effort scales reward proportionally; **decreasing never does**. A scheduled date always implies an expiry. Confirm requires quadrant + date (Archive exempt). Quadrant assignment resolves due/value exactly per `PlanMatrixResolution`. | `Triage` |
| **Earn** | tab bar · sidebar | Reward points, tomato counter, performances, Earn preferences (including the legacy points-formula switch). | `Performances` |
| **Find / All Tasks** | search affordance · sidebar | Search across endeavors; All Tasks as a vista. | `EndeavorsVista` |
| **Endeavor Detail / Edit** | any card or row | Detail, edit, and relations. | `EndeavorDetail`, `EndeavorCard` |
| **Settings** | sidebar bottom · profile popover | The settings hub mirroring `SettingOptions`, **including per-key sync scope**. Signing out clears device-stored preferences and pending notification alerts. | `Preferences` |
| **Auth** | first run · sign-in | Supabase Auth: email/password, Apple OIDC, Google. `authenticationEnforced` is OFF in `statusQuoSet`. | `Preferences` |
| **Thirst / coming soon** | any gated destination | A gated destination renders a vote surface tagged with a web `VotePlatform`. An **unmapped** dead-end shows a plain card with **no** vote affordance — the distinction is canon. | `Thirst` |

## Web-only seams

Things the Apple app solves natively that web must solve differently — each one a place to check
against canon rather than improvise:

- **The menu-bar extra has no web counterpart.** The **Session Pill** plus the document-title
  timer carry it.
- **Notifications** are Web Push, flag-gated, and follow canon's reconciliation model rather
  than fire-and-forget (#34).
- **Wake lock, sounds and install** are Services behind `ThunkExtra`, each with a `stubbed…`
  twin — never called from a component.
- **Apple Calendar / Apple Reminders hosts are impossible.** Google Calendar is the flagship
  external host; reconciliation stays host-agnostic so more hosts are additive.
- **Pointer vs. touch** changes target sizes (28 px / 4 px vs. 44 px / 8 px), not layout logic —
  the idiom×width table already decides layout.

## Motion & feedback

- `prefers-reduced-motion` stops the rotating glow and the press/block waves. Every animated
  affordance must be complete and usable without its animation.
- Every coloured signal pairs with an icon **and** text.
- A disabled submit control says what blocks it.
