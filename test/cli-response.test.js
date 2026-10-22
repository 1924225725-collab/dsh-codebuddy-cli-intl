import test from 'node:test'
import assert from 'node:assert/strict'
import { collectResult, CodeBuddyCliError } from '../lib/cli-response.js'

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
