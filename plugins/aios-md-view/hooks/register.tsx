import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Doc, Viewing } from '../types'

// A Markdown reader inside Claude Code: documents open in a side pane
// with real tables (drawn the way Claude's replies draw them), coloured headings,
// code in colour, and images as links that open on the Mac. Three ways in: the strip
// above the prompt listing this chat's documents, /view <file>, or $.command.run('view').

const PANE = 'md-view'

// Language: ~/.aios/installed.json has "lang": "en" | "es". English unless it says es.
type Lang = 'en' | 'es'
let LANG: Lang | null = null
const T = {
  commandDesc: { en: 'Read a Markdown file in a side pane: /view <file>, or /view alone to pick a recent document', es: 'Lee un archivo Markdown en un panel lateral: /view <archivo>, o /view solo para elegir un documento reciente' },
  documents: { en: 'Documents', es: 'Documentos' },
  couldNotOpen: { en: "Couldn't open", es: 'No se pudo abrir' },
  panelFailed: { en: 'Document panel could not open: ', es: 'No se pudo abrir el panel de documentos: ' },
  noReason: { en: 'no reason given', es: 'sin motivo' },
  stripLabel: { en: 'DOCUMENTS', es: 'DOCUMENTOS' },
  all: { en: 'all ›', es: 'todos ›' },
  none: { en: 'No recent documents found. Use /view <file>.', es: 'Ningún documento reciente. Usa /view <archivo>.' },
  recent: { en: 'RECENT DOCUMENTS', es: 'DOCUMENTOS RECIENTES' },
  clickToRead: { en: 'Click one to read it. Esc closes.', es: 'Haz clic en uno para leerlo. Esc cierra.' },
  escCloses: { en: 'Esc closes', es: 'Esc cierra' },
  installGlow: { en: 'Install Glow for nicer documents', es: 'Instala Glow para ver mejor los documentos' },
  open: { en: 'open', es: 'abrir' },
} as const
const tr = (k: keyof typeof T, lang: Lang) => T[k][lang]

async function langOf($: EngineInterface): Promise<Lang> {
  if (LANG) return LANG
  let lang: Lang = 'en'
  try {
    const home = await homeOf($)
    if (home) {
      const j = JSON.parse(await $.fs.read(home + '/.aios/installed.json'))
      if (j && j.lang === 'es') lang = 'es'
    }
  } catch { /* no install record: English */ }
  LANG = lang
  return lang
}

// The person's home folder. A Mac working folder under /Users/<name> gives /Users/<name>; a Windows one
// (C:\Users\<name>\...) gives USERPROFILE, or that folder when the variable is not readable; anywhere else HOME.
const envOf = async ($: EngineInterface, k: 'HOME' | 'USERPROFILE' | 'OS' | 'LOCALAPPDATA') => {
  try {
    const v = k === 'HOME' ? await $.env.get('HOME') : k === 'USERPROFILE' ? await $.env.get('USERPROFILE') : k === 'OS' ? await $.env.get('OS') : await $.env.get('LOCALAPPDATA')
    return String(v ?? '').replace(/[\\/]+$/, '')
  } catch { return '' }
}
const homeOf = async ($: EngineInterface) => {
  const cwd = await $.session.cwd()
  const parts = cwd.split(/[\\/]/)
  if (cwd.startsWith('/')) {
    if (parts[1] === 'Users' && parts[2]) return '/Users/' + parts[2]
    return (await envOf($, 'HOME')) || HOME
  }
  const win = /^[A-Za-z]:$/.test(parts[0]) && parts[1] === 'Users' && parts[2] ? parts[0] + '\\Users\\' + parts[2] : ''
  return (await envOf($, 'USERPROFILE')) || win || (await envOf($, 'HOME')) || HOME
}
// Windows: a drive-letter working folder or home, or OS=Windows_NT
let WIN: boolean | null = null
const isWindows = async ($: EngineInterface) => {
  if (WIN !== null) return WIN
  WIN = /^[A-Za-z]:/.test(await $.session.cwd()) || (await envOf($, 'OS')) === 'Windows_NT'
  return WIN
}
const isAbs = (p: string) => p.startsWith('/') || /^[A-Za-z]:[\\/]/.test(p) || p.startsWith('\\\\')
// file: URL of an absolute path (file:///C:/Users/x/a.md on Windows) and back
const toFileUrl = (abs: string) => { const q = abs.replace(/\\/g, '/'); return 'file://' + (q.startsWith('/') ? q : '/' + q) }
const fromFileUrl = (href: string) => { const q = decodeURI(href.slice(7)); return /^\/[A-Za-z]:/.test(q) ? q.slice(1) : q }
const MAX_DOCS = 6
const CHUNK = 9000 // the Markdown element takes at most 10,000 characters

