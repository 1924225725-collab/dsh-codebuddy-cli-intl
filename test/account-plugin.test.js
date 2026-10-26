import test from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { mkdtemp, mkdir, writeFile, readFile, chmod, rm } from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { spawnSync } from 'node:child_process'
registerHooks({ resolve(specifier, context, next) {
  if (specifier === '@deepseek-ai/schemastery') return { url: 'data:text/javascript,export default {object:x=>x,string:()=>({description(){return this},default(){return this},volatile(){return this}}),number:()=>({description(){return this},default(){return this},volatile(){return this}})}', shortCircuit: true }
  if (specifier === '@deepseek-ai/dsh-llm') return { url: 'data:text/javascript,export class LlmAdapter {}', shortCircuit: true }
  return next(specifier, context)
} })

test('account API, labelled routing and tool-image continuation keep synthetic processes on their bound profiles', { skip: process.platform !== 'win32' }, async t => {
  const { apply } = await import('../lib/index.js')
  const directory = await mkdtemp(path.join(tmpdir(), 'dsh-account-plugin-'))
  const previous = Object.fromEntries(['LOCALAPPDATA', 'DSH_FIXTURE_CLI_VERSION', 'CODEBUDDY_AUTH_TOKEN'].map(key => [key, process.env[key]]))
  process.env.LOCALAPPDATA = directory; process.env.DSH_FIXTURE_CLI_VERSION = '2.174.0'; process.env.CODEBUDDY_AUTH_TOKEN = 'PRIVATE_PARENT_TOKEN'
  const bin = path.join(directory, 'node_modules/@tencent-ai/codebuddy-code/bin'); await mkdir(bin, { recursive: true })
  const entry = path.join(bin, 'codebuddy'); await writeFile(entry, await readFile(new URL('./fixtures/fake-codebuddy.cjs', import.meta.url))); await chmod(entry, 0o755)
  const cliPath = path.join(directory, 'codebuddy.cmd'); await writeFile(cliPath, '@echo off\r\n')
  let adapter, server
  const routes = new Map(), cleanups = []
  const ctx = {
    attachments: { async readImageRequest() { return { data: Buffer.from('SYNTHETIC_IMAGE'), bytes: 15, mediaType: 'image/png', width: 2, height: 2 } } },
    llm: { registerAdapter(p, a) { adapter = a; return () => {} } },
    effect(f) { const cleanup = f(); if (typeof cleanup === 'function') cleanups.push(cleanup) },
    emit() {}, on() {}, inject(deps, f) { f(ctx) }, webServer: { register(route) { routes.set(route.path, route.handler); return () => {} } }
  }
  t.after(async () => {
    for (const cleanup of cleanups.reverse()) cleanup()
    if (server) await new Promise(resolve => server.close(resolve))
    for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value }
    await rm(directory, { recursive: true, force: true })
  })
  apply(ctx, { cliPath, timeoutMs: 15000 })
  server = createServer((req, res) => {
    const handler = routes.get(new URL(req.url, 'http://localhost').pathname)
    if (!handler) { res.writeHead(404); res.end(); return }
    Promise.resolve(handler(req, res)).catch(() => { res.writeHead(500); res.end() })
  })
  server.listen(0, '127.0.0.1'); await once(server, 'listening')
  const origin = `http://127.0.0.1:${server.address().port}`
  const action = async (body, headers = {}) => {
    const response = await fetch(`${origin}/plugins/dsh-codebuddy-cli-intl/accounts`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'X-DSH-CodeBuddy-Action': '1', ...headers }, body: JSON.stringify(body) })
    return { status: response.status, body: await response.json() }
  }
  assert.equal((await action({ action: 'add', label: 'blocked' }, { Origin: 'https://outside.example' })).status, 403)
  assert.equal((await action({ action: 'exec', command: 'anything' })).status, 400)
  assert.equal((await action({ action: 'add', label: '' })).status, 409)
  let state = (await action({ action: 'add', label: 'Synthetic A' })).body
  const a = state.accounts.accounts[0]
  state = (await action({ action: 'add', label: 'Synthetic B' })).body
  const b = state.accounts.accounts[1]
  assert.equal(state.accounts.selectedId, null)
  const prepared = await action({ action: 'prepareLogin', id: a.id })
  assert.equal(prepared.status, 200, JSON.stringify(prepared.body))
  const accountRoot = path.join(directory, 'dsh-codebuddy-cli-intl', 'accounts')
  const script = await readFile(path.join(accountRoot, a.id, 'login.ps1'), 'utf8')
  assert.ok(script.includes('USERPROFILE'))
  assert.ok(script.includes(a.id))
  assert.ok(script.includes('"--setting-sources" ""'))
  assert.ok(script.includes('System.Diagnostics.ProcessStartInfo'))
  assert.equal(script.includes('PRIVATE_PARENT_TOKEN'), false)
  const loginProbe = spawnSync(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe'), ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(accountRoot, a.id, 'login.ps1')], {
    env: { ...process.env, DSH_FIXTURE_LOGIN_PROBE: '1' }, windowsHide: true, encoding: 'utf8', timeout: 10000
  })
  assert.equal(loginProbe.status, 0, `generated login script must run under Windows PowerShell 5.1 against the inert fixture: ${loginProbe.stderr.slice(0, 1600)}`)
  const loginRecord = (await readFile(path.join(bin, 'requests.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse).find(x => x.loginArgs)
  assert.equal(loginRecord.competingAuth, false)
  assert.ok(loginRecord.accountHome.includes(a.id))
  assert.equal(loginRecord.home, loginRecord.accountHome)
  assert.ok(loginRecord.configDir.includes(a.id))
  assert.equal(loginRecord.internetEnvironment, 'public')
  assert.deepEqual(loginRecord.loginArgs, ['--tools', '', '--setting-sources', '', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}'])
  const futureVersion = spawnSync(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe'), ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(accountRoot, a.id, 'login.ps1')], {
    env: { ...process.env, DSH_FIXTURE_LOGIN_PROBE: '1', DSH_FIXTURE_CLI_VERSION: '2.175.0' }, windowsHide: true, encoding: 'utf8', timeout: 10000
  })
  assert.notEqual(futureVersion.status, 0, 'a prepared script must refuse a later unverified CLI before opening sign-in')
  assert.equal((await readFile(path.join(bin, 'requests.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse).filter(x => x.loginArgs).length, 1)
  const loginCommand = (await action({ action: 'select', id: a.id })).body.loginCommand
  assert.ok(loginCommand.includes('login.ps1'))
  const { accountModelId } = await import('../lib/accounts.js')
  const pinnedA = accountModelId(a.id, 'future-alpha')
  const collect = async options => { const chunks = []; for await (const chunk of adapter.stream(options)) chunks.push(chunk); return chunks }
  await assert.rejects(collect({ model: pinnedA, messages: [{ role: 'user', content: 'hello' }] }), e => e.code === 'ACCOUNT_LOGIN_REQUIRED')
  for (const account of [a, b]) {
    const auth = path.join(accountRoot, account.id, 'home/AppData/Local/CodeBuddyExtension/Data/Public/auth')
    await mkdir(auth, { recursive: true }); await writeFile(path.join(auth, 'synthetic.info'), 'SYNTHETIC_NOT_A_TOKEN')
  }
  await fetch(`${origin}/plugins/dsh-codebuddy-cli-intl/actions`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'X-DSH-CodeBuddy-Action': '1' }, body: JSON.stringify({ action: 'refreshModels' }) })
  const models = await adapter.listModels('codebuddy-cli-intl')
  assert.equal(models[0].id, pinnedA); assert.ok(models[0].name.startsWith('[Synthetic A]'))
  assert.equal((await adapter.resolveModel('codebuddy-cli-intl', pinnedA)).id, pinnedA)
  await assert.rejects(collect({ model: 'future-alpha', messages: [{ role: 'user', content: 'hello' }] }), e => e.code === 'ACCOUNT_MODEL_REQUIRED')
  const tools = [{ name: 'read_test', parameters: { type: 'object', properties: {} } }]
  const plan = await collect({ model: pinnedA, messages: [{ role: 'user', content: 'tool-round' }], tools })
  const call = plan.find(x => x.type === 'block-end' && x.block.type === 'tool-call').block
  await action({ action: 'select', id: b.id })
  const bModels = await adapter.listModels('codebuddy-cli-intl')
  assert.ok(bModels[0].name.startsWith('[Synthetic B]'))
  assert.notEqual(bModels[0].id, pinnedA)
  const final = await collect({ model: pinnedA, messages: [
    { role: 'user', content: 'tool-round' }, { role: 'assistant', content: [call] },
    { role: 'tool', toolCallId: call.id, content: [{ type: 'text', text: 'synthetic tool result' }, { type: 'image', attachment: { attachmentId: 'synthetic', mediaType: 'image/png', width: 2, height: 2, bytes: 15 } }] }
  ], tools })
  assert.equal(final.at(-1).reason.kind, 'stop')
  await assert.rejects(collect({ model: pinnedA, messages: [{ role: 'user', content: 'response-case:auth-required' }] }), e => e.code === 'CLI_AUTH_REQUIRED')
  await collect({ model: bModels[0].id, messages: [{ role: 'user', content: 'hello B' }] })
  const calls = (await readFile(path.join(bin, 'requests.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse).filter(x => x.args)
  assert.equal(calls.length, 4, 'the failed A request is not retried or rerouted to B')
  assert.ok(calls[0].accountHome.includes(a.id)); assert.ok(calls[1].accountHome.includes(a.id)); assert.ok(calls[2].accountHome.includes(a.id)); assert.ok(calls[3].accountHome.includes(b.id))
  for (const call of calls) {
    assert.equal(call.competingAuth, false)
    assert.equal(call.args[call.args.indexOf('--model') + 1], 'future-alpha')
    assert.equal(call.args[call.args.indexOf('--setting-sources') + 1], 'user')
    assert.equal(call.args[call.args.indexOf('--tools') + 1], 'StructuredOutput')
  }
  state = await (await fetch(`${origin}/plugins/dsh-codebuddy-cli-intl/status`)).json()
  assert.equal(state.accounts.accounts[0].usage.calls, 4, 'A includes one blocked missing-login request, two successful calls and one 401')
  assert.equal(state.accounts.accounts[1].usage.calls, 1)
  assert.equal(state.usage.lastCall.accountId, b.id)
  assert.equal((await action({ action: 'remove', id: b.id })).status, 409)
  await action({ action: 'remove', id: a.id })
  await assert.rejects(collect({ model: pinnedA, messages: [{ role: 'user', content: 'hello' }] }), e => e.code === 'ACCOUNT_NOT_FOUND')
  assert.equal((await action({ action: 'select', id: null })).status, 200)
  assert.equal((await adapter.listModels('codebuddy-cli-intl'))[0].id, 'future-alpha')
  const logs = await (await fetch(`${origin}/plugins/dsh-codebuddy-cli-intl/diagnostics`)).json()
  assert.ok(logs.entries.some(x => x.accountId === a.id))
  assert.equal(JSON.stringify(logs).includes('Synthetic A'), false)
  assert.equal(JSON.stringify(logs).includes(accountRoot.replaceAll('\\', '\\\\')), false)
  assert.equal(JSON.stringify(logs).includes('PRIVATE_PARENT_TOKEN'), false)
})

