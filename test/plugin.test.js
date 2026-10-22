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
  assert.ok(calls.every((call) => !call.args.includes('--json-schema')), 'avoid CLI internal structured-output retry calls')
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
  const status = await (await fetch(`${origin}/plugins/dsh-codebuddy-cli-intl/status`)).json()
  assert.equal(status.catalog.models.length, 2)
  assert.equal(status.pluginVersion, JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')).version)
  assert.equal(status.timeoutMs, 15000)
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

  // Exercise recovery through the full process/adapter boundary, then verify
  // invalid output never yields partial text/tools or triggers another call.
  const recovered = []
  for await (const chunk of adapter.stream({ model: 'future-alpha', messages: [{ role: 'user', content: 'response-case:fenced-tool' }], tools: [{ name: 'read_test', parameters: { type: 'object', properties: {} } }] })) recovered.push(chunk)
  assert.equal(recovered.at(-1).reason.kind, 'tool-calls')
  assert.deepEqual(JSON.parse(recovered.find(x => x.type === 'block-end').block.arguments), { target: 'sandbox.txt' })
  const beforeFailures = (await readFile(path.join(binDirectory, 'requests.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse).filter(x => x.args).length
  for (const variant of ['truncated', 'wrong-shape', 'truncated', 'wrong-shape', 'truncated', 'wrong-shape']) {
    const delivered = []
    await assert.rejects(async () => {
      for await (const chunk of adapter.stream({ model: 'future-alpha', messages: [{ role: 'user', content: `response-case:${variant}` }] })) delivered.push(chunk)
    }, error => error.code === 'STRUCTURED_OUTPUT_INVALID' && error.message.includes(variant === 'truncated' ? 'possibly-truncated-json' : 'invalid-text-field'))
    assert.deepEqual(delivered, [], 'invalid replies cannot deliver partial blocks')
  }
  const afterFailures = (await readFile(path.join(binDirectory, 'requests.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse).filter(x => x.args).length
  assert.equal(afterFailures - beforeFailures, 6, 'one CLI invocation per request, no paid repair or retry')
  for await (const chunk of adapter.stream({ model: 'future-alpha', messages: [{ role: 'user', content: 'normal reply after failure' }] })) {}
  const history = await (await fetch(`${origin}/plugins/dsh-codebuddy-cli-intl/status`)).json()
  assert.equal(history.usage.lastCall.state, 'success')
  assert.equal(history.usage.lastCall.responseDiagnostics.reason, 'valid')
  assert.equal(history.usage.recentFailures.length, 5)
  assert.equal(history.usage.recentFailures[0].responseDiagnostics.reason, 'invalid-text-field')
  assert.equal(history.usage.recentFailures[1].responseDiagnostics.reason, 'possibly-truncated-json')
  assert.equal(JSON.stringify(history).includes('PRIVATE_FAILED_REPLY'), false)

  const denied = await fetch(`${origin}/plugins/dsh-codebuddy-cli-intl/actions`, {
    method: 'POST', headers: { Origin: 'https://other.example', 'Content-Type': 'application/json', 'X-DSH-CodeBuddy-Action': '1' }, body: JSON.stringify({ action: 'setup' })
  })
  assert.equal(denied.status, 403)
})
