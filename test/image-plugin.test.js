import test from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { mkdtemp, mkdir, readFile, writeFile, chmod, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === '@deepseek-ai/schemastery') {
      return { url: 'data:text/javascript,export default {object:x=>x,string:()=>({description(){return this},default(){return this},volatile(){return this}}),number:()=>({description(){return this},default(){return this},volatile(){return this}})}', shortCircuit: true }
    }
    if (specifier === '@deepseek-ai/dsh-llm') return { url: 'data:text/javascript,export class LlmAdapter {}', shortCircuit: true }
    return next(specifier, context)
  }
})

test('international image adapter carries user/tool images while DSH retains business-tool authority and log privacy', async t => {
  const { apply, inject } = await import('../lib/index.js')
  assert.ok(inject.includes('attachments'))
  const directory = await mkdtemp(path.join(tmpdir(), 'dsh-intl-image-plugin-'))
  const stateKey = process.platform === 'win32' ? 'LOCALAPPDATA' : process.platform === 'darwin' ? 'HOME' : 'XDG_STATE_HOME'
  const oldStateRoot = process.env[stateKey]
  process.env[stateKey] = directory
  const bin = process.platform === 'win32'
    ? path.join(directory, 'node_modules', '@tencent-ai', 'codebuddy-code', 'bin') : directory
  await mkdir(bin, { recursive: true })
  const entry = path.join(bin, 'codebuddy')
  await writeFile(entry, await readFile(new URL('./fixtures/fake-codebuddy.cjs', import.meta.url)))
  await chmod(entry, 0o755)
  const executable = process.platform === 'win32' ? path.join(directory, 'codebuddy.cmd') : entry
  if (process.platform === 'win32') await writeFile(executable, '@echo off\r\n')

  const cleanups = []
  const routes = new Map()
  const reads = []
  const imageA = Buffer.from('SYNTHETIC_IMAGE_A_DO_NOT_LOG')
  const imageB = Buffer.from('SYNTHETIC_IMAGE_B_DO_NOT_LOG')
  const imageBytes = new Map([['synthetic-A', imageA], ['synthetic-B', imageB]])
  let adapter
  const ctx = {
    attachments: {
      async readImageRequest(ref, target, signal) {
        reads.push({ id: ref.attachmentId, target, signal })
        return { data: imageBytes.get(ref.attachmentId), bytes: imageBytes.get(ref.attachmentId).length, mediaType: 'image/png', width: 10, height: 10 }
      }
    },
    llm: { registerAdapter(_providers, value) { adapter = value; return () => {} } },
    effect(callback) { const dispose = callback(); if (typeof dispose === 'function') cleanups.push(dispose) },
    on() {}, emit() {}, inject(_deps, callback) { callback(ctx) },
    webServer: { register(route) { routes.set(route.path, route.handler); return () => {} } }
  }
  t.after(async () => {
    for (const cleanup of cleanups.reverse()) cleanup()
    if (oldStateRoot === undefined) delete process.env[stateKey]
    else process.env[stateKey] = oldStateRoot
    const relative = path.relative(tmpdir(), directory)
    if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) await rm(directory, { recursive: true, force: true })
  })

  apply(ctx, { cliPath: executable, configDir: '', model: '', effort: '', timeoutMs: 15000 })
  const models = await adapter.listModels('codebuddy-cli-intl')
  assert.deepEqual(models[0].inputModalities, ['text', 'image'])
  assert.deepEqual(models[1].inputModalities, ['text'])

  const refA = { attachmentId: 'synthetic-A', mediaType: 'image/png', bytes: imageA.length, width: 10, height: 10 }
  const refB = { attachmentId: 'synthetic-B', mediaType: 'image/png', bytes: imageB.length, width: 10, height: 10 }
  const initialMessages = [{ role: 'user', content: [
    { type: 'text', text: 'image-route:tool-round compare both diagrams' },
    { type: 'image', attachment: refA },
    { type: 'image', attachment: refB }
  ] }]
  const opts = {
    provider: 'codebuddy-cli-intl', model: 'future-alpha',
    messages: initialMessages,
    tools: [{ name: 'read_test', description: 'Synthetic DSH tool; this test never executes it.', parameters: { type: 'object', properties: { target: { type: 'string' } } } }]
  }
  const collect = async options => {
    const chunks = []
    for await (const chunk of adapter.stream(options)) chunks.push(chunk)
    return chunks
  }
  const plan = await collect(opts)
  assert.equal(plan.at(-1).reason.kind, 'tool-calls')
  const call = plan.find(chunk => chunk.type === 'block-end' && chunk.block.type === 'tool-call').block
  const followUp = await collect({
    ...opts,
    messages: [...initialMessages,
      { role: 'assistant', content: [call] },
      { role: 'tool', toolCallId: call.id, isError: false, content: [
        { type: 'text', text: 'synthetic DSH tool result only' },
        { type: 'image', attachment: refA }
      ] },
      { role: 'user', content: 'compare the images and summarize the result' }]
  })
  assert.equal(followUp.at(-1).reason.kind, 'stop')
  assert.equal(followUp.some(chunk => chunk.type.endsWith('-delta')), false)

  const requests = (await readFile(path.join(bin, 'requests.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse).filter(item => item.args)
  assert.equal(requests.length, 2)
  const expectedImages = [[imageA, imageB], [imageA, imageB, imageA]]
  for (const [requestIndex, record] of requests.entries()) {
    const args = record.args
    assert.equal(args[args.indexOf('--input-format') + 1], 'stream-json')
    assert.equal(args[args.indexOf('--output-format') + 1], 'stream-json')
    assert.ok(args.includes('--json-schema'))
    assert.equal(args[args.indexOf('--tools') + 1], 'StructuredOutput')
    assert.equal(args[args.indexOf('--allowedTools') + 1], 'StructuredOutput')
    assert.ok(args.includes('--verbose'))
    assert.ok(args.includes('--strict-mcp-config'))
    assert.deepEqual(JSON.parse(args[args.indexOf('--mcp-config') + 1]), { mcpServers: {} })
    const turn = JSON.parse(record.input)
    assert.equal(record.input.trim().split('\n').length, 1, 'DSH history is not replayed as multiple CLI user turns')
    assert.equal(turn.type, 'user')
    assert.equal(turn.session_id, '')
    assert.equal(turn.parent_tool_use_id, null)
    assert.deepEqual(turn.message.content.slice(1).map(block => Buffer.from(block.source.data, 'base64')), expectedImages[requestIndex])
    assert.equal(turn.message.content[0].text.includes(imageA.toString('base64')), false)
    assert.equal(turn.message.content[0].text.includes('synthetic-A'), false)
    assert.equal(turn.message.content[0].text.includes('synthetic-B'), false)
    assert.match(turn.message.content[0].text, /CLI image 1/u)
    assert.match(turn.message.content[0].text, /CLI image 2/u)
    if (requestIndex === 1) {
      const envelopeStart = turn.message.content[0].text.indexOf('{"protocol"')
      const envelope = JSON.parse(turn.message.content[0].text.slice(envelopeStart))
      const toolResult = envelope.messages.find(message => message.role === 'tool')
      assert.equal(toolResult.toolCallId, call.id)
      assert.equal(toolResult.isError, false)
      assert.match(toolResult.content[1].text, /CLI image 3/u)
      assert.match(turn.message.content[0].text, /CLI image 3/u)
    } else {
      assert.doesNotMatch(turn.message.content[0].text, /CLI image 3/u)
    }
  }

  await assert.rejects(collect({ ...opts, model: 'new-free-model' }), { code: 'IMAGE_MODEL_UNSUPPORTED' })
  await assert.rejects(collect({ ...opts, messages: [{ role: 'user', content: Array.from({ length: 7 }, () => ({ type: 'image', attachment: refA })) }] }), error => {
    assert.equal(error.code, 'IMAGE_OFFLOAD_REQUIRED')
    assert.equal(error.failure.offloadImages, 2)
    assert.equal(typeof error.failure.requestId, 'string')
    return true
  })

  const action = async name => {
    const { Readable } = await import('node:stream')
    const request = Readable.from([JSON.stringify({ action: name })])
    request.method = 'POST'
    request.headers = { host: 'localhost', origin: 'http://localhost', 'content-type': 'application/json', 'x-dsh-codebuddy-action': '1' }
    let body
    await routes.get('/plugins/dsh-codebuddy-cli-intl/diagnostics')(request, { writeHead() {}, end(value) { body = JSON.parse(value) } })
    return body
  }
  await action('armCapture')
  await assert.rejects(collect({
    ...opts,
    messages: [
      { role: 'user', content: [{ type: 'text', text: 'Inspect the failed screenshot tool result.' }] },
      { role: 'assistant', content: [{ type: 'tool-call', id: 'failed-capture-call', name: 'screen_capture', arguments: {} }] },
      { role: 'tool', toolCallId: 'failed-capture-call', isError: true, content: [
        { type: 'text', text: 'response-case:image-wrong-shape screenshot operation failed.' },
        { type: 'image', attachment: refA }
      ] }
    ]
  }), { code: 'STRUCTURED_OUTPUT_INVALID' })
  const details = await action('exportDetailedLogs')
  assert.equal(details.entries.at(-1).imageRequest, true)
  assert.equal(details.entries.at(-1).captureAttempted, true)
  assert.equal(details.entries.at(-1).sample, undefined)
  assert.equal(details.entries.at(-1).diagnostics.imageCount, 1)
  assert.equal(details.privacy.includesRawReplies, false)
  assert.equal(JSON.stringify(details).includes(imageA.toString('base64')), false)
  const allRequests = (await readFile(path.join(bin, 'requests.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse).filter(item => item.args)
  assert.equal(allRequests.length, 3)
  const toolOnlyTurn = JSON.parse(allRequests[2].input)
  assert.deepEqual(toolOnlyTurn.message.content.slice(1).map(block => Buffer.from(block.source.data, 'base64')), [imageA])
  const toolOnlyPrompt = toolOnlyTurn.message.content[0].text
  const toolOnlyEnvelope = JSON.parse(toolOnlyPrompt.slice(toolOnlyPrompt.indexOf('{"protocol"')))
  const failedToolResult = toolOnlyEnvelope.messages.find(message => message.role === 'tool')
  assert.equal(failedToolResult.toolCallId, 'failed-capture-call')
  assert.equal(failedToolResult.isError, true)
  assert.match(failedToolResult.content[1].text, /CLI image 1/u)
  const logPath = path.join(directory, 'dsh-codebuddy-cli-intl', 'logs', 'diagnostics.json')
  const stored = await readFile(logPath, 'utf8')
  assert.equal(stored.includes(imageA.toString('base64')), false)
  assert.equal(stored.includes('SYNTHETIC_IMAGE_A_DO_NOT_LOG'), false)
  assert.equal(stored.includes('PRIVATE_FAILED_REPLY'), false)
  assert.equal(reads.length, 5)
})
