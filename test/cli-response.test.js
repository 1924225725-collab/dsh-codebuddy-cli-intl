import test from 'node:test'
import assert from 'node:assert/strict'
import { collectResult, collectStructuredResult, CodeBuddyCliError } from '../lib/cli-response.js'

test('reads a structured result from the documented single-object response', () => {
  const response = collectResult(JSON.stringify({
    structured_output: { text: 'hello', toolCalls: [] },
    usage: { input_tokens: 12, output_tokens: 3 }
  }))

  assert.deepEqual(response, {
    result: { text: 'hello', toolCalls: [] },
    usage: { input_tokens: 12, output_tokens: 3 }
  })
})

test('reads the final result from a JSON message array', () => {
  const response = collectResult(JSON.stringify([
    { type: 'system', subtype: 'init' },
    { type: 'assistant', message: { content: 'working' } },
    {
      type: 'result',
      subtype: 'success',
      structured_output: { text: 'done', toolCalls: [] },
      usage: { input_tokens: 20, output_tokens: 5 }
    }
  ]))

  assert.deepEqual(response, {
    result: { text: 'done', toolCalls: [] },
    usage: { input_tokens: 20, output_tokens: 5 }
  })
})

test('preserves CLI failures inside a JSON message array', () => {
  assert.throws(
    () => collectResult(JSON.stringify([{ type: 'result', subtype: 'error_during_execution', is_error: true }])),
    (error) => error instanceof CodeBuddyCliError && error.code === 'CLI_REQUEST_FAILED'
  )
})

test('reports an array without a final result instead of silently choosing a message', () => {
  assert.throws(
    () => collectResult(JSON.stringify([{ type: 'assistant', message: { content: 'not final' } }])),
    (error) => error instanceof CodeBuddyCliError && error.code === 'CLI_OUTPUT_INVALID'
  )
})

test('preserves per-model counters for success and failure without summing assistant snapshots', () => {
  const usage = { input_tokens: 74, cache_creation_input_tokens: 74 }
  const modelUsage = { model: { inputTokens: 0, outputTokens: 29, cacheCreationInputTokens: 74 } }
  const response = collectResult(JSON.stringify([{ type: 'assistant', usage }, { type: 'result', result: 'ok', usage, modelUsage }]))
  assert.deepEqual(response.modelUsage, modelUsage)
  assert.throws(() => collectResult(JSON.stringify({ type: 'result', subtype: 'error', usage, modelUsage })), (error) => {
    assert.deepEqual(error.modelUsage, modelUsage)
    return true
  })
})

test('recognizes authentication notices even with empty stdout and exit 0 without exposing raw notices', () => {
  const processDiagnostics = { timeoutMs: 10000, elapsedMs: 2500, stdoutBytes: 0, stderrBytes: 200, exitCode: 0, token: 'PRIVATE_TOKEN' }
  for (const stderr of ['401 Authentication required. Please use /login (PRIVATE_TOKEN)', '\u001b[31m401 Unauthorized, sign in again\u001b[0m PRIVATE_TOKEN']) {
    assert.throws(() => collectResult('', { stderr, processDiagnostics }), error => {
      assert.equal(error.code, 'CLI_AUTH_REQUIRED')
      assert.match(error.message, /\/login/u)
      assert.equal(error.processDiagnostics.exitCode, 0)
      assert.equal(error.processDiagnostics.stdoutBytes, 0)
      assert.equal(JSON.stringify(error).includes('PRIVATE_TOKEN'), false)
      assert.equal(error.message.includes('PRIVATE_TOKEN'), false)
      return true
    })
  }
  const valid = JSON.stringify({ result: 'valid reply' })
  assert.equal(collectResult(valid, { stderr: '401 Authentication required from an earlier recovered attempt' }).result, 'valid reply')
})

test('classifies fixed CLI notices and distinguishes empty from non-JSON output without retaining bodies', () => {
  for (const [stdout, stderr, code] of [
    ['', '', 'CLI_OUTPUT_INVALID'], ['PRIVATE_NON_JSON', '', 'CLI_OUTPUT_INVALID'],
    ['', '403 Forbidden: access denied PRIVATE_TOKEN', 'CLI_ACCESS_DENIED'],
    ['', '429 Too many requests PRIVATE_TOKEN', 'CLI_RATE_LIMITED'],
    ['', "EPERM: operation not permitted, mkdir 'PRIVATE_PATH'", 'CLI_LOCAL_PERMISSION_DENIED'],
    ['', 'A model quoted an example 401 Authentication required', 'CLI_OUTPUT_INVALID']
  ]) {
    assert.throws(() => collectResult(stdout, { stderr }), error => {
      assert.equal(error.code, code)
      assert.equal(error.message.includes('PRIVATE'), false)
      assert.equal(JSON.stringify(error).includes('PRIVATE'), false)
      return true
    })
  }
  assert.throws(() => collectResult(''), error => error.message.includes('标准输出为空'))
  assert.throws(() => collectResult('plain'), error => error.message.includes('非 JSON'))
})

