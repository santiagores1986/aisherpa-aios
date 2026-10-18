import { expect, test } from 'claude-code/testing'

test('the side chat button above the prompt opens the pane from its own press', async ($, on) => {
  on('ui.render', { component: 'AbovePrompt' }, async (_$: any, e: any) => { const { Box } = _$.ui.resolve(e); return Box({}) })
  const opened: string[] = []
  on('ui.open', async (_$: any, e: any) => { opened.push(e.id); return { value: { isPlaced: true } } })
  const ui = await $.ui.mount({ plugin: 'aios-side-chat-es', surface: 'terminal', component: 'AbovePrompt', props: {} } as any)
  await ui.press({ key: 'side-open' })
  expect(opened).toEqual(['side-chat'])
  await ui.unmount()
})
