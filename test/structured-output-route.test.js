import test from 'node:test'
import assert from 'node:assert/strict'
import { collectStructuredResult, CodeBuddyCliError } from '../lib/cli-response.js'
import { parseStructuredResponse } from '../lib/model-response.js'

const tool = { name: 'read_test', parameters: { type: 'object', properties: { path: { type: 'string' } } } }
const plan = (path) => ({ text: '', toolCalls: [{ name: tool.name, arguments: { path } }] })
const result = (structured_output, extra = {}) => ({ type: 'result', subtype: 'success', structured_output, ...extra })

test('uses the official structured_output object even when a separate human-readable result exists', () => {
  const response = collectStructuredResult(JSON.stringify(result(plan('one.txt'), { result: 'human readable CLI summary' })))
  const parsed = parseStructuredResponse(response.result, [tool])
  assert.equal(parsed.calls.length, 1)
  assert.deepEqual(JSON.parse(parsed.calls[0].arguments), { path: 'one.txt' })
})

test('rejects a missing structured_output instead of falling back to a valid-looking result string', () => {
  const stdout = JSON.stringify(result(undefined, { result: JSON.stringify(plan('must-not-be-used.txt')) }))
  assert.throws(() => collectStructuredResult(stdout), error => error instanceof CodeBuddyCliError
    && error.code === 'CLI_STRUCTURED_OUTPUT_MISSING')
})

test('rejects multiple final records even when identical; repeated calls inside one plan remain intact', () => {
  const repeatedPlan = { text: '', toolCalls: [
    { name: tool.name, arguments: { path: 'same.txt' } },
    { name: tool.name, arguments: { path: 'same.txt' } }
  ] }
  assert.throws(() => collectStructuredResult(JSON.stringify([result(repeatedPlan), result(repeatedPlan)])), error => error instanceof CodeBuddyCliError
    && error.code === 'STRUCTURED_OUTPUT_INVALID' && error.responseDiagnostics.reason === 'native-final-results'
    && error.responseDiagnostics.finalResultCount === 2)
  const parsed = parseStructuredResponse(repeatedPlan, [tool])
  assert.equal(parsed.calls.length, 2)
  assert.deepEqual(parsed.calls.map(call => JSON.parse(call.arguments)), [{ path: 'same.txt' }, { path: 'same.txt' }])
})

test('treats CLI failure as failure even if structured_output is present', () => {
  assert.throws(() => collectStructuredResult(JSON.stringify({
    ...result(plan('ignored.txt')),
    is_error: true,
    subtype: 'error_during_execution'
  })), error => error instanceof CodeBuddyCliError && error.code === 'CLI_REQUEST_FAILED')
})
