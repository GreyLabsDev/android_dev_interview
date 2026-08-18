import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { questionsByTopic } from '../src/content'
import { topics } from '../src/content/topics'

const repositoryRoot = resolve(import.meta.dirname, '..', '..')
const errors: string[] = []
const allIds = new Set<string>()

function normalizeHeading(value: string) {
  return value
    .toLowerCase()
    .replace(/[`*_~]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim()
}

for (const topic of topics) {
  const questions = questionsByTopic[topic.id]
  if (questions.length === 0 || questions.length % 20 !== 0) {
    errors.push(`${topic.id}: question count must be divisible by 20`)
  }

  for (const question of questions) {
    if (allIds.has(question.id)) errors.push(`${question.id}: duplicate id`)
    allIds.add(question.id)

    if (question.topicId !== topic.id) {
      errors.push(`${question.id}: topicId does not match ${topic.id}`)
    }
    if (question.options.length !== 4) {
      errors.push(`${question.id}: expected exactly four options`)
    }
    if (new Set(question.options.map((option) => option.id)).size !== question.options.length) {
      errors.push(`${question.id}: duplicate option ids`)
    }
    if (!question.options.some((option) => option.id === question.correctOptionId)) {
      errors.push(`${question.id}: correctOptionId is missing`)
    }
    if (!question.explanation.summary.trim() || !question.explanation.mechanism.trim()) {
      errors.push(`${question.id}: explanation is incomplete`)
    }

    const sourcePath = resolve(repositoryRoot, question.source.file)
    if (!existsSync(sourcePath)) {
      errors.push(`${question.id}: source file ${question.source.file} does not exist`)
    } else {
      const source = readFileSync(sourcePath, 'utf8')
      const headings = source
        .split('\n')
        .filter((line) => /^#{1,4}\s+/u.test(line))
        .map((line) => normalizeHeading(line.replace(/^#{1,4}\s+/u, '')))
      if (!headings.includes(normalizeHeading(question.source.section))) {
        errors.push(`${question.id}: section "${question.source.section}" not found in source`)
      }
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exit(1)
}

console.log(`Validated ${allIds.size} questions across ${topics.length} topics`)
