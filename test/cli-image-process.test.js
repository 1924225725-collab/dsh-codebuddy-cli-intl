import test from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { runImageProcess } from '../lib/cli-image-process.js'
import { collectStructuredResult } from '../lib/cli-response.js'
import { parseStructuredResponse } from '../lib/model-response.js'

const fixture = fileURLToPath(new URL('./fixtures/fake-image-stream.cjs', import.meta.url))
const run = (mode, extra = {}) => runImageProcess(process.execPath, [fixture, mode], {
  input: '{"type":"user","message":{"role":"user","content":[{"type":"text","text":"synthetic"}]}}\n',
  timeoutMs: 5000,
  terminalDrainMs: 150,
  ...extra
})

test('JSONL accepts one native structured result and preserves text without synthetic deltas', async () => {
  const output = await run('valid')
  const raw = collectStructuredResult(output.stdout, output)
  const parsed = parseStructuredResponse(raw.result, [])
  assert.match(parsed.text, /图像测试完成 C:\\examples\\demo/u)
  assert.match(parsed.text, /\{"example":1\}/u)
  assert.deepEqual(parsed.calls, [])
  assert.equal(output.processDiagnostics.exitCode, 0)
})

test('a resident CLI is drained and terminated after its one terminal result', async () => {
  const output = await run('resident')
  assert.ok(output.processDiagnostics.elapsedMs < 4000)
  assert.equal(collectStructuredResult(output.stdout, output).finalResultCount, 1)
})

test('delayed duplicate results and frames after terminal are rejected', async () => {
  await assert.rejects(run('multiple'), error => error.code === 'STRUCTURED_OUTPUT_INVALID' && error.responseDiagnostics.finalResultCount === 2)
  await assert.rejects(run('post-result'), { code: 'CLI_STREAM_INVALID' })
})

test('malformed frames, missing terminal results, overflow and permission requests fail closed', async () => {
  for (const [mode, code, extra] of [
    ['invalid', 'CLI_STREAM_INVALID', {}],
    ['tail', 'CLI_STREAM_INVALID', {}],
    ['overflow', 'CLI_OUTPUT_TOO_LARGE', { maxStdoutBytes: 1000 }],
    ['nonzero', 'CLI_RESULT_MISSING', {}],
    ['permission', 'CLI_PERMISSION_REQUIRED', {}],
    ['notice', 'CLI_AUTH_REQUIRED', {}]
  ]) {
    await assert.rejects(run(mode, extra), error => error.code === code && error.processDiagnostics.stdoutBytes > 0)
  }
  await assert.rejects(run('string').then(output => parseStructuredResponse(collectStructuredResult(output.stdout, output).result, [])), { code: 'STRUCTURED_OUTPUT_INVALID' })
})

test('stream authentication frames are classified without exposing their content', async () => {
  await assert.rejects(run('auth'), error => error.code === 'CLI_AUTH_REQUIRED'
    && !error.message.includes('PRIVATE_SYNTHETIC_TOKEN'))
})

test('stream error frames classify fixed failures and hide private details before any following result', async () => {
  for (const [mode, code, secret] of [
    ['error-permission', 'CLI_LOCAL_PERMISSION_DENIED', 'PRIVATE_SYNTHETIC_PATH'],
    ['error-auth', 'CLI_AUTH_REQUIRED', 'PRIVATE_SYNTHETIC_AUTH'],
    ['error-generic', 'CLI_REQUEST_FAILED', 'PRIVATE_SYNTHETIC_UNKNOWN_ERROR']
  ]) {
    await assert.rejects(run(mode), error => {
      assert.equal(error.code, code)
      assert.equal(error.message.includes(secret), false)
      assert.ok(error.processDiagnostics.stdoutBytes > 0)
      return true
    })
  }
})

test('cancellation and the request deadline stop the image process without a usable result', async () => {
  const controller = new AbortController()
  const pending = run('hang', { signal: controller.signal })
  setTimeout(() => controller.abort(), 100)
  await assert.rejects(pending, { code: 'ABORTED' })
  await assert.rejects(run('hang', { timeoutMs: 100 }), { code: 'CLI_TIMEOUT' })
})
