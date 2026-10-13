import { test, expect } from 'claude-code/testing'

const MARK = '[hidden by secret-filter]'
const FAKE = 'a3c28411fakefakefake0a0bba783497692d8a7b8189c416e5'

test('a Bash result with a secret reaches the model hidden', async ($, on) => {
  on('tool.call', async () => ({
    result: { stdout: `s3_secret = ${FAKE}\nbucket = my-bucket\n`, stderr: '', interrupted: false, isImage: false },
  }) as any)
  const r: any = await $.tool.call({ tool: 'Bash', command: 'cat config' } as any)
  const out = JSON.stringify(r.result)
  expect(out).not.toContain(FAKE)
  expect(out).toContain(MARK)
  expect(out).toContain('my-bucket')
})

test('a clean result passes through untouched', async ($, on) => {
  on('tool.call', async () => ({ result: { stdout: 'queue empty\n', stderr: '', interrupted: false, isImage: false } }) as any)
  const r: any = await $.tool.call({ tool: 'Bash', command: 'ls' } as any)
  expect(r.result.stdout).toBe('queue empty\n')
})

test('writing the placeholder back into a file is refused', async ($, on) => {
  let wrote = false
  on('tool.call', async () => { wrote = true; return { result: {} } as any })
  const r: any = await $.tool.call({ tool: 'Write', file_path: '/tmp/x.json', content: `{"s3_secret": "${MARK}"}` } as any)
  expect(wrote).toBe(false)
  expect(r.isError === true || r.deny !== undefined).toBe(true)
})

test('a value from the project .env file is hidden even when it has no telling name', async ($, on) => {
  const VALUE = 'Zq81fakeXyPass4299'
  on('fs.list', () => ({ value: [{ name: '.env', kind: 'file', size: 40 }] }) as any)
  on('fs.read', () => ({ value: `DB_PASSWORD=${VALUE}\nPORT=3000\n` }) as any)
  on('tool.call', async () => ({ result: { stdout: `connecting with ${VALUE} to port 3000\n`, stderr: '', interrupted: false, isImage: false } }) as any)
  on('session.cwd', () => ({ value: '/work' }) as any)
  const r: any = await $.tool.call({ tool: 'Bash', command: 'run' } as any)
  expect(JSON.stringify(r.result)).not.toContain(VALUE)
  expect(JSON.stringify(r.result)).toContain('port 3000')
})
