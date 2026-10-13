import { expect, test } from 'claude-code/testing'

import { changeTag, changesOf, groupSummary, labelOf } from './register'

const EDIT_OUT = {
  filePath: '/Users/x/report.md',
  structuredPatch: [{ oldStart: 3, oldLines: 2, newStart: 3, newLines: 3, lines: [' keep', '-old', '+new', '+added'] }],
}
const SHELL_OUT = {
  stdout: 'done', stderr: '', interrupted: false,
  bashEditDiff: { moreFiles: 0, files: [
    { filePath: '/a/register.tsx', hunks: [{ oldStart: 1, oldLines: 0, newStart: 1, newLines: 2, lines: ['+one', '+two'] }] },
    { filePath: '/a/config.json', deleted: true, hunks: [{ oldStart: 1, oldLines: 1, newStart: 0, newLines: 0, lines: ['-x'] }] },
  ] },
}

test('labels read like plain sentences', async () => {
  expect(labelOf('Bash', { command: 'cd /x && python3 -', description: 'Check the edit-row types' })).toBe('Check the edit-row types')
  expect(labelOf('Read', { file_path: '/a/b/report.md' })).toBe('Read report.md')
  expect(labelOf('mcp__claude_ai_Gmail__search', {})).toBe('Gmail: search')
})

test('file changes come from edits and from shell commands', async () => {
  expect(changeTag(changesOf('Edit', {}, EDIT_OUT))).toBe('  ✎ report.md +2 −1')
  expect(changeTag(changesOf('Bash', {}, SHELL_OUT))).toBe('  ✎ 2 files +2 −1')
})

const row = (tool: string, input: unknown, output: unknown, extra: Record<string, boolean> = {}) => ({
  tool_use_id: 'r1', tool, input, isRunning: false, isErrored: false, isInterrupted: false, output, ...extra,
})

test('every tool row is one quiet line, on every surface, and results are hidden', async $ => {
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'aios-chat-mode', surface, component: 'ToolUse', props: row('Bash', { command: 'python3 x.py', description: 'Fix the helper' }, SHELL_OUT) })
    expect(JSON.stringify(await ui.find({ key: 'act-r1' }))).toContain('· Fix the helper  ✎ 2 files +2 −1')
    await ui.unmount()
    const res = await $.ui.mount({ plugin: 'aios-chat-mode', surface, component: 'ToolResult', props: { tool_use_id: 'r1', tool: 'Bash', output: SHELL_OUT, isErrored: false } })
    expect(await res.find({ type: 'Text', text: /done/ })).toBeUndefined()
    await res.unmount()
  }
})

test('a failed call is one red line', async $ => {
  const ui = await $.ui.mount({ plugin: 'aios-chat-mode', surface: 'terminal', component: 'ToolUse', props: row('Edit', { file_path: '/a/mod-test.md' }, 'not found', { isErrored: true }) })
  expect(JSON.stringify(await ui.find({ key: 'act-r1' }))).toContain('Edit mod-test.md  failed')
  await ui.unmount()
})

test('clicking a line opens the activity pane', async ($, on) => {
  const opened: string[] = []
  on('ui.open', async (_$, e) => {
    opened.push(e.id)
    return { value: { isPlaced: true } }
  })
  const ui = await $.ui.mount({ plugin: 'aios-chat-mode', surface: 'terminal', component: 'ToolUse', props: row('Read', { file_path: '/a/x.md' }, { file: {} }) })
  await ui.press({ key: 'act-r1' })
  expect(opened).toEqual(['quiet-activity'])
  await ui.unmount()
})

test('a folded run is one clickable summary line', async $ => {
  const ui = await $.ui.mount({
    plugin: 'aios-chat-mode', surface: 'terminal', component: 'ToolGroup',
    props: { isActive: false, isExpanded: true, calls: [
      { tool_use_id: 'g1', tool: 'Bash', input: { description: 'One' }, isRunning: false, isErrored: false, isInterrupted: false },
      { tool_use_id: 'g2', tool: 'Bash', input: { description: 'Two' }, isRunning: false, isErrored: true, isInterrupted: false },
    ] },
  })
  expect(JSON.stringify(await ui.find({ key: 'grp-btn-g2' }))).toContain('· Ran 2 commands  · details')
  expect(JSON.stringify(await ui.find({ key: 'grp-err-btn-g2' }))).toContain('Two  failed')
  await ui.unmount()
})

