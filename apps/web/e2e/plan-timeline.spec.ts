import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

/**
 * The Plan timeline's drag gestures, in a real browser.
 *
 * The jsdom suites in `packages/app` already prove the *decisions* — which
 * callback fires, what lands in the slice. What they cannot prove is the part
 * that only exists in a browser: that a real pointer sequence reaches the
 * right layer through the stacking order, that a card really does move when a
 * handle is dragged, and that the scroll container really does stop scrolling
 * while a card is armed. Those are what this file is for.
 *
 * ## Two input paths, one implementation
 *
 * `page.mouse` emits `pointerdown`/`pointermove`/`pointerup` with
 * `pointerType: "mouse"`; the helpers at the foot of this file emit the same
 * three with `pointerType: "touch"`. The production code has ONE path, so the
 * two describes below assert the **same outcomes** — which is the claim,
 * rather than a coincidence.
 *
 * ## Seeding is the app's own schema, not a fixture the product cannot make
 *
 * The day is read from IndexedDB — `@kro/core`'s `EndeavorRecord` rows in the
 * `kro` database (KC-IS-#10). `seedDay` writes those rows before the app
 * boots, so what the timeline draws is what its real Producer read from its
 * real store. Nothing is stubbed, no network is faked, and no test-only hook
 * exists in the shipped bundle.
 *
 * The alternative — creating the events through the UI — is not available yet:
 * quick-create opens the **capture prompt**, which is KC-IS-#24's. The ghost
 * that gesture leaves behind IS asserted here, because that half is this
 * child's.
 */

/**
 * The two surfaces the epic's responsive contract names, as **context
 * options** rather than as a `devices[…]` descriptor.
 *
 * A device descriptor carries `defaultBrowserType`, which Playwright refuses
 * inside a `describe` because it would force a new worker. Spreading only the
 * options that describe the *surface* — the viewport, a coarse pointer, the
 * mobile flag — is what lets one file cover both widths without a second
 * project in `playwright.config.ts` (a file this child's lane does not own).
 *
 * 390 x 844 and 1440 x 900 are the two the screenshots are taken at, so the
 * suite and the evidence are looking at the same thing.
 */
const PHONE = {
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 3,
} as const
const DESKTOP = { width: 1440, height: 900 }

/** The canvas is 60px an hour — `TIMELINE_HOUR_HEIGHT_PX`. */
const HOUR_HEIGHT = 60

/** The row shape `endeavorRecordFromEndeavor` produces, as plain data. */
interface SeedEvent {
  readonly id: string
  readonly title: string
  readonly hour: number
  readonly minute?: number
  readonly durationSeconds: number
  readonly associatedColor?: string
}

/** One long block with a short one nested inside it, plus a finished event. */
const REALISTIC_DAY: readonly SeedEvent[] = [
  { id: 'e2e-breakfast', title: 'Breakfast', hour: 6, durationSeconds: 1800 },
  {
    id: 'e2e-offsite',
    title: 'Team offsite',
    hour: 9,
    durationSeconds: 4 * 3600,
    associatedColor: '#4285F4',
  },
  {
    id: 'e2e-standup',
    title: 'Standup',
    hour: 9,
    minute: 30,
    durationSeconds: 900,
    associatedColor: '#DB4437',
  },
  {
    id: 'e2e-review',
    title: 'Design review',
    hour: 14,
    durationSeconds: 2 * 3600,
    associatedColor: '#AB47BC',
  },
]

/**
 * Compile `/plan` once per worker, before any test's clock starts.
 *
 * The `webServer` Playwright waits for is the dev server's *base* URL; a route
 * is only compiled the first time it is requested, and on a cold cache that
 * can take longer than a whole test's 30 s budget. Left alone it makes
 * whichever test a worker happens to run first flaky — a failure that is about
 * the toolchain and says nothing about the timeline, which is the worst kind
 * to have in a suite that exists as evidence.
 *
 * `beforeAll` runs per worker, so each pays the compile once and no test pays
 * it at all.
 */
test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage()
  await page.goto('/plan', { waitUntil: 'domcontentloaded', timeout: 120_000 })
  await page.close()
})

