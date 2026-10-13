import type { Register } from 'claude-code'
import { MARK, extractSecrets, redactDeep } from './redact'

// aios-secret-filter: every tool result passes through here before Claude reads it. Secret values from
// your project's .env files, and anything shaped like a credential (API keys, tokens, private keys,
// passwords in key=value lines), become MARK in Claude's context and in the transcript.
// Writing MARK back into a file or command is refused, so a hidden read can never overwrite a real secret.

// Files in the working folder that hold values worth learning
const SOURCE_FILES = ['.claude/settings.json', '.claude/settings.local.json']
const SOURCE_PREFIX = '.env' // .env, .env.local, .env.production ...
const RELOAD_MS = 5 * 60_000
const WRITERS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit'])

let known: string[] = []
let loadedAt = 0

async function secrets($: any): Promise<string[]> {
  if (Date.now() - loadedAt < RELOAD_MS && known.length) return known
  const found = new Set<string>()
  let cwd = ''
  try { cwd = await $.session.cwd() } catch { return known } // no folder known: pattern matching still works
  const take = async (path: string) => {
    try {
      for (const s of extractSecrets(await $.fs.read(path))) found.add(s)
    } catch { /* missing or unreadable: skip */ }
  }
  let entries: any[] = []
  try { entries = await $.fs.list(cwd) } catch { /* no folder access: pattern matching still works */ }
  for (const f of entries)
    if (f.kind === 'file' && f.name.startsWith(SOURCE_PREFIX) && f.size < 1_000_000 && !/\.(example|sample|template)$/i.test(f.name)) await take(`${cwd}/${f.name}`)
  for (const f of SOURCE_FILES) await take(`${cwd}/${f}`)
  // longest first, so a secret that contains another is hidden whole
  known = [...found].sort((a, b) => b.length - a.length)
  loadedAt = Date.now()
  return known
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    loadedAt = 0
    await secrets($)
    return next(e)
  })

  on('tool.call', async ($, e: any, next) => {
    // never write the marker back: that would replace a real secret with the placeholder
    const isWriter = WRITERS.has(e.tool)
    if ((isWriter || e.tool === 'Bash') && JSON.stringify(e).includes(MARK))
      return { deny: `${$.plugin.name}: this ${e.tool} contains "${MARK}", a placeholder for a secret you were not shown. ` +
        `Writing it would destroy the real value. Edit around that line, or ask the person to enter the secret themselves.` }

    const ran: any = await next(e)
    if (ran.deny !== undefined || ran.result === undefined || isWriter) return ran

    const list = await secrets($)
    const red = redactDeep(ran.result, list)
    if (!red) return ran

    $.ui.status(`secret-filter hid ${red.hits} value${red.hits === 1 ? '' : 's'}`)
    return {
      result: red.value,
      ...(ran.isError ? { isError: true } : {}),
      context: [...(ran.context ?? []),
        `${$.plugin.name}: ${red.hits} secret value(s) in this ${e.tool} result were replaced with "${MARK}". ` +
        `Do not try to recover them, and never write the placeholder into a file or command.`],
    }
  })
}
