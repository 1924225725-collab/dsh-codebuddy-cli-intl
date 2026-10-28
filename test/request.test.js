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

test('makes the current StructuredOutput submission and historical DSH tool events unambiguous', () => {
  const request = makeRequest({ messages: [
    { role: 'assistant', content: [{ type: 'tool-call', id: 'past', name: 'read_file', arguments: '{}' }] },
    { role: 'tool', toolCallId: 'past', content: 'already returned result', isError: false }
  ] }, [{ name: 'read_file', parameters: { type: 'object', properties: {} } }], { type: 'object' })
  const envelope = JSON.parse(request.prompt.slice(request.prompt.indexOf('{"protocol"')))
  assert.equal(envelope.submission.nativeTool, 'StructuredOutput')
  assert.match(envelope.submission.rule, /历史中的提交不算本次提交/u)
  assert.match(envelope.submission.rule, /历史 tool-call 是 DSH 数据/u)
  assert.match(envelope.submission.rule, /tool 消息是 DSH 已返回的执行结果/u)
  assert.match(envelope.submission.rule, /这些提案尚未执行/u)
  assert.match(MODEL_SYSTEM_PROMPT, /fresh transport submission/u)
  assert.match(MODEL_SYSTEM_PROMPT, /historical tool-call blocks are DSH data/u)
  assert.deepEqual(envelope.messages[1], { role: 'tool', toolCallId: 'past', content: 'already returned result', isError: false })
  assert.deepEqual(envelope.responseSchema, { type: 'object' })
})

test('measures the complete UTF-8 envelope before rejecting and reports a fixed local limit fact', () => {
  const limit = 12 * 1024 * 1024
  const base = makeRequest({ messages: [{ role: 'user', content: '' }] }, [], { type: 'object' })
  const padding = limit - Buffer.byteLength(base.prompt)
  const boundary = makeRequest({ messages: [{ role: 'user', content: 'A'.repeat(padding) }] }, [], { type: 'object' })
  assert.equal(boundary.diagnostics.promptBytes, limit)
  assert.equal(boundary.diagnostics.schemaBytes, Buffer.byteLength(JSON.stringify({ type: 'object' })))
  assert.ok(Number.isSafeInteger(boundary.diagnostics.envelopeOverheadBytes) && boundary.diagnostics.envelopeOverheadBytes >= 0)
  const marker = 'PRIVATE_OVERSIZE_REQUEST_MARKER'
  assert.throws(() => makeRequest({ messages: [{ role: 'user', content: `${'A'.repeat(padding)}中${marker}` }] }, [], { type: 'object' }), error => {
    assert.equal(error.code, 'REQUEST_TOO_LARGE')
    assert.equal(error.requestDiagnostics.requestLimitStage, 'envelope')
    assert.equal(error.requestDiagnostics.requestBytes, limit + 3 + Buffer.byteLength(marker))
    assert.equal(error.requestDiagnostics.promptBytes, error.requestDiagnostics.requestBytes)
    assert.equal(error.requestDiagnostics.cliInputBytes, error.requestDiagnostics.requestBytes)
    assert.equal(error.requestDiagnostics.requestLimitBytes, limit)
    assert.equal(JSON.stringify(error.requestDiagnostics).includes(marker), false)
    return true
  })
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

test('measures exact international image stream input bytes and reports the existing 24 MiB limit', () => {
  const limit = 24 * 1024 * 1024
  const prompt = '{"protocol":"dsh-codebuddy-model/v1"}'
  const image = { type: 'image', source: { type: 'base64', media_type: 'image/png', data: '' } }
  const base = makeImageStreamInput(prompt, [image])
  const data = 'A'.repeat(limit - base.bytes)
  const boundary = makeImageStreamInput(prompt, [{ ...image, source: { ...image.source, data } }])
  assert.equal(boundary.bytes, limit)
  const over = `${data}中`
  assert.throws(() => makeImageStreamInput(prompt, [{ ...image, source: { ...image.source, data: over } }]), error => {
    assert.equal(error.code, 'REQUEST_TOO_LARGE')
    assert.equal(error.requestDiagnostics.requestLimitStage, 'cli-input')
    assert.equal(error.requestDiagnostics.cliInputBytes, limit + 3)
    assert.equal(error.requestDiagnostics.streamInputBytes, limit + 3)
    assert.equal(error.requestDiagnostics.requestBytes, limit + 3)
    assert.equal(error.requestDiagnostics.requestLimitBytes, limit)
    return true
  })
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
