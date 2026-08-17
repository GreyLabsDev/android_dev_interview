import { expect, test } from '@playwright/test'

test('opens topic list and starts a training', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Выберите тему' })).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(6)

  await page.getByRole('article').first().getByRole('button', { name: 'Начать тренировку' }).click()
  await expect(page.getByText('Вопрос 1 из 20')).toBeVisible()
  await expect(page.getByRole('group', { name: 'Варианты ответа' }).getByRole('button')).toHaveCount(4)
})

test('renders the Markdown library', async ({ page }) => {
  await page.goto('/#/theory')
  await expect(page.getByRole('heading', { name: 'Вся теория' })).toBeVisible()
  await expect(page.locator('.markdown-article')).toContainText('Senior Android')
})

test('scrolls to a theory section from the table of contents', async ({ page }) => {
  await page.goto('/#/theory/kotlin-senior-android-guide')
  await page.getByText('Оглавление', { exact: true }).click()

  const sectionTitle = '1.1. Kotlin — компилируемый или интерпретируемый язык?'
  const sectionHeading = page.getByRole('heading', { name: sectionTitle })
  const sectionId = await sectionHeading.getAttribute('id')

  expect(sectionId).toBeTruthy()
  await page.getByRole('button', { name: sectionTitle }).click()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500)
  const sectionSlug = sectionId!.replace(/^user-content-/u, '')
  await expect(page).toHaveURL(new RegExp(`section=${encodeURIComponent(sectionSlug)}`))
})

test('forces dark theme and returns to device theme', async ({ page }) => {
  await page.goto('/')
  const themeSwitch = page.getByRole('switch')

  await expect(themeSwitch).toHaveAttribute('aria-checked', 'false')
  await themeSwitch.click()
  await expect(themeSwitch).toHaveAttribute('aria-checked', 'true')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  await page.reload()
  await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'true')

  await page.getByRole('switch').click()
  await expect(page.locator('html')).not.toHaveAttribute('data-theme')
})
