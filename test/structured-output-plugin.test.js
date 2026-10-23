import test from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { mkdtemp, mkdir, readFile, writeFile, chmod, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

const schemaStub = `const field=()=>({description(){return this},default(value){this.fallback=value;return this},volatile(){return this}});export default {string:field,number:field,object:shape=>({shape})}`
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === '@deepseek-ai/schemastery') return { url: `data:text/javascript,${encodeURIComponent(schemaStub)}`, shortCircuit: true }
    if (specifier === '@deepseek-ai/dsh-llm') return { url: 'data:text/javascript,export class LlmAdapter {}', shortCircuit: true }
    return next(specifier, context)
  }
})

test('international adapter uses only bounded StructuredOutput, validates official results and never retries or selects conflicts', async (t) => {
  const { apply } = await import('../lib/index.js')
  const directory = await mkdtemp(path.join(tmpdir(), 'dsh-intl-native-output-test-'))
  const stateKey = process.platform === 'win32' ? 'LOCALAPPDATA' : process.platform === 'darwin' ? 'HOME' : 'XDG_STATE_HOME'
  const oldStateRoot = process.env[stateKey]
  process.env[stateKey] = directory
  const binDirectory = process.platform === 'win32'
    ? path.join(directory, 'node_modules', '@tencent-ai', 'codebuddy-code', 'bin') : directory
  await mkdir(binDirectory, { recursive: true })
  const entry = path.join(binDirectory, 'codebuddy')
  await writeFile(entry, await readFile(new URL('./fixtures/fake-codebuddy.cjs', import.meta.url)))
  await chmod(entry, 0o755)
  const executable = process.platform === 'win32' ? path.join(directory, 'codebuddy.cmd') : entry
  if (process.platform === 'win32') await writeFile(executable, '@echo off\r\n')
  const cleanups = []
  let adapter
  const ctx = {
    llm: { registerAdapter(providers, value) { adapter = value; return () => {} } },
    effect(callback) { const dispose = callback(); if (typeof dispose === 'function') cleanups.push(dispose) },
    on() {}, emit() {}, inject(deps, callback) { callback(ctx) },
    webServer: { register() { return () => {} } }
  }
  t.after(async () => {
    for (const cleanup of cleanups.reverse()) cleanup()
    if (oldStateRoot === undefined) delete process.env[stateKey]
    else process.env[stateKey] = oldStateRoot
    const relative = path.relative(tmpdir(), directory)
    if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) await rm(directory, { recursive: true, force: true })
  })
  apply(ctx, { cliPath: executable, configDir: '', model: '', effort: '', timeoutMs: 10000 })

  const tools = [{ name: 'read_test', description: 'Synthetic DSH tool; this test never executes it.', parameters: {
    type: 'object', properties: { target: { type: 'string' } }, required: ['target'], additionalProperties: false
  } }]
  const call = async (content) => {
    const chunks = []
    for await (const chunk of adapter.stream({ model: 'future-alpha', messages: [{ role: 'user', content }], tools })) chunks.push(chunk)
    return chunks
  }
  const failed = async (content, code) => {
    const chunks = []
    await assert.rejects(async () => {
      for await (const chunk of adapter.stream({ model: 'future-alpha', messages: [{ role: 'user', content }], tools })) chunks.push(chunk)
    }, error => error.code === code)
    assert.deepEqual(chunks, [], 'failed structured output must not deliver partial text or tools')
  }

  const valid = await call('native-route:valid tool-round')
  assert.equal(valid.at(-1).reason.kind, 'tool-calls')
  assert.deepEqual(JSON.parse(valid.find(chunk => chunk.type === 'block-end').block.arguments), { target: 'sandbox.txt' })
  await failed('native-route:missing tool-round', 'CLI_STRUCTURED_OUTPUT_MISSING')
  await failed('native-route:conflict', 'STRUCTURED_OUTPUT_INVALID')
  await failed('native-route:cli-error tool-round', 'CLI_REQUEST_FAILED')
  await failed('native-route:identical-duplicate tool-round', 'STRUCTURED_OUTPUT_INVALID')

  const records = (await readFile(path.join(binDirectory, 'requests.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse)
  const requests = records.filter(record => record.args)
  assert.equal(requests.length, 5, 'one CLI invocation per request; no adapter repair or retry')
  for (const request of requests) {
    const args = request.args
    assert.equal(args[args.indexOf('--output-format') + 1], 'json')
    assert.ok(args.includes('--json-schema'))
    const schema = JSON.parse(args[args.indexOf('--json-schema') + 1])
    assert.deepEqual(schema.required, ['text', 'toolCalls'])
    assert.equal(schema.properties.toolCalls.items.properties.name.enum[0], 'read_test')
    assert.equal(args[args.indexOf('--tools') + 1], 'StructuredOutput')
    assert.ok(args.includes('--strict-mcp-config'))
    const mcpConfig = JSON.parse(args[args.indexOf('--mcp-config') + 1])
    assert.deepEqual(mcpConfig, { mcpServers: {} })
    const turns = Number(args[args.indexOf('--max-turns') + 1])
    assert.ok(turns >= 2 && turns <= 4, 'internal structured-processing turns must be bounded')
    const systemPrompt = args[args.indexOf('--system-prompt') + 1]
    assert.ok(systemPrompt.includes('StructuredOutput'))
    assert.ok(systemPrompt.includes('The only CodeBuddy built-in tool you may use'))
    assert.ok(!systemPrompt.includes('Never use built-in tools'))
    const envelope = JSON.parse(request.input.slice(request.input.indexOf('{"protocol"')))
    assert.ok(!envelope.instructions.includes('任何 CodeBuddy 工具'))
  }
})
