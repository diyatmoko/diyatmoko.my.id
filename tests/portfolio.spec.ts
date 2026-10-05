import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('hydrates the production page without errors or blocked assets', async ({ page }) => {
  const errors: string[] = []
  const failed: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('requestfailed', (request) => failed.push(request.url()))
  page.on('response', (response) => {
    if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`)
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName(
    'Complexity, made clear.',
  )
  await expect(page.locator('.project-card')).toHaveCount(3)
  await expect(page).toHaveTitle(/Yanuar Diyatmoko/)
  await page.getByRole('button', { name: 'Explore project: MESTHI', exact: true }).last().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(errors).toEqual([])
  expect(failed).toEqual([])
})

test('prerendered profile and project content remains readable without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.locator('.project-card')).toHaveCount(3)
  await expect(page.locator('#about')).toContainText('13+ years')
  await expect(page.getByRole('link', { name: 'Find me on GitHub', exact: true })).toHaveAttribute(
    'href',
    'https://github.com/diyatmoko',
  )
  await context.close()
})

test('project filters show the right work and announce the result', async ({ page }) => {
  await page.goto('/')
  for (const [label, id] of [
    ['Platforms', 'mesthi'],
    ['Enterprise', 'enterprise'],
    ['Experiments', 'quant'],
  ] as const) {
    await page.getByRole('button', { name: label, exact: true }).click()
    await expect(page.locator('.project-card')).toHaveCount(1)
    await expect(page.locator(`.project-${id}`)).toBeVisible()
    await expect(page.getByRole('status')).toHaveText('01 projects')
  }
  await page.getByRole('button', { name: 'All work', exact: true }).click()
  await expect(page.locator('.project-card')).toHaveCount(3)
})

test('project dialog traps focus, closes on Escape, and returns focus', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const trigger = page.getByRole('button', { name: 'Explore project: MESTHI', exact: true }).last()
  await trigger.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Workspace and backlog planning')
  await expect(dialog.getByRole('link', { name: 'Visit MESTHI' })).toHaveAttribute(
    'href',
    'https://mesthi.com',
  )
  for (let index = 0; index < 5; index++) {
    await page.keyboard.press('Tab')
    expect(
      await page.evaluate(() => document.querySelector('dialog')?.contains(document.activeElement)),
    ).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('')
})

test('language selection changes the whole page and persists across reloads', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Switch to Indonesian' }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'id')
  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName(
    'Kompleksitas, jadi jelas.',
  )
  await expect(page.getByRole('button', { name: 'Semua karya', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'id')
  await page.getByRole('button', { name: 'Switch to English' }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})

test('motion can be paused and the setting persists', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Pause animations' }).click()
  await expect(page.locator('.portfolio')).toHaveAttribute('data-motion', 'off')
  const shell = page.locator('.orbit-shell')
  const pausedTransform = await shell.getAttribute('transform')
  await page.waitForTimeout(180)
  expect(await shell.getAttribute('transform')).toBe(pausedTransform)
  await page.reload()
  await expect(page.locator('.portfolio')).toHaveAttribute('data-motion', 'off')
  await page.getByRole('button', { name: 'Enable animations' }).click()
  await expect(page.locator('.portfolio')).toHaveAttribute('data-motion', 'on')
})

test('system reduced-motion preference is respected, including changes while open', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.locator('.portfolio')).toHaveAttribute('data-motion', 'off')
  await expect(
    page.getByRole('button', { name: 'Reduced motion is enabled on your device' }),
  ).toBeDisabled()
  expect(await page.locator('.orbit-shell').getAttribute('transform')).toBeNull()
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect(page.getByRole('button', { name: 'Pause animations' })).toBeEnabled()
})

test('orbital motion runs when visible and pauses outside the viewport', async ({ page }) => {
  await page.goto('/')
  const orbit = page.locator('.orbit-shell')
  await expect(page.getByRole('button', { name: 'Pause animations' })).toBeEnabled()
  const initial = await orbit.getAttribute('transform')
  await page.waitForTimeout(180)
  expect(await orbit.getAttribute('transform')).not.toBe(initial)
  await page.locator('#contact').scrollIntoViewIfNeeded()
  await page.waitForTimeout(180)
  const outsideViewport = await orbit.getAttribute('transform')
  await page.waitForTimeout(180)
  expect(await orbit.getAttribute('transform')).toBe(outsideViewport)
})

test('mobile navigation supports keyboard and section navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const toggle = page.getByRole('button', { name: 'Open navigation' })
  await toggle.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(toggle).toBeFocused()
  await toggle.click()
  await page.getByRole('dialog').getByRole('link', { name: '01 Work' }).click()
  await expect(page).toHaveURL(/#work$/)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('#work')).toBeFocused()
})

test('mobile navigation closes when resized to desktop', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.setViewportSize({ width: 1440, height: 960 })
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('')
})

test('engineering focus controls work with touch and keep an accessible state', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'AI agents', exact: true }).click()
  await expect(page.locator('.hero-art')).toHaveAttribute('data-mode', '1')
  await expect(page.getByRole('button', { name: 'AI agents', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.locator('.art-caption')).toContainText('Intelligence, orchestrated.')
})

for (const width of [320, 390, 768, 1024, 1440]) {
  for (const language of ['en', 'id'] as const) {
    test(`no clipped content at ${width}px in ${language.toUpperCase()}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto('/')
      if (language === 'id')
        await page.getByRole('button', { name: 'Switch to Indonesian' }).click()
      const dimensions = await page.evaluate(() => ({
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth,
      }))
      expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport)
      const heading = await page.locator('h1').boundingBox()
      expect(heading?.x).toBeGreaterThanOrEqual(0)
      for (const line of await page.locator('.hero-line-inner').all()) {
        const bounds = await line.boundingBox()
        expect(bounds && bounds.x + bounds.width).toBeLessThanOrEqual(width - 10)
      }
      await expect(page.locator('.project-card')).toHaveCount(3)
    })
  }
}

test('desktop page passes automated WCAG A/AA checks', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  expect(results.violations).toEqual([])
})

test('mobile page and project dialog pass automated WCAG A/AA checks', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const pageResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  expect(pageResults.violations).toEqual([])
  await page.getByRole('button', { name: 'Explore project: MESTHI', exact: true }).last().click()
  const dialogResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  expect(dialogResults.violations).toEqual([])
})

test('production headers, health check, and SEO assets are valid', async ({ request }) => {
  const response = await request.get('/')
  expect(response.headers()['content-security-policy']).toContain("script-src 'self' 'sha256-")
  expect(response.headers()['x-content-type-options']).toBe('nosniff')
  expect(response.headers()['cache-control']).toBe('no-cache')
  const html = await response.text()
  expect(html).toContain('application/ld+json')
  expect(html).toContain('rel="canonical"')
  expect(await (await request.get('/health.txt')).text()).toBe('ok\n')
  for (const path of ['/robots.txt', '/sitemap.xml', '/og-image.png', '/apple-touch-icon.png'])
    expect((await request.get(path)).ok()).toBe(true)
  expect((await request.get('/not-a-route')).status()).toBe(404)
  const asset = html.match(/src="(\/assets\/[^" ]+\.js)"/)
  expect(asset).not.toBeNull()
  expect((await request.get(asset![1]!)).headers()['cache-control']).toContain('immutable')
})
