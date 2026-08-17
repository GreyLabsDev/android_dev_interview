# Android Interview Trainer

Адаптивный тренажёр по материалам из корня репозитория. Содержит шесть тем,
сессии по 20 вопросов, непрерывное покрытие темы и библиотеку исходных Markdown-файлов.

## Требования

- [Bun](https://bun.sh/) 1.2 или новее.
- Git — только для публикации на GitHub Pages.

## Локальный запуск

```bash
cd web
bun install
bun run dev
```

Основные команды:

```bash
bun run generate:materials  # пересобрать каталог Markdown из корня
bun run validate:content    # проверить 240 вопросов
bun run test
bun run lint
bun run check               # все проверки и production build
bun run preview             # проверить dist локально
```

## Как обновляется теория

`scripts/generate-materials.mjs` сканирует только корень репозитория и включает
в приложение все файлы `.md` и `.markdown`. Команда автоматически выполняется
перед production build. Редактировать `src/generated/materials.json` вручную не нужно.

## Автоматический деплой на GitHub Pages

1. Отправьте изменения в основную ветку `master`.
2. Откройте **Settings → Pages**.
3. В поле **Source** выберите **GitHub Actions**.
4. Сделайте push в `master` или запустите workflow
   **Check and deploy GitHub Pages** вручную.
5. После job `deploy` сайт будет доступен по адресу
   `https://<owner>.github.io/<repository>/`.

Workflow `.github/workflows/deploy-pages.yml` устанавливает зависимости,
запускает генерацию материалов, валидацию, lint, тесты и сборку, затем публикует
`web/dist` официальными GitHub Pages actions. Для pull request выполняются только проверки.

## Ручной резервный деплой

После настройки `origin` выполните:

```bash
cd web
bun run deploy:pages
```

Скрипт определит имя репозитория, соберёт приложение с правильным Vite base path
и опубликует `dist` через `gh-pages`. Он не изменяет git config.

## Маршрутизация и 404

Приложение использует `HashRouter`, поэтому GitHub Pages не нуждается в rewrite:
прямые ссылки вида `/#/theory/README` и их обновление работают без `404.html`.
Если assets возвращают 404, проверьте `VITE_BASE_PATH`: для project page это
`/<repository>/`, для custom domain — `/`.

## Custom domain

Для custom domain добавьте домен в **Settings → Pages**, настройте DNS и собирайте
с `VITE_BASE_PATH=/`. При необходимости добавьте файл `web/public/CNAME`.