const docs = atom({ plugin: 'aios-md-view', key: 'docs' } as const, [] as Doc[])
const viewing = atom({ plugin: 'aios-md-view', key: 'viewing' } as const, { path: '', text: '', error: '' } as Viewing)

const picks = atom({ plugin: 'aios-md-view', key: 'picks' } as const, [] as string[])
let HOME = ''

const isMd = (p: string) => /\.(md|markdown|mdx)$/i.test(p)
const baseName = (p: string) => p.split(/[\\/]/).filter(Boolean).pop() ?? p
const dirName = (p: string) => p.slice(0, Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'))) || '/'

// Glow does the rendering (installed from Homebrew): the pane runs it at the pane's
// width and draws its coloured output. Without Glow the pane draws the Markdown itself. ANSI colours map to this palette.
const GLOW_PATHS = ['/opt/homebrew/bin/glow', '/usr/local/bin/glow']
// Windows: where winget puts it
const glowWinPaths = async ($: EngineInterface) => {
  const local = (await envOf($, 'LOCALAPPDATA')) || (await homeOf($)) + '\\AppData\\Local'
  return [local + '\\Microsoft\\WinGet\\Links\\glow.exe']
}
const ANSI = ['#1e1e2e', '#ff6b7a', '#7ee0a8', '#f5c96a', '#7aa8ff', '#c49bff', '#5ee0c8', '#d6dbe6',
  '#5b6478', '#ff8a96', '#9cf0bf', '#ffd98a', '#9cc0ff', '#d6b8ff', '#8cf0dc', '#ffffff']

export type Span = { text: string; fg?: string; bg?: string; bold?: boolean; italic?: boolean; underline?: boolean; dim?: boolean }

// The standard xterm colours 16-255: a 6x6x6 cube, then 24 greys
const xterm256 = (n: number) => {
  const hx = (v: number) => v.toString(16).padStart(2, '0')
  if (n >= 232) { const g = 8 + (n - 232) * 10; return '#' + hx(g) + hx(g) + hx(g) }
  const lv = [0, 95, 135, 175, 215, 255], c = n - 16
  return '#' + hx(lv[Math.floor(c / 36)]) + hx(lv[Math.floor(c / 6) % 6]) + hx(lv[c % 6])
}

// Turn ANSI-coloured lines into spans the pane can draw
export const spansOf = (line: string): Span[] => {
  const out: Span[] = []
  let st: Omit<Span, 'text'> = {}
  const re = /\x1b\[([0-9;]*)m/g
  let pos = 0
  let m: RegExpExecArray | null
  const push = (t: string) => { if (t) out.push({ text: t, ...st }) }
  while ((m = re.exec(line))) {
    push(line.slice(pos, m.index))
    pos = re.lastIndex
    const codes = m[1] === '' ? [0] : m[1].split(';').map(Number)
    for (let i = 0; i < codes.length; i++) {
      const c = codes[i]
      if (c === 0) st = {}
      else if (c === 1) st = { ...st, bold: true }
      else if (c === 2) st = { ...st, dim: true }
      else if (c === 3) st = { ...st, italic: true }
      else if (c === 4) st = { ...st, underline: true }
      else if (c >= 30 && c <= 37) st = { ...st, fg: ANSI[c - 30] }
      else if (c >= 90 && c <= 97) st = { ...st, fg: ANSI[c - 82] }
      else if (c >= 40 && c <= 47) st = { ...st, bg: ANSI[c - 40] }
      else if (c >= 100 && c <= 107) st = { ...st, bg: ANSI[c - 92] }
      else if ((c === 38 || c === 48) && codes[i + 1] === 2) {
        const hex = '#' + codes.slice(i + 2, i + 5).map(n => n.toString(16).padStart(2, '0')).join('')
        st = c === 38 ? { ...st, fg: hex } : { ...st, bg: hex }
        i += 4
      } else if ((c === 38 || c === 48) && codes[i + 1] === 5) {
        // Glow on Windows writes 256-colour codes (Mac Glow writes the 16 basic ones)
        const n = codes[i + 2]
        const hex = n < 16 ? ANSI[n] : n <= 255 ? xterm256(n) : undefined
        if (hex) st = c === 38 ? { ...st, fg: hex } : { ...st, bg: hex }
        i += 2
      } else if (c === 39) st = { ...st, fg: undefined }
      else if (c === 49) st = { ...st, bg: undefined }
    }
  }
  push(line.slice(pos))
  // Merge neighbours with the same style, and drop the padding Glow adds at the end
  const merged: Span[] = []
  for (const sp of out) {
    const last = merged[merged.length - 1]
    if (last && last.fg === sp.fg && last.bg === sp.bg && last.bold === sp.bold && last.italic === sp.italic && last.underline === sp.underline && last.dim === sp.dim) last.text += sp.text
    else merged.push({ ...sp })
  }
  while (merged.length && !merged[merged.length - 1].bg && merged[merged.length - 1].text.trim() === '') merged.pop()
  if (merged.length && !merged[merged.length - 1].bg) merged[merged.length - 1].text = merged[merged.length - 1].text.replace(/\s+$/, '')
  return merged
}

const plain = (ln: string) => ln.replace(/\x1b\[[0-9;]*m/g, '')

// Glow draws table rows with no line between them; add a dim one, copied from the
// line under the header, before each new row (a row starts when its first cell has text)
export const withRowDividers = (lines: string[]): string[] => {
  const out: string[] = []
  let sep = ''
  let inTable = false
  let rowsSeen = 0
  for (const ln of lines) {
    const t = plain(ln)
    if (/^\s*─+(┼─+)+\s*$/.test(t)) {
      sep = t.replace(/\s+$/, '')
      inTable = true
      rowsSeen = 0
      out.push(ln)
      continue
    }
    if (inTable && t.includes('│')) {
      const firstCell = t.split('│')[0]
      if (firstCell.trim() !== '' && rowsSeen > 0) out.push(`\x1b[90m${sep}\x1b[0m`)
      if (firstCell.trim() !== '') rowsSeen += 1
      out.push(ln)
      continue
    }
    inTable = false
    out.push(ln)
  }
  return out
}

const glowCache = new Map<string, string[]>()
let glowBin = ''
let hintPath = '' // the document that carries the one-time "install Glow" hint

// Homebrew on Apple silicon, Homebrew on Intel, then whatever is on PATH
async function findGlow($: EngineInterface): Promise<string | null> {
  if (glowBin) return glowBin
  const win = await isWindows($)
  for (const c of win ? await glowWinPaths($) : GLOW_PATHS) {
    try { await $.fs.stat(c); glowBin = c; return c } catch { /* try the next one */ }
  }
  if (win) {
    try {
      const r = await $.process.run(['where.exe', 'glow'], { timeoutMs: 3000 })
      const found = String(r.stdout ?? '').trim().split(/\r?\n/)[0]
      if (r.exitCode === 0 && found) { glowBin = found; return found }
    } catch { /* not on PATH */ }
    return null
  }
  try {
    const r = await $.process.run(['/usr/bin/which', 'glow'], { env: { PATH: process.env.PATH ?? '/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin' }, timeoutMs: 3000 })
    const found = String(r.stdout ?? '').trim().split('\n')[0]
    if (r.exitCode === 0 && found) { glowBin = found; return found }
  } catch { /* not on PATH */ }
  return null
}

async function glowLines($: EngineInterface, path: string, width: number): Promise<string[] | null> {
  let mtime = 0
  try { mtime = (await $.fs.stat(path)).mtimeMs } catch { return null }
  const bin = await findGlow($)
  if (!bin) return null
  const key = `${path}|${mtime}|${width}`
  const hit = glowCache.get(key)
  if (hit) return hit
  try {
    const w = String(Math.max(40, width - 2))
    // Glow 3.0.0 on Windows prints two empty lines for any file path (found 2026-10-17), so it gets the text on stdin there
    const r = (await isWindows($))
      ? await $.process.run([bin, '-s', 'dark', '-w', w, '-'], {
          env: { CLICOLOR_FORCE: '1', COLORTERM: 'truecolor', TERM: 'xterm-256color' },
          stdin: await $.fs.read(path),
          timeoutMs: 8000,
        })
      : await $.process.run([bin, '-s', 'dark', '-w', w, path], {
          env: { CLICOLOR_FORCE: '1', COLORTERM: 'truecolor', TERM: 'xterm-256color', PATH: '/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin' },
          timeoutMs: 8000,
        })
    if (r.exitCode !== 0) return null
    const out = String(r.stdout ?? '').replace(/\r/g, '')
    // Empty output means Glow failed quietly: draw the document ourselves instead of a blank pane
    if (!out.trim()) return null
    const lines = withRowDividers(out.replace(/\n+$/, '').split('\n'))
    glowCache.clear()
    glowCache.set(key, lines)
    return lines
  } catch {
    return null
  }
}

// Heading colours by level: orange, blue, teal, then quiet
const HEADING = ['#f5a35c', '#7aa8ff', '#5ee0c8', '#c9d1e0', '#c9d1e0', '#c9d1e0']

export type Block = { kind: 'heading'; level: number; text: string } | { kind: 'md'; text: string } | { kind: 'code'; lang: string; text: string }

// Split a document into headings (drawn in colour), code blocks, and Markdown runs
// small enough for one Markdown element; images become links that open the file
export const blocksOf = (source: string, dir: string, lang: Lang = 'en'): Block[] => {
  let text = source.replace(/^﻿/, '')
  // Front matter is metadata: leave it out of the reading view
  text = text.replace(/^---\n[\s\S]*?\n---\n/, '')
  // ![alt](path) -> a link that opens the picture
  text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g, (_m, alt, src) => {
    const href = /^(https?|file):/.test(src) ? src : toFileUrl(isAbs(src) ? src : dir + '/' + src)
    return `[🖼 ${alt || baseName(src)} (${tr('open', lang)})](${encodeURI(href)})`
  })
  const out: Block[] = []
  let buf: string[] = []
  const flush = () => {
    const joined = buf.join('\n').trim()
    buf = []
    if (!joined) return
    // Long runs split on blank lines, never inside a table
    let piece = ''
    for (const para of joined.split(/\n{2,}/)) {
      if (piece && piece.length + para.length + 2 > CHUNK) { out.push({ kind: 'md', text: piece }); piece = '' }
      piece = piece ? piece + '\n\n' + para : para
    }
    if (piece) out.push({ kind: 'md', text: piece.slice(0, CHUNK) })
  }
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i]
    const fence = /^```\s*([\w+-]*)/.exec(ln)
    if (fence) {
      flush()
      const code: string[] = []
      i++
      while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++])
      out.push({ kind: 'code', lang: fence[1] || '', text: code.join('\n').slice(0, CHUNK) })
      continue
    }
    const h = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(ln)
    if (h) {
      flush()
      out.push({ kind: 'heading', level: h[1].length, text: h[2] })
      continue
    }
    buf.push(ln)
  }
  flush()
  return out
}

// In a reply, turn file paths into short links: `~/AIOS/work/outputs/report.md` shows as
// "📄 report.md" (opens in the pane), images as "🖼 name", anything else as "📎 name"
// (open on the Mac). The target is a file: URL to the absolute path.
const IMAGE = /\.(png|jpe?g|gif|webp|heic|svg|bmp|tiff?)$/i
export const linkLabel = (p: string) => (isMd(p) ? '📄 ' : IMAGE.test(p) ? '🖼 ' : '📎 ') + baseName(p)
const PATHLIKE = /^(~[\\/]|[A-Za-z]:[\\/]|\/|\.\.?[\\/])[^\s`]*\.[A-Za-z0-9]{1,6}$|^[\w.-]+([\\/][\w.@ -]+)+\.[A-Za-z0-9]{1,6}$/
export const linkify = (text: string, cwd: string, home: string) => {
  let count = 0
  const abs = (p: string) => /^~[\\/]/.test(p) ? home + p.slice(1) : isAbs(p) ? p : cwd + '/' + p.replace(/^\.[\\/]/, '')
  // Leave code blocks alone
  const parts = text.split(/(```[\s\S]*?```)/)
  const out = parts.map((part, i) => {
    if (i % 2 === 1) return part
    // `path` in backticks, not already inside a link
    let s = part.replace(/(?<!\[)`([^`\n]+)`(?!\]\()/g, (m, inner) => {
      const p = inner.trim()
      if (!PATHLIKE.test(p) || p.includes('://')) return m
      count += 1
      return `[${linkLabel(p)}](${encodeURI(toFileUrl(abs(p)))})`
    })
    // bare ~/... or /Users/... (C:\Users\... on Windows) paths in prose
    s = s.replace(/(^|[\s(])((?:~|\/Users|[A-Za-z]:[\\/]Users)[\\/][^\s`)\]]+\.[A-Za-z0-9]{1,6})(?=[\s).,;:!?]|$)/gm, (m, pre, p) => {
      count += 1
      return `${pre}[${linkLabel(p)}](${encodeURI(toFileUrl(abs(p)))})`
    })
    return s
  })
  return { text: out.join(''), count }
}

