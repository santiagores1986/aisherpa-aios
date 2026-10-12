import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { EffortChoice, EffortLevel, QuickButton } from '../types'

// Quickbar (AIOS by AI Sherpa): buttons above the prompt for the routines you use most.
// One click sends, as if typed.
// "＋" opens a pane to add, rename or delete buttons; they persist across sessions.
// A second row picks the effort level for this chat (auto, low ... max).
// No digit hotkeys: on the band they fire when a lone digit is typed, which would
// collide with answering "1" or "2" to a question.

const EDIT_PANE = 'quickbar-edit'
const STORE_KEY = 'buttons'

const DEFAULTS: QuickButton[] = [
  { id: 'go', label: '✓ Go ahead', text: 'go ahead' },
  { id: 'retry', label: '↻ Try again', text: 'try again' },
  { id: 'bro', label: 'Bro', text: '/aios:bro' },
  { id: 'close', label: 'Close', text: '/aios:close' },
  { id: 'newproject', label: 'New project', text: '/aios:new-project' },
  { id: 'remember', label: 'Remember', text: '/aios:remember' },
  { id: 'think', label: 'Think', text: '/aios:think' },
  { id: 'broken', label: "It's broken", text: '/aios:its-broken' },
]

const buttons = atom({ plugin: 'aios-quickbar', key: 'buttons' } as const, DEFAULTS)
const draftLabel = atom({ plugin: 'aios-quickbar', key: 'draftLabel' } as const, '')
const draftText = atom({ plugin: 'aios-quickbar', key: 'draftText' } as const, '')

// Effort row: a second line of buttons that sets how hard the model thinks, this chat only.
// 'auto' leaves Claude Code's own setting alone; any other choice rewrites the effort of
// every main-loop request (subagents keep theirs). Session state, so a new chat starts on auto.
const EFFORT_LEVELS: EffortLevel[] = ['low', 'medium', 'high', 'xhigh', 'max']
const effortChoice = atom({ plugin: 'aios-quickbar', key: 'effortChoice' } as const, 'auto' as EffortChoice)
// What Claude Code itself asked for on the last request, before any override, for the auto label
const sessionEffort = atom({ plugin: 'aios-quickbar', key: 'sessionEffort' } as const, '')

// Send a button's text: a slash command runs as a command when Claude Code knows it,
// otherwise the text goes in as if you typed it
async function send($: EngineInterface, text: string) {
  const m = /^\/([\w:-]+)\s*(.*)$/.exec(text.trim())
  if (m) {
    try {
      const known = (await $.command.list()).some((c: { name: string }) => c.name === m[1])
      if (known) {
        await $.command.run({ command: m[1], args: m[2] })
        return
      }
    } catch { /* fall through to typing it */ }
  }
  await $.prompt.submit({ text, asUser: true })
}

async function save($: EngineInterface, list: QuickButton[]) {
  await update($, buttons, () => list)
  await $.store.set(STORE_KEY, list)
}

async function load($: EngineInterface) {
  const saved = await $.store.get(STORE_KEY)
  if (Array.isArray(saved) && saved.length > 0) await update($, buttons, () => saved as QuickButton[])
}

async function openEditor($: EngineInterface) {
  await $.ui.open({ id: EDIT_PANE, title: 'Quickbar', focus: true, closeOnEscape: true })
}

async function addButton($: EngineInterface) {
  const label = (await read($, draftLabel)).trim()
  const text = (await read($, draftText)).trim()
  if (!label || !text) {
    $.ui.toast('A button needs a label and the text it sends')
    return
  }
  const list = await read($, buttons)
  await save($, [...list, { id: 'b' + (await $.clock.now()).toString(36), label, text }])
  await update($, draftLabel, () => '')
  await update($, draftText, () => '')
}

async function removeButton($: EngineInterface, id: string) {
  const list = await read($, buttons)
  await save($, list.filter(b => b.id !== id))
}

async function moveButton($: EngineInterface, id: string, dir: -1 | 1) {
  const list = [...(await read($, buttons))]
  const i = list.findIndex(b => b.id === id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= list.length) return
  ;[list[i], list[j]] = [list[j], list[i]]
  await save($, list)
}

async function setEffort($: EngineInterface, choice: EffortChoice) {
  await update($, effortChoice, () => choice)
  $.ui.toast(choice === 'auto' ? 'Effort back to auto (Claude Code\'s setting)' : `Effort set to ${choice} for this chat, from the next message`)
}

