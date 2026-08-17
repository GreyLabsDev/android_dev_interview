import { isValidElement, useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'
import { materials } from '../generated/materials'

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