// A click on a link: Markdown opens in the pane, anything else on the Mac
async function openLink($: EngineInterface, href: string) {
  if (href.startsWith('file://')) {
    const path = fromFileUrl(href)
    if (isMd(path)) return show($, path)
  }
  await openOnMac($, href)
}

// /view with nothing after it: a short list of recently changed documents to pick from
async function showPicker($: EngineInterface) {
  const opening = $.ui.open({ id: PANE, title: tr('documents', await langOf($)), focus: true, closeOnEscape: true })
  const home = await homeOf($)
  const roots = [home + '/AIOS', await $.session.cwd()]
  let found: string[] = []
  if (await isWindows($)) {
    found = await recentMarkdown($, roots)
  } else try {
    const r = await $.process.run(['/usr/bin/find', ...roots, '-name', '*.md', '-mtime', '-7', '-not', '-path', '*/node_modules/*', '-not', '-path', '*/.git/*'], { timeoutMs: 8000 })
    found = String(r.stdout ?? '').split('\n').filter(isReadable)
  } catch { /* nothing found */ }
  const seen = (await read($, docs)).map(d => d.path).reverse()
  const list = [...new Set([...seen, ...found])].slice(0, 400)
  // Newest first by modification time
  const withTime = await Promise.all(list.map(async p => { try { return [p, (await $.fs.stat(p)).mtimeMs] as const } catch { return [p, 0] as const } }))
  const ordered = withTime.sort((a, b) => b[1] - a[1]).slice(0, 15).map(x => x[0])
  await update($, picks, () => ordered)
  await update($, viewing, () => ({ path: '', text: '', error: '' }))
  await opening
}

