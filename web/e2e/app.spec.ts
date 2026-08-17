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
