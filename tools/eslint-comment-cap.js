// Longer than this has to say so with an eslint-disable, the way a one-off heading size
// does. Guidance alone never held — a writer talks themselves past it.
const MAX_LINES = 2

const message =
  'Comment block is {{lines}} lines; the limit is {{max}}. Say why in a line or two, or eslint-disable this line with the reason it needs more.'

// Machinery, not prose. Counted, a directive pads the block it exempts and moves the
// report onto its own line, out of reach of the directive meant to allow it.
const DIRECTIVE = /^\s*(eslint|prettier-ignore|globals?\s|exported|@ts-|[vc]8 ignore)/

// Consecutive `//` lines read as one comment, so they are counted as one.
function groupRuns(all) {
  const comments = all.filter((c) => !DIRECTIVE.test(c.value))
  const runs = []
  for (const c of comments) {
    const prev = runs[runs.length - 1]
    const last = prev?.[prev.length - 1]
    if (last && c.type === 'Line' && last.type === 'Line' && c.loc.start.line === last.loc.end.line + 1) prev.push(c)
    else runs.push([c])
  }
  return runs
}

// Three aligned trailing notes are not a three-line block. Read off the source, not the token
// before: in a template that token is the whitespace spanning the line break.
function ownLine(lines, c) {
  return lines[c.loc.start.line - 1].slice(0, c.loc.start.column).trim() === ''
}

// `/**` and `*/` are syntax, not prose. Counted, a two-line budget leaves a JSDoc none.
function prose(c) {
  return c.value.split('\n').filter((l) => l.replace(/^\s*\*?/, '').trim() !== '').length
}

function check(context, comments) {
  for (const run of groupRuns(comments)) {
    const lines = run.length === 1 && run[0].type === 'Block' ? prose(run[0]) : run[run.length - 1].loc.end.line - run[0].loc.start.line + 1
    if (lines > MAX_LINES) {
      context.report({ loc: run[0].loc, message, data: { lines, max: MAX_LINES } })
    }
  }
}

export default {
  rules: {
    'max-lines': {
      meta: { type: 'suggestion', schema: [] },
      create(context) {
        const source = context.sourceCode
        const lines = source.lines
        // Template comments are the ones this repo writes most, and they live in a separate
        // AST that getAllComments never sees.
        const template = source.parserServices?.getTemplateBodyTokenStore?.()
        return {
          Program(node) {
            check(
              context,
              source.getAllComments().filter((c) => (c.type === 'Line' || c.type === 'Block') && ownLine(lines, c)),
            )
            if (template && node.templateBody)
              check(
                context,
                template
                  .getTokens(node.templateBody, { includeComments: true })
                  .filter((t) => t.type === 'HTMLComment' && ownLine(lines, t)),
              )
          },
        }
      },
    },
  },
}