// Windows has no find: walk the folders and keep the Markdown files changed in the last 7 days
async function recentMarkdown($: EngineInterface, roots: string[]): Promise<string[]> {
  const since = (await $.clock.now()) - 7 * 24 * 3600 * 1000
  const out: string[] = []
  let visited = 0
  const walk = async (dir: string, depth: number): Promise<void> => {
    if (depth > 6 || visited > 4000) return
    let entries: Array<{ name: string; kind: string }> = []
    try { entries = (await $.fs.list(dir)) as any } catch { return }
    for (const en of entries) {
      visited += 1
      const full = dir.replace(/[\\/]+$/, '') + '/' + en.name
      if (en.kind === 'directory' || en.kind === 'dir') {
        if (en.name !== 'node_modules' && en.name !== '.git') await walk(full, depth + 1)
      } else if (isMd(en.name)) {
        try { if ((await $.fs.stat(full)).mtimeMs >= since) out.push(full) } catch { /* unreadable */ }
      }
    }
  }
  for (const r of roots) await walk(r, 0)
  return out.filter(isReadable)
}

async function resolvePath($: EngineInterface, p: string) {
  const clean = p.trim().replace(/^["']|["']$/g, '').replace(/^~(?=[\\/])/, await homeOf($))
  if (isAbs(clean)) return clean
  return (await $.session.cwd()) + '/' + clean
}

// Load a document into the pane and open it (open first, so a click counts as the person's)
async function show($: EngineInterface, path: string) {
  const opening = $.ui.open({ id: PANE, title: baseName(path), focus: true, closeOnEscape: true })
  let text = ''
  let error = ''
  try {
    text = await $.fs.read(path)
  } catch (err) {
    error = `${tr('couldNotOpen', await langOf($))} ${path}: ${err instanceof Error ? err.message : String(err)}`
  }
  await update($, viewing, () => ({ path, text, error }))
  const placed = await opening
  if (placed && placed.isPlaced === false) { const l = await langOf($); $.ui.toast(tr('panelFailed', l) + (placed.reason ?? tr('noReason', l))) }
  try { await $.ui.scroll({ in: PANE, to: 'start', block: 'start' }) } catch { /* nothing to scroll yet */ }
}

// Open a picture or web link with the computer's own program (the Mac's open; Windows' explorer)
async function openOnMac($: EngineInterface, href: string) {
  const target = href.startsWith('file://') ? fromFileUrl(href) : href
  if (await isWindows($)) {
    await $.process.run(['explorer.exe', /^[a-z][a-z0-9+.-]+:\/\//i.test(target) ? target : target.replace(/\//g, '\\')])
    return
  }
  await $.process.run(['/usr/bin/open', target])
}

// Claude's own settings and memory notes are not documents to read: keep them off the strip
const BOOKKEEPING = /[\\/]\.claude[\\/]|[\\/]AIOS[\\/](memory|memoria)[\\/]|[\\/]node_modules[\\/]|[\\/]\.git[\\/]/
export const isReadable = (p: string) => isMd(p) && !BOOKKEEPING.test(p)

async function remember($: EngineInterface, paths: string[]) {
  const at = await $.clock.now()
  const fresh = paths.filter(isReadable)
  if (fresh.length === 0) return
  await update($, docs, list => {
    const rest = list.filter(d => !fresh.includes(d.path))
    return [...rest, ...fresh.map(path => ({ path, at }))].slice(-MAX_DOCS)
  })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'view', description: tr('commandDesc', await langOf($)) })
    HOME = await homeOf($)
    return next(e)
  })

  // Remember the documents written in this chat, from the edit tools and from shell commands
  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny !== undefined || ran.isError === true) return ran
    const input = e as unknown as Record<string, any>
    const out = (ran.result ?? {}) as Record<string, any>
    const paths: string[] = []
    if (['Edit', 'Write', 'MultiEdit'].includes(e.tool) && typeof input.file_path === 'string') paths.push(input.file_path)
    if (Array.isArray(out.bashEditDiff?.files)) {
      for (const f of out.bashEditDiff.files) if (!f.deleted && typeof f.filePath === 'string') paths.push(f.filePath)
    }
    if (paths.length) await remember($, paths)
    return ran
  })

  on('command.run', { command: 'view' }, async ($, e) => {
    const arg = (e.args ?? '').trim()
    if (!arg) {
      await showPicker($)
      return {}
    }
    await show($, await resolvePath($, arg))
    return {}
  })

  // The Documents section above the quickbar: only when this chat has produced a real
  // document. Its own divider, a label, blue-gray chips, and "all ›" for the picker.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const theirs = await next(e)
    const list = [...(await read($, docs))].filter(d => isReadable(d.path)).reverse()
    if (list.length === 0) return theirs
    const lang = await langOf($)
    const { Box, Text, Button } = $.ui.resolve(e)
    const cols = (e.props as { bodyColumns?: number }).bodyColumns ?? 100
    return (
      <Box flexDirection="column">
        <Text color="#3a4052">{'─'.repeat(Math.max(10, cols))}</Text>
        <Box key="md-docs" flexDirection="row" columnGap={2}>
          <Text bold color="#7aa8ff">{tr('stripLabel', lang)}</Text>
          {list.map(d => (
            <Box key={'doc-' + d.path} backgroundColor="#2c3a55">
              <Button key={'open-' + d.path} plain label={` ${baseName(d.path)} `} hover={{ bold: true, color: '#ffffff', backgroundColor: '#3d5684' }} onPress={() => void show($, d.path)} />
            </Box>
          ))}
          <Box key="doc-all">
            <Button key="open-all" plain dimColor label={tr('all', lang)} hover={{ dimColor: false, bold: true }} onPress={() => void showPicker($)} />
          </Box>
        </Box>
        {theirs}
      </Box>
    )
  })

  // My replies: file paths become links (link colour); a click opens them
  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    const cwd = await $.session.cwd()
    const home = await homeOf($)
    const { text, count } = linkify(e.props.text, cwd, home)
    if (count === 0) return next(e)
    const { Markdown } = $.ui.resolve(e)
    return <Markdown key={'reply-links'} text={text.slice(0, 10000)} onLinkPress={link => void openLink($, link.href)} />
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Markdown, Code } = $.ui.resolve(e)
    const v = await read($, viewing)
    const lang = await langOf($)
    if (v.error) return <Text color="#ff5f6d">{v.error}</Text>
    if (!v.path) {
      const list = await read($, picks)
      const { Button } = $.ui.resolve(e)
      if (list.length === 0) return <Text dimColor>{tr('none', lang)}</Text>
      return (
        <Box flexDirection="column">
          <Text bold color="#f5a35c">{tr('recent', lang)}</Text>
          <Text dimColor>{tr('clickToRead', lang)}</Text>
          {list.map(p => (
            <Box key={'pick-' + p} flexDirection="row" columnGap={2}>
              <Button key={'pickbtn-' + p} plain label={baseName(p)} hover={{ bold: true, color: '#7aa8ff' }} onPress={() => void show($, p)} />
              <Text dimColor>{dirName(p).replace(HOME, '~')}</Text>
            </Box>
          ))}
        </Box>
      )
    }
    const width = (e.props as { bodyColumns?: number }).bodyColumns ?? 100
    const lines = await glowLines($, v.path, width)
    if (lines) {
      return (
        <Box flexDirection="column" paddingX={1}>
          <Text dimColor>{v.path.replace(HOME, '~')}   ·   {tr('escCloses', lang)}</Text>
          {lines.map((ln, i) => {
            const spans = spansOf(ln)
            if (spans.length === 0) return <Text key={'l' + i}> </Text>
            return (
              <Text key={'l' + i} wrap="truncate-end">
                {spans.map(sp => <Text {...(sp.fg ? { color: sp.fg } : {})} {...(sp.bg ? { backgroundColor: sp.bg } : {})} {...(sp.bold ? { bold: true } : {})} {...(sp.italic ? { italic: true } : {})} {...(sp.underline ? { underline: true } : {})} {...(sp.dim ? { dimColor: true } : {})}>{sp.text}</Text>)}
              </Text>
            )
          })}
        </Box>
      )
    }
    // Without Glow: the built-in rendering, with a one-time hint to install it
    const blocks = blocksOf(v.text, dirName(v.path), lang)
    if (!hintPath) hintPath = v.path
    return (
      <Box flexDirection="column">
        <Text dimColor>{v.path}   ·   {tr('escCloses', lang)}</Text>
        {hintPath === v.path ? <Text color="#f5c96a">{tr('installGlow', lang)}</Text> : null}
        {blocks.map((b, i) => {
          if (b.kind === 'heading') {
            return (
              <Box key={'h' + i} flexDirection="column" marginTop={i === 0 ? 0 : 1}>
                <Text bold color={HEADING[b.level - 1]}>{b.level <= 2 ? b.text.toUpperCase() : b.text}</Text>
              </Box>
            )
          }
          if (b.kind === 'code') return <Box key={'c' + i}><Code source={b.text} {...(b.lang ? { language: b.lang } : {})} /></Box>
          return (
            <Box key={'m' + i}>
              <Markdown key={'md' + i} text={b.text} onLinkPress={link => void openOnMac($, link.href)} />
            </Box>
          )
        })}
      </Box>
    )
  })
}
