import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Activity } from '../types'

// Chat mode: every tool call Claude makes becomes one short, plain,
// dim line ("· Check the edit-row types  ✎ 2 files +30 −0"). Commands, outputs
// and diffs are hidden from the chat; a failure is one red line. Clicking a line
// (fullscreen terminal) or typing /activity opens everything in a side pane.

const PANE = 'quiet-activity'

// Language: ~/.aios/installed.json has "lang": "en" | "es". English unless it says es.
type Lang = 'en' | 'es'
let LANG: Lang | null = null
const T = {
  activityDesc: { en: 'Show everything Claude did this session (commands, output, file changes) in a side pane', es: 'Muestra todo lo que Claude hizo en esta sesión (comandos, resultados, cambios de archivos) en un panel lateral' },
  changesDesc: { en: 'Same as /activity', es: 'Igual que /activity' },
  activityTitle: { en: 'Activity', es: 'Actividad' },
  panelFailed: { en: 'Details panel could not open: ', es: 'No se pudo abrir el panel de detalles: ' },
  noReason: { en: 'no reason given', es: 'sin motivo' },
  stopped: { en: '(stopped)', es: '(detenido)' },
  failed: { en: 'failed', es: 'falló' },
  details: { en: 'details', es: 'detalles' },
  nothing: { en: 'Nothing yet this session. Esc closes.', es: 'Todavía no hay nada en esta sesión. Esc cierra.' },
  allActivity: { en: 'All activity, newest first. Esc closes.', es: 'Toda la actividad, lo más reciente primero. Esc cierra.' },
  backAll: { en: '← All activity', es: '← Toda la actividad' },
  before: { en: 'That step happened before this panel was open.', es: 'Ese paso ocurrió antes de que este panel estuviera abierto.' },
  explaining: { en: 'explaining…', es: 'explicando…' },
  explain: { en: 'explain in plain words ›', es: 'explicar en palabras sencillas ›' },
  hideTech: { en: 'hide technical details ‹', es: 'ocultar detalles técnicos ‹' },
  showTech: { en: 'show technical details ›', es: 'ver detalles técnicos ›' },
  file: { en: 'file', es: 'archivo' }, files: { en: 'files', es: 'archivos' },
  time: { en: 'time', es: 'vez' }, times: { en: 'times', es: 'veces' },
  command: { en: 'command', es: 'comando' }, commands: { en: 'commands', es: 'comandos' },
  otherStep: { en: 'other step', es: 'otro paso' }, otherSteps: { en: 'other steps', es: 'otros pasos' },
  created: { en: 'created', es: 'creado' }, deleted: { en: 'deleted', es: 'eliminado' },
} as const
const tr = (k: keyof typeof T, lang: Lang) => T[k][lang]

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

async function langOf($: EngineInterface): Promise<Lang> {
  if (LANG) return LANG
  let lang: Lang = 'en'
  try {
    const home = await homeDir($)
    if (home) {
      const j = JSON.parse(await $.fs.read(home + '/.aios/installed.json'))
      if (j && j.lang === 'es') lang = 'es'
    }
  } catch { /* no install record: English */ }
  LANG = lang
  return lang
}
const MAX_KEPT = 60
const MAX_DIFF_CHARS = 6000
const MAX_TEXT_CHARS = 3000
const MAX_LABEL = 90

const activities = atom({ plugin: 'aios-chat-mode', key: 'activities' } as const, [] as Activity[])
const selected = atom({ plugin: 'aios-chat-mode', key: 'selected' } as const, '')
// Narrator: a plain explanation per step, written on demand; and which steps show their technical details
const narrations = atom({ plugin: 'aios-chat-mode', key: 'narrations' } as const, {} as Record<string, string>)
const technical = atom({ plugin: 'aios-chat-mode', key: 'technical' } as const, [] as string[])
const narrating = new Set<string>()

type Hunk = { oldStart: number; oldLines: number; newStart: number; newLines: number; lines: string[] }
type FileChange = { file: string; added: number; removed: number; diff: string; verb: string }

const baseName = (path: string) => path.split(/[\\/]/).filter(Boolean).pop() ?? path
const cut = (text: string, n: number) => (text.length > n ? text.slice(0, n - 1) + '…' : text)
const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim()

