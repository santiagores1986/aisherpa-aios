// Pure logic of aios-secret-filter: learn the secrets kept in your project's .env files, and hide them (plus anything
// shaped like a credential) in text before Claude reads it. No engine calls here, so tests drive it directly.

export const MARK = '[hidden by secret-filter]'

const MIN_LEN = 8 // shorter values hide ordinary words; a 4-character admin password is left to luck
// strong names: the value is a secret as it stands; weak names: only when the value also looks random
const SECRET_NAME = /(pass(word|wd|phrase)?|contrase|clave|secret|token|api[_-]?key|access[_-]?key|private[_-]?key|credential)/i
const WEAK_NAME = /(auth|\bkey\b|_key\b|cookie|pin\b|code\b|webhook)/i
const NOT_SECRET_NAME = /(user(name)?$|email|e-mail|host|port|^name$|_name$|url$|region|bucket|endpoint|^id$|username|date|noticed|seen|count|expires|type$|at$|session)/i

/** Every secret value a file holds, whatever its shape: one-line key, .env, JSON, or notes with "Password: x". */
export function extractSecrets(text: string, allRandom = false): string[] {
  const out = new Set<string>()
  const add = (v: unknown, mustLookRandom = false, relaxed = false) => {
    if (typeof v !== 'string') return
    const s = v.trim().replace(/^["']|["']$/g, '')
    if (s.length < MIN_LEN || /\s/.test(s)) return
    if (/^(true|false|null|undefined)$/i.test(s)) return
    if (/^[~/.]|^[a-z]+:\/\//i.test(s)) return // paths and URLs: hiding them would break work (a key inside a URL is caught by its own entry)
    if (/^\d{1,12}$/.test(s)) return // ports, chat ids, counts
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return // dates and timestamps
    if (relaxed && (/^([\w.\-]+\/)+[\w.\-]+$/.test(s) && /\.[a-z]{1,5}$/.test(s) || /^[\w.+\-]+@[\w\-]+\.[\w.]+$/.test(s) || /^([a-z0-9\-]+\.)+[a-z]{2,}$/i.test(s)))
      return // relative paths, emails, domains written in a note
    if (mustLookRandom && !looksRandom(s, relaxed)) return
    out.add(s)
  }
  const trimmed = text.trim()
  if (!trimmed) return []
  // allRandom: the whole file is meant to be secret, so every random-looking word in it counts, whatever the layout
  // ("user / password" lists, prose, tables).
  if (allRandom)
    for (const w of trimmed.split(/[\s,;|()<>"'`]+/)) add(w.replace(/^[*_]+|[*_.:]+$/g, '').replace(/^[A-Za-z_][A-Za-z0-9_]*[=:]/, ''), true, true)

  // JSON: every string under a secret-looking name, at any depth
  if (/^[[{]/.test(trimmed)) {
    try {
      const walk = (node: unknown, name = '') => {
        if (typeof node === 'string') {
          if (NOT_SECRET_NAME.test(name)) return
          if (SECRET_NAME.test(name)) add(node)
          else if (WEAK_NAME.test(name) || allRandom) add(node, true)
        } else if (Array.isArray(node)) node.forEach(n => walk(n, name))
        else if (node && typeof node === 'object')
          for (const [k, v] of Object.entries(node as Record<string, unknown>)) walk(v, k)
      }
      walk(JSON.parse(trimmed))
      return [...out]
    } catch { /* not JSON after all: fall through to lines */ }
  }

  const lines = trimmed.split(/\r?\n/)
  // a lone token: the whole file is the secret
  if (lines.length === 1 && !/\s/.test(trimmed)) { add(trimmed); return [...out] }

  for (const raw of lines) {
    const line = raw.replace(/^\s*(export\s+|[-*]\s+)?/, '')
    // KEY=VALUE (.env) or Label: value (notes)
    const m = line.match(/^\**([A-Za-z0-9_ .\-áéíóúñ]{1,60}?)\**\s*[:=]\s*\**\s*(.+)$/)
    if (m) {
      const [, name, value] = m
      if (NOT_SECRET_NAME.test(name.trim())) continue
      const v = value.replace(/`/g, '').split(/\s+#/)[0]
      if (SECRET_NAME.test(name) || (allRandom && /^[A-Z0-9_]+$/.test(name.trim()))) add(v) // allRandom: every NAME=value
      else if (WEAK_NAME.test(name)) add(v, true)
      else if (/^[A-Z0-9_]+$/.test(name.trim())) add(v, true) // other .env entries count only when random-looking
      continue
    }
    // a bare long token on its own line
    if (!/\s/.test(line.trim()) && line.trim().length >= 16) add(line, true)
  }
  return [...out]
}

/** Random-looking: 16+ chars mixing letters and digits, not a word, version or date. */
export function looksRandom(s: string, relaxed = false): boolean {
  // relaxed (allRandom files only): 12+ chars and no digit needed, since everything there is meant to be secret
  if (s.length < (relaxed ? 12 : 16)) return false
  if (!/[A-Za-z]/.test(s) || (!relaxed && !/\d/.test(s))) return false
  if (/^[\d.\-:T+Z]+$/.test(s)) return false // dates, versions
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[_\-+/=]/].filter(r => r.test(s)).length
  return classes >= (relaxed ? 3 : 2) && new Set(s).size >= 10
}

// Credential shapes that need no list: provider prefixes, private keys, JWTs, bot tokens.
const SHAPES: RegExp[] = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  /\bsk-(ant-|proj-|live-)?[A-Za-z0-9_\-]{20,}/g, // Anthropic, OpenAI
  /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}\b/g, /\bgithub_pat_[A-Za-z0-9_]{40,}\b/g,
  /\bxox[abprs]-[A-Za-z0-9\-]{10,}/g, // Slack
  /\b(sk|rk|pk)_(live|test)_[A-Za-z0-9]{16,}\b/g, // Stripe
  /\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}\b/g, // Resend
  /\bAKIA[0-9A-Z]{16}\b/g, /\bAIza[0-9A-Za-z_\-]{35}\b/g, // AWS, Google
  /\bya29\.[A-Za-z0-9_\-]{20,}/g, /\b1\/\/0[A-Za-z0-9_\-]{30,}/g, // Google OAuth access / refresh
  /\b\d{8,10}:AA[A-Za-z0-9_\-]{33}\b/g, // Telegram bot token
  /\beyJ[A-Za-z0-9_\-]{10,}\.eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}/g, // JWT
]
// name = value, name: "value", --name value, NAME=value: the value goes when the name says secret
const NAMED = /((?:["']?)[A-Za-z0-9_.\-]*(?:pass(?:word|wd)?|secret|token|api[_-]?key|access[_-]?key|private[_-]?key|auth(?:orization)?|credential|client[_-]?secret|_key)[A-Za-z0-9_.\-]*["']?\s*(?:[:=]|=>)\s*["']?|--(?:password|token|secret|api-key)[ =]["']?|Bearer\s+|Basic\s+)([A-Za-z0-9_\-+/=.~]{12,})/gi

/** Hide known secret values, credential shapes and secret-named values. Returns the text and how many it hid. */
export function redactText(text: string, known: readonly string[]): { text: string; hits: number } {
  if (text.length > 5_000_000) return { text, hits: 0 } // images and huge dumps: leave alone
  let hits = 0
  let t = text
  for (const s of known) {
    if (t.includes(s)) {
      const parts = t.split(s)
      hits += parts.length - 1
      t = parts.join(MARK)
    }
  }
  for (const re of SHAPES) t = t.replace(re, () => (hits++, MARK))
  t = t.replace(NAMED, (whole, lead: string, value: string) =>
    value.includes('hidden') || /^[a-z]+$/.test(value) ? whole : (hits++, lead + MARK))
  return { text: t, hits }
}

/** Same, through every string of a tool's result record; null when nothing changed. */
export function redactDeep<T>(value: T, known: readonly string[]): { value: T; hits: number } | null {
  let hits = 0
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') {
      const r = redactText(v, known)
      hits += r.hits
      return r.text
    }
    if (Array.isArray(v)) return v.map(walk)
    if (v && typeof v === 'object') {
      const o: Record<string, unknown> = {}
      for (const [k, x] of Object.entries(v as Record<string, unknown>)) o[k] = walk(x)
      return o
    }
    return v
  }
  const out = walk(value) as T
  return hits ? { value: out, hits } : null
}
