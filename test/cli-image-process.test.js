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
  assert.equal(output.processDiagnostics.frameCount, 2)
  assert.equal(output.processDiagnostics.initCount, 1)
  assert.equal(output.processDiagnostics.resultCount, 1)
  assert.equal(output.processDiagnostics.lastFrameClass, 'result')
  assert.equal(output.processDiagnostics.closeObserved, true)
  assert.equal(output.processDiagnostics.terminationInitiator, 'natural-close')
})

test('a resident CLI is drained and terminated after its one terminal result', async () => {
  const output = await run('resident')
  assert.ok(output.processDiagnostics.elapsedMs < 4000)
  assert.equal(collectStructuredResult(output.stdout, output).finalResultCount, 1)
  assert.equal(output.processDiagnostics.terminationInitiator, 'adapter-drain')
  assert.equal(output.processDiagnostics.closeObserved, true)
})

test('delayed duplicate results and frames after terminal are rejected', async () => {
  await assert.rejects(run('multiple'), error => error.code === 'STRUCTURED_OUTPUT_INVALID'
    && error.responseDiagnostics.finalResultCount === 2
    && error.processDiagnostics.streamReason === 'multiple-results'
    && error.processDiagnostics.resultCount === 2)
  await assert.rejects(run('post-result'), error => error.code === 'CLI_STREAM_INVALID'
    && error.processDiagnostics.streamReason === 'post-result-sequence'
    && error.processDiagnostics.firstFinalSeen === true)
})

test('malformed frames, missing terminal results, overflow and permission requests fail closed', async () => {
  for (const [mode, code, extra, expectedReason] of [
    ['invalid', 'CLI_STREAM_INVALID', {}, 'json-parse'],
    ['tail', 'CLI_STREAM_INVALID', {}, 'json-parse'],
    ['shape', 'CLI_STREAM_INVALID', {}, 'frame-shape'],
    ['duplicate-init', 'CLI_STREAM_INVALID', {}, 'duplicate-init'],
    ['result-before-init', 'CLI_STREAM_INVALID', {}, 'result-before-init'],
    ['post-result', 'CLI_STREAM_INVALID', {}, 'post-result-sequence'],
    ['overflow', 'CLI_OUTPUT_TOO_LARGE', { maxStdoutBytes: 1000 }, 'output-too-large'],
    ['nonzero', 'CLI_RESULT_MISSING', {}, 'nonzero-exit'],
    ['missing-init', 'CLI_RESULT_MISSING', {}, 'missing-init'],
    ['missing-result', 'CLI_RESULT_MISSING', {}, 'missing-result'],
    ['permission', 'CLI_PERMISSION_REQUIRED', {}, 'permission-frame'],
    ['notice', 'CLI_AUTH_REQUIRED', {}, 'missing-result']
  ]) {
    await assert.rejects(run(mode, extra), error => {
      assert.equal(error.code, code)
      assert.equal(error.processDiagnostics.streamReason, expectedReason)
      if (error.processDiagnostics.stdoutBytes > 0) assert.ok(error.processDiagnostics.frameCount > 0)
      return true
    })
  }
  await assert.rejects(run('string').then(output => parseStructuredResponse(collectStructuredResult(output.stdout, output).result, [])), { code: 'STRUCTURED_OUTPUT_INVALID' })
})

test('a malformed tail observed during natural close preserves the real exit code and does not re-terminate the child', async () => {
  await assert.rejects(run('close-bad-tail'), error => error.code === 'CLI_STREAM_INVALID'
    && error.processDiagnostics.closeObserved === true
    && error.processDiagnostics.exitCode === 7
    && error.processDiagnostics.streamReason === 'json-parse')
})

test('prototype-like unknown frame types remain classified as other', async () => {
  await assert.rejects(run('proto-type'), error => error.code === 'CLI_RESULT_MISSING'
    && error.processDiagnostics.lastFrameClass === 'other')
  await assert.rejects(run('assistant-shape'), error => error.code === 'CLI_STREAM_INVALID'
    && error.processDiagnostics.streamReason === 'frame-shape'
    && error.processDiagnostics.lastFrameClass === 'assistant')
})

