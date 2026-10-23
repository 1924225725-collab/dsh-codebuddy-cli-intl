import test from 'node:test'
import assert from 'node:assert/strict'
import { makeRequest, MODEL_SYSTEM_PROMPT } from '../lib/request.js'

test('sends active schemas once, preserves history and reports sizes without retaining prompt contents in diagnostics', () => {
  const tools = [{ name: 'read_file', description: 'UNIQUE_SCHEMA_MARKER', parameters: { type: 'object', properties: {} } }]
  const messages = [{ role: 'system', content: 'DSH system' }, { role: 'user', content: 'private conversation' }, { role: 'assistant', content: [{ type: 'text', text: 'earlier reply' }] }, { role: 'user', content: 'continue' }]
  const { prompt, diagnostics } = makeRequest({ messages, tools, toolHistory: { tools, updates: [] } }, tools)
  assert.equal(prompt.split('UNIQUE_SCHEMA_MARKER').length - 1, 1)
  const envelope = JSON.parse(prompt.slice(prompt.indexOf('{"protocol"')))
  assert.deepEqual(envelope.messages, messages)
  assert.equal('toolHistory' in envelope, false)
  assert.equal(diagnostics.messageCount, 4)
  assert.equal(diagnostics.toolCount, 1)
  assert.equal(diagnostics.promptBytes, Buffer.byteLength(prompt))
  assert.ok(Object.values(diagnostics).every((value) => typeof value === 'number'))
})

test('preserves tool failure flags and instructs the model to honor DSH file and permission checks', () => {
  const messages = [{ role: 'tool', toolCallId: 'failed', content: [{ type: 'text', text: 'Operation declined' }], isError: true },
    { role: 'tool', toolCallId: 'done', content: [{ type: 'text', text: 'Operation completed' }], isError: false }]
  const request = makeRequest({ messages }, [])
  const envelope = JSON.parse(request.prompt.slice(request.prompt.indexOf('{"protocol"')))
  assert.deepEqual(envelope.messages, messages)
  assert.ok(MODEL_SYSTEM_PROMPT.includes('isError=true'))
  assert.ok(MODEL_SYSTEM_PROMPT.includes('read-before-edit'))
})
