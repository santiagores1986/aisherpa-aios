import { expect, test } from 'claude-code/testing'

const band = async ($: any, on: any) => {
  on('ui.render', { component: 'AbovePrompt' }, async (_$: any, e: any) => {
    const { Box } = _$.ui.resolve(e)
    return Box({})
  })
}

test('the side chat button runs the side command even when the command list leaves it out', async ($, on) => {
  await band($, on)
  on('store.get', async () => ({ value: undefined }))
  on('command.list', async () => ({ value: [] }))
  const ran: string[] = [], sent: string[] = []
  on('command.run', async (_$: any, e: any) => { ran.push(e.command); return { text: '' } })
  on('prompt.submit', async (_$: any, e: any) => { sent.push(e.text); return { drop: 'test' } })
  const ui = await $.ui.mount({ plugin: 'aios-quickbar-es', surface: 'terminal', component: 'AbovePrompt', props: {} } as any)
  await ui.press({ key: 'qbtn-side' })
  expect(ran).toEqual(['side'])
  expect(sent).toEqual([])
  await ui.unmount()
})

test('a plain button still sends its text as typed', async ($, on) => {
  await band($, on)
  on('store.get', async () => ({ value: undefined }))
  const sent: string[] = []
  on('prompt.submit', async (_$: any, e: any) => { sent.push(e.text); return { drop: 'test' } })
  const ui = await $.ui.mount({ plugin: 'aios-quickbar-es', surface: 'terminal', component: 'AbovePrompt', props: {} } as any)
  await ui.press({ key: 'qbtn-go' })
  expect(sent.length).toBe(1)
  await ui.unmount()
})
