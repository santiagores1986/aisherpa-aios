import type { EngineInterface, Register } from 'claude-code'
import { statusIcons } from './status-icons'

// aios-keepwarm (AIOS by AI Sherpa): keeps Claude's prompt cache warm during breaks and stops a cold send once,
// with its price. Based on cache-tax 2.2.1 by Karan Bansal (MIT, https://github.com/karanb192/cache-tax).
// AI Sherpa changes, marked "AIOS": on by default, the window restarts on every turn, a switch in the band,
// English and Spanish text (the "lang" in ~/.aios/installed.json).

type Lang = 'en' | 'es'
let lang: Lang = 'en'
const t = (en: string, es: string) => (lang === 'es' ? es : en)
export const setLang = (l: Lang) => { lang = l }

const TTL_MS = 60 * 60 * 1000
const PING_AFTER_MS = 50 * 60 * 1000
const MIN_PING_MS = 60 * 1000
const AUTO_WARM_MS = 3 * 60 * 60 * 1000
const DEFAULT_WINDOW_MS = 6 * 60 * 60 * 1000
const BIG_TOKENS = 50000
const PING_PROMPT = 'Reply with the single word: warm'
const KEY_DEADLINE = 'deadline'
const KEY_EVERY = 'every'
const KEY_GUARD = 'guard'
const KEY_PAUSED = 'paused'
// AIOS: the green/gray switch in the band
const ON_COLOR = '#5fd068'
const KEY_ALWAYS = 'always'
const STATE_ES: Record<string, string> = { warm: 'caliente', cold: 'frío', stopped: 'detenido', unknown: 'desconocido' }

// $ per million tokens, [cache read, 1h cache write, output], list prices September 2026.
// Longer family names first: a model id matches the first row it contains.
const PRICES: Array<[string, number, number, number]> = [
  ['fable-5-1', 0.25, 20, 50],
  ['fable-5', 1, 20, 50],
  ['opus-5', 0.5, 10, 25],
  ['opus-4', 0.5, 10, 25],
  ['sonnet-5', 0.2, 4, 10],
  ['sonnet', 0.3, 6, 15],
  ['haiku', 0.1, 2, 5],
]

type PingRecord = { at: number; read: number; write: number; usd: number | null; warm: boolean }
type Miss = { at: number; tokens: number; usd: number | null }
type GuardMode = 'refuse' | 'warn'

export type State = {
  hasBand: boolean
  sid: string
  deadline: number
  every: number
  always: boolean
  /** AIOS: this chat's switch is off, so turns do not re-arm it. */
  paused: boolean
  lastRequestAt: number
  lastModel: string | null
  ctx: number
  compacted: boolean
  guard: GuardMode
  ackedAt: number
  coldWritePending: boolean
  misses: Miss[]
  pending: { cancel: () => void } | null
  last: PingRecord | null
  stopped: string | null
}

function priceOf(model: string | null): [number, number, number] | null {
  const m = (model ?? '').toLowerCase().replace(/[\s.]+/g, '-')
  for (const [family, read, write, output] of PRICES) if (m.includes(family)) return [read, write, output]
  return null
}

export function parseDuration(text: string): number | null {
  const m = /^(?:(\d+)h)?(?:(\d+)m)?$/.exec(text.trim())
  if (!m || (m[1] === undefined && m[2] === undefined)) return null
  return (Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0)) * 60 * 1000
}

