import test from 'node:test'
import assert from 'node:assert/strict'
import { makeImageStreamInput, makeRequest, MODEL_SYSTEM_PROMPT, inlineImageDataUriStats, assertInlineImageDataUriBudget, MAX_INLINE_IMAGE_DATA_URI_CHARS } from '../lib/request.js'

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

test('image requests use one native JSONL user turn and bound the combined prompt and image bytes', () => {
  const prompt = '{"protocol":"dsh-codebuddy-model/v1"}'
  const nativeImages = [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AQID' } }]
  const { input, bytes } = makeImageStreamInput(prompt, nativeImages)
  const [line, ...extra] = input.trim().split('\n')
  assert.deepEqual(extra, [])
  assert.equal(bytes, Buffer.byteLength(input))
  assert.deepEqual(JSON.parse(line), { type: 'user', session_id: '', parent_tool_use_id: null, message: { role: 'user', content: [{ type: 'text', text: prompt }, ...nativeImages] } })
  assert.throws(() => makeImageStreamInput(prompt, []), { code: 'CLI_STREAM_INPUT_INVALID' })
})

test('inline image data URIs have an aggregate character budget and diagnostics retain only counts', () => {
  const marker = 'PRIVATE_INLINE_IMAGE_MARKER'
  const prefix = 'data:image/png;base64,'
  const perUriChars = MAX_INLINE_IMAGE_DATA_URI_CHARS / 2
  const uri = `${prefix}${'A'.repeat(perUriChars - prefix.length)}`
  const messages = [{ role: 'user', content: [{ type: 'text', text: marker }, { type: 'text', text: uri }, { type: 'text', text: uri }] }]
  const stats = inlineImageDataUriStats(messages)
  assert.deepEqual(stats, { inlineImageDataUriCount: 2, inlineImageDataUriChars: uri.length * 2 })
  const request = makeRequest({ messages }, [], undefined, stats)
  assert.equal(request.diagnostics.inlineImageDataUriCount, 2)
  assert.equal(request.diagnostics.inlineImageDataUriChars, uri.length * 2)
  assert.equal(JSON.stringify(request.diagnostics).includes(marker), false)
  assert.doesNotThrow(() => assertInlineImageDataUriBudget({ inlineImageDataUriChars: MAX_INLINE_IMAGE_DATA_URI_CHARS }))
  assert.throws(() => assertInlineImageDataUriBudget({ inlineImageDataUriChars: MAX_INLINE_IMAGE_DATA_URI_CHARS + 1 }), error => {
    assert.equal(error.code, 'IMAGE_DATA_URI_TOO_LARGE')
    assert.match(error.message, /未提交本轮模型请求/u)
    assert.equal(error.failure.requestId, undefined)
    return true
  })
})
