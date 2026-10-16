import type { EngineInterface, Register } from 'claude-code'
import { findMissingAccents, isClearlySpanish, refusal, type Lang } from './accents'

// aios-spanish-accents: a Write or Edit whose text is clearly Spanish is refused, with the list of words to fix,
// when common words lack their accent. English text, and mixed documents' English lines, are never touched.
// The message to Claude follows the "lang" in ~/.aios/installed.json (en by default).

let LANG: Lang | null = null

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

async function check($: EngineInterface, e: any, next: (e: any) => Promise<any>): Promise<any> {
  const text = e.tool === 'Write' ? String(e.content ?? '') : String(e.new_string ?? '')
  if (!isClearlySpanish(text)) return next(e)
  const found = findMissingAccents(text)
  if (found.length === 0) return next(e)
  $.ui.log('aios-spanish-accents: refused a write with missing accents')
  return { deny: refusal(found, await langOf($)) }
}

export const register: Register = on => {
  on('tool.call', { tool: 'Write' } as any, check as any)
  on('tool.call', { tool: 'Edit' } as any, check as any)
}
