import test from 'node:test'
import assert from 'node:assert/strict'
import { makeRequest } from '../lib/request.js'

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
