import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { SideMessage } from '../types'

// Side chat: ask about the main conversation in a pane, without adding to it.
// Each question is answered by a fork of the main thread ($.model.fork): the model
// sees the whole conversation up to Claude's last reply (served from the prompt cache),
// tools are denied, and nothing enters the main transcript. Earlier side questions
// travel in the prompt, so the side chat remembers its own back-and-forth.

const PANE = 'side-chat'
const MAX_KEPT = 30
const HISTORY_CHARS = 6000

const messages = atom({ plugin: 'aios-side-chat', key: 'messages' } as const, [] as SideMessage[])
const busy = atom({ plugin: 'aios-side-chat', key: 'busy' } as const, false)

// The assistant's own name, from the AIOS folder (context/assistant.md "Name: X" or contexto/asistente.md
// "Nombre: X"); 'claude' until the client has chosen one.
async function assistantName($: EngineInterface): Promise<string> {
  const parts = (await $.session.cwd()).split('/')
  const home = parts[1] === 'Users' && parts[2] ? '/Users/' + parts[2] : ''
  for (const f of ['/AIOS/context/assistant.md', '/AIOS/contexto/asistente.md']) {
    try {
      const m = (await $.fs.read(home + f)).match(/^\*{0,2}(?:Name|Nombre)\*{0,2}:\*{0,2}\s*(.+)$/m)
      const n = m?.[1].replace(/\*/g, '').trim()
      if (n && !/not chosen|sin elegir|\{\{/i.test(n)) return n.toLowerCase()
    } catch { /* not an AIOS folder */ }
  }
  return 'claude'
}

export const buildPrompt = (history: SideMessage[], question: string) => {
  const earlier = history
    .filter(m => m.who !== 'note')
    .map(m => (m.who === 'you' ? 'User: ' : 'You: ') + m.text)
    .join('\n\n')
    .slice(-HISTORY_CHARS)
  return [
    'SIDE CHAT. The user is asking a quick side question about this conversation in a separate panel.',
    'Answer from what is already in the conversation. You cannot use tools here, so do not start work or promise to.',
    'Keep it short and plain: a few sentences, no jargon, as one human to another. If the question needs real work, say so in one line.',
    earlier ? `\nEarlier in this side chat:\n${earlier}` : '',
    `\nThe user's question: ${question}`,
  ].join('\n')
}

async function open($: EngineInterface) {
  await $.ui.open({ id: PANE, title: 'Side chat', focus: true, closeOnEscape: true })
}

async function ask($: EngineInterface, question: string) {
  const q = question.trim()
  if (!q || (await read($, busy))) return
  const history = await read($, messages)
  await update($, messages, list => [...list, { who: 'you' as const, text: q }].slice(-MAX_KEPT))
  await update($, busy, () => true)
  let answer: SideMessage
  try {
    const r = await $.model.fork({ prompt: buildPrompt(history, q) })
    if (r.isAnswered) answer = { who: 'claude', text: r.text.trim() }
    else if (r.reason === 'nothing-to-fork') answer = { who: 'note', text: 'Nothing to ask about yet: the main chat needs at least one reply first.' }
    else answer = { who: 'note', text: `No answer (${r.reason}). Try again.` }
  } catch (err) {
    answer = { who: 'note', text: `No answer: ${err instanceof Error ? err.message : String(err)}` }
  }
  await update($, messages, list => [...list, answer].slice(-MAX_KEPT))
  await update($, busy, () => false)
  try { await $.ui.scroll({ in: PANE, to: 'end' }) } catch { /* nothing to scroll */ }
}

// Pass a side answer (with its question) into the main chat as real work
async function sendToMain($: EngineInterface, index: number) {
  const list = await read($, messages)
  const a = list[index]
  const q = [...list.slice(0, index)].reverse().find(m => m.who === 'you')
  if (!a) return
  const text = `From my side chat: I asked: "${q?.text ?? ''}" and you answered: "${a.text}". Let's act on this.`
  await $.prompt.submit({ text, asUser: true })
  $.ui.toast('Sent to the main chat')
}

async function clearAll($: EngineInterface) {
  await update($, messages, () => [])
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'side', description: 'Open the side chat: ask about this conversation without adding to it' })
    return next(e)
  })

  on('command.run', { command: 'side' }, async ($, e) => {
    await open($)
    const q = (e.args ?? '').trim()
    if (q) void ask($, q)
    return {}
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button, Input, Markdown } = $.ui.resolve(e)
    const list = await read($, messages)
    const thinking = await read($, busy)
    const M = (t: string) => t
    const cols = (e.props as { bodyColumns?: number }).bodyColumns ?? 60
    const who = await assistantName($)
    return (
      <Box flexDirection="column">
        <Box flexDirection="row" columnGap={2}>
          <Text bold color="#E86A33">SIDE CHAT</Text>
          <Text dimColor>knows the main chat · doesn't add to it · Esc closes</Text>
        </Box>
        <Text color="#3a4052">{'─'.repeat(Math.max(10, cols))}</Text>
        {list.length === 0 ? <Text dimColor>Ask anything about what we're doing. The main chat won't see it.</Text> : null}
        {list.map((m, i) => {
          if (m.who === 'you') {
            return (
              <Box key={'m' + i} flexDirection="column" marginTop={i === 0 ? 0 : 1}>
                <Text bold color="#f5a35c">you</Text>
                <Text>{M(m.text)}</Text>
              </Box>
            )
          }
          if (m.who === 'note') return <Box key={'m' + i} marginTop={1}><Text dimColor italic>{M(m.text)}</Text></Box>
          return (
            <Box key={'m' + i} flexDirection="column" marginTop={1}>
              <Text bold color="#5FB8A5">{who}</Text>
              <Markdown key={'md' + i} text={M(m.text).slice(0, 10000)} />
              <Box key={'acts' + i}>
                <Button key={'send-' + i} plain dimColor label="send to main chat ›" hover={{ dimColor: false, bold: true, color: '#ffd84d' }} onPress={() => void sendToMain($, i)} />
              </Box>
            </Box>
          )
        })}
        {thinking ? <Box marginTop={1}><Text dimColor italic>Claude is thinking…</Text></Box> : null}
        <Text color="#3a4052">{'─'.repeat(Math.max(10, cols))}</Text>
        <Input key="side-input" label="Ask" placeholder={thinking ? 'wait for the answer…' : 'a question about this chat'} value="" submitLabel="ask" autoFocus onSubmit={v => void ask($, v)} />
        {list.length > 0 ? (
          <Box key="clear-row">
            <Button key="clear" plain dimColor label="clear side chat" onPress={() => void clearAll($)} />
          </Box>
        ) : null}
      </Box>
    )
  })
}