test.describe('Plan timeline — pointer (mouse) path', () => {
  test.use({ viewport: DESKTOP, colorScheme: 'light' })

  test('draws the hour grid with its closing rule and a now line on today', async ({
    page,
  }) => {
    await seedDay(page, REALISTIC_DAY)
    await page.goto('/plan')

    const canvas = page.getByTestId('plan-timeline-canvas')
    await expect(canvas).toBeVisible()
    // A full day is 24 hours PLUS the rule that closes it.
    await expect(page.getByTestId('plan-timeline-hour-rule')).toHaveCount(25)
    await expect(page.getByTestId('plan-timeline-now')).toBeVisible()
    await expect(canvas).toHaveCSS('height', `${24 * HOUR_HEIGHT}px`)
  })

  test('lays a nested short event out in its own live column', async ({
    page,
  }) => {
    await seedDay(page, REALISTIC_DAY)
    await page.goto('/plan')

    const offsite = page.locator('[data-endeavor-id="e2e-offsite"]')
    const standup = page.locator('[data-endeavor-id="e2e-standup"]')
    await expect(offsite).toBeVisible()
    await expect(standup).toBeVisible()

    const [long, short] = await Promise.all([
      offsite.boundingBox(),
      standup.boundingBox(),
    ])
    expect(long).not.toBeNull()
    expect(short).not.toBeNull()
    if (long === null || short === null) return
    // Canon's whole reason for the sweep: the short event is beside the long
    // one, not on top of it, so both are independently hit-testable.
    expect(short.x).toBeGreaterThan(long.x)
  })

  test('marks a finished event inert — history cannot be armed', async ({
    page,
  }) => {
    await seedDay(page, REALISTIC_DAY)
    await page.goto('/plan')

    const past = page.locator('[data-endeavor-id="e2e-breakfast"]')
    await expect(past).toHaveAttribute('data-past', 'true')

    await holdWithMouse(page, past, 900)

    await expect(page.getByTestId('plan-timeline-edit-handle')).toHaveCount(0)
  })

  test('creates a dashed hour ghost from a hold on empty canvas', async ({
    page,
  }) => {
    await seedDay(page, [])
    await page.goto('/plan')

    await holdWithMouse(page, slotAt(page, 40), 500)

    const ghost = page.getByTestId('plan-timeline-draft')
    await expect(ghost).toBeVisible()
    await expect(ghost).toContainText('New event')
    // Canon's ghost is one hour long.
    await expect(ghost).toHaveCSS('height', `${HOUR_HEIGHT}px`)
  })

  test('creates the same ghost from a double click, with no hold', async ({
    page,
  }) => {
    await seedDay(page, [])
    await page.goto('/plan')

    const { x, y } = await centreOf(slotAt(page, 44))

    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.up()
    await page.mouse.down()
    await page.mouse.up()

    await expect(page.getByTestId('plan-timeline-draft')).toBeVisible()
  })

  test('ARMS edit mode on a hold and resizes with the bottom handle', async ({
    page,
  }) => {
    await seedDay(page, REALISTIC_DAY)
    await page.goto('/plan')

    const block = page.locator('[data-endeavor-id="e2e-review"]')
    // Scroll first, then measure: every later comparison is against the box
    // the block has WHILE it is reachable, and edit mode locks the scroll so
    // that box stays valid for the whole gesture.
    await block.scrollIntoViewIfNeeded()
    const before = await block.boundingBox()
    expect(before).not.toBeNull()
    if (before === null) return

    await holdWithMouse(page, block, 900)

    await expect(page.getByTestId('plan-timeline-edit-handle')).toHaveCount(2)
    // Canon disables the scroll view while a card is armed, or the drag would
    // be stolen by it.
    await expect(page.getByTestId('plan-timeline-scroll')).toHaveCSS(
      'overflow-y',
      'hidden',
    )

    const handle = page.locator(
      '[data-testid="plan-timeline-edit-handle"][data-edge="end"]',
    )
    const { x: hx, y: hy } = await centreOf(handle)

    await page.mouse.move(hx, hy)
    await page.mouse.down()
    // A whole hour, in 15-minute steps, so every snap crossing is exercised.
    for (let step = 1; step <= 4; step += 1) {
      await page.mouse.move(hx, hy + step * (HOUR_HEIGHT / 4), { steps: 3 })
    }
    await page.mouse.up()

    await expect
      .poll(async () => (await block.boundingBox())?.height ?? 0)
      .toBeGreaterThan(before.height + HOUR_HEIGHT / 2)
  })

  test('MOVES the block with a body drag, preserving its duration', async ({
    page,
  }) => {
    await seedDay(page, REALISTIC_DAY)
    await page.goto('/plan')

    const block = page.locator('[data-endeavor-id="e2e-review"]')
    await block.scrollIntoViewIfNeeded()
    const before = await block.boundingBox()
    expect(before).not.toBeNull()
    if (before === null) return

    await holdWithMouse(page, block, 900)

    const bx = before.x + before.width / 2
    const by = before.y + before.height / 2
    await page.mouse.move(bx, by)
    await page.mouse.down()
    for (let step = 1; step <= 4; step += 1) {
      await page.mouse.move(bx, by + step * (HOUR_HEIGHT / 4), { steps: 3 })
    }
    await page.mouse.up()

    await expect
      .poll(async () => (await block.boundingBox())?.y ?? 0)
      .toBeGreaterThan(before.y)
    // Canon's invariant: a body drag never changes duration.
    await expect
      .poll(async () => Math.round((await block.boundingBox())?.height ?? 0))
      .toBe(Math.round(before.height))
  })

  test('MOVES the card when the hold is continued into a slide, without lifting', async ({
    page,
  }) => {
    // The gesture a user actually makes — press, feel it arm, keep going — as
    // one uninterrupted pointer sequence. The drag hook is mounted onto a
    // press already in flight and never sees a `pointerdown`, so it has to
    // adopt the pointer that is already down.
    await seedDay(page, REALISTIC_DAY)
    await page.goto('/plan')

    const block = page.locator('[data-endeavor-id="e2e-review"]')
    await block.scrollIntoViewIfNeeded()
    const before = await block.boundingBox()
    expect(before).not.toBeNull()
    if (before === null) return

    const x = before.x + before.width / 2
    const y = before.y + before.height / 2

    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.waitForTimeout(900) // past the 0.6s arm
    for (let step = 1; step <= 4; step += 1) {
      await page.mouse.move(x, y + step * (HOUR_HEIGHT / 4), { steps: 3 })
    }
    await page.mouse.up()

    await expect
      .poll(async () => (await block.boundingBox())?.y ?? 0)
      .toBeGreaterThan(before.y)
    // And the deepened press fill let go, rather than sticking on the card.
    await expect(block).toHaveAttribute('data-pressed', 'false')
  })

  test('does NOT create an event from a plain single click on empty canvas', async ({
    page,
  }) => {
    // A slot's accessible activation and a pointer click are the same DOM
    // event; an unguarded handler would make one click create, which is
    // exactly what the hold/double-tap grammar refuses.
    await seedDay(page, [])
    await page.goto('/plan')

    const { x, y } = await centreOf(slotAt(page, 40))
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.up()
    await page.waitForTimeout(600)

    await expect(page.getByTestId('plan-timeline-draft')).toHaveCount(0)
  })

  test('commits the edit and re-enables scrolling when the canvas is clicked', async ({
    page,
  }) => {
    await seedDay(page, REALISTIC_DAY)
    await page.goto('/plan')

    await holdWithMouse(
      page,
      page.locator('[data-endeavor-id="e2e-review"]'),
      900,
    )
    await expect(page.getByTestId('plan-timeline-edit-handle')).toHaveCount(2)

    await page
      .getByTestId('plan-timeline-commit-surface')
      .click({ position: { x: 20, y: 20 } })

    await expect(page.getByTestId('plan-timeline-edit-handle')).toHaveCount(0)
    await expect(page.getByTestId('plan-timeline-scroll')).not.toHaveCSS(
      'overflow-y',
      'hidden',
    )
  })

  test('switches destination through the rotary picker, and the FAB stands down', async ({
    page,
  }) => {
    await seedDay(page, REALISTIC_DAY)
    await page.goto('/plan')

    await expect(page.getByTestId('plan-fab')).toBeVisible()
    await page.getByRole('button', { name: 'Priority Matrix' }).click()

    await expect(page.getByTestId('plan-mode-placeholder')).toHaveAttribute(
      'data-mode',
      'priorityMatrix',
    )
    await expect(page.getByTestId('plan-fab')).toHaveCount(0)
  })

  test('steps the day with the picker and shows that day contents', async ({
    page,
  }) => {
    await seedDay(page, REALISTIC_DAY)
    await page.goto('/plan')
    await expect(page.getByTestId('plan-timeline-block')).toHaveCount(4)

    await page.getByRole('button', { name: 'Next day' }).click()

    await expect(page.getByTestId('plan-timeline-block')).toHaveCount(0)
  })
})

