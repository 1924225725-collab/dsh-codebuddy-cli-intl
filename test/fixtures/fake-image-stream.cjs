#!/usr/bin/env node
const mode = process.argv[2]
const emit = value => process.stdout.write(`${JSON.stringify(value)}\n`)
const init = () => emit({ type: 'system', subtype: 'init', model: 'future-alpha' })
const result = (value = { text: '图像测试完成 C:\\examples\\demo；字面量 {"example":1}', toolCalls: [] }) => ({
  type: 'result',
  subtype: 'success',
  structured_output: value,
  result: 'free-form CLI text must not replace structured output',
  usage: { input_tokens: 41, output_tokens: 17, cache_read_input_tokens: 3 },
  modelUsage: { 'future-alpha': { inputTokens: 38, outputTokens: 17, cacheReadInputTokens: 3 } }
})

if (mode === 'invalid') {
  init(); process.stdout.write('{broken}\n')
} else if (mode === 'tail') {
  init(); process.stdout.write('{"type":"result"')
} else if (mode === 'close-bad-tail') {
  init(); process.stdout.write('{"type":"result"'); process.exitCode = 7
} else if (mode === 'overflow') {
  init(); process.stdout.write(`${'x'.repeat(4096)}\n`)
} else if (mode === 'nonzero') {
  init(); process.exitCode = 2
} else if (mode === 'permission') {
  init(); emit({ type: 'control_request', request_id: 'synthetic', request: { subtype: 'permission' } })
} else if (mode === 'notice') {
  init(); emit({ type: 'assistant', message: { content: [{ type: 'text', text: '401 Unauthorized' }] } })
} else if (mode === 'auth') {
  init(); emit({ type: 'error', error: '401 Unauthorized PRIVATE_SYNTHETIC_TOKEN' })
} else if (mode === 'error-permission') {
  init(); emit({ type: 'error', error: 'EPERM: operation not permitted, mkdir PRIVATE_SYNTHETIC_PATH' }); emit(result())
} else if (mode === 'error-auth') {
  init(); emit({ type: 'error', error: { message: '401 Unauthorized PRIVATE_SYNTHETIC_AUTH' } })
} else if (mode === 'error-context') {
  init(); emit({ type: 'error', status: 400, error: { message: 'prompt is too long: 100001 tokens > 100000 maximum PRIVATE_CONTEXT' } }); emit(result())
} else if (mode === 'error-balance') {
  init(); emit({ type: 'error', status: 402, error: { message: 'Insufficient Balance PRIVATE_BALANCE' } }); emit(result())
} else if (mode === 'error-generic') {
  init(); emit({ type: 'error', error: { message: 'PRIVATE_SYNTHETIC_UNKNOWN_ERROR' } })
} else if (mode === 'error-network') {
  init(); emit({ type: 'error', error: { message: 'Error: read ECONNRESET PRIVATE_NETWORK https://private.invalid/secret' } }); emit(result())
} else if (mode === 'stderr-network') {
  process.stderr.write('Error: Client network socket disconnected before secure TLS connection was established PRIVATE_NETWORK https://private.invalid/secret')
} else if (mode === 'string') {
  init(); emit(result('not an object'))
} else if (mode === 'hang') {
  init(); setInterval(() => {}, 1000)
} else if (mode === 'resident') {
  init(); emit(result()); setInterval(() => {}, 1000)
} else if (mode === 'multiple') {
  init(); emit(result({ text: 'first', toolCalls: [] }))
  setTimeout(() => emit(result({ text: 'late conflict', toolCalls: [] })), 60)
} else if (mode === 'post-result') {
  init(); emit(result()); emit({ type: 'assistant', message: { content: [{ type: 'text', text: 'unexpected after terminal' }] } })
} else if (mode === 'duplicate-init') {
  init(); init(); emit(result())
} else if (mode === 'result-before-init') {
  emit(result())
} else if (mode === 'missing-init') {
  process.exitCode = 0
} else if (mode === 'missing-result') {
  init()
} else if (mode === 'shape') {
  process.stdout.write('{"type":7}\n')
} else if (mode === 'proto-type') {
  process.stdout.write('{"type":"__proto__"}\n')
} else if (mode === 'assistant-shape') {
  init(); emit({ type: 'assistant', message: { content: { type: 'text', text: 'not an array' } } })
} else if (mode === 'crlf') {
  process.stdout.write(`${JSON.stringify({ type: 'system', subtype: 'init', model: 'future-alpha' })}\r\n${JSON.stringify(result())}\r\n`)
} else if (mode === 'tail-valid') {
  process.stdout.write(`${JSON.stringify({ type: 'system', subtype: 'init', model: 'future-alpha' })}\n${JSON.stringify(result())}`)
} else if (mode === 'chunked') {
  const buffer = Buffer.from(`${JSON.stringify({ type: 'system', subtype: 'init', model: 'future-alpha' })}\r\n${JSON.stringify(result())}\r\n`)
  const firstUtf8Byte = buffer.indexOf(Buffer.from('图'))
  const cuts = [3, firstUtf8Byte + 1, Math.floor(buffer.length / 2), buffer.length - 2, buffer.length]
  let start = 0
  for (const end of [...new Set(cuts)].sort((a, b) => a - b)) {
    process.stdout.write(buffer.subarray(start, end))
    start = end
  }
} else {
  init()
  const buffer = Buffer.from(`${JSON.stringify(result())}\n`)
  const split = Math.max(1, buffer.indexOf(Buffer.from('图')) + 1)
  process.stdout.write(buffer.subarray(0, split))
  setTimeout(() => process.stdout.write(buffer.subarray(split)), 1)
}
