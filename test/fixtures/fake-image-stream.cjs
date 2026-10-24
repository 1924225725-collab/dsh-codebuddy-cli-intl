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
} else if (mode === 'error-generic') {
  init(); emit({ type: 'error', error: { message: 'PRIVATE_SYNTHETIC_UNKNOWN_ERROR' } })
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
} else {
  init()
  const buffer = Buffer.from(`${JSON.stringify(result())}\n`)
  const split = Math.max(1, buffer.indexOf(Buffer.from('图')) + 1)
  process.stdout.write(buffer.subarray(0, split))
  setTimeout(() => process.stdout.write(buffer.subarray(split)), 1)
}