// Turn a patch into counts and a readable diff, keeping whole hunks only
export const patchOf = (hunks: Hunk[]) => {
  let added = 0
  let removed = 0
  const parts: string[] = []
  let size = 0
  for (const h of hunks ?? []) {
    const block = [`@@ -${h.oldStart},${h.oldLines} +${h.newStart},${h.newLines} @@`]
    for (const l of h.lines ?? []) {
      if (l.startsWith('+')) added += 1
      else if (l.startsWith('-')) removed += 1
      block.push(l)
    }
    const text = block.join('\n')
    if (size + text.length <= MAX_DIFF_CHARS) { parts.push(text); size += text.length + 1 }
  }
  return { added, removed, diff: parts.join('\n') }
}

// Every file a call changed: the edit tools' own patch, or a shell command's bashEditDiff
export const changesOf = (tool: string, input: unknown, output: unknown): FileChange[] => {
  const out = (output ?? {}) as Record<string, any>
  const inp = (input ?? {}) as Record<string, any>
  if (Array.isArray(out.bashEditDiff?.files)) {
    return out.bashEditDiff.files.map((f: any) => ({
      file: f.filePath,
      ...patchOf(f.hunks),
      verb: f.deleted ? 'deleted' : f.created ? 'created' : '',
    }))
  }
  if (['Edit', 'Write', 'MultiEdit', 'NotebookEdit'].includes(tool) && output && typeof output === 'object') {
    const file = out.filePath ?? inp.file_path ?? inp.notebook_path ?? 'file'
    const hunks: Hunk[] = Array.isArray(out.structuredPatch) ? out.structuredPatch : []
    if (hunks.length === 0 && out.type === 'create' && typeof out.content === 'string') {
      const lines = out.content.split('\n')
      return [{ file, ...patchOf([{ oldStart: 0, oldLines: 0, newStart: 1, newLines: lines.length, lines: lines.map((l: string) => '+' + l) }]), verb: 'created' }]
    }
    return [{ file, ...patchOf(hunks), verb: '' }]
  }
  return []
}