test('CRLF, arbitrary UTF-8 data cuts, multiple records per chunk and valid unterminated tail are accepted', async () => {
  for (const mode of ['crlf', 'chunked', 'tail-valid']) {
    const output = await run(mode)
    assert.equal(collectStructuredResult(output.stdout, output).finalResultCount, 1)
    assert.equal(output.processDiagnostics.frameCount, 2)
    assert.equal(output.processDiagnostics.initCount, 1)
    assert.equal(output.processDiagnostics.resultCount, 1)
    assert.equal(output.processDiagnostics.closeObserved, true)
  }
})

test('stream authentication frames are classified without exposing their content', async () => {
  await assert.rejects(run('auth'), error => error.code === 'CLI_AUTH_REQUIRED'
    && error.responseDiagnostics.noticeClass === 'authentication'
    && error.responseDiagnostics.noticeSource === 'error-frame'
    && !error.message.includes('PRIVATE_SYNTHETIC_TOKEN'))
})

test('stream error frames classify fixed failures and hide private details before any following result', async () => {
  for (const [mode, code, secret] of [
    ['error-permission', 'CLI_LOCAL_PERMISSION_DENIED', 'PRIVATE_SYNTHETIC_PATH'],
    ['error-auth', 'CLI_AUTH_REQUIRED', 'PRIVATE_SYNTHETIC_AUTH'],
    ['error-context', 'CLI_CONTEXT_TOO_LARGE', 'PRIVATE_CONTEXT'],
    ['error-balance', 'CLI_INSUFFICIENT_BALANCE', 'PRIVATE_BALANCE'],
    ['error-generic', 'CLI_REQUEST_FAILED', 'PRIVATE_SYNTHETIC_UNKNOWN_ERROR']
  ]) {
    await assert.rejects(run(mode), error => {
      assert.equal(error.code, code)
      assert.equal(error.message.includes(secret), false)
      if (mode === 'error-context') assert.equal(error.failure.status, 400)
      if (mode === 'error-balance') assert.equal(error.failure.status, 402)
      assert.ok(error.processDiagnostics.stdoutBytes > 0)
      return true
    })
  }
})

test('image error frames and empty streams classify fixed network notices without leaking or accepting later plans', async () => {
  for (const mode of ['error-network', 'stderr-network']) await assert.rejects(run(mode), error => {
    assert.equal(error.code, 'CLI_NETWORK_ERROR')
    assert.equal(error.failure.code, error.code)
    assert.equal(error.message.includes('PRIVATE_NETWORK'), false)
    assert.equal(error.message.includes('private.invalid'), false)
    assert.ok(error.processDiagnostics.stdoutBytes + error.processDiagnostics.stderrBytes > 0)
    assert.equal(error.failure.status, undefined)
    assert.equal(Object.hasOwn(error, 'retry'), false)
    assert.equal(Object.hasOwn(error, 'retryable'), false)
    return true
  })
})

test('cancellation and the request deadline stop the image process without a usable result', async () => {
  const controller = new AbortController()
  const pending = run('hang', { signal: controller.signal })
  setTimeout(() => controller.abort(), 100)
  await assert.rejects(pending, error => error.code === 'ABORTED'
    && error.processDiagnostics.streamReason === 'cancelled'
    && error.processDiagnostics.terminationInitiator === 'external-cancel'
    && error.processDiagnostics.firstFinalSeen === false)
  await assert.rejects(run('hang', { timeoutMs: 100 }), error => error.code === 'CLI_TIMEOUT'
    && error.processDiagnostics.streamReason === 'deadline'
    && error.processDiagnostics.deadlineReached === true
    && error.processDiagnostics.terminationInitiator === 'deadline')
})
