import { expect, test } from 'claude-code/testing'

import { blocksOf, linkify, spansOf, withRowDividers } from './register'

const DOC = `---
title: x
---
# Research report

Intro paragraph with **bold**.

| Finding | Label |
|---|---|
| Tables render | Current |

## Details

![Diagram](img/arch.png)

\`\`\`ts
const a = 1
\`\`\`
`

test('a document splits into coloured headings, Markdown runs and code', async () => {
  const b = blocksOf(DOC, '/Users/x/docs')
  expect(b.map(x => x.kind)).toEqual(['heading', 'md', 'heading', 'md', 'code'])
  expect(b[1].kind === 'md' && b[1].text.includes('| Tables render | Current |')).toBe(true)
  expect(b[3].kind === 'md' && b[3].text).toContain('[🖼 Diagram (open)](file:///Users/x/docs/img/arch.png)')
  expect(JSON.stringify(b)).not.toContain('title: x')
})

test('/view opens the pane and draws headings, the table and code on every surface', async ($, on) => {
  on('ui.open', async () => ({ value: { isPlaced: true } }))
  on('ui.scroll', async () => ({ value: {} }))
  on('fs.read', async () => ({ value: DOC }))
  on('session.cwd', async () => ({ value: '/Users/x/docs' }))
  await $.command.run({ command: 'view', args: 'report.md' })
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'aios-md-view', surface, component: 'Pane', requestId: 'md-view', props: { title: 'report.md', isFocused: true } } as any)
    expect(await ui.find({ type: 'Text', text: /RESEARCH REPORT/ })).toBeDefined()
    expect(JSON.stringify(await ui.find({ key: 'md1' }))).toContain('| Tables render | Current |')
    await ui.unmount()
  }
})

test('documents written in the chat appear in the strip above the prompt', async ($, on) => {
  on('clock.now', async () => ({ value: 1 }))
  on('tool.call', async () => ({ result: { filePath: '/a/report.md', type: 'create', content: '# x', structuredPatch: [] } }))
  on('ui.render', { component: 'AbovePrompt' }, async (_$, e) => {
    const { Box } = _$.ui.resolve(e)
    return Box({})
  })
  await $.tool.call({ tool: 'Write', file_path: '/a/report.md', content: '# x' } as any)
  const ui = await $.ui.mount({ plugin: 'aios-md-view', surface: 'terminal', component: 'AbovePrompt', props: {} } as any)
  expect(JSON.stringify(await ui.find({ key: 'open-/a/report.md' }))).toContain('report.md')
  await ui.unmount()
})


test('file paths in a reply become links, code blocks and web links left alone', async () => {
  const r = linkify('Open `~/AIOS/work/outputs/report.md` or /Users/s/a.pdf, not `npm test`.\n```\n`~/x.md`\n```', '/Users/s', '/Users/s')
  expect(r.count).toBe(2)
  expect(r.text).toContain('[📄 report.md](file:///Users/s/AIOS/work/outputs/report.md)')
  expect(r.text).toContain('[📎 a.pdf](file:///Users/s/a.pdf)')
  expect(r.text).toContain('`npm test`')
  expect(r.text).toContain('```\n`~/x.md`\n```')
})

test('a reply with a file path draws as linked Markdown; one without is left alone', async ($, on) => {
  on('session.cwd', async () => ({ value: '/Users/s' }))
  on('ui.render', { component: 'AssistantMessage' }, async (_$, e) => {
    const { Text } = _$.ui.resolve(e)
    return Text({ children: ['engine: ' + e.props.text] })
  })
  const a = await $.ui.mount({ plugin: 'aios-md-view', surface: 'terminal', component: 'AssistantMessage', props: { text: 'Saved to `~/AIOS/work/outputs/report.md`.', isFirstOfReply: true } } as any)
  expect(JSON.stringify(await a.find({ key: 'reply-links' }))).toContain('file:///Users/s/AIOS/work/outputs/report.md')
  await a.unmount()
  const b = await $.ui.mount({ plugin: 'aios-md-view', surface: 'terminal', component: 'AssistantMessage', props: { text: 'No paths here.', isFirstOfReply: true } } as any)
  expect(await b.find({ type: 'Text', text: /engine: No paths here/ })).toBeDefined()
  await b.unmount()
})


test('Glow colours become spans; padding at the end is dropped', async () => {
  const sp = spansOf('\x1b[94;1m## Summary\x1b[0m\x1b[37m    \x1b[0m')
  expect(sp).toEqual([{ text: '## Summary', fg: '#9cc0ff', bold: true }])
})