test.describe('Plan timeline — touch path', () => {
  test.use({ ...PHONE, colorScheme: 'light' })

  test('creates the ghost from a finger hold, exactly as the mouse does', async ({
    page,
  }) => {
    await seedDay(page, [])
    await page.goto('/plan')

    await holdWithFinger(page, slotAt(page, 40), 500)

    await expect(page.getByTestId('plan-timeline-draft')).toBeVisible()
  })

  test('creates the same ghost from a double tap', async ({ page }) => {
    await seedDay(page, [])
    await page.goto('/plan')

    const slot = slotAt(page, 44)
    const { x, y } = await centreOf(slot)

    await tapWithFinger(slot, x, y)
    await page.waitForTimeout(80)
    await tapWithFinger(slot, x, y)

    await expect(page.getByTestId('plan-timeline-draft')).toBeVisible()
  })

  test('does NOT create when the finger slides into a scroll', async ({
    page,
  }) => {
    await seedDay(page, [])
    await page.goto('/plan')

    const slot = slotAt(page, 40)
    const { x, y } = await centreOf(slot)

    await dispatchPointerOn(slot, 'pointerdown', x, y)
    await dispatchPointerOn(slot, 'pointermove', x, y - 80)
    await page.waitForTimeout(600)
    await dispatchPointerOn(slot, 'pointerup', x, y - 80)

    await expect(page.getByTestId('plan-timeline-draft')).toHaveCount(0)
  })

  test('ARMS edit mode on a finger hold and moves the block with a body drag', async ({
    page,
  }) => {
    await seedDay(page, REALISTIC_DAY)
    await page.goto('/plan')

    const block = page.locator('[data-endeavor-id="e2e-review"]')
    const surface = block.getByTestId('plan-timeline-block-surface')
    await block.scrollIntoViewIfNeeded()
    const before = await block.boundingBox()
    expect(before).not.toBeNull()
    if (before === null) return

    // The gesture handlers live on the card's inner surface, not on the
    // positioned wrapper — a `pointerdown` dispatched on the wrapper bubbles
    // UP and never reaches them.
    await holdWithFinger(page, surface, 900)
    await expect(page.getByTestId('plan-timeline-edit-handle')).toHaveCount(2)

    // A whole hour, in 15-minute steps, so every snap crossing is exercised.
    await dragWithFinger(
      surface,
      { x: before.x + before.width / 2, y: before.y + before.height / 2 },
      [15, 30, 45, 60],
    )

    await expect
      .poll(async () => (await block.boundingBox())?.y ?? 0)
      .toBeGreaterThan(before.y)
  })

  test('DRAGS the top handle with a finger to move the start time', async ({
    page,
  }) => {
    await seedDay(page, REALISTIC_DAY)
    await page.goto('/plan')

    const block = page.locator('[data-endeavor-id="e2e-review"]')
    await block.scrollIntoViewIfNeeded()
    const before = await block.boundingBox()
    expect(before).not.toBeNull()
    if (before === null) return

    await holdWithFinger(
      page,
      block.getByTestId('plan-timeline-block-surface'),
      900,
    )

    const handle = page.locator(
      '[data-testid="plan-timeline-edit-handle"][data-edge="start"]',
    )
    const { x: hx, y: hy } = await centreOf(handle)

    await dragWithFinger(handle, { x: hx, y: hy }, [-15, -30])

    // A top-handle drag never moves the end, so the card grows upward.
    await expect
      .poll(async () => (await block.boundingBox())?.height ?? 0)
      .toBeGreaterThan(before.height)
  })
})

