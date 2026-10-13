import { test, expect } from 'claude-code/testing'
import { MARK, extractSecrets, redactText } from './redact'

// Fake values only, shaped like the real ones. Never put a real secret in this file.
const FAKE_ID = 'bd69a0926fakeid41c709831aef50d6e8'
const FAKE_SECRET = 'q8Lm2Xz7fakeSecretValue91Rt'

test('a printed dict with a key id and a secret: both hidden, the rest kept', () => {
  const printed = `{'s3_endpoint': 'https://abc.example.com', 's3_key_id': '${FAKE_ID}', ` +
    `'s3_secret': '${FAKE_SECRET}', 'bucket': 'my-bucket', 'workdir': '/home/ana/jobs'}`
  const { text, hits } = redactText(printed, [])
  expect(text).not.toContain(FAKE_SECRET)
  expect(text).not.toContain(FAKE_ID)
  expect(text).toContain('my-bucket')
  expect(text).toContain('/home/ana/jobs')
  expect(hits).toBe(2)
})

test('known values are hidden wherever they appear, even unnamed', () => {
  const { text } = redactText(`curl -H "x: ${FAKE_SECRET}" and again ${FAKE_SECRET}`, [FAKE_SECRET])
  expect(text).not.toContain(FAKE_SECRET)
  expect(text.split(MARK).length - 1).toBe(2)
})

test('credential shapes need no list', () => {
  const samples = [
    'sk-ant-api03-' + 'x'.repeat(40),
    'ghp_' + 'A1'.repeat(18),
    '1234567890:AA' + 'b'.repeat(33),
    'AKIA' + 'ABCDEFGHIJKLMNOP',
    '-----BEGIN RSA PRIVATE KEY-----\nMIIfake\n-----END RSA PRIVATE KEY-----',
  ]
  for (const s of samples) {
    const { text, hits } = redactText(`value: ${s} end`, [])
    expect(text).not.toContain(s)
    expect(hits).toBeGreaterThan(0)
  }
})

test('ordinary text and commands are left alone', () => {
  const plain = [
    'ls -la /Users/ana/Documents',
    'git status',
    'Meeting notes: the token economy of the project, see page 4',
    'password: hunter',
  ]
  for (const p of plain) expect(redactText(p, []).text).toBe(p)
})

test('extract: a .env file gives its secret values, not ports or names', () => {
  const env = 'DB_PASSWORD=Zq81fakeXyPass42\nPORT=3000\nAPP_NAME=myapp\nAPI_KEY=k2Lfake93PqAbCdEf77'
  const got = extractSecrets(env)
  expect(got).toContain('Zq81fakeXyPass42')
  expect(got).toContain('k2Lfake93PqAbCdEf77')
  expect(got).not.toContain('3000')
  expect(got).not.toContain('myapp')
})

test('extract: JSON config, secret-named strings at any depth', () => {
  const j = JSON.stringify({ name: 'demo', env: { SERVICE_TOKEN: 'tok_fakeValue8812abc' }, count: 12345678 })
  const got = extractSecrets(j)
  expect(got).toContain('tok_fakeValue8812abc')
  expect(got).not.toContain('demo')
})

test('redacting twice does not touch the placeholder', () => {
  const once = redactText(`api_key=${FAKE_SECRET}`, []).text
  expect(redactText(once, []).text).toBe(once)
})
