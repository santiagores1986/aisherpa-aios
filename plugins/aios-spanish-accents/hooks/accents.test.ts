import { test, expect } from 'claude-code/testing'
import { findMissingAccents, isClearlySpanish, refusal } from './accents'

const BAD = 'La decision de este proyecto es importante para todos los equipos que trabajan con nosotros. ' +
  'Hay una descripcion clara de la situacion, pero tambien falta la informacion sobre el diseno y el codigo. ' +
  'Por eso la reunion de la proxima semana tiene una agenda con los puntos que ya conocemos de la pagina anterior.'
const GOOD = 'La decisión de este proyecto es importante para todos los equipos que trabajan con nosotros. ' +
  'Hay una descripción clara de la situación, pero también falta la información sobre el diseño y el código. ' +
  'Por eso la reunión de la próxima semana tiene una agenda con los puntos que ya conocemos de la página anterior.'
const ENGLISH = 'The decision for this project is important for all the teams that work with us. ' +
  'There is a clear description of the situation, but the information about the design and the code is missing. ' +
  'That is why the meeting next week has an agenda with the points we already know from the previous page, in Mexico.'

test('a Spanish paragraph missing accents is found and refused', () => {
  expect(isClearlySpanish(BAD)).toBe(true)
  const found = findMissingAccents(BAD)
  const words = found.map(v => v.word.toLowerCase())
  for (const w of ['decision', 'descripcion', 'situacion', 'tambien', 'informacion', 'diseno', 'codigo', 'reunion', 'pagina']) expect(words).toContain(w)
  expect(refusal(found, 'en')).toContain('decision → decisión')
  expect(refusal(found, 'en')).toContain('Fix every accent')
})

test('the corrected paragraph passes', () => {
  expect(isClearlySpanish(GOOD)).toBe(true)
  expect(findMissingAccents(GOOD)).toEqual([])
})

test('an English paragraph passes, even with words that exist in Spanish', () => {
  expect(isClearlySpanish(ENGLISH)).toBe(false)
  expect(findMissingAccents(ENGLISH)).toEqual([])
})

test('short Spanish text is not judged', () => {
  expect(isClearlySpanish('La decision es de ellos para que lo sepan')).toBe(false)
})

test('an English line inside a Spanish document is not flagged', () => {
  const doc = BAD + '\nThe decision was made in Mexico last week.\n'
  const lines = findMissingAccents(doc).map(v => v.line)
  expect(lines).not.toContain(2)
})

test('the refusal speaks Spanish when asked', () => {
  const msg = refusal(findMissingAccents(BAD), 'es')
  expect(msg).toContain('Corrige todas las tildes')
  expect(msg).toContain('sin tilde')
})

test('a capitalised word keeps its capital, and a longer word is not cut', () => {
  expect(findMissingAccents('Decision tomada, pero esta es la que cuenta para todos.')[0].correct).toBe('Decisión')
  expect(findMissingAccents('Las Travesías que tiene este viaje son para todos y cada uno.')).toEqual([])
})
