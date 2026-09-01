import { expect, test } from '@playwright/test'
import { openStory } from './storybook'

/**
 * The glass material must lose to a utility on the same element.
 *
 * THE DEFECT THIS GUARDS (KC-IS-#69, fixed by KC-IS-#30, guarded here by
 * KC-IS-#71 item 17). `glass.css` sets `.kro-glass { position: relative }`, and
 * it used to be imported **unlayered**. Unlayered CSS beats every `@layer`
 * rule, Tailwind emits every utility inside `@layer utilities`, and both
 * `DialogContent` and `SheetContent` are `.kro-glass` elements asking for
 * `fixed` with a utility class. So every glass overlay in the app computed to
 * `position: relative` and rendered **inline in the document flow**: an auth
 * modal measured `top: 869px` in an 844px viewport, an 85vh bottom sheet did
 * not appear at all, and the session pill came out at the wrong radius.
 *
 * WHY IT LIVES HERE AND NOT IN VITEST. Three surfaces already assert what they
 * can from jsdom, and none of them can see this:
 *
 *   · `endeavorDetail/pages/__tests__/overlayCascade.test.ts` reads
 *     `styles.css` from disk and asserts the `layer(components)` token is
 *     present. That is the FIX being spelled correctly, not the fix working.
 *   · the primitives' own suites deliberately never put a panel on screen
 *     (`radixEnvironment.tsx` records the 5–12 s cost).
 *   · jsdom applies no stylesheets and performs no layout at all, so
 *     `getComputedStyle(...).position` there is the inline style or nothing.
 *
 * Only a real engine resolves a cascade. These assertions are therefore on the
 * COMPUTED value in Chromium, driven through the shipped primitives' own
 * stories — which is the same reason `action-surface.spec.ts` lives beside it.
 */

const DIALOG_STORY = 'design-system-primitives-dialog--default'
const SHEET_STORY = 'design-system-primitives-sheet--bottom'

test.describe('a glass Dialog is pinned to the viewport, not laid out in flow', () => {
  test('computes `position: fixed`, which the unlayered material used to win', async ({
    page,
  }) => {
    await openStory(page, DIALOG_STORY)
    await page.getByRole('button', { name: 'Triage inbox' }).click()

    const panel = page.getByRole('dialog')
    await expect(panel).toBeVisible()

    // THE REGRESSION. `.kro-glass`'s `position: relative` beat the `fixed`
    // utility on the same element while glass.css was unlayered.
    await expect(panel).toHaveCSS('position', 'fixed')
  })

  test('carries the material it is layered under — the fix does not delete it', async ({
    page,
  }) => {
    await openStory(page, DIALOG_STORY)
    await page.getByRole('button', { name: 'Triage inbox' }).click()

    const panel = page.getByRole('dialog')

    // The blur is on the `::before` layer, never on the element: Safari drops
    // a `backdrop-filter` that shares an element with `position: fixed`, so the
    // kit puts the material on an inner pseudo-element. Asserting it here is
    // what keeps "make the utility win" from being solved by dropping the
    // class — and `isolation: isolate` is the element's own tell, since no
    // Tailwind utility in use sets it.
    const material = await panel.evaluate((node) => ({
      filter: getComputedStyle(node, '::before').backdropFilter,
      isolation: getComputedStyle(node).isolation,
    }))

    expect(material.filter).not.toBe('none')
    expect(material.isolation).toBe('isolate')
  })

  test('sits inside the viewport rather than after the shell in normal flow', async ({
    page,
  }) => {
    await openStory(page, DIALOG_STORY)
    await page.getByRole('button', { name: 'Triage inbox' }).click()

    const box = await page.getByRole('dialog').boundingBox()
    const viewport = page.viewportSize()
    if (box === null || viewport === null) throw new Error('nothing rendered')

    // The measured symptom, stated as the property a user would notice: the
    // panel is on screen. In flow it landed below the fold.
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.y).toBeLessThan(viewport.height)
  })
})

test.describe('a glass bottom Sheet reaches the bottom edge', () => {
  test('computes `position: fixed` and is flush with the viewport bottom', async ({
    page,
  }) => {
    await openStory(page, SHEET_STORY)

    const sheet = page.getByRole('dialog')
    await expect(sheet).toBeVisible()
    await expect(sheet).toHaveCSS('position', 'fixed')

    const box = await sheet.boundingBox()
    const viewport = page.viewportSize()
    if (box === null || viewport === null) throw new Error('nothing rendered')

    // `inset-x-0 bottom-0` is three more utilities on the same element; if the
    // cascade regressed, the sheet would be wherever the flow put it instead.
    expect(Math.round(box.y + box.height)).toBe(viewport.height)
    expect(Math.round(box.x)).toBe(0)
    expect(Math.round(box.width)).toBe(viewport.width)
  })
})