test.describe('Plan timeline — dark scheme, desktop', () => {
  test.use({ viewport: DESKTOP, colorScheme: 'dark' })

  test('renders the canvas, both pickers and the FAB in the dark theme', async ({
    page,
  }) => {
    await seedDay(page, REALISTIC_DAY)
    await page.goto('/plan')

    await expect(page.getByTestId('plan-timeline-canvas')).toBeVisible()
    await expect(page.getByTestId('plan-day-picker')).toBeVisible()
    await expect(page.getByTestId('plan-view-mode-picker')).toBeVisible()
    await expect(page.getByTestId('plan-fab')).toBeVisible()
    await expect(page.getByTestId('plan-timeline-block')).toHaveCount(4)
  })
})

test.describe('Plan timeline — dark scheme, phone', () => {
  test.use({ ...PHONE, colorScheme: 'dark' })

  test('keeps every chrome piece reachable on a phone in the dark', async ({
    page,
  }) => {
    await seedDay(page, REALISTIC_DAY)
    await page.goto('/plan')

    await expect(page.getByTestId('plan-timeline-canvas')).toBeVisible()
    await expect(page.getByTestId('plan-day-chip')).toHaveCount(5)
    // `exact` matters: the accessible slot buttons are all named "Add event
    // at …", and Playwright matches a name by substring unless told not to.
    await expect(
      page.getByRole('button', { name: 'Add', exact: true }),
    ).toBeVisible()
  })
})

