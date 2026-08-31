import type { Page } from '@playwright/test'

/**
 * Opening one story, isolated.
 *
 * `/iframe.html` is Storybook's own story canvas without the manager chrome —
 * no sidebar, no toolbar, nothing between the viewport and the component. That
 * matters here: both specs in this folder measure a surface against the
 * VIEWPORT, and the manager's iframe would silently make every measurement
 * relative to a panel instead.
 */
export async function openStory(page: Page, id: string): Promise<void> {
  await page.goto(`/iframe.html?id=${id}&viewMode=story`)
  // Storybook renders into `#storybook-root`; waiting for it (rather than for
  // `networkidle`) is what makes these specs stable while the dev server is
  // still compiling other stories in the background.
  await page.waitForSelector('#storybook-root > *', { state: 'attached' })
}
