import { execFileSync } from 'node:child_process'

function repositoryName() {
  if (process.env.GITHUB_REPOSITORY) {
    return process.env.GITHUB_REPOSITORY.split('/').at(-1)
  }
  try {
    const remote = execFileSync('git', ['remote', 'get-url', 'origin'], {
      encoding: 'utf8',
    }).trim()
    return remote.replace(/\.git$/u, '').split('/').at(-1)
  } catch {
    return null
  }
}

const name = repositoryName()
if (!name) {
  console.error('Не найден GitHub remote origin. Сначала создайте репозиторий и добавьте remote.')
  process.exit(1)
}

const basePath = `/${name}/`
console.log(`Building GitHub Pages with base path ${basePath}`)

execFileSync('bun', ['run', 'check'], {
  stdio: 'inherit',
  env: { ...process.env, VITE_BASE_PATH: basePath },
})
execFileSync('bunx', ['gh-pages', '-d', 'dist'], { stdio: 'inherit' })

console.log(`Published. Expected URL: https://<owner>.github.io/${name}/`)