// ---------------------------------------------------------------- helpers

const slotAt = (page: Page, index: number): Locator =>
  page
    .getByTestId('plan-timeline-slots')
    .locator(`[data-timeline-slot="${index}"]`)

/**
 * Write `EndeavorRecord` rows into the app's own IndexedDB before it boots.
 *
 * `addInitScript` runs before any page script, so the store is populated by
 * the time the Page's Producer reads it — no waiting, no race. The database
 * name, version and object store are the ones `KroDatabase.ts` declares; the
 * row shape is the one `endeavorRecordFromEndeavor` produces.
 */
async function seedDay(
  page: Page,
  events: readonly SeedEvent[],
): Promise<void> {
  await page.addInitScript((rows: readonly SeedEvent[]) => {
    const open = indexedDB.open('kro', 1)

    open.onupgradeneeded = () => {
      const database = open.result
      // Mirrors `kroSchemaMigrations` step 1. The app opens the same version,
      // so whichever of the two runs first, the schema is identical.
      if (!database.objectStoreNames.contains('endeavors')) {
        database.createObjectStore('endeavors', { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains('projects')) {
        database.createObjectStore('projects', { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains('userProfiles')) {
        database.createObjectStore('userProfiles', { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains('lensSnapshots')) {
        database.createObjectStore('lensSnapshots', { keyPath: 'vistaId' })
      }
      if (!database.objectStoreNames.contains('defers')) {
        database
          .createObjectStore('defers')
          .createIndex('endeavorId', 'endeavorId', { unique: false })
      }
      if (!database.objectStoreNames.contains('performances')) {
        database
          .createObjectStore('performances')
          .createIndex('endeavorId', 'endeavorId', { unique: false })
      }
    }

    open.onsuccess = () => {
      const database = open.result
      if (rows.length === 0) {
        database.close()
        return
      }
      const now = new Date()
      const transaction = database.transaction('endeavors', 'readwrite')
      const store = transaction.objectStore('endeavors')
      for (const row of rows) {
        const start = new Date()
        start.setHours(row.hour, row.minute ?? 0, 0, 0)
        store.put({
          id: row.id,
          title: row.title,
          kind: 'calendarEvent',
          status: 'planned',
          isDraft: false,
          tagsCsv: '',
          shadowsJson: null,
          repeatConfigJson: null,
          start,
          due: null,
          duration: row.durationSeconds,
          minimumDuration: null,
          maximumDuration: null,
          projectId: null,
          ownerUserId: null,
          ownerGroupId: null,
          completed: null,
          createdAt: now,
          updatedAt: null,
          value: null,
          effort: null,
          expiry: null,
          associatedColor: row.associatedColor ?? null,
          sessionPoints: null,
          updatedAtEpochMillis: now.getTime(),
          lastSyncedAtEpochMillis: null,
          deletedAtEpochMillis: null,
        })
      }
      transaction.oncomplete = () => database.close()
    }
  }, events)
}

/**
 * A `PointerEvent` at a page coordinate with `pointerType: "touch"`.
 *
 * `page.touchscreen` offers only `tap`, and every drag below needs
 * `pointermove` between down and up. Dispatching the real event on the element
 * under the point is the touch equivalent of `page.mouse` — the same three
 * events the production handlers listen for, with the other `pointerType`.
 */
async function dispatchPointerOn(
  locator: Locator,
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  x: number,
  y: number,
): Promise<void> {
  await locator.evaluate(
    (element, { type, x, y }) => {
      element.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          composed: true,
          clientX: x,
          clientY: y,
          pointerId: 1,
          pointerType: 'touch',
          isPrimary: true,
          button: 0,
          buttons: type === 'pointerup' ? 0 : 1,
        }),
      )
    },
    { type, x, y },
  )
}

/**
 * A finger drag on one element — down, N moves, up — all dispatched at **that
 * element**, whatever the coordinates say.
 *
 * That is what pointer capture does in a real browser, and it is why the
 * helper takes a locator rather than a point: a drag that leaves a 14px handle
 * would otherwise retarget its second `pointermove` to whatever is now under
 * the finger, and the handle would never see the rest of its own gesture. The
 * production code calls `setPointerCapture` for exactly this reason; the test
 * has to model it rather than fight it.
 */
async function dragWithFinger(
  locator: Locator,
  from: { readonly x: number; readonly y: number },
  offsets: readonly number[],
): Promise<void> {
  await dispatchPointerOn(locator, 'pointerdown', from.x, from.y)
  for (const dy of offsets) {
    await dispatchPointerOn(locator, 'pointermove', from.x, from.y + dy)
  }
  const last = offsets[offsets.length - 1] ?? 0
  await dispatchPointerOn(locator, 'pointerup', from.x, from.y + last)
}

async function tapWithFinger(
  locator: Locator,
  x: number,
  y: number,
): Promise<void> {
  await dispatchPointerOn(locator, 'pointerdown', x, y)
  await dispatchPointerOn(locator, 'pointerup', x, y)
}

/**
 * The centre of an element, in **viewport** coordinates, after scrolling it
 * into view.
 *
 * Both input paths need this. `page.mouse` dispatches at a viewport point, and
 * `document.elementFromPoint` reads one — so a target below the fold (a 14:00
 * block on a 24-hour canvas is 840px down) would otherwise be aimed at
 * whatever happens to be at that coordinate on screen, which is usually
 * nothing. The canvas scrolls, so the fix is to scroll it, exactly as a user
 * would before reaching for the block.
 */
async function centreOf(
  locator: Locator,
): Promise<{ readonly x: number; readonly y: number }> {
  await locator.scrollIntoViewIfNeeded()
  const box = await locator.boundingBox()
  expect(box).not.toBeNull()
  if (box === null) return { x: 0, y: 0 }
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

async function holdWithFinger(
  page: Page,
  locator: Locator,
  ms: number,
): Promise<void> {
  const { x, y } = await centreOf(locator)
  await dispatchPointerOn(locator, 'pointerdown', x, y)
  await page.waitForTimeout(ms)
  await dispatchPointerOn(locator, 'pointerup', x, y)
}

async function holdWithMouse(
  page: Page,
  locator: Locator,
  ms: number,
): Promise<void> {
  const { x, y } = await centreOf(locator)
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.waitForTimeout(ms)
  await page.mouse.up()
}
