#!/usr/bin/env node
const fs = require('node:fs')
const path = require('node:path')
const readline = require('node:readline')
const recordFile = path.join(process.env.DSH_FIXTURE_DIR || __dirname, 'requests.jsonl')
const record = (data) => fs.appendFileSync(recordFile, `${JSON.stringify(data)}\n`)
const models = [
  { modelId: 'future-alpha', name: '未来 Alpha', _meta: { credits: 'x0.33 credits', supportsReasoning: true, supportsImages: true, maxInputTokens: 1000000, effortOptions: [{ value: 'high', name: 'High' }] } },
  { modelId: 'new-free-model', name: 'New Free', _meta: { credits: 'x0.00 credits', supportsReasoning: false } }
]
if (process.argv.includes('--version')) {
  console.log('CodeBuddy CLI 9.8.7')
} else if (process.argv.includes('--acp')) {
  console.log('fixture startup diagnostic')
  const reader = readline.createInterface({ input: process.stdin })
  reader.on('line', (line) => {
    const message = JSON.parse(line)
    record({ method: message.method })
    if (process.argv.includes('--hang')) return
    let result
    if (message.method === 'initialize') result = { protocolVersion: 1, agentCapabilities: {} }
    else if (message.method === 'session/new') result = { sessionId: 'fixture-session', models: { currentModelId: 'future-alpha', availableModels: models } }
    else throw new Error('Discovery must never send a model prompt')
    const buffer = Buffer.from(`${JSON.stringify({ jsonrpc: '2.0', id: message.id, result })}\n`)
    const split = Math.floor(buffer.length / 2)
    process.stdout.write(buffer.subarray(0, split))
    setTimeout(() => process.stdout.write(buffer.subarray(split)), 1)
  })
} else if (process.argv.includes('--print') && process.argv.includes('--input-format')) {
  let input = ''
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', (chunk) => { input += chunk })
  process.stdin.on('end', () => {
    record({ args: process.argv.slice(2), input })
    const turn = JSON.parse(input.trim())
    const text = turn.message.content.find(block => block?.type === 'text')?.text ?? ''
    const envelope = JSON.parse(text.slice(text.indexOf('{"protocol"')))
    const toolCalls = text.includes('tool-round') && envelope.tools.length
      && !envelope.messages.some(message => message.role === 'tool')
      ? [{ name: envelope.tools[0].name, arguments: { target: 'sandbox.txt' } }] : []
    const structured = text.includes('response-case:image-wrong-shape')
      ? { text: { PRIVATE_FAILED_REPLY: true }, toolCalls }
      : { text: toolCalls.length ? '' : 'synthetic image response', toolCalls }
    const usage = { input_tokens: 31, output_tokens: 9, cache_read_input_tokens: 2 }
    const init = { type: 'system', subtype: 'init', model: 'future-alpha' }
    if (text.includes('response-case:image-auth')) {
      console.log(JSON.stringify(init))
      console.log(JSON.stringify({ type: 'error', error: '401 Unauthorized PRIVATE_AUTH_TOKEN' }))
      return
    }
    if (text.includes('response-case:image-missing')) {
      console.log(JSON.stringify(init))
      console.log(JSON.stringify({ type: 'result', subtype: 'success', result: JSON.stringify(structured), usage }))
      return
    }
    if (text.includes('response-case:image-conflict')) {
      console.log(JSON.stringify(init))
      console.log(JSON.stringify({ type: 'result', subtype: 'success', structured_output: { text: 'first', toolCalls: [] }, usage }))
      setTimeout(() => console.log(JSON.stringify({ type: 'result', subtype: 'success', structured_output: { text: 'second', toolCalls: [] }, usage })), 60)
      return
    }
    console.log(JSON.stringify(init))
    console.log(JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'processing structured result' }] } }))
    console.log(JSON.stringify({
      type: 'result', subtype: 'success', structured_output: structured,
      result: 'free-form stream output must not replace structured_output', usage,
      modelUsage: { 'future-alpha': { inputTokens: 29, outputTokens: 9, cacheReadInputTokens: 2 } }
    }))
  })
} else if (process.argv.includes('--print')) {
  let input = ''
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', (chunk) => { input += chunk })
  process.stdin.on('end', () => {
    record({ args: process.argv.slice(2), input })
    if (input.includes('response-case:auth-required')) { process.stderr.write('401 Authentication required. Please use /login PRIVATE_AUTH_TOKEN'); return }
    if (input.includes('response-case:network-reset')) { process.stderr.write('Error: 502 安全连接建立失败：可能被代理拦截（Client network socket disconnected before secure TLS connection was established） PRIVATE_NETWORK_TOKEN https://private.invalid/secret'); return }
    if (input.includes('response-case:empty-output')) return
    if (input.includes('response-case:non-json')) { process.stdout.write('PRIVATE_NON_JSON'); return }
    const envelope = JSON.parse(input.slice(input.indexOf('{"protocol"')))
    const toolCalls = input.includes('tool-round') && envelope.tools.length && !envelope.messages.some((message) => message.role === 'tool') ? [{ name: envelope.tools[0].name, arguments: { target: 'sandbox.txt' } }] : []
    if (process.argv.includes('--json-schema')) {
      let structured = { text: toolCalls.length ? '' : 'fixture response', toolCalls }
      const usage = { input_tokens: 11, output_tokens: 7, cache_read_input_tokens: 3, cache_creation_input_tokens: 4 }
      if (input.includes('response-case:fenced-tool') || input.includes('response-case:annotated-tool')) {
        structured = { text: '', toolCalls: [{ name: envelope.tools[0].name, arguments: { target: 'sandbox.txt' } }] }
      }
      if (input.includes('response-case:duplicate-tool')) {
        const repeated = { name: envelope.tools[0].name, arguments: { target: 'sandbox.txt' } }
        structured = { text: '', toolCalls: [repeated, repeated] }
      }
      if (input.includes('response-case:malformed-final-text')) {
        structured = { text: '输出 5\n退出码 0；路径 C:\\project\\demo', toolCalls: [] }
      }
      if (input.includes('response-case:native-literal')) {
        structured = { text: '示例：{"text":"quoted example"} {"toolCalls":[{"name":"read_test","arguments":{}}]}', toolCalls: [] }
      }
      if (input.includes('native-route:missing')) {
        console.log(JSON.stringify({ type: 'result', subtype: 'success', result: JSON.stringify(structured), usage }))
        return
      }
      if (input.includes('response-case:truncated')) {
        console.log(JSON.stringify({ type: 'result', subtype: 'success', result: '{"text":"PRIVATE_FAILED_REPLY', usage }))
        return
      }
      if (input.includes('response-case:wrong-shape')) {
        console.log(JSON.stringify({ type: 'result', subtype: 'success', structured_output: { text: { PRIVATE_FAILED_REPLY: true }, toolCalls: [] }, usage }))
        return
      }
      if (input.includes('response-case:ambiguous')) {
        console.log(JSON.stringify([
          { type: 'result', subtype: 'success', structured_output: { text: 'first', toolCalls: [] }, usage },
          { type: 'result', subtype: 'success', structured_output: { text: 'second', toolCalls: [] }, usage }
        ]))
        return
      }
      if (input.includes('native-route:conflict')) {
        console.log(JSON.stringify([
          { type: 'result', subtype: 'success', structured_output: { text: 'first', toolCalls: [] }, usage },
          { type: 'result', subtype: 'success', structured_output: { text: 'last', toolCalls: [] }, usage }
        ]))
        return
      }
      if (input.includes('native-route:identical-duplicate')) {
        const item = { type: 'result', subtype: 'success', structured_output: structured, usage }
        console.log(JSON.stringify([item, { ...item }, { ...item }]))
        return
      }
      if (input.includes('native-route:cli-error')) {
        console.log(JSON.stringify({ type: 'result', subtype: 'error_during_execution', is_error: true, structured_output: structured, usage }))
        return
      }
      console.log(JSON.stringify({ type: 'result', subtype: 'success', structured_output: structured, result: 'human-readable CLI summary must not replace structured_output', usage }))
      return
    }
    let response = JSON.stringify({ text: toolCalls.length ? '' : 'fixture response', toolCalls })
    if (input.includes('response-case:fenced-tool')) response = `\`\`\`json\n${JSON.stringify({ toolCalls: [{ name: envelope.tools[0].name, arguments: JSON.stringify({ target: 'sandbox.txt' }) }] })}\n\`\`\``
    if (input.includes('response-case:truncated')) response = '{"text":"PRIVATE_FAILED_REPLY'
    if (input.includes('response-case:wrong-shape')) response = JSON.stringify({ text: { PRIVATE_FAILED_REPLY: true }, toolCalls: [] })
    if (input.includes('response-case:malformed-final-text')) response = '{"text":"输出 5\n退出码 0；路径 C:\\project\\demo","toolCalls":[]}'
    if (input.includes('response-case:annotated-tool')) response = '说明 [阶段一] [阶段二]\n' + JSON.stringify({ text: '', toolCalls: [{ name: envelope.tools[0].name, arguments: { target: 'sandbox.txt' } }] })
    if (input.includes('response-case:duplicate-tool')) {
      const plan = JSON.stringify({ text: '', toolCalls: [{ name: envelope.tools[0].name, arguments: { target: 'sandbox.txt' } }] })
      response = plan + '\n' + plan
    }
    if (input.includes('response-case:ambiguous')) response = [JSON.stringify({ text: 'PRIVATE_FAILED_REPLY', toolCalls: [] }), JSON.stringify({ text: 'conflicting reply', toolCalls: [] })].join('\n')
    console.log(JSON.stringify([
      { type: 'system', subtype: 'init' },
      { type: 'result', subtype: 'success', result: response, usage: { input_tokens: 11, output_tokens: 7, cache_read_input_tokens: 3, cache_creation_input_tokens: 4 } }
    ]))
  })
} else {
  throw new Error('Unexpected CLI invocation')
}
