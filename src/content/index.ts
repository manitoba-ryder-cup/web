import type { Article } from '@/lib/news'

// Every article in the repo, resolved at build time by the plugin in vite.config: it renders the
// body and checks the frontmatter, so a broken one fails the build rather than reaching a reader.
const modules = import.meta.glob<{ default: Article }>('./news/*.md', { eager: true })

export const allArticles: Article[] = Object.values(modules).map((m) => m.default)