export function fmtDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 60000))
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h >= 48) return `${Math.floor(h / 24)}d ${h % 24}h`
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}m` : `${m}m`
}

function fmtUsd(usd: number | null): string {
  return usd == null ? 'n/a' : '$' + (usd >= 100 ? usd.toFixed(0) : usd.toFixed(2))
}

function fmtTok(n: number): string {
  return n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1000 ? Math.round(n / 1000) + 'k' : String(n)
}

function coldUsd(s: State): number | null {
  const price = priceOf(s.lastModel)
  return price ? s.ctx * price[1] / 1e6 : null
}

function warmUsd(s: State): number | null {
  const price = priceOf(s.lastModel)
  return price ? s.ctx * price[0] / 1e6 : null
}

/** Everything a fork bills: the cache read, any cache write, uncached input at the base rate (half the 1h write rate), and the output. */
function pingUsd(u: { input_tokens: number; output_tokens: number; cache_read_input_tokens: number; cache_creation_input_tokens: number }, price: [number, number, number]): number {
  return (u.cache_read_input_tokens * price[0] + u.cache_creation_input_tokens * price[1] + u.input_tokens * price[1] / 2 + u.output_tokens * price[2]) / 1e6
}

/** The read-only upper bound: pings at the cache-read rate that cost as much as one cold write of the same context. */
function breakEvenPings(s: State): number | null {
  const price = priceOf(s.lastModel)
  if (!price || s.ctx <= 0) return null
  return Math.floor(price[1] / price[0])
}

function isCold(s: State, now: number): boolean {
  return s.lastRequestAt > 0 && !s.compacted && now - s.lastRequestAt >= TTL_MS
}

function guardText(s: State, now: number): string {
  const price = priceOf(s.lastModel)
  const rate = price ? `$${price[1]}/MTok` : t('the cache-write rate', 'la tarifa de escritura de caché')
  const warm = warmUsd(s)
  return t(`the prompt cache went cold ${fmtDuration(now - s.lastRequestAt - TTL_MS)} ago. Sending this re-writes ` +
    `up to ${s.ctx.toLocaleString('en-US')} tokens at ${rate} = ${fmtUsd(coldUsd(s))}` +
    (warm == null ? '' : ` (a warm turn would have cost ${fmtUsd(warm)})`) + '.',
    `el caché de la conversación se enfrió hace ${fmtDuration(now - s.lastRequestAt - TTL_MS)}. Enviar esto reescribe ` +
    `hasta ${s.ctx.toLocaleString('en-US')} tokens a ${rate} = ${fmtUsd(coldUsd(s))}` +
    (warm == null ? '' : ` (un turno con el caché caliente habría costado ${fmtUsd(warm)})`) + '.')
}

export type ResumeFields = {
  source: string
  model?: string
  context_tokens?: number
  seconds_since_last_response?: number
  prompt_cache_likely_expired?: boolean
  estimated_cache_write_usd?: number
}

/** /clear starts a new conversation in the same process; nothing priced before it still exists. */
export function resetForClear(s: State) {
  s.ctx = 0
  s.lastRequestAt = 0
  s.compacted = false
  s.ackedAt = 0
  s.coldWritePending = false
  s.misses = []
  disarm(s)
}

/** Applies a resumed session's fields to the state; returns the line to log, if any. */
export function seedFromResume(s: State, e: ResumeFields, now: number): string | null {
  if (e.source !== 'resume' && e.source !== 'fork') return null
  if (typeof e.context_tokens === 'number' && e.context_tokens > 0) s.ctx = e.context_tokens
  if (typeof e.seconds_since_last_response === 'number') s.lastRequestAt = now - e.seconds_since_last_response * 1000
  if (typeof e.model === 'string') s.lastModel = e.model
  s.compacted = false
  if (e.prompt_cache_likely_expired !== true || s.ctx < BIG_TOKENS) return null
  const usd = typeof e.estimated_cache_write_usd === 'number' ? fmtUsd(e.estimated_cache_write_usd) : fmtUsd(coldUsd(s))
  return t(`resuming cold. The first message re-writes ${s.ctx.toLocaleString('en-US')} tokens, about ${usd}. /clear and paste a summary if you only need the conclusions.`,
    `retomas con el caché frío. El primer mensaje reescribe ${s.ctx.toLocaleString('en-US')} tokens, unos ${usd}. Usa /clear y pega un resumen si solo necesitas las conclusiones.`)
}

function statusText(s: State, now: number): string | undefined {
  if (s.stopped) return t(`keepwarm stopped: ${s.stopped}`, `keepwarm detenido: ${s.stopped}`)
  if (!s.deadline) return undefined
  const pingText = s.last ? t(` · last ping read ${fmtTok(s.last.read)} ${fmtUsd(s.last.usd)}`, ` · el último ping leyó ${fmtTok(s.last.read)} ${fmtUsd(s.last.usd)}`) : ''
  const nextText = !s.lastRequestAt ? t(' · waiting for the first turn', ' · esperando el primer turno')
    : s.compacted ? t(' · waiting for the first turn after compaction', ' · esperando el primer turno tras compactar')
    : isCold(s, now) ? t(` · cold now, first ping ${fmtDuration(s.every)} after the next turn`, ` · frío ahora, el primer ping llega ${fmtDuration(s.every)} después del próximo turno`)
    : t(` · ping in ${fmtDuration(s.lastRequestAt + s.every - now)}`, ` · ping en ${fmtDuration(s.lastRequestAt + s.every - now)}`)
  return t(`keepwarm ${fmtDuration(s.deadline - now)} left${nextText}${pingText}`, `keepwarm: quedan ${fmtDuration(s.deadline - now)}${nextText}${pingText}`)
}

function updateStatus($: EngineInterface, s: State, now: number) {
  if (s.hasBand) $.ui.invalidate('ui.render')
  else $.ui.status(statusText(s, now))
}

function disarm(s: State) {
  if (s.pending) s.pending.cancel()
  s.pending = null
}

// The window and its ping period belong to the session that armed them, so a
// second session, or one resumed from another transcript, never inherits them
// and cannot turn them off. The always switch and the guard mode stay global.
function deadlineKey(s: State): string {
  return `${KEY_DEADLINE}:${s.sid}`
}

function everyKey(s: State): string {
  return `${KEY_EVERY}:${s.sid}`
}

function pausedKey(s: State): string {
  return `${KEY_PAUSED}:${s.sid}`
}

/** AIOS: puts the row between the quickbar and its Effort row (keyed 'effort-row'), a divider under it; with no Effort row, at the end under a divider. */
function placeRow(rest: any, row: any, divider: any): any {
  const kids = rest && Array.isArray(rest.children) ? rest.children : null
  if (kids) {
    const at = kids.findIndex((k: any) => k && k.props && k.props.key === 'effort-row')
    if (at >= 0) return { ...rest, children: [...kids.slice(0, at), row, divider, ...kids.slice(at)] }
    for (let i = 0; i < kids.length; i++) {
      const inner = placeRow(kids[i], row, divider)
      if (inner !== null) return { ...rest, children: [...kids.slice(0, i), inner, ...kids.slice(i + 1)] }
    }
  }
  return null
}

/** AIOS: the band's switch. On = this chat's window is armed; pressing flips it for this chat only. */
async function toggle($: EngineInterface, s: State) {
  if (s.deadline) {
    s.paused = true
    await $.store.set(pausedKey(s), true)
    await stop($, s, null)
  } else {
    s.paused = false
    await $.store.delete(pausedKey(s))
    await startWindow($, s, DEFAULT_WINDOW_MS, PING_AFTER_MS)
  }
}

/** Clears this session's own dead window and the bare keys a store written before 2.1.1 still holds. Other sessions' keys are never touched: a read followed by a delete cannot be made atomic against their renewal. */
async function prune($: EngineInterface, s: State, now: number) {
  for (const key of [KEY_DEADLINE, deadlineKey(s)]) {
    const deadline = await $.store.get(key)
    if (deadline === undefined) continue
    if (typeof deadline === 'number' && deadline > now) continue
    await $.store.delete(key)
    await $.store.delete(KEY_EVERY + key.slice(KEY_DEADLINE.length))
  }
}

async function stop($: EngineInterface, s: State, why: string | null, forgetAlways = false) {
  s.deadline = 0
  s.every = PING_AFTER_MS
  s.stopped = why
  disarm(s)
  await $.store.delete(deadlineKey(s))
  await $.store.delete(everyKey(s))
  if (forgetAlways) {
    s.always = false
    await $.store.set(KEY_ALWAYS, false)
  }
  updateStatus($, s, await $.clock.now())
}

async function arm($: EngineInterface, s: State) {
  disarm(s)
  if (!s.deadline) return
  const now = await $.clock.now()
  if (now >= s.deadline) return stop($, s, null)
  // A cold window still needs expiry cleanup, but must not send a model request.
  if (s.lastRequestAt && !s.compacted && !isCold(s, now)) {
    const untilCold = s.lastRequestAt + TTL_MS - now
    const delay = Math.min(s.deadline - now, untilCold, Math.max(1000, s.lastRequestAt + s.every - now))
    s.pending = $.clock.after(delay, () => { void ping($, s) })
  } else {
    s.pending = $.clock.after(s.deadline - now, () => { void arm($, s) })
  }
  updateStatus($, s, now)
}

async function ping($: EngineInterface, s: State) {
  s.pending = null
  if (!s.deadline) return
  const now = await $.clock.now()
  if (now >= s.deadline) return arm($, s)
  // A turn in the meantime re-armed the timer; this callback is stale.
  if (isCold(s, now)) return arm($, s)
  if (now - s.lastRequestAt < s.every - 1000) return
  let reply
  try {
    reply = await $.model.fork({ prompt: PING_PROMPT })
  } catch (err) {
    return stop($, s, t(`the ping failed, ${err instanceof Error ? err.message : String(err)}`, `el ping falló, ${err instanceof Error ? err.message : String(err)}`))
  }
  if (reply === null) return stop($, s, t('the engine did not send the ping, either the snapshot was cold or the API call failed', 'el motor no envió el ping: o el caché ya estaba frío o falló la llamada a la API'))
  if (reply.isAnswered === false) {
    const reason = reply.reason === 'nothing-to-fork' ? t('no conversation to warm yet', 'todavía no hay conversación que mantener caliente')
      : reply.reason === 'api-error' ? t(`the API call failed${reply.status === null ? '' : ` (${reply.status})`}`, `falló la llamada a la API${reply.status === null ? '' : ` (${reply.status})`}`)
      : reply.reason === 'aborted' ? t('the ping was interrupted', 'el ping se interrumpió')
      : t('the ping returned no text', 'el ping no devolvió texto')
    return stop($, s, reason)
  }
  const u = reply.usage
  const price = priceOf(s.lastModel)
  // A warm ping reads the prefix and writes only its own message; a write of a tenth of the read or more means the prefix broke.
  const warm = u.cache_read_input_tokens > 0 && u.cache_creation_input_tokens < 0.1 * u.cache_read_input_tokens
  const usd = price ? pingUsd(u, price) : null
  s.last = { at: now, read: u.cache_read_input_tokens, write: u.cache_creation_input_tokens, usd, warm }
  if (!warm) return stop($, s, t(`the ping read ${fmtTok(u.cache_read_input_tokens)} and wrote ${fmtTok(u.cache_creation_input_tokens)} tokens (${fmtUsd(usd)}), the cache was already gone`, `el ping leyó ${fmtTok(u.cache_read_input_tokens)} y escribió ${fmtTok(u.cache_creation_input_tokens)} tokens (${fmtUsd(usd)}), el caché ya se había perdido`))
  s.lastRequestAt = now
  await arm($, s)
}

/** The reply to an arming command; on a cold cache it says when the first ping can come. */
function armedText(s: State, now: number, windowMs: number): string {
  if (isCold(s, now)) return t(`keepwarm on for ${fmtDuration(windowMs)}. The cache is cold now, so the first ping comes ${fmtDuration(s.every)} after the next turn`,
    `keepwarm activado por ${fmtDuration(windowMs)}. El caché está frío ahora, así que el primer ping llega ${fmtDuration(s.every)} después del próximo turno`)
  return t(`keepwarm on for ${fmtDuration(windowMs)}, a ping ${fmtDuration(s.every)} after each idle stretch keeps the cache read, not re-written`,
    `keepwarm activado por ${fmtDuration(windowMs)}: un ping ${fmtDuration(s.every)} después de cada pausa mantiene el caché en lectura, sin reescribirlo`)
}

async function startWindow($: EngineInterface, s: State, windowMs: number, every: number) {
  const now = await $.clock.now()
  s.every = every
  if (every === PING_AFTER_MS) await $.store.delete(everyKey(s))
  else await $.store.set(everyKey(s), every)
  s.deadline = now + windowMs
  s.stopped = null
  if (s.paused) {
    s.paused = false
    await $.store.delete(pausedKey(s))
  }
  await $.store.set(deadlineKey(s), s.deadline)
  await arm($, s)
}

function card(s: State, now: number): string {
  const lines: string[] = []
  lines.push(`${s.lastModel ?? t('model not seen yet', 'modelo aún no visto')}`)
  if (s.compacted) lines.push(t('state       reset by compaction, waiting for the first turn', 'estado      reiniciado por la compactación, esperando el primer turno'))
  else if (!s.lastRequestAt) lines.push(t('state       no request yet this session', 'estado      aún no hay ninguna solicitud en esta sesión'))
  else if (isCold(s, now)) lines.push(t(`state       COLD, last request ${fmtDuration(now - s.lastRequestAt)} ago`, `estado      FRÍO, la última solicitud fue hace ${fmtDuration(now - s.lastRequestAt)}`))
  else lines.push(t(`state       warm, ${fmtDuration(s.lastRequestAt + TTL_MS - now)} left`, `estado      caliente, quedan ${fmtDuration(s.lastRequestAt + TTL_MS - now)}`))
  lines.push(t(`context     ${s.ctx.toLocaleString('en-US')} tokens`, `contexto    ${s.ctx.toLocaleString('en-US')} tokens`))
  lines.push(t(`cold cost   ${fmtUsd(coldUsd(s))} to re-write it (warm turn ${fmtUsd(warmUsd(s))})`, `costo frío  ${fmtUsd(coldUsd(s))} por reescribirlo (turno caliente ${fmtUsd(warmUsd(s))})`))
  const always = s.always ? t(' (always)', ' (siempre)') : ''
  const idle = s.always
    ? t('off until the next session start, which arms 6h00m (always)', 'apagado hasta el próximo inicio de sesión, que activa 6h00m (siempre)')
    : t('off (/keepwarm to arm it for 6h00m)', 'apagado (/keepwarm lo activa por 6h00m)')
  const on = (statusText(s, now) ?? '').replace(/^keepwarm:? /, t('on, ', 'activo, '))
  lines.push(`keepwarm    ${s.deadline ? on + always : s.stopped ? t(`stopped, ${s.stopped}${always}`, `detenido, ${s.stopped}${always}`) : idle}`)
  const pings = breakEvenPings(s)
  if (pings != null) lines.push(t(`break-even  up to ${pings} pings at the read rate cost one cold write, about ${fmtDuration(pings * s.every)} of idle at one ping per ${fmtDuration(s.every)}`,
    `equilibrio  hasta ${pings} pings a tarifa de lectura cuestan lo mismo que una escritura en frío, unas ${fmtDuration(pings * s.every)} de pausa con un ping cada ${fmtDuration(s.every)}`))
  lines.push(s.guard === 'refuse'
    ? t('guard       refuse once (/keepwarm-info guard warn to only show the price)', 'guardia     frena una vez (/keepwarm-info guard warn solo muestra el precio)')
    : t('guard       warn only (/keepwarm-info guard refuse to be stopped once)', 'guardia     solo avisa (/keepwarm-info guard refuse para que frene una vez)'))
  const paid = s.misses.reduce((a, m) => a + (m.usd ?? 0), 0)
  lines.push(t(`session     ${s.misses.length} cold write${s.misses.length === 1 ? '' : 's'} paid, ${fmtUsd(paid)}`, `sesión      ${s.misses.length} escritura${s.misses.length === 1 ? '' : 's'} en frío pagada${s.misses.length === 1 ? '' : 's'}, ${fmtUsd(paid)}`))
  return lines.join('\n')
}

export function freshState(): State {
  return {
    hasBand: false, sid: '', deadline: 0, every: PING_AFTER_MS, always: false, paused: false, lastRequestAt: 0, lastModel: null, ctx: 0, compacted: false,
    guard: 'refuse', ackedAt: 0, coldWritePending: false, misses: [], pending: null, last: null, stopped: null,
  }
}

// The person's home folder. A Mac working folder under /Users/<name> gives /Users/<name>; a Windows one
// (C:\Users\<name>\...) gives USERPROFILE, or that folder when the variable is not readable; anywhere else HOME.
async function homeDir($: EngineInterface): Promise<string> {
  const cwd = await $.session.cwd()
  const parts = cwd.split(/[\\/]/)
  const env = async (k: 'HOME' | 'USERPROFILE') => {
    try { return String((k === 'HOME' ? await $.env.get('HOME') : await $.env.get('USERPROFILE')) ?? '').replace(/[\\/]+$/, '') } catch { return '' }
  }
  if (cwd.startsWith('/')) {
    if (parts[1] === 'Users' && parts[2]) return '/Users/' + parts[2]
    return await env('HOME')
  }
  const win = /^[A-Za-z]:$/.test(parts[0]) && parts[1] === 'Users' && parts[2] ? parts[0] + '\\Users\\' + parts[2] : ''
  return (await env('USERPROFILE')) || win || (await env('HOME'))
}

/** The "lang" of the AIOS install record (~/.aios/installed.json); English when there is none. */
async function readLang($: EngineInterface): Promise<Lang> {
  try {
    const home = await homeDir($)
    if (home) {
      const j = JSON.parse(await $.fs.read(home + '/.aios/installed.json'))
      if (j && j.lang === 'es') return 'es'
    }
  } catch { /* no install record: English */ }
  return 'en'
}

export const register: Register = on => {
  const s = freshState()
  let light = false
  let noColor = false

  on('config.set', { key: 'theme' }, async ($, e, next) => {
    const result = await next(e)
    if (result.deny === undefined) {
      light = typeof result.value === 'string' && result.value.startsWith('light')
      if (s.hasBand) $.ui.invalidate('ui.render')
    }
    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const rest = await next(e)
    if (!s.hasBand || e.props.hasSurvey) return rest
    const now = await $.clock.now()
    const live = s.deadline > 0 && now < s.deadline
    const text = live ? statusText(s, now) : undefined
    const { Box, Text, Button } = $.ui.resolve(e)
    // AIOS: the switch, green while this chat is kept warm, gray while it is not; a press flips it.
    const switchEl = Box({ key: 'keepwarm-switch-box', flexShrink: 0, children: [Button({
      key: 'keepwarm-switch', label: live ? t('keep warm on', 'caché activo: encendido') : t('keep warm off', 'caché activo: apagado'), plain: true,
      hover: { bold: true },
      onPress: () => { void toggle($, s) },
      children: [live
        ? Text({ color: noColor ? undefined : ON_COLOR, bold: true, children: [t('● keep warm', '● caché activo')] })
        : Text({ dimColor: true, children: [t('○ keep warm', '○ caché activo')] })],
    })] })
    const cols = (e.props as { bodyColumns?: number }).bodyColumns ?? 100
    const divider = Text({ color: '#3a4052', children: ['─'.repeat(Math.max(10, cols))] })
    const place = (row: any) => placeRow(rest, row, divider) ?? Box({ flexDirection: 'column', children: [rest, divider, row] })
    if (!text) {
      return place(Box({ key: 'keepwarm-row', flexDirection: 'row', children: [switchEl, Text({ dimColor: true, children: [s.stopped ? `  keepwarm · ${statusText(s, now)}` : t('  off for this chat, click to turn on', '  apagado en este chat, haz clic para encender')] })] }))
    }
    const state = s.stopped ? 'stopped' : !s.lastRequestAt || s.compacted ? 'unknown' : isCold(s, now) ? 'cold' : 'warm'
    const color = noColor ? undefined : state === 'warm' ? 'success' : state === 'cold' ? (light ? '#c15f3c' : '#d97757') : undefined
    const asset = statusIcons[light ? 'light' : 'dark'][state === 'warm' || state === 'cold' ? state : 'neutral']
    const icon = noColor ? Text({ bold: true, children: ['[>]'] })
      : e.surface === 'terminal' ? $.ui.resolve(e).Image({ source: { png: asset.png }, columns: 3, rows: 1, alt: ' ' })
      : e.surface === 'desktop' ? $.ui.resolve(e).Svg({ source: asset.svg, width: 18, height: 18, alt: 'keepwarm' })
      : Text({ color, bold: true, children: ['[>]'] })
    return place(
      Box({ key: 'keepwarm-row', flexDirection: 'row', alignItems: 'center', children: [
        switchEl,
        Text({ children: ['  '] }),
        Box({ flexShrink: 0, children: [icon] }),
        Text({ children: [
          ' keepwarm · ',
          Text({ color, bold: true, children: [t(state, STATE_ES[state])] }),
          ` · ${text}`,
        ] }),
      ] }),
    )
  })

  on('session.start', async ($, e, next) => {
    const r = await next(e)
    lang = await readLang($)
    s.hasBand = e.surface === 'terminal' || e.surface === 'desktop'
    if (s.hasBand) {
      const theme = (await $.config.list()).find(row => row.key === 'theme')?.value
      light = typeof theme === 'string' && theme.startsWith('light')
      noColor = Boolean(await $.env.get('NO_COLOR'))
      $.ui.status(undefined)
    }
    s.sid = await $.session.id()
    const now = await $.clock.now()
    await prune($, s, now)
    const saved = await $.store.get(deadlineKey(s))
    const savedEvery = await $.store.get(everyKey(s))
    const savedGuard = await $.store.get(KEY_GUARD)
    s.deadline = typeof saved === 'number' && saved > now ? saved : 0
    s.every = typeof savedEvery === 'number' && savedEvery >= MIN_PING_MS ? savedEvery : PING_AFTER_MS
    s.guard = savedGuard === 'warn' ? 'warn' : 'refuse'
    // AIOS: always is on unless /keepwarm off stored false.
    s.always = (await $.store.get(KEY_ALWAYS)) !== false
    s.paused = (await $.store.get(pausedKey(s))) === true
    // Always means a fresh default window every session, whatever the last one left behind.
    if (s.always && !s.paused) await startWindow($, s, DEFAULT_WINDOW_MS, PING_AFTER_MS)
    const usage = await $.session.usage()
    if (usage.context.tokens) s.ctx = usage.context.tokens
    await $.command.register({
      name: 'keepwarm',
      description: t('Keep the prompt cache warm: bare for 6h, a window such as 90m, always, off, or status', 'Mantiene caliente el caché de la conversación: sin nada son 6h, o una ventana como 90m, always, off o status'),
      argumentHint: '[6h | always | off | status]',
      immediate: true,
    })
    await $.command.register({
      name: 'keepwarm-info',
      description: t('Prompt cache state, cold price and this session\'s cold writes; guard warn|refuse', 'Estado del caché, precio en frío y escrituras en frío de esta sesión; guard warn|refuse'),
      argumentHint: '[status | guard warn | guard refuse]',
      immediate: true,
    })
    updateStatus($, s, now)
    return r
  })

  // Resume fields seed the guard before any turn of the resumed session has run.
  on('classic.SessionStart', async ($, e, next) => {
    const r = await next(e)
    if (e.source === 'clear') {
      await stop($, s, null)
      s.stopped = null
      resetForClear(s)
      s.sid = await $.session.id()
      updateStatus($, s, await $.clock.now())
      return r
    }
    const line = seedFromResume(s, e, await $.clock.now())
    // The resume payload may omit the model; without it the guard cannot price the cold write.
    if (!s.lastModel) s.lastModel = await $.session.model()
    if (line) $.ui.log(line)
    // The seeded clock decides whether a restored or always window pings before the first turn: never when it is cold.
    await arm($, s)
    return r
  })

  on('command.run', { command: 'keepwarm' }, async ($, e) => {
    const words = String(e.args ?? '').trim().split(/\s+/).filter(Boolean)
    if (words[0]) words[0] = ({ apagar: 'off', siempre: 'always', estado: 'status' } as Record<string, string>)[words[0].toLowerCase()] ?? words[0]
    const now = await $.clock.now()
    if (words[0] === 'off') {
      const wasAlways = s.always
      await stop($, s, null, true)
      return { text: wasAlways ? t('keepwarm is off, and no longer arms itself at session start', 'keepwarm está apagado y ya no se activa solo al iniciar sesión') : t('keepwarm is off', 'keepwarm está apagado') }
    }
    if (words[0] === 'always') {
      s.always = true
      await $.store.set(KEY_ALWAYS, true)
      await startWindow($, s, DEFAULT_WINDOW_MS, PING_AFTER_MS)
      const cold = isCold(s, now) ? t(`. The cache is cold now, so the first ping comes ${fmtDuration(s.every)} after the next turn`, `. El caché está frío ahora, así que el primer ping llega ${fmtDuration(s.every)} después del próximo turno`) : ''
      return { text: t(`keepwarm always on: every session starts with a ${fmtDuration(DEFAULT_WINDOW_MS)} window; /keepwarm off turns it off for good${cold}`, `keepwarm siempre activo: cada sesión empieza con una ventana de ${fmtDuration(DEFAULT_WINDOW_MS)}; /keepwarm off lo apaga del todo${cold}`) }
    }
    if (!words.length) {
      await startWindow($, s, DEFAULT_WINDOW_MS, PING_AFTER_MS)
      return { text: armedText(s, now, DEFAULT_WINDOW_MS) }
    }
    if (words[0] !== 'status') {
      const window = parseDuration(words[0])
      if (window == null) return { text: t('keepwarm takes a window such as 6h or 90m, or always, off, or status', 'keepwarm acepta una ventana como 6h o 90m, o always, off o status') }
      // "every 2m" is a testing knob and lasts only for the window it was given with.
      let every = PING_AFTER_MS
      if (words[1] === 'every') {
        const period = parseDuration(words[2] ?? '')
        if (period == null || period < MIN_PING_MS) return { text: t('every takes a period of at least 1m', 'every necesita un periodo de al menos 1m') }
        every = period
      }
      await startWindow($, s, window, every)
      return { text: armedText(s, now, window) }
    }
    return { text: statusText(s, now) ?? t('keepwarm is off', 'keepwarm está apagado') }
  })

  on('command.run', { command: 'keepwarm-info' }, async ($, e) => {
    const words = String(e.args ?? '').trim().split(/\s+/).filter(Boolean)
    const now = await $.clock.now()
    if (words[0] === 'guard') {
      if (words[1] !== 'warn' && words[1] !== 'refuse') return { text: t('/keepwarm-info guard takes warn or refuse', '/keepwarm-info guard acepta warn o refuse') }
      s.guard = words[1]
      await $.store.set(KEY_GUARD, s.guard)
      return { text: s.guard === 'refuse' ? t('guard set to refuse once: a cold send is dropped with its price, the resend goes through', 'guardia en "frenar una vez": un envío en frío se detiene mostrando su precio, y al reenviar pasa') : t('guard set to warn: a cold send goes through with its price shown', 'guardia en "avisar": un envío en frío pasa mostrando su precio') }
    }
    return { text: card(s, now) }
  })

  // The message that pays. Only its first character is read.
  on('prompt.submit', async ($, e, next) => {
    if (e.origin.kind === 'plugin') return next(e)
    if (typeof e.text !== 'string' || e.text.trimStart().startsWith('/')) return next(e)
    const now = await $.clock.now()
    if (!isCold(s, now) || s.ctx < BIG_TOKENS) return next(e)
    if (s.guard === 'warn') {
      $.ui.log(`${guardText(s, now)} ` + t(`Sending anyway; keepwarm will hold the cache for ${fmtDuration(AUTO_WARM_MS)} once it lands.`, `Se envía igual; keepwarm mantendrá el caché ${fmtDuration(AUTO_WARM_MS)} una vez que llegue.`))
      s.coldWritePending = true
      return next(e)
    }
    if (s.ackedAt === s.lastRequestAt) {
      s.ackedAt = 0
      s.coldWritePending = true
      return next(e)
    }
    s.ackedAt = s.lastRequestAt
    return { drop: `keepwarm: ${guardText(s, now)} ` + t(`Send it again to pay it, and keepwarm will then hold the cache for ${fmtDuration(AUTO_WARM_MS)}. Or /clear and start from a note.`, `Envíalo de nuevo para pagarlo y keepwarm mantendrá el caché ${fmtDuration(AUTO_WARM_MS)}. O usa /clear y empieza desde una nota.`) }
  })

  on('turn.step', async function* ($, e, next) {
    if (!e.agentId) s.lastRequestAt = await $.clock.now()
    yield* next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    if (e.agentId) return r
    const now = await $.clock.now()
    // A sleeping host may deliver this turn before the expired window's timer.
    if (s.deadline && now >= s.deadline) await stop($, s, null)
    // turn.step stamps the exact request time; when no step of this turn did, the turn's end is the floor.
    if (now - s.lastRequestAt > e.durationMs) s.lastRequestAt = now
    s.compacted = false
    s.ackedAt = 0
    const u = e.usage
    if (u) {
      if (u.model) s.lastModel = u.model
      const prev = s.ctx
      // A turn's usage is its responses summed, so a ten-step turn reports ten
      // reads of the context. The live window is the engine's figure; the sum
      // is only the fallback for a host that reports no tokens.
      const write = u.cache_creation_input_tokens
      const live = (await $.session.usage()).context.tokens
      s.ctx = live && live > 0 ? live : u.input_tokens + u.cache_read_input_tokens + write
      const full = prev > 20000 && write >= 0.5 * prev
      if (full || s.coldWritePending) {
        const price = priceOf(s.lastModel)
        const usd = price ? write * price[1] / 1e6 : null
        s.misses.push({ at: now, tokens: write, usd })
        if (s.deadline < now + AUTO_WARM_MS) {
          await startWindow($, s, AUTO_WARM_MS, s.every)
          $.ui.log(t(`cold write of ${fmtTok(write)} tokens paid (${fmtUsd(usd)}). Keeping the cache warm for ${fmtDuration(AUTO_WARM_MS)} so it is not paid again today; /keepwarm off to stop.`, `escritura en frío de ${fmtTok(write)} tokens pagada (${fmtUsd(usd)}). Mantengo el caché caliente ${fmtDuration(AUTO_WARM_MS)} para no pagarla otra vez hoy; /keepwarm off para detenerlo.`))
        }
      }
    }
    s.coldWritePending = false
    // AIOS: with always on, the window runs 6h from the last turn, not from session start.
    if (s.always && !s.paused) {
      await startWindow($, s, DEFAULT_WINDOW_MS, s.every)
      return r
    }
    await arm($, s)
    return r
  })

  on('session.compact', async ($, e, next) => {
    const r = await next(e)
    if (!e.agentId) {
      s.compacted = true
      s.ctx = 0
      s.ackedAt = 0
      disarm(s)
      await arm($, s)
    }
    return r
  })
}
