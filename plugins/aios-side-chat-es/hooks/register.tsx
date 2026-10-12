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

const messages = atom({ plugin: 'aios-side-chat-es', key: 'messages' } as const, [] as SideMessage[])
const busy = atom({ plugin: 'aios-side-chat-es', key: 'busy' } as const, false)

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
  await $.ui.open({ id: PANE, title: 'Chat al lado', focus: true, closeOnEscape: true })
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
  $.ui.toast('Enviado al chat principal')
}

async function clearAll($: EngineInterface) {
  await update($, messages, () => [])
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'side', description: 'Abrir el chat al lado: pregunta sobre esta conversación sin agregarle nada' })
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
    return (
      <Box flexDirection="column">
        <Box flexDirection="row" columnGap={2}>
          <Text bold color="#E86A33">CHAT AL LADO</Text>
          <Text dimColor>conoce el chat principal · no le agrega nada · Esc cierra</Text>
        </Box>
        <Text color="#3a4052">{'─'.repeat(Math.max(10, cols))}</Text>
        {list.length === 0 ? <Text dimColor>Pregunta lo que quieras sobre lo que estamos haciendo. El chat principal no lo verá.</Text> : null}
        {list.map((m, i) => {
          if (m.who === 'you') {
            return (
              <Box key={'m' + i} flexDirection="column" marginTop={i === 0 ? 0 : 1}>
                <Text bold color="#f5a35c">tú</Text>
                <Text>{M(m.text)}</Text>
              </Box>
            )
          }
          if (m.who === 'note') return <Box key={'m' + i} marginTop={1}><Text dimColor italic>{M(m.text)}</Text></Box>
          return (
            <Box key={'m' + i} flexDirection="column" marginTop={1}>
              <Text bold color="#5FB8A5">claude</Text>
              <Markdown key={'md' + i} text={M(m.text).slice(0, 10000)} />
              <Box key={'acts' + i}>
                <Button key={'send-' + i} plain dimColor label="enviar al chat principal ›" hover={{ dimColor: false, bold: true, color: '#ffd84d' }} onPress={() => void sendToMain($, i)} />
              </Box>
            </Box>
          )
        })}
        {thinking ? <Box marginTop={1}><Text dimColor italic>Claude está pensando…</Text></Box> : null}
        <Text color="#3a4052">{'─'.repeat(Math.max(10, cols))}</Text>
        <Input key="side-input" label="Pregunta" placeholder={thinking ? 'espera la respuesta…' : 'una pregunta sobre este chat'} value="" submitLabel="preguntar" autoFocus onSubmit={v => void ask($, v)} />
        {list.length > 0 ? (
          <Box key="clear-row">
            <Button key="clear" plain dimColor label="borrar el chat al lado" onPress={() => void clearAll($)} />
          </Box>
        ) : null}
      </Box>
    )
  })
}
