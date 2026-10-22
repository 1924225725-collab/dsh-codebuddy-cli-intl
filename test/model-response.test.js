import test from 'node:test'
import assert from 'node:assert/strict'
import { parseModelResponse } from '../lib/model-response.js'

const envelope = { text: 'hello', toolCalls: [] }
const tool = { name: 'edit_demo' }
const toolEnvelope = { text: '', toolCalls: [{ name: tool.name, arguments: { content: 'quoted "text"\nC:\\demo\\file.txt { [ ] }' } }] }

test('accepts exact envelopes and complete wrappers without changing reply or tool arguments', () => {
  const json = JSON.stringify(toolEnvelope)
  for (const result of [toolEnvelope, json, `\uFEFF${json}`, `\n\`\`\`json\n${json}\n\`\`\`\n`, JSON.stringify(json), { data: toolEnvelope }, { result: json }, [toolEnvelope], `模型结果如下：\n${json}\n以上为结果。`]) {
    const parsed = parseModelResponse(result, [tool])
    assert.equal(parsed.text, toolEnvelope.text)
    assert.deepEqual(JSON.parse(parsed.calls[0].arguments), toolEnvelope.toolCalls[0].arguments)
    assert.equal(parsed.responseDiagnostics.reason, 'valid')
  }
})

test('normalizes only unambiguous text-only and nonempty tool-only envelopes', () => {
  assert.deepEqual(parseModelResponse({ text: 'hello' }).calls, [])
  for (const value of [{ toolCalls: toolEnvelope.toolCalls }, { text: null, toolCalls: toolEnvelope.toolCalls }]) {
    const parsed = parseModelResponse(value, [tool])
    assert.equal(parsed.text, '')
    assert.equal(parsed.calls.length, 1)
  }
  for (const value of [{ toolCalls: [] }, { text: null, toolCalls: [] }, { text: 'hello', tool_calls: [toolEnvelope.toolCalls[0]] }]) {
    assert.throws(() => parseModelResponse(value, [tool]), (error) => error.code === 'STRUCTURED_OUTPUT_INVALID')
  }
})

test('decodes complete string arguments but rejects truncated or non-object arguments', () => {
  const value = { ...toolEnvelope, toolCalls: [{ name: tool.name, arguments: JSON.stringify({ content: 'ok' }) }] }
  assert.deepEqual(JSON.parse(parseModelResponse(value, [tool]).calls[0].arguments), { content: 'ok' })
  for (const args of ['{"content":"unfinished', '[]', 'null', '42', [], null]) {
    assert.throws(() => parseModelResponse({ text: '', toolCalls: [{ name: tool.name, arguments: args }] }, [tool]), (error) => error.code === 'TOOL_CALL_INVALID')
  }
})

test('never selects between multiple results, repairs incomplete JSON or accepts unknown tools', () => {
  const json = JSON.stringify(toolEnvelope)
  for (const value of [json + '\n' + json, 'prefix\n' + json + '\n{"text":', json + '}', json.slice(0, -1), '```json\n' + json.slice(0, -1), '[{"text":"ok","toolCalls":[]},', '{"text":"C:\\demo\\test","toolCalls":[]}', JSON.stringify({ text: 'hello', toolCalls: [] }).slice(0, -4)]) {
    assert.throws(() => parseModelResponse(value, [tool]), (error) => error.code === 'STRUCTURED_OUTPUT_INVALID')
  }
  assert.throws(() => parseModelResponse(toolEnvelope, []), (error) => error.code === 'TOOL_CALL_INVALID' && error.responseDiagnostics.reason === 'unknown-tool')
  assert.throws(() => parseModelResponse([envelope, envelope]), (error) => error.responseDiagnostics.reason === 'invalid-envelope')
})

test('diagnostics distinguish empty, syntax and shape failures without including response content or keys', () => {
  const secret = 'PRIVATE_CONTENT_NEVER_LOG'
  const cases = [['', 'empty-result'], ['not json ' + secret, 'invalid-json'], ['{"text":"' + secret, 'possibly-truncated-json'], [{ [secret]: secret }, 'invalid-text-field'], [{ text: secret, toolCalls: '[]' }, 'invalid-tool-calls-field']]
  for (const [value, reason] of cases) {
    assert.throws(() => parseModelResponse(value), (error) => {
      assert.equal(error.responseDiagnostics.reason, reason)
      assert.equal(JSON.stringify(error.responseDiagnostics).includes(secret), false)
      assert.equal(error.message.includes(secret), false)
      return true
    })
  }
})

test('large complete replies and multiline tool content pass without truncation', () => {
  const content = '长文本 "quoted" C:\\demo\\path\n{[content]}\n'.repeat(40000)
  const parsed = parseModelResponse(JSON.stringify({ text: content, toolCalls: [{ name: tool.name, arguments: { content } }] }), [tool])
  assert.equal(parsed.text, content)
  assert.equal(JSON.parse(parsed.calls[0].arguments).content, content)
})
