import { isValidElement, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'
import { materials } from '../generated/materials'

// Материал, где заголовки задач (h3) и решений (h2) пронумерованы одинаково -
// это позволяет автоматически связать их без ручного подбора якорей.
const TASK_SOLUTION_MATERIAL_SLUG = '19-coroutines-interview-tasks'

function headingPlainText(node: ReactNode): string {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(headingPlainText).join('')
  if (isValidElement<{ children?: ReactNode }>(node)) return headingPlainText(node.props.children)
  return ''
}

function headingNumber(node: ReactNode): number | null {
  const match = /^(\d+)\./u.exec(headingPlainText(node).trim())
  return match ? Number(match[1]) : null
}

function extractCode(children: ReactNode) {
  if (!isValidElement<{ children?: ReactNode }>(children)) return ''
  return String(children.props.children ?? '').replace(/\n$/u, '')
}

function PreBlock({ children }: { children?: ReactNode }) {
  const [copied, setCopied] = useState(false)
  const code = extractCode(children)

  async function copy() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="code-block">
      <button type="button" onClick={copy}>
        {copied ? 'Скопировано' : 'Копировать'}
      </button>
      <pre>{children}</pre>
    </div>
  )
}

function scrollToSection(section: string) {
  window.requestAnimationFrame(() => {
    const heading =
      document.getElementById(section) ?? document.getElementById(`user-content-${section}`)
    heading?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

export function TheoryPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const material = materials.find((item) => item.slug === slug) ?? materials[0]
  const requestedMaterialMissing = Boolean(slug) && !materials.some((item) => item.slug === slug)

  useEffect(() => {
    if (!slug && material) {
      navigate(`/theory/${material.slug}`, { replace: true })
    }
  }, [material, navigate, slug])

  useEffect(() => {
    const section = searchParams.get('section')
    if (!section) {
      window.scrollTo({ top: 0 })
      return
    }
    scrollToSection(section)
  }, [material?.slug, searchParams])

  const taskSolutionSections = useMemo(() => {
    const tasks = new Map<number, string>()
    const solutions = new Map<number, string>()
    if (material?.slug === TASK_SOLUTION_MATERIAL_SLUG) {
      for (const heading of material.headings) {
        const match = /^(\d+)\.\s/u.exec(heading.title)
        if (!match) continue
        const number = Number(match[1])
        if (heading.depth === 3) tasks.set(number, heading.slug)
        else if (heading.depth === 2) solutions.set(number, heading.slug)
      }
    }
    return { tasks, solutions }
  }, [material])

  if (!material || requestedMaterialMissing) {
    return (
      <div className="page narrow-page empty-state">
        <h1>Материал не найден</h1>
        <button className="button button-primary" type="button" onClick={() => navigate('/theory')}>
          Открыть каталог
        </button>
      </div>
    )
  }

  function selectMaterial(nextSlug: string) {
    navigate(`/theory/${nextSlug}`)
  }

  function selectSection(section: string) {
    setSearchParams({ section })
    scrollToSection(section)
  }

  return (
    <div className="theory-page">
      <aside className="material-sidebar" aria-label="Материалы">
        <div className="sidebar-title">
          <p className="eyebrow">Библиотека</p>
          <h1>Вся теория</h1>
        </div>
        <label className="mobile-material-select">
          <span>Файл</span>
          <select value={material.slug} onChange={(event) => selectMaterial(event.target.value)}>
            {materials.map((item) => (
              <option key={item.slug} value={item.slug}>{item.file}</option>
            ))}
          </select>
        </label>
        <nav className="material-list">
          {materials.map((item) => (
            <button
              className={item.slug === material.slug ? 'is-active' : ''}
              key={item.slug}
              type="button"
              onClick={() => selectMaterial(item.slug)}
            >
              <span>{item.title}</span>
              <small>{item.file}</small>
            </button>
          ))}
        </nav>
      </aside>

      <article className="markdown-article">
        <div className="article-file">{material.file}</div>
        {material.headings.length > 1 && (
          <details className="article-toc">
            <summary>Оглавление</summary>
            <nav aria-label="Оглавление материала">
              {material.headings.slice(1).map((heading, index) => (
                <button
                  key={`${heading.slug}-${index}`}
                  style={{ paddingLeft: `${Math.max(0, heading.depth - 2) * 16}px` }}
                  type="button"
                  onClick={() => selectSection(heading.slug)}
                >
                  {heading.title}
                </button>
              ))}
            </nav>
          </details>
        )}
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeSlug, rehypeSanitize]}
          components={{
            pre: PreBlock,
            h2: ({ id, children, ...props }) => {
              const number = headingNumber(children)
              const target = number !== null ? taskSolutionSections.tasks.get(number) : undefined
              return (
                <h2 id={id} {...props}>
                  {children}
                  {target && (
                    <button type="button" className="heading-jump-link" onClick={() => selectSection(target)}>
                      ← Условие {number}
                    </button>
                  )}
                </h2>
              )
            },
            h3: ({ id, children, ...props }) => {
              const number = headingNumber(children)
              const target = number !== null ? taskSolutionSections.solutions.get(number) : undefined
              return (
                <h3 id={id} {...props}>
                  {children}
                  {target && (
                    <button type="button" className="heading-jump-link" onClick={() => selectSection(target)}>
                      Решение {number} →
                    </button>
                  )}
                </h3>
              )
            },
            a: ({ href, children, ...props }) => {
              const external = href?.startsWith('http')
              return (
                <a
                  {...props}
                  href={href}
                  rel={external ? 'noreferrer' : undefined}
                  target={external ? '_blank' : undefined}
                >
                  {children}
                </a>
              )
            },
          }}
        >
          {material.content}
        </ReactMarkdown>
      </article>
    </div>
  )
}
