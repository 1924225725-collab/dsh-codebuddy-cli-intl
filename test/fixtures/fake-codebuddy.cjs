#!/usr/bin/env node
const fs = require('node:fs')
const path = require('node:path')
const readline = require('node:readline')
const recordFile = path.join(process.env.DSH_FIXTURE_DIR || __dirname, 'requests.jsonl')
const record = (data) => fs.appendFileSync(recordFile, `${JSON.stringify(data)}\n`)
const models = [
  { modelId: 'future-alpha', name: '未来 Alpha', _meta: { credits: 'x0.33 credits', supportsReasoning: true, maxInputTokens: 1000000, effortOptions: [{ value: 'high', name: 'High' }] } },
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
} else if (process.argv.includes('--print')) {
  let input = ''
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', (chunk) => { input += chunk })
  process.stdin.on('end', () => {
    record({ args: process.argv.slice(2), input })
    const envelope = JSON.parse(input.slice(input.indexOf('{"protocol"')))
    const toolCalls = input.includes('tool-round') && envelope.tools.length && !envelope.messages.some((message) => message.role === 'tool') ? [{ name: envelope.tools[0].name, arguments: { target: 'sandbox.txt' } }] : []
    let response = JSON.stringify({ text: toolCalls.length ? '' : 'fixture response', toolCalls })
    if (input.includes('response-case:fenced-tool')) response = `\`\`\`json\n${JSON.stringify({ toolCalls: [{ name: envelope.tools[0].name, arguments: JSON.stringify({ target: 'sandbox.txt' }) }] })}\n\`\`\``
    if (input.includes('response-case:truncated')) response = '{"text":"PRIVATE_FAILED_REPLY'
    if (input.includes('response-case:wrong-shape')) response = JSON.stringify({ text: { PRIVATE_FAILED_REPLY: true }, toolCalls: [] })
    console.log(JSON.stringify([
      { type: 'system', subtype: 'init' },
      { type: 'result', subtype: 'success', result: response, usage: { input_tokens: 11, output_tokens: 7, cache_read_input_tokens: 3, cache_creation_input_tokens: 4 } }
    ]))
  })
} else {
  throw new Error('Unexpected CLI invocation')
}
