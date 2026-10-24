import test from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { mkdtemp, mkdir, readFile, writeFile, chmod, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createServer } from 'node:http'
import { once } from 'node:events'

const schemaStub = `const field=()=>({description(){return this},default(value){this.fallback=value;return this},volatile(){return this}});export default {string:field,number:field,object:shape=>({shape})}`
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === '@deepseek-ai/schemastery') return { url: `data:text/javascript,${encodeURIComponent(schemaStub)}`, shortCircuit: true }
    if (specifier === '@deepseek-ai/dsh-llm') return { url: 'data:text/javascript,export class LlmAdapter {}', shortCircuit: true }
    return next(specifier, context)
  }
})

test('DSH integration discovers all models, forwards selected IDs and efforts, supports tools, and configures the detected CLI', async (t) => {
  const { apply, Config } = await import('../lib/index.js')
  assert.equal(Config.shape.model.fallback, '')
  assert.equal(Config.shape.effort.fallback, '')
  const directory = await mkdtemp(path.join(tmpdir(), 'dsh-plugin-test-'))
  const stateKey = process.platform === 'win32' ? 'LOCALAPPDATA' : process.platform === 'darwin' ? 'HOME' : 'XDG_STATE_HOME'
  const oldStateRoot = process.env[stateKey]
  process.env[stateKey] = directory
  t.after(() => { if (oldStateRoot === undefined) delete process.env[stateKey]; else process.env[stateKey] = oldStateRoot })
  const binDirectory = process.platform === 'win32'
    ? path.join(directory, 'node_modules', '@tencent-ai', 'codebuddy-code', 'bin') : directory
  await mkdir(binDirectory, { recursive: true })
  const entry = path.join(binDirectory, 'codebuddy')
  await writeFile(entry, await readFile(new URL('./fixtures/fake-codebuddy.cjs', import.meta.url)))
  await chmod(entry, 0o755)
  const executable = process.platform === 'win32' ? path.join(directory, 'codebuddy.cmd') : entry
  if (process.platform === 'win32') await writeFile(executable, '@echo off\r\n')
  const config = { cliPath: executable, configDir: '', model: '', effort: '', timeoutMs: 15000 }
  const cleanups = []
  const routes = new Map()
  let adapter
  let notifications = 0
  const ctx = {
    llm: { registerAdapter(providers, value) { adapter = value; return () => {} } },
    effect(callback) { const dispose = callback(); if (typeof dispose === 'function') cleanups.push(dispose) },
    on() {}, emit() { notifications += 1 }, inject(deps, callback) { callback(ctx) },
    webServer: { register(route) { routes.set(route.path, route.handler); return () => routes.delete(route.path) } }
  }
  let server
  t.after(async () => {
    for (const cleanup of cleanups.reverse()) cleanup()
    if (server) await new Promise((resolve) => server.close(resolve))
    const relative = path.relative(tmpdir(), directory)
    if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) await rm(directory, { recursive: true, force: true })
  })
  apply(ctx, config)
  const models = await adapter.listModels('codebuddy-cli-intl')
  assert.equal(models.length, 2)
  assert.deepEqual(models.map((model) => model.id), ['future-alpha', 'new-free-model'])
  assert.match(models[0].name, /×0.33/u)
  assert.match(models[1].name, /×0/u)
  assert.ok(notifications > 0)
  const resolved = await adapter.resolveModel('codebuddy-cli-intl', 'future-alpha')
  assert.deepEqual(resolved.reasoning.efforts, [{ id: 'high', name: 'High' }])
  assert.equal(resolved.context.contextWindow, 1000000)
  assert.equal(resolved.reasoning.defaultEffort, undefined)
  const chunks = []
  for await (const chunk of adapter.stream({ model: 'future-alpha', reasoningEffort: 'high', messages: [{ role: 'user', content: 'tool-round' }], tools: [{ name: 'read_test', parameters: { type: 'object', properties: { target: { type: 'string' } } } }] })) chunks.push(chunk)
  assert.equal(chunks.at(-1).reason.kind, 'tool-calls')
  assert.equal(chunks.find((chunk) => chunk.type === 'block-end').block.name, 'read_test')
  assert.equal(chunks.some((chunk) => chunk.type.endsWith('-delta')), false, 'complete JSON responses must not generate artificial timing deltas')
  assert.deepEqual(chunks.find((chunk) => chunk.type === 'usage').usage, { inputTokens: 4, outputTokens: 7, cacheReadTokens: 3, cacheWriteTokens: 4, totalTokens: 18 })
  for await (const chunk of adapter.stream({ model: 'new-free-model', reasoningEffort: 'high', messages: [{ role: 'user', content: 'hello' }] })) {}
  for await (const chunk of adapter.stream({ model: 'manual-future-id', messages: [{ role: 'user', content: 'hello' }] })) {}
  for await (const chunk of adapter.stream({ messages: [{ role: 'user', content: 'hello' }] })) {}
  const completed = []
  for await (const chunk of adapter.stream({ model: 'future-alpha', messages: [
    { role: 'user', content: 'tool-round' },
    { role: 'assistant', content: [chunks.find((chunk) => chunk.type === 'block-end').block] },
    { role: 'tool', toolCallId: chunks.find((chunk) => chunk.type === 'block-end').block.id, content: 'file contents' }
  ], tools: [{ name: 'read_test', parameters: { type: 'object', properties: {} } }] })) completed.push(chunk)
  assert.equal(completed.at(-1).reason.kind, 'stop')
  assert.equal(completed.find((chunk) => chunk.type === 'block-end').block.text, 'fixture response')
  assert.equal(completed.some((chunk) => chunk.type.endsWith('-delta')), false)
  const records = (await readFile(path.join(binDirectory, 'requests.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse)
  const calls = records.filter((record) => record.args)
  assert.equal(calls[0].args[calls[0].args.indexOf('--model') + 1], 'future-alpha')
  assert.equal(calls[0].args[calls[0].args.indexOf('--effort') + 1], 'high')
  assert.equal(calls[1].args.includes('--effort'), false)
  assert.equal(calls[2].args[calls[2].args.indexOf('--model') + 1], 'manual-future-id')
  assert.equal(calls[3].args.includes('--model'), false)
  assert.equal(calls[3].args.includes('--effort'), false)
  assert.ok(calls.every((call) => call.args.includes('--system-prompt') && !call.args.includes('--append-system-prompt')))
  assert.ok(calls.every((call) => call.args.includes('--json-schema')))
  assert.ok(calls.every((call) => call.args[call.args.indexOf('--tools') + 1] === 'StructuredOutput'))
  assert.ok(calls.every((call) => call.args[call.args.indexOf('--max-turns') + 1] === '4'))
  assert.ok(calls.every((call) => JSON.parse(call.args[call.args.indexOf('--mcp-config') + 1]).mcpServers))
  assert.ok(calls.every((call) => JSON.parse(call.input.slice(call.input.indexOf('{"protocol"'))).responseSchema))
  assert.ok(records.filter((record) => record.method).every((record) => ['initialize', 'session/new'].includes(record.method)))

  server = createServer((req, res) => {
    const route = routes.get(new URL(req.url, 'http://localhost').pathname)
    if (!route) { res.writeHead(404); res.end(); return }
    Promise.resolve(route(req, res)).catch(() => { res.writeHead(500); res.end() })
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const origin = `http://127.0.0.1:${server.address().port}`
  const logAction = async (action, extra = {}) => {
    const response = await fetch(`${origin}/plugins/dsh-codebuddy-cli-intl/diagnostics`, {
      method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'X-DSH-CodeBuddy-Action': '1', ...extra }, body: JSON.stringify({ action })
    })
    return { status: response.status, body: await response.json() }
  }
  const status = await (await fetch(`${origin}/plugins/dsh-codebuddy-cli-intl/status`)).json()
  assert.equal(status.catalog.models.length, 2)
  assert.equal(status.pluginVersion, JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')).version)
  assert.equal(status.timeoutMs, 15000)
  assert.equal(status.responseMode, 'native-json-schema')
  assert.equal(status.usage.lastCall.model, 'future-alpha')
  assert.equal(status.usage.calls, 5)
  assert.equal(status.usage.inputTokens, 55)
  assert.equal(status.usage.uncachedInputTokens, 20)
  assert.equal(status.usage.cacheReadTokens, 15)
  assert.equal(status.usage.cacheWriteTokens, 20)
  assert.equal(status.usage.lastCall.inputTokens, 11)
  assert.equal(status.usage.lastCall.diagnostics.messageCount, 3)
  assert.ok(status.usage.lastCall.durationMs >= 0)
  assert.ok(status.loginCommand.includes(executable))
  const setup = await fetch(`${origin}/plugins/dsh-codebuddy-cli-intl/actions`, {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'X-DSH-CodeBuddy-Action': '1' }, body: JSON.stringify({ action: 'setup' })
  })
  assert.equal(setup.status, 202)
  let result = await setup.json()
  for (let attempt = 0; ['detecting', 'installing'].includes(result.setup.state) && attempt < 100; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 10))
    result = await (await fetch(`${origin}/plugins/dsh-codebuddy-cli-intl/status`)).json()
  }
  assert.equal(result.setup.state, 'ready')
  assert.equal(result.setup.installed, false)
  assert.equal(result.setup.path, executable)

  // Exercise the native response boundary. Examples inside text remain text;
  // invalid structured results never yield partial blocks or trigger retries.
  const recovered = []
  for await (const chunk of adapter.stream({ model: 'future-alpha', messages: [{ role: 'user', content: 'response-case:fenced-tool' }], tools: [{ name: 'read_test', parameters: { type: 'object', properties: {} } }] })) recovered.push(chunk)
  assert.equal(recovered.at(-1).reason.kind, 'tool-calls')
  assert.deepEqual(JSON.parse(recovered.find(x => x.type === 'block-end').block.arguments), { target: 'sandbox.txt' })
  const literal = []
  for await (const chunk of adapter.stream({ model: 'future-alpha', messages: [{ role: 'user', content: 'response-case:native-literal' }], tools: [{ name: 'read_test', parameters: { type: 'object', properties: {} } }] })) literal.push(chunk)
  assert.equal(literal.at(-1).reason.kind, 'stop')
  assert.equal(literal.filter(x => x.type === 'block-end' && x.block.type === 'tool-call').length, 0)
  assert.ok(literal.find(x => x.type === 'block-end' && x.block.type === 'text').block.text.includes('{"toolCalls":['))
  const annotated = []
  for await (const chunk of adapter.stream({ model: 'future-alpha', messages: [{ role: 'user', content: 'response-case:annotated-tool' }], tools: [{ name: 'read_test', parameters: { type: 'object', properties: {} } }] })) annotated.push(chunk)
  assert.equal(annotated.at(-1).reason.kind, 'tool-calls')
  assert.equal(annotated.filter(x => x.type === 'block-end' && x.block.type === 'tool-call').length, 1)
  // Synthetic T11 boundary: the tool result has already arrived. Recover only
  // the final text, without replaying a model request or yielding any new tool.
  const requestCount = async () => (await readFile(path.join(binDirectory, 'requests.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse).filter(x => x.args).length
  const beforeDuplicate = await requestCount()
  const duplicate = []
  for await (const chunk of adapter.stream({ model: 'future-alpha', messages: [{ role: 'user', content: 'response-case:duplicate-tool' }], tools: [{ name: 'read_test', parameters: { type: 'object', properties: {} } }] })) duplicate.push(chunk)
  assert.equal(await requestCount() - beforeDuplicate, 1, 'the adapter invokes the CLI once and does not repair output')
  assert.equal(duplicate.at(-1).reason.kind, 'tool-calls')
  assert.equal(duplicate.filter(x => x.type === 'block-end' && x.block.type === 'tool-call').length, 2, 'repeated calls inside one plan remain in order')
  const duplicateLog = (await logAction('exportLogs')).body.entries.at(-1)
  assert.equal(duplicateLog.responseDiagnostics.outputMode, 'native-json-schema')
  assert.equal(duplicateLog.responseDiagnostics.finalResultCount, 1)
  assert.deepEqual(duplicateLog.responseDiagnostics.normalizations, [])
  const beforeFinalReply = await requestCount()
  const finalReply = []
  for await (const chunk of adapter.stream({ model: 'future-alpha', tools: [{ name: 'read_test', parameters: { type: 'object', properties: {} } }], messages: [
    { role: 'user', content: 'response-case:malformed-final-text' },
    { role: 'assistant', content: [{ type: 'tool-call', id: 'already-done', name: 'read_test', arguments: '{}' }] },
    { role: 'tool', toolCallId: 'already-done', content: '5; exit=0', isError: false }
  ] })) finalReply.push(chunk)
  assert.equal(await requestCount() - beforeFinalReply, 1, 'the adapter does not retry the CLI')
  assert.equal(finalReply.at(-1).reason.kind, 'stop')
  assert.equal(finalReply.filter(x => x.type === 'block-end' && x.block.type === 'tool-call').length, 0)
  assert.equal(finalReply.find(x => x.type === 'block-end' && x.block.type === 'text').block.text, '输出 5\n退出码 0；路径 C:\\project\\demo')
  const recoveredLog = (await logAction('exportLogs')).body.entries.at(-1)
  assert.equal(recoveredLog.responseDiagnostics.outputMode, 'native-json-schema')
  assert.equal(recoveredLog.responseDiagnostics.finalResultCount, 1)
  assert.deepEqual(recoveredLog.responseDiagnostics.normalizations, [])
  assert.equal(JSON.stringify(recoveredLog).includes('project'), false)
  assert.equal((await logAction('armCapture')).body.logs.captureArmed, true)
  const beforeFailures = (await readFile(path.join(binDirectory, 'requests.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse).filter(x => x.args).length
  const reportedFailures = []
  for (const variant of ['truncated', 'wrong-shape', 'ambiguous', 'wrong-shape', 'truncated', 'wrong-shape']) {
    const delivered = []
    await assert.rejects(async () => {
      for await (const chunk of adapter.stream({ model: 'future-alpha', messages: [{ role: 'user', content: `response-case:${variant}` }] })) delivered.push(chunk)
    }, error => {
      reportedFailures.push(error.failure)
      return variant === 'truncated' ? error.code === 'CLI_STRUCTURED_OUTPUT_MISSING'
        : error.code === 'STRUCTURED_OUTPUT_INVALID' && error.message.includes(variant === 'ambiguous' ? 'native-final-results' : 'invalid-text-field')
    })
    assert.deepEqual(delivered, [], 'invalid replies cannot deliver partial blocks')
  }
  const afterFailures = (await readFile(path.join(binDirectory, 'requests.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse).filter(x => x.args).length
  assert.equal(afterFailures - beforeFailures, 6, 'one CLI invocation per request, no paid repair or retry')
  for await (const chunk of adapter.stream({ model: 'future-alpha', messages: [{ role: 'user', content: 'normal reply after failure' }] })) {}
  const history = await (await fetch(`${origin}/plugins/dsh-codebuddy-cli-intl/status`)).json()
  assert.equal(history.usage.lastCall.state, 'success')
  assert.equal(history.usage.lastCall.responseDiagnostics.reason, 'valid')
  assert.equal(history.usage.lastCall.responseDiagnostics.outputMode, 'native-json-schema')
  assert.equal(history.usage.recentFailures.length, 5)
  assert.equal(history.usage.recentFailures[0].responseDiagnostics.reason, 'invalid-text-field')
  assert.equal(history.usage.recentFailures[1].responseDiagnostics.reason, 'native-structured-output-missing')
  assert.equal(JSON.stringify(history).includes('PRIVATE_FAILED_REPLY'), false)
  assert.equal(history.logs.captureArmed, false)
  assert.equal(history.logs.samples, 1)
  const basic = await logAction('exportLogs')
  assert.equal(basic.status, 200)
  assert.equal(basic.body.entries[0].processDiagnostics.exitCode, 0)
  assert.ok(basic.body.entries[0].processDiagnostics.stdoutBytes > 0)
  assert.equal(JSON.stringify(basic.body).includes('PRIVATE_FAILED_REPLY'), false)
  assert.equal(basic.body.entries.filter(x => x.state === 'error').length, 6)
  const failureEntries = basic.body.entries.filter(x => x.state === 'error')
  assert.equal(new Set(reportedFailures.map(x => x.requestId)).size, 6)
  assert.deepEqual(reportedFailures.map(x => x.requestId), failureEntries.map(x => x.id))
  assert.ok(reportedFailures.every(x => ['STRUCTURED_OUTPUT_INVALID', 'CLI_STRUCTURED_OUTPUT_MISSING'].includes(x.code) && x.message.includes(x.requestId)))
  assert.deepEqual(reportedFailures.map(x => x.code), ['CLI_STRUCTURED_OUTPUT_MISSING', 'STRUCTURED_OUTPUT_INVALID', 'STRUCTURED_OUTPUT_INVALID', 'STRUCTURED_OUTPUT_INVALID', 'CLI_STRUCTURED_OUTPUT_MISSING', 'STRUCTURED_OUTPUT_INVALID'])
  const detail = await logAction('exportDetailedLogs')
  assert.equal(detail.body.entries.filter(x => x.sample).length, 1)
  assert.equal(detail.body.entries.find(x => x.sample).sample.head, '{"text":"PRIVATE_FAILED_REPLY')
  const ordinaryView = await (await fetch(`${origin}/plugins/dsh-codebuddy-cli-intl/diagnostics`)).json()
  assert.equal(JSON.stringify(ordinaryView).includes('PRIVATE_FAILED_REPLY'), false)
  for (const action of ['armCapture', 'cancelCapture', 'clearLogs', 'exportLogs', 'exportDetailedLogs']) {
    assert.equal((await logAction(action, { Origin: 'https://external.example' })).status, 403)
    assert.equal((await logAction(action, { 'X-DSH-CodeBuddy-Action': '' })).status, 403)
  }
  assert.equal((await logAction('arbitrary-command')).status, 400)
  assert.equal((await logAction('clearLogs')).body.logs.entries, 0)
  assert.equal((await logAction('exportDetailedLogs')).body.entries.length, 0)
  await logAction('armCapture')
  for (const [variant, code] of [['auth-required', 'CLI_AUTH_REQUIRED'], ['empty-output', 'CLI_OUTPUT_INVALID'], ['non-json', 'CLI_OUTPUT_INVALID']]) {
    const delivered = []
    await assert.rejects(async () => {
      for await (const chunk of adapter.stream({ model: 'future-alpha', messages: [{ role: 'user', content: `response-case:${variant}` }] })) delivered.push(chunk)
    }, error => error.code === code)
    assert.deepEqual(delivered, [])
  }
  await assert.rejects(async () => {
    for await (const _chunk of adapter.stream({ model: 'future-alpha', messages: [{ role: 'user', content: 'response-case:non-json' }] })) {}
  }, error => {
    assert.equal(error.code, 'CLI_OUTPUT_INVALID')
    assert.ok(error.processDiagnostics.stdoutBytes > 0)
    assert.equal(error.responseDiagnostics.outputMode, 'native-json-schema')
    return true
  })
  const processLog = (await logAction('exportDetailedLogs')).body
  assert.equal(processLog.entries.length, 4)
  assert.equal(processLog.entries[0].errorCode, 'CLI_AUTH_REQUIRED')
  assert.equal(processLog.entries[0].pluginVersion, '0.1.7')
  assert.equal(processLog.entries[0].processDiagnostics.exitCode, 0)
  assert.equal(processLog.entries[0].processDiagnostics.stdoutBytes, 0)
  assert.ok(processLog.entries[0].processDiagnostics.stderrBytes > 0)
  assert.equal(processLog.entries[0].captureAttempted, true)
  assert.equal(JSON.stringify(processLog).includes('PRIVATE_'), false)
  const paused = adapter.stream({ model: 'future-alpha', messages: [{ role: 'user', content: 'pause consumption after first block' }] })
  assert.equal((await paused.next()).value.type, 'block-start')
  const pausedStatus = await (await fetch(`${origin}/plugins/dsh-codebuddy-cli-intl/status`)).json()
  assert.equal(pausedStatus.activeCalls, 0, 'a completed CLI call must not remain active while its consumer is paused')
  await paused.return()
  assert.equal((await (await fetch(`${origin}/plugins/dsh-codebuddy-cli-intl/status`)).json()).activeCalls, 0)

  const denied = await fetch(`${origin}/plugins/dsh-codebuddy-cli-intl/actions`, {
    method: 'POST', headers: { Origin: 'https://other.example', 'Content-Type': 'application/json', 'X-DSH-CodeBuddy-Action': '1' }, body: JSON.stringify({ action: 'setup' })
  })
  assert.equal(denied.status, 403)
})
