import { expect, test } from 'claude-code/testing'

const band = async ($: any, on: any) => {
  on('ui.render', { component: 'AbovePrompt' }, async (_$: any, e: any) => {
    const { Box } = _$.ui.resolve(e)
    return Box({})
  })
}

test('an old saved Side chat button is left out: the side chat draws its own', async ($, on) => {
  await band($, on)
  on('store.get', async () => ({ value: [{ id: 'side', label: 'Side', text: '/side' }, { id: 'go', label: 'Go', text: 'go' }] }))
  const ui = await $.ui.mount({ plugin: 'aios-quickbar', surface: 'terminal', component: 'AbovePrompt', props: {} } as any)
  expect(await ui.find({ key: 'qbtn-side' })).toBeFalsy()
  expect(JSON.stringify(await ui.find({ key: 'qbtn-go' }))).toContain('Go')
  await ui.unmount()
})

test('a plain button still sends its text as typed', async ($, on) => {
  await band($, on)
  on('store.get', async () => ({ value: undefined }))
  const sent: string[] = []
  on('prompt.submit', async (_$: any, e: any) => { sent.push(e.text); return { drop: 'test' } })
  const ui = await $.ui.mount({ plugin: 'aios-quickbar', surface: 'terminal', component: 'AbovePrompt', props: {} } as any)
  await ui.press({ key: 'qbtn-go' })
  expect(sent.length).toBe(1)
  await ui.unmount()
})

test('after /clear the saved buttons still draw, with no classic hook (sec-default owns those on client Macs)', async ($, on) => {
  await band($, on)
  on('store.get', async () => ({ value: [{ id: 'mine', label: 'Mine', text: 'my routine' }] }))
  on('classic.SessionStart', async () => ({}))
  await $.classic.SessionStart({ source: 'clear' } as any)
  const ui = await $.ui.mount({ plugin: 'aios-quickbar', surface: 'terminal', component: 'AbovePrompt', props: {} } as any)
  expect(JSON.stringify(await ui.find({ key: 'qbtn-mine' }))).toContain('Mine')
  await ui.unmount()
})
