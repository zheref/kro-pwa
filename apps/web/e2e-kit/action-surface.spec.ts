import { expect, test } from '@playwright/test'
import { openStory } from './storybook'

/**
 * `EndeavorActionSurface`, in an engine that actually implements pointers.
 *
 * TWO DEFECTS LIVE HERE, and neither is visible to the kit's Vitest suite.
 *
 * 1. **Pointer capture ate the click.** The surface called `setPointerCapture`
 *    on `pointerdown`, and a captured pointer retargets the subsequent `click`
 *    to the capturing element — so canon's two in-row buttons (Triage, Add for
 *    Today) never fired on any touch device. jsdom implements no pointer
 *    capture at all, so the suite was green throughout. The fix takes the
 *    capture at the drag threshold instead; the unit suite pins *that*, and
 *    this pins what it was for: the click lands.
 *
 * 2. **The hover chrome sat on top of those buttons.** The strip and the ⋯
 *    trigger are both anchored to the trailing edge and both become clickable
 *    on hover, and nothing reserved room for them. jsdom performs no layout,
 *    so "these two rectangles overlap" is a question only a browser can be
 *    asked.
 *
 * Both are driven through `Endeavor/EndeavorActionSurface`'s own stories, so
 * what is measured is the shipped component and not a lookalike.
 */

const TOUCH_STORY =
  'endeavor-endeavoractionsurface--touch-with-trailing-buttons'
const POINTER_STORY =
  'endeavor-endeavoractionsurface--pointer-with-trailing-buttons'

test.describe('a tap on an in-row button reaches the button', () => {
  test('fires Triage on a plain tap, with the swipe grammar active', async ({
    page,
  }) => {
    await openStory(page, TOUCH_STORY)

    const surface = page.locator('[data-slot="endeavor-action-surface"]')
    await expect(surface).toHaveAttribute('data-input', 'touch')
    await expect(page.getByTestId('tap-log')).toHaveText('No button tapped yet')

    await page.getByTestId('row-button-Triage').click()

    // THE REGRESSION. With capture taken on `pointerdown`, the click was
    // retargeted to the content wrapper and this stayed on its empty state.
    await expect(page.getByTestId('tap-log')).toHaveText('Triage')
  })

  test('fires the second button too, and both in order', async ({ page }) => {
    await openStory(page, TOUCH_STORY)

    await page.getByTestId('row-button-Add-for-Today').click()
    await page.getByTestId('row-button-Triage').click()

    await expect(page.getByTestId('tap-log')).toHaveText(
      'Add for Today, Triage',
    )
  })

  test('still swipes — the fix defers the capture, it does not remove it', async ({
    page,
  }) => {
    await openStory(page, TOUCH_STORY)

    const content = page.locator('[data-slot="endeavor-action-content"]')
    const box = await content.boundingBox()
    if (box === null) throw new Error('the story did not render')

    // Start on the row's own body, well clear of the trailing buttons.
    const startX = box.x + 40
    const y = box.y + box.height / 2

    await page.mouse.move(startX, y)
    await page.mouse.down()
    // Several moves, as a real drag produces: the first past the threshold is
    // the one that takes the capture.
    for (const dx of [10, 30, 50, 70]) {
      await page.mouse.move(startX + dx, y)
    }

    // The row has travelled with the pointer.
    const transform = await content.evaluate(
      (node) => getComputedStyle(node).transform,
    )
    expect(transform).not.toBe('none')

    await page.mouse.up()
  })

  test('a drag that starts ON a button still swipes rather than firing it', async ({
    page,
  }) => {
    // The other side of the same contract: crossing the threshold means the
    // gesture is a swipe, and a swipe must not also count as a tap.
    await openStory(page, TOUCH_STORY)

    const button = page.getByTestId('row-button-Triage')
    const box = await button.boundingBox()
    if (box === null) throw new Error('the story did not render')

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 - 120, box.y + box.height / 2)
    await page.mouse.up()

    await expect(page.getByTestId('tap-log')).toHaveText('No button tapped yet')
  })
})

test.describe('the pointer chrome gets its own gutter', () => {
  test('does not overlap the trailing buttons once revealed on hover', async ({
    page,
  }) => {
    await openStory(page, POINTER_STORY)

    const surface = page.locator('[data-slot="endeavor-action-surface"]')
    await expect(surface).toHaveAttribute('data-input', 'pointer')

    // Reveal the chrome the way a user does.
    await surface.hover()

    const strip = page.locator('[data-slot="endeavor-hover-actions"]')
    await expect(strip).toBeVisible()

    const stripBox = await strip.boundingBox()
    const buttonsBox = await page.getByTestId('inbox-row-buttons').boundingBox()
    if (stripBox === null || buttonsBox === null)
      throw new Error('the story did not render')

    // THE REGRESSION: the strip began exactly where the buttons were, so it
    // covered them completely and neither could be clicked.
    expect(stripBox.x).toBeGreaterThanOrEqual(
      buttonsBox.x + buttonsBox.width - 1,
    )
  })

  test('leaves the buttons hittable while the chrome is showing', async ({
    page,
  }) => {
    await openStory(page, POINTER_STORY)

    const surface = page.locator('[data-slot="endeavor-action-surface"]')
    await surface.hover()
    await expect(
      page.locator('[data-slot="endeavor-hover-actions"]'),
    ).toBeVisible()

    // `click()` fails outright if another element would receive the event, so
    // this asserts reachability as well as the handler.
    await page.getByTestId('row-button-Triage').click()
    await expect(page.getByTestId('tap-log')).toHaveText('Triage')
  })

  test('reserves the gutter the kit’s own geometry asks for', async ({
    page,
  }) => {
    await openStory(page, POINTER_STORY)

    const surface = page.locator('[data-slot="endeavor-action-surface"]')
    // Two hover actions (the Inbox vista's two swipe bindings) plus the menu:
    // 8 + 28 + 4 + 28 = 68, which is wider than the trigger's 4 + 28.
    await expect(surface).toHaveAttribute('data-pointer-gutter', '68')

    const row = page.locator('[data-slot="endeavor-row"]')
    await expect(row).toHaveCSS('padding-right', '84px')
  })
})