test('empty stdout plus a known reset or TLS notice is a private network failure even with exit zero', () => {
  const processDiagnostics = { timeoutMs: 120000, elapsedMs: 4567, stdoutBytes: 0, stderrBytes: 128, exitCode: 0, secret: 'PRIVATE_TOKEN' }
  for (const stderr of [
    'Error: read ECONNRESET PRIVATE_TOKEN https://private.invalid/secret',
    'ECONNRESET: connection reset PRIVATE_TOKEN',
    'Error: Client network socket disconnected before secure TLS connection was established PRIVATE_TOKEN',
    'Error: 502 安全连接建立失败：可能被代理拦截（Client network socket disconnected before secure TLS connection was established） PRIVATE_TOKEN',
    '\u001b[31mAPI Error: 502 安全连接建立失败 PRIVATE_TOKEN\u001b[0m'
  ]) assert.throws(() => collectStructuredResult('', { stderr, processDiagnostics }), error => {
    assert.equal(error.code, 'CLI_NETWORK_ERROR')
    assert.equal(error.failure.code, error.code)
    assert.deepEqual(error.processDiagnostics, { timeoutMs: 120000, elapsedMs: 4567, stdoutBytes: 0, stderrBytes: 128, exitCode: 0 })
    assert.equal(JSON.stringify(error).includes('PRIVATE'), false)
    assert.equal(error.message.includes('private.invalid'), false)
    assert.equal(error.failure.status, undefined)
    assert.equal(Object.hasOwn(error, 'retry'), false)
    assert.equal(Object.hasOwn(error, 'retryable'), false)
    return true
  })
  for (const [stderr, code] of [
    ['Error: read ECONNRESET PRIVATE_NETWORK\n401 Authentication required PRIVATE_AUTH', 'CLI_AUTH_REQUIRED'],
    ['Error: connect ECONNRESET PRIVATE_NETWORK\nEACCES: permission denied PRIVATE_PATH', 'CLI_LOCAL_PERMISSION_DENIED']
  ]) assert.throws(() => collectStructuredResult('', { stderr }), error => error.code === code)
})

test('network words in valid results or quoted examples never override successful native output or generic failures', () => {
  const structured_output = { text: 'Example: Error: read ECONNRESET', toolCalls: [] }
  assert.deepEqual(collectStructuredResult(JSON.stringify({ type: 'result', structured_output }), {
    stderr: 'Error: read ECONNRESET from an earlier recovered attempt'
  }).result, structured_output)
  for (const stderr of [
    '', 'Unknown failure PRIVATE_TOKEN', 'A model quoted Error: read ECONNRESET',
    'The example says Client network socket disconnected before secure TLS connection was established',
    '502 unrelated PRIVATE_TOKEN'
  ]) assert.throws(() => collectStructuredResult('', { stderr }), error =>
    error.code === 'CLI_OUTPUT_INVALID' && !error.message.includes('PRIVATE'))
})

test('carries immutable DSH-compatible failure facts with a diagnostic ID instead of UNKNOWN', () => {
  const requestId = '9f68b497-ec6a-4cdf-ad81-c2c5384d0583'
  const error = new CodeBuddyCliError('CLI_AUTH_REQUIRED', 'Synthetic authentication failure', { requestId })
  assert.equal(Object.getOwnPropertyDescriptor(error, 'code').value, 'CLI_AUTH_REQUIRED')
  assert.equal(Object.getOwnPropertyDescriptor(error, 'failure').value.code, error.code)
  assert.equal(error.failure.requestId, requestId)
  assert.equal(error.failure.status, 401)
  assert.equal(error.failure.message, error.message)
  assert.ok(error.message.includes(requestId))
  assert.ok(Object.isFrozen(error.failure))
  const offload = new CodeBuddyCliError('IMAGE_OFFLOAD_REQUIRED', 'Need DSH image offload', { requestId, offloadImages: 2 })
  assert.equal(offload.failure.offloadImages, 2)
  assert.equal(new CodeBuddyCliError('CLI_TIMEOUT', 'timeout', { offloadImages: 2 }).failure.offloadImages, undefined)
  assert.equal(new CodeBuddyCliError('CLI_TIMEOUT', 'timeout').failure.code, 'CLI_TIMEOUT')
})

test('native collection requires the official structured_output field and exactly one final result', () => {
  const value = { text: 'Example: {"text":"literal"}', toolCalls: [] }
  const response = collectStructuredResult(JSON.stringify({ type: 'result', structured_output: value, result: 'must not replace native output' }))
  assert.deepEqual(response.result, value)
  assert.equal(response.finalResultCount, 1)
  for (const document of [
    { type: 'result', result: JSON.stringify(value), usage: { input_tokens: 9 } },
    { type: 'result', structured_output: null, result: JSON.stringify(value) }
  ]) {
    assert.throws(() => collectStructuredResult(JSON.stringify(document)), error => {
      assert.equal(error.code, 'CLI_STRUCTURED_OUTPUT_MISSING')
      assert.equal(error.usage.input_tokens, document.usage?.input_tokens)
      assert.equal(error.responseDiagnostics.outputMode, 'native-json-schema')
      assert.equal(Object.keys(error).includes('rawResult'), false)
      return true
    })
  }
  const final = { type: 'result', structured_output: value }
  for (const output of [[], [{ type: 'assistant', structured_output: value }], [final, final], [final, { ...final, structured_output: { text: 'different', toolCalls: [] } }]]) {
    assert.throws(() => collectStructuredResult(JSON.stringify(output)), error => {
      assert.equal(error.code, 'STRUCTURED_OUTPUT_INVALID')
      assert.equal(error.responseDiagnostics.reason, 'native-final-results')
      assert.equal(error.responseDiagnostics.outputMode, 'native-json-schema')
      return true
    })
  }
  assert.throws(() => collectStructuredResult(JSON.stringify({ ...final, is_error: true, subtype: 'error_max_turns', usage: { output_tokens: 5 } })), error => {
    assert.equal(error.code, 'CLI_REQUEST_FAILED')
    assert.equal(error.usage.output_tokens, 5)
    return true
  })
})