async function resetDefaults($: EngineInterface) {
  await save($, DEFAULTS)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'quickbar', description: 'Edit the quickbar buttons above the prompt' })
    await load($)
    return next(e)
  })

  // /clear, /resume and /branch reset session state: load the saved buttons again
  on('classic.SessionStart', { source: ['clear', 'resume', 'fork'] }, async ($, e, next) => {
    await load($)
    return next(e)
  })

  // Apply the chosen effort to each main-loop request; turn.step streams, so a generator
  on('turn.step', async function* ($, e, next) {
    if (e.agentId === undefined && typeof e.effort === 'string') {
      if ((await read($, sessionEffort)) !== e.effort) await update($, sessionEffort, () => e.effort as string)
      const choice = await read($, effortChoice)
      if (choice !== 'auto' && choice !== e.effort) return yield* next({ ...e, effort: choice })
    }
    return yield* next(e)
  })

  on('command.run', { command: 'quickbar' }, async $ => {
    await openEditor($)
    return {}
  })

  // The bar itself, under whatever other mods draw in the band
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const theirs = await next(e)
    // Always the saved list, so edits made elsewhere (another chat, the store file) show up
    let saved: unknown
    try { saved = await $.store.get(STORE_KEY) } catch { saved = undefined }
    const list = Array.isArray(saved) && saved.length > 0 ? (saved as QuickButton[]) : await read($, buttons)
    const choice = await read($, effortChoice)
    const seen = await read($, sessionEffort)
    const { Box, Button, Text } = $.ui.resolve(e)
    // Breathing room: a dim divider above the bar, set apart from the chat
    const cols = (e.props as { bodyColumns?: number }).bodyColumns ?? 100
    return (
      <Box flexDirection="column">
        {theirs}
        <Text color="#3a4052">{'─'.repeat(Math.max(10, cols))}</Text>
        <Box key="quickbar-row" flexDirection="row" columnGap={2}>
          {list.map(b => (
            <Box key={'qb-' + b.id} backgroundColor="#3a4052">
              <Button key={'qbtn-' + b.id} plain label={` ${b.label} `} hover={{ bold: true, color: '#ffd84d', backgroundColor: '#5a4712' }} onPress={() => void send($, b.text)} />
            </Box>
          ))}
          <Box key="qb-add">
            <Button key="qbtn-edit" plain dimColor label="＋" hover={{ dimColor: false, bold: true }} onPress={() => void openEditor($)} />
          </Box>
        </Box>
        <Text key="effort-div" color="#3a4052">{'─'.repeat(Math.max(10, cols))}</Text>
        <Box key="effort-row" flexDirection="row" columnGap={2}>
          <Text dimColor>Effort</Text>
          {(['auto', ...EFFORT_LEVELS] as EffortChoice[]).map(level => {
            const active = level === choice
            const label = level === 'auto' && seen ? `auto (${seen})` : level
            return (
              <Box key={'ef-' + level} backgroundColor={active ? '#5a4712' : undefined}>
                <Button key={'eff-' + level} plain dimColor={!active} label={` ${active ? '● ' : ''}${label} `} hover={{ dimColor: false, bold: true, color: '#ffd84d' }} onPress={() => void setEffort($, level)} />
              </Box>
            )
          })}
        </Box>
      </Box>
    )
  })

  // The editor: each button with ↑ ↓ ✕, then two fields and Add
  on('ui.render', { component: 'Pane', requestId: EDIT_PANE }, async ($, e) => {
    const { Box, Text, Button, Input } = $.ui.resolve(e)
    const list = await read($, buttons)
    const label = await read($, draftLabel)
    const text = await read($, draftText)
    return (
      <Box flexDirection="column" gap={1}>
        <Text bold color="#f5a35c">QUICKBAR</Text>
        <Box flexDirection="column">
          {list.map(b => (
            <Box key={'row-' + b.id} flexDirection="row" columnGap={2}>
              <Button key={'up-' + b.id} plain dimColor label="↑" onPress={() => void moveButton($, b.id, -1)} />
              <Button key={'down-' + b.id} plain dimColor label="↓" onPress={() => void moveButton($, b.id, 1)} />
              <Button key={'del-' + b.id} plain label="✕" hover={{ color: '#ff5f6d', bold: true }} onPress={() => void removeButton($, b.id)} />
              <Text bold>{b.label}</Text>
              <Text dimColor>sends “{b.text}”</Text>
            </Box>
          ))}
        </Box>
        <Text dimColor>Add a button: a short label, then the text it sends (a /command works too).</Text>
        <Input key="new-label" label="Label" placeholder="e.g. Prep call" value={label} onInput={v => void update($, draftLabel, () => v)} onSubmit={v => void update($, draftLabel, () => v)} />
        <Input key="new-text" label="Sends" placeholder="e.g. prep my next call" value={text} onInput={v => void update($, draftText, () => v)} onSubmit={() => void addButton($)} submitLabel="add" />
        <Box flexDirection="row" columnGap={3}>
          <Button key="add" label="Add button" onPress={() => void addButton($)} />
          <Button key="reset" plain dimColor label="reset to defaults" onPress={() => void resetDefaults($)} />
        </Box>
        <Text dimColor>Esc closes.</Text>
      </Box>
    )
  })
}