// A plain description of what a call does
export const labelOf = (tool: string, input: unknown, lang: Lang = 'en'): string => {
  const es = lang === 'es'
  const i = (input ?? {}) as Record<string, any>
  const name = (k: string) => (typeof i[k] === 'string' ? baseName(i[k]) : '')
  let label: string
  switch (tool) {
    case 'Bash': label = i.description ? String(i.description) : oneLine(String(i.command ?? (es ? 'Ejecutó un comando' : 'Ran a command'))); break
    case 'Read': label = (es ? 'Leer ' : 'Read ') + name('file_path'); break
    case 'Edit': case 'MultiEdit': label = (es ? 'Editar ' : 'Edit ') + name('file_path'); break
    case 'Write': label = (es ? 'Escribir ' : 'Write ') + name('file_path'); break
    case 'NotebookEdit': label = (es ? 'Editar ' : 'Edit ') + name('notebook_path'); break
    case 'Grep': label = es ? `Buscar “${i.pattern ?? ''}”` : `Search for “${i.pattern ?? ''}”`; break
    case 'Glob': label = (es ? 'Buscar archivos ' : 'Find files ') + (i.pattern ?? ''); break
    case 'WebSearch': label = (es ? 'Buscar en la web: ' : 'Search the web: ') + (i.query ?? ''); break
    case 'WebFetch': label = (es ? 'Leer una página web' : 'Read a web page') + (typeof i.url === 'string' ? ': ' + i.url.replace(/^https?:\/\//, '') : ''); break
    case 'Agent': case 'Task': label = (es ? 'Agente: ' : 'Agent: ') + (i.description ?? i.subagent_type ?? ''); break
    case 'Skill': label = (es ? 'Habilidad: ' : 'Skill: ') + (i.skill ?? ''); break
    case 'Workflow': label = (es ? 'Flujo de trabajo' : 'Workflow') + (i.name ? ': ' + i.name : ''); break
    case 'ToolSearch': label = es ? 'Cargar herramientas' : 'Load tools'; break
    default: {
      const m = /^mcp__(.+?)__(.+)$/.exec(tool)
      label = m ? `${m[1].replace(/^claude_ai_/, '').replace(/_/g, ' ')}: ${m[2].replace(/_/g, ' ')}` : tool
    }
  }
  return cut(oneLine(label), MAX_LABEL)
}

const textOf = (value: unknown): string => {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  const v = value as Record<string, any>
  if (typeof v.stdout === 'string' || typeof v.stderr === 'string') return [v.stdout, v.stderr].filter(Boolean).join('\n')
  try { return JSON.stringify(value, null, 1) } catch { return String(value) }
}

const verbOf = (verb: string, lang: Lang) => (verb === 'created' || verb === 'deleted' ? tr(verb, lang) : verb)

export const changeTag = (files: FileChange[], lang: Lang = 'en') => {
  if (files.length === 0) return ''
  const a = files.reduce((n, f) => n + f.added, 0)
  const r = files.reduce((n, f) => n + f.removed, 0)
  const what = files.length === 1 ? baseName(files[0].file) + (files[0].verb ? ' ' + verbOf(files[0].verb, lang) : '') : files.length + ' ' + tr('files', lang)
  return `  ✎ ${what} +${a} −${r}`
}

// Open the pane with one activity shown first ('' shows newest first)
async function openOn($: EngineInterface, id: string, quiet = false) {
  // Open first, before any other await: a click only counts as the person's own
  // request (which seats the pane at any width) while it is answered right away
  const lang = await langOf($)
  const opening = $.ui.open({ id: PANE, title: tr('activityTitle', lang), focus: true, closeOnEscape: true })
  await update($, selected, () => id)
  const placed = await opening
  // Say so when the pane can't show, instead of failing silently
  // A click without fullscreen has nowhere to open: stay quiet. A typed /activity says so.
  if (!quiet && placed && placed.isPlaced === false) $.ui.toast(tr('panelFailed', lang) + (placed.reason ?? tr('noReason', lang)))
  // Start at the top, so what was clicked is what you see
  try { await $.ui.scroll({ in: PANE, to: 'start', block: 'start' }) } catch { /* nothing to scroll yet */ }
}

// Narrator: ask Claude, with the whole chat as context (a fork of the main thread, tools
// off, nothing added to the chat), to explain one step in plain words
export const narratePrompt = (r: Activity, lang: Lang = 'en') => [
  'NARRATOR. The person you are working with (not an engineer) clicked one of your steps in the details panel.',
  'In one or two short, plain sentences, say what this step did and why, using what you know from this conversation.',
  'No jargon, no code, no file paths unless the file name itself helps. Start with a verb ("Added…", "Checked…").',
  lang === 'es' ? 'Answer in Spanish (Colombian, with every accent), using "tú" if you address them, and start with a verb ("Agregué…", "Revisé…").' : '',
  `Step: ${r.label}${r.failed ? ' (it failed)' : ''}`,
  r.command ? `Command: ${r.command.slice(0, 600)}` : '',
  r.files.length ? `Files changed: ${r.files.map(f => `${baseName(f.file)} (+${f.added} −${f.removed}${f.verb ? ', ' + f.verb : ''})`).join(', ')}` : '',
  r.output ? `Result (start): ${r.output.slice(0, 800)}` : '',
].filter(Boolean).join('\n')

async function narrate($: EngineInterface, ids: string[]) {
  const lang = await langOf($)
  const have = await read($, narrations)
  const list = await read($, activities)
  for (const id of ids) {
    if (have[id] || narrating.has(id)) continue
    const r = list.find(a => a.id === id)
    if (!r) continue
    narrating.add(id)
    $.ui.invalidate('ui.render') // show "explaining…" right away
    let text = ''
    try {
      const res = await $.model.fork({ prompt: narratePrompt(r, lang) })
      text = res.isAnswered ? res.text.trim() : ''
    } catch { /* leave it unexplained */ }
    narrating.delete(id)
    if (text) await update($, narrations, m => ({ ...m, [id]: text }))
  }
}

async function toggleTechnical($: EngineInterface, id: string) {
  await update($, technical, t => (t.includes(id) ? t.filter(x => x !== id) : [...t, id]))
}

// A click on a line: show just that line's calls in the pane (ids joined by commas)
async function clickOn($: EngineInterface, ids: string) {
  await openOn($, ids, true)
  void narrate($, ids.split(',').filter(Boolean))
}

// Claude Code's own kind of summary ("Read 1 file, ran 2 commands, edited 3 files +6 −2")
export const groupSummary = (calls: ReadonlyArray<{ tool: string; input: unknown; output?: unknown }>, lang: Lang = 'en') => {
  const n = { read: 0, search: 0, command: 0, edit: 0, other: 0 }
  const files: FileChange[] = []
  for (const c of calls) {
    if (c.tool === 'Read') n.read += 1
    else if (['Grep', 'Glob', 'WebSearch', 'WebFetch', 'ToolSearch'].includes(c.tool)) n.search += 1
    else if (c.tool === 'Bash') n.command += 1
    else if (['Edit', 'Write', 'MultiEdit', 'NotebookEdit'].includes(c.tool)) n.edit += 1
    else n.other += 1
    files.push(...changesOf(c.tool, c.input, c.output))
  }
  const plural = (k: number, one: keyof typeof T, many: keyof typeof T) => `${k} ${tr(k === 1 ? one : many, lang)}`
  const es = lang === 'es'
  const parts: string[] = []
  if (n.read) parts.push((es ? 'leyó ' : 'read ') + plural(n.read, 'file', 'files'))
  if (n.search) parts.push((es ? 'buscó ' : 'searched ') + plural(n.search, 'time', 'times'))
  if (n.command) parts.push((es ? 'ejecutó ' : 'ran ') + plural(n.command, 'command', 'commands'))
  if (n.edit) parts.push((es ? 'editó ' : 'edited ') + plural(n.edit, 'file', 'files'))
  if (n.other) parts.push(plural(n.other, 'otherStep', 'otherSteps'))
  const text = parts.join(', ')
  const a = files.reduce((k, f) => k + f.added, 0)
  const r = files.reduce((k, f) => k + f.removed, 0)
  return (text.charAt(0).toUpperCase() + text.slice(1)) + (files.length ? `  ✎ +${a} −${r}` : '')
}

// Open a document in the md-view reader; fall back to the activity pane without it
async function openDoc($: EngineInterface, path: string, id: string) {
  try {
    await $.command.run({ command: 'view', args: path })
  } catch {
    await clickOn($, id)
  }
}

// One quiet line for a call: dim normally, red when it failed; click to open details
function quietRow($: EngineInterface, e: any, lang: Lang) {
  const { Box, Text, Button } = $.ui.resolve(e)
  const id: string = e.props.tool_use_id
  const label = labelOf(e.props.tool, e.props.input, lang)
  if (e.props.isRunning) return <Text dimColor>{`· ${label} …`}</Text>
  if (e.props.isInterrupted) return <Text dimColor>{`· ${label}  ${tr('stopped', lang)}`}</Text>
  if (e.props.isErrored) {
    return (
      <Box key={'row-' + id} flexDirection="row">
        <Text color="red">✗ </Text>
        <Button key={'act-' + id} plain label={`${label}  ${tr('failed', lang)}`} hover={{ color: 'red', bold: true }} onPress={() => void clickOn($, id)} />
      </Box>
    )
  }
  const files = changesOf(e.props.tool, e.props.input, e.props.output)
  // A changed Markdown document opens in the md-view reader; everything else in the activity pane
  const doc = files.find(f => /\.(md|markdown|mdx)$/i.test(f.file) && f.verb !== 'deleted')
  return (
    <Box key={'row-' + id}>
      <Button key={'act-' + id} plain dimColor label={`· ${label}${changeTag(files, lang)}`} hover={{ dimColor: false, bold: true }} onPress={() => void (doc ? openDoc($, doc.file, id) : clickOn($, id))} />
    </Box>
  )
}

export const isPanelCommand = (text: string) =>
  /^\s*(<command-name>)?\/(view|activity|changes|side|quickbar)(\b|<)/.test(text)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'activity', description: tr('activityDesc', await langOf($)) })
    await $.command.register({ name: 'changes', description: tr('changesDesc', await langOf($)) })
    return next(e)
  })

  // Remember every call with its command, output and file changes, for the pane
  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    const input = e as unknown as Record<string, any>
    const failed = ran.deny !== undefined || ran.isError === true
    const record: Activity = {
      id: e.tool_use_id,
      tool: e.tool,
      label: labelOf(e.tool, e),
      command: typeof input.command === 'string' ? cut(input.command, MAX_TEXT_CHARS) : '',
      output: cut(ran.deny ?? textOf(ran.text ?? ran.result), MAX_TEXT_CHARS),
      files: failed ? [] : changesOf(e.tool, e, ran.result),
      failed,
      at: await $.clock.now(),
    }
    await update($, activities, list => [...list.filter(r => r.id !== record.id), record].slice(-MAX_KEPT))
    return ran
  })

  // Panel commands (/view, /activity, /changes, /side, /quickbar) only open a panel:
  // don't echo them into the chat as if they were messages
  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    const text = String((e.props as { text?: string }).text ?? '')
    if (!isPanelCommand(text)) return next(e)
    const { Box } = $.ui.resolve(e)
    return <Box />
  })

  // Every tool row in the chat: one quiet line
  on('ui.render', { component: 'ToolUse' }, async ($, e) => quietRow($, e, await langOf($)))

  // The result block under a row: hidden, the line above says it
  on('ui.render', { component: 'ToolResult' }, async ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })

  // A folded run ("Ran 2 shell commands"): keep Claude Code's short summary, never
  // unfold it, add "· details", and a red line when something in it failed
  on('ui.render', { component: 'ToolGroup' }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const lang = await langOf($)
    const calls = e.props.calls
    const last = calls[calls.length - 1]?.tool_use_id ?? ''
    const failed = calls.filter(c => c.isErrored)
    const failedId = failed[0]?.tool_use_id ?? last
    return (
      <Box flexDirection="column">
        <Box key={'grp-' + last}>
          <Button key={'grp-btn-' + last} plain dimColor label={`· ${groupSummary(calls, lang)}  · ${tr('details', lang)}`} hover={{ dimColor: false, bold: true }} onPress={() => void clickOn($, calls.map(c => c.tool_use_id ?? '').join(','))} />
        </Box>
        {failed.length > 0
          ? (
            <Box key={'grp-err-' + failedId} flexDirection="row">
              <Text color="red">✗ </Text>
              <Button key={'grp-err-btn-' + failedId} plain label={`${labelOf(failed[0].tool, failed[0].input, lang)}  ${tr('failed', lang)}`} hover={{ color: 'red', bold: true }} onPress={() => void clickOn($, failedId)} />
            </Box>
          )
          : null}
      </Box>
    )
  })

  on('command.run', { command: 'activity' }, async $ => {
    await openOn($, '')
    return {}
  })
  on('command.run', { command: 'changes' }, async $ => {
    await openOn($, '')
    return {}
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Code, Button } = $.ui.resolve(e)
    const list = await read($, activities)
    const pick = await read($, selected)
    const notes = await read($, narrations)
    const tech = await read($, technical)
    const lang = await langOf($)
    if (list.length === 0) return <Text dimColor>{tr('nothing', lang)}</Text>
    // A click shows only what was clicked; /activity shows everything, newest first
    const ids = new Set(pick.split(',').filter(Boolean))
    const ordered = ids.size > 0 ? list.filter(r => ids.has(r.id)) : [...list].reverse()
    return (
      <Box flexDirection="column" gap={1}>
        {ids.size > 0
          ? (
            <Box key="back-row">
              <Button key="show-all" plain label={tr('backAll', lang)} hover={{ bold: true }} onPress={() => void openOn($, '', true)} />
            </Box>
          )
          : <Text dimColor>{tr('allActivity', lang)}</Text>}
        {ordered.length === 0 ? <Text dimColor>{tr('before', lang)}</Text> : null}
        {ordered.map(r => {
          const story = notes[r.id]
          const showTech = tech.includes(r.id)
          return (
            <Box key={r.id} flexDirection="column">
              <Text bold {...(r.failed ? { color: 'red' } : {})}>{`${r.failed ? '✗' : '·'} ${r.label}${r.failed ? '  ' + tr('failed', lang) : ''}`}</Text>
              {story
                ? <Text>{story}</Text>
                : narrating.has(r.id)
                  ? <Text dimColor italic>{tr('explaining', lang)}</Text>
                  : (
                    <Box key={'explain-' + r.id}>
                      <Button key={'exp-' + r.id} plain dimColor label={tr('explain', lang)} hover={{ dimColor: false, bold: true, color: '#ffd84d' }} onPress={() => void narrate($, [r.id])} />
                    </Box>
                  )}
              {r.files.length ? <Text dimColor>{r.files.map(f => `✎ ${baseName(f.file)} +${f.added} −${f.removed}${f.verb ? ' ' + verbOf(f.verb, lang) : ''}`).join('   ')}</Text> : null}
              <Box key={'tech-' + r.id}>
                <Button key={'tog-' + r.id} plain dimColor label={showTech ? tr('hideTech', lang) : tr('showTech', lang)} hover={{ dimColor: false, bold: true }} onPress={() => void toggleTechnical($, r.id)} />
              </Box>
              {showTech ? (
                <Box key={'techbody-' + r.id} flexDirection="column">
                  {r.command ? <Code source={r.command} language="bash" /> : null}
                  {r.output ? <Text {...(r.failed ? { color: 'red' } : { dimColor: true })}>{r.output}</Text> : null}
                  {r.files.map(f => (
                    <Box key={r.id + f.file} flexDirection="column">
                      <Text>{`✎ ${baseName(f.file)} +${f.added} −${f.removed}${f.verb ? '  ' + verbOf(f.verb, lang) : ''}   ${f.file}`}</Text>
                      {f.diff ? <Code source={f.diff} format="diff" path={f.file} /> : null}
                    </Box>
                  ))}
                </Box>
              ) : null}
            </Box>
          )
        })}
      </Box>
    )
  })
}
