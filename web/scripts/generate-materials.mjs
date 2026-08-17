import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import GithubSlugger from 'github-slugger'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const webDirectory = resolve(scriptDirectory, '..')
const repositoryDirectory = resolve(webDirectory, '..')
const outputDirectory = join(webDirectory, 'src', 'generated')
const outputFile = join(outputDirectory, 'materials.json')

const files = (await readdir(repositoryDirectory, { withFileTypes: true }))
  .filter(
    (entry) =>
      entry.isFile() &&
      (entry.name.endsWith('.md') || entry.name.endsWith('.markdown')),
  )
  .map((entry) => entry.name)
  .sort((left, right) =>
    left.localeCompare(right, 'ru', { numeric: true, sensitivity: 'base' }),
  )

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/\.(md|markdown)$/u, '')
    .replace(/[^a-z0-9а-яё]+/giu, '-')
    .replace(/^-|-$/gu, '')
}

const materials = await Promise.all(
  files.map(async (file) => {
    const content = await readFile(join(repositoryDirectory, file), 'utf8')
    const headingSlugger = new GithubSlugger()
    const headings = [...content.matchAll(/^(#{1,4})\s+(.+)$/gmu)].map((match) => ({
      depth: match[1].length,
      title: match[2].trim(),
      slug: headingSlugger.slug(match[2].trim()),
    }))
    return {
      file,
      slug: slugify(file),
      title: headings[0]?.title ?? file,
      headings,
      content,
    }
  }),
)

await mkdir(outputDirectory, { recursive: true })
await writeFile(outputFile, `${JSON.stringify(materials)}\n`)
console.log(`Generated ${materials.length} Markdown materials`)
