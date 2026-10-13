import { test, expect } from 'claude-code/testing'

const BAD = 'La decision de este proyecto es importante para todos los equipos que trabajan con nosotros. ' +
  'Hay una descripcion clara de la situacion, pero tambien falta la informacion sobre el diseno y el codigo. ' +
  'Por eso la reunion de la proxima semana tiene una agenda con los puntos que ya conocemos de la pagina anterior.'

test('a Write of Spanish without accents is refused, in Spanish when lang is es', async ($, on) => {
  let wrote = false
  on('session.cwd', () => ({ value: '/Users/ana/work' }) as any)
  on('fs.read', () => ({ value: '{"lang":"es"}' }) as any)
  on('tool.call', async () => { wrote = true; return { result: {} } as any })
  const r: any = await $.tool.call({ tool: 'Write', file_path: '/work/a.md', content: BAD } as any)
  expect(wrote).toBe(false)
  expect(JSON.stringify(r)).toContain('Corrige todas las tildes')
})

test('English text is written untouched', async ($, on) => {
  let wrote = false
  on('tool.call', async () => { wrote = true; return { result: {} } as any })
  await $.tool.call({ tool: 'Write', file_path: '/work/a.md', content: 'The decision is made and we move on with the plan. '.repeat(10) } as any)
  expect(wrote).toBe(true)
})