test('after a click the pane shows only that step, with a way back', async ($, on) => {
  on('ui.open', async () => ({ value: { isPlaced: true } }))
  on('ui.scroll', async () => ({ value: {} }))
  on('clock.now', async () => ({ value: 1 }))
  on('tool.call', async () => ({ result: { stdout: 'hello', stderr: '', interrupted: false } }))
  await $.tool.call({ tool: 'Bash', command: 'echo hello', description: 'Say hello' } as any)
  await $.tool.call({ tool: 'Bash', command: 'echo other', description: 'Something else' } as any)
  const all = await $.ui.mount({ plugin: 'aios-chat-mode', surface: 'terminal', component: 'Pane', requestId: 'quiet-activity', props: { title: 'Activity', isFocused: true } } as any)
  expect(await all.find({ type: 'Text', text: /Say hello/ })).toBeDefined()
  expect(await all.find({ type: 'Text', text: /Something else/ })).toBeDefined()
  await all.unmount()
})

test('a clicked step gets a plain-words explanation, with technical details folded away', async ($, on) => {
  on('ui.open', async () => ({ value: { isPlaced: true } }))
  on('ui.scroll', async () => ({ value: {} }))
  on('clock.now', async () => ({ value: 1 }))
  on('model.fork', async () => ({ value: { isAnswered: true, text: 'Added a divider above the quickbar so it stands apart.', usage: {} } }))
  on('tool.call', async () => ({ result: { stdout: 'ok', stderr: '', interrupted: false } }))
  await $.tool.call({ tool: 'Bash', command: 'python3 fix.py', description: 'Add the divider' } as any)
  const row = await $.ui.mount({ plugin: 'aios-chat-mode', surface: 'terminal', component: 'ToolUse', props: { tool_use_id: 'toolu_x', tool: 'Bash', input: { command: 'python3 fix.py', description: 'Add the divider' }, isRunning: false, isErrored: false, isInterrupted: false, output: { stdout: 'ok', stderr: '' } } } as any)
  await row.unmount()
  const pane = await $.ui.mount({ plugin: 'aios-chat-mode', surface: 'terminal', component: 'Pane', requestId: 'quiet-activity', props: { title: 'Activity', isFocused: true } } as any)
  const first = JSON.stringify(await pane.find({ type: 'Button', label: /explain in plain words/ }))
  expect(first).toContain('explain')
  await pane.press({ key: first.match(/"key":"(exp-[^"]+)"/)![1] })
  expect(await pane.find({ type: 'Text', text: /Added a divider above the quickbar/ })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: /python3 fix.py/ })).toBeUndefined()
  await pane.unmount()
})

test('panel commands are not echoed into the chat; normal messages are', async ($, on) => {
  on('ui.render', { component: 'UserMessage' }, async (_$, e) => {
    const { Text } = _$.ui.resolve(e)
    return Text({ children: ['engine: ' + e.props.text] })
  })
  const a = await $.ui.mount({ plugin: 'aios-chat-mode', surface: 'terminal', component: 'UserMessage', props: { text: '/view /Users/x/AIOS/informe.md', origin: 'person', isExpanded: false } } as any)
  expect(await a.find({ type: 'Text', text: /engine:/ })).toBeUndefined()
  await a.unmount()
  const b = await $.ui.mount({ plugin: 'aios-chat-mode', surface: 'terminal', component: 'UserMessage', props: { text: 'view the report please', origin: 'person', isExpanded: false } } as any)
  expect(await b.find({ type: 'Text', text: /engine: view the report/ })).toBeDefined()
  await b.unmount()
})

test('Spanish: labels, group summary and tags speak Spanish', async () => {
  expect(labelOf('Read', { file_path: '/a/b/informe.md' }, 'es')).toBe('Leer informe.md')
  expect(labelOf('Grep', { pattern: 'x' }, 'es')).toBe('Buscar “x”')
  expect(changeTag(changesOf('Bash', {}, SHELL_OUT), 'es')).toBe('  ✎ 2 archivos +2 −1')
  expect(groupSummary([{ tool: 'Read', input: {} }, { tool: 'Bash', input: {} }, { tool: 'Bash', input: {} }], 'es')).toBe('Leyó 1 archivo, ejecutó 2 comandos')
})

test('Spanish: rows and pane use installed.json lang', async ($, on) => {
  on('session.cwd', async () => ({ value: '/Users/s' }))
  on('fs.read', async () => ({ value: '{"lang":"es"}' }))
  on('ui.open', async () => ({ value: { isPlaced: true } }))
  const ui = await $.ui.mount({ plugin: 'aios-chat-mode', surface: 'terminal', component: 'ToolUse', props: row('Read', { file_path: '/a/x.md' }, { file: {} }) })
  expect(JSON.stringify(await ui.find({ key: 'act-r1' }))).toContain('· Leer x.md')
  await ui.unmount()
})