test('the pane draws Glow output when Glow is there', async ($, on) => {
  on('ui.open', async () => ({ value: { isPlaced: true } }))
  on('ui.scroll', async () => ({ value: {} }))
  on('fs.read', async () => ({ value: '# Hi' }))
  on('fs.stat', async () => ({ value: { mtimeMs: 5, size: 4, kind: 'file' } }))
  on('session.cwd', async () => ({ value: '/Users/x' }))
  on('process.run', async () => ({ value: { exitCode: 0, stdout: '\x1b[93;104;1m Hi \x1b[0m\n\n\x1b[37mbody text\x1b[0m', stderr: '' } }))
  await $.command.run({ command: 'view', args: '/Users/x/a.md' })
  const ui = await $.ui.mount({ plugin: 'aios-md-view', surface: 'terminal', component: 'Pane', requestId: 'md-view', props: { title: 'a.md', isFocused: true, bodyColumns: 80 } } as any)
  expect(await ui.find({ type: 'Text', text: /body text/ })).toBeDefined()
  await ui.unmount()
})


test('table rows get a divider between them', async () => {
  const out = withRowDividers([' # │ A', '───┼───', ' 1 │ x', '   │ y', ' 2 │ z', 'after'])
  expect(out).toEqual([' # │ A', '───┼───', ' 1 │ x', '   │ y', '\x1b[90m───┼───\x1b[0m', ' 2 │ z', 'after'])
})

test('no Documents section when the chat only touched memory notes', async ($, on) => {
  on('clock.now', async () => ({ value: 1 }))
  on('tool.call', async () => ({ result: { filePath: '/Users/s/AIOS/memory/notes.md', type: 'update', content: '', structuredPatch: [] } }))
  on('ui.render', { component: 'AbovePrompt' }, async (_$, e) => {
    const { Text } = _$.ui.resolve(e)
    return Text({ children: ['quickbar here'] })
  })
  await $.tool.call({ tool: 'Write', file_path: '/Users/s/AIOS/memory/notes.md', content: '' } as any)
  const ui = await $.ui.mount({ plugin: 'aios-md-view', surface: 'terminal', component: 'AbovePrompt', props: {} } as any)
  expect(await ui.find({ type: 'Text', text: /DOCUMENTS/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /quickbar here/ })).toBeDefined()
  await ui.unmount()
})


test('Spanish: strip, picker and hint speak Spanish when installed.json says es', async ($, on) => {
  on('clock.now', async () => ({ value: 1 }))
  on('session.cwd', async () => ({ value: '/Users/s' }))
  on('fs.read', async () => ({ value: '{"lang":"es"}' }))
  on('tool.call', async () => ({ result: { filePath: '/a/informe.md', type: 'create', content: '# x', structuredPatch: [] } }))
  on('ui.render', { component: 'AbovePrompt' }, async (_$, e) => {
    const { Box } = _$.ui.resolve(e)
    return Box({})
  })
  await $.tool.call({ tool: 'Write', file_path: '/a/informe.md', content: '# x' } as any)
  const ui = await $.ui.mount({ plugin: 'aios-md-view', surface: 'terminal', component: 'AbovePrompt', props: {} } as any)
  expect(await ui.find({ type: 'Text', text: /DOCUMENTOS/ })).toBeDefined()
  await ui.unmount()
})

test('without Glow the pane shows the document and says once to install Glow', async ($, on) => {
  on('ui.open', async () => ({ value: { isPlaced: true } }))
  on('ui.scroll', async () => ({ value: {} }))
  on('fs.read', async () => ({ value: '# Hola\n\ntexto' }))
  on('fs.stat', async () => { throw new Error('ENOENT') })
  on('session.cwd', async () => ({ value: '/Users/x' }))
  on('process.run', async () => ({ value: { exitCode: 1, stdout: '', stderr: '' } }))
  await $.command.run({ command: 'view', args: '/Users/x/a.md' })
  const ui = await $.ui.mount({ plugin: 'aios-md-view', surface: 'terminal', component: 'Pane', requestId: 'md-view', props: { title: 'a.md', isFocused: true, bodyColumns: 80 } } as any)
  expect(await ui.find({ type: 'Text', text: /HOLA/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Install Glow for nicer documents|Instala Glow/ })).toBeDefined()
  await ui.unmount()
})
