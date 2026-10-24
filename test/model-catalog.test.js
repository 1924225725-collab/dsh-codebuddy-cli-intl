import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizeCatalog, createModelCatalog, queryModelCatalog, modelInfo } from '../lib/model-catalog.js'

const response = (ids = ['newly-released']) => ({ models: { currentModelId: ids[0], availableModels: ids.map((modelId) => ({
  modelId, name: modelId, _meta: { credits: 'x0.07 credits', supportsReasoning: true, supportsImages: true, maxInputTokens: 1000000, effortOptions: [{ value: 'high', name: 'High' }] }
})) } })

test('discovers arbitrary new models, preserves zero rates, and leaves missing rates unknown', () => {
  const value = response()
  value.models.availableModels.push(
    { modelId: 'free-new', name: 'Free new', _meta: { credits: 'x0.00 credits' } },
    { modelId: 'unknown-rate' }, { modelId: 'unknown-rate' }, { modelId: '' }
  )
  const catalog = normalizeCatalog(value)
  assert.deepEqual(catalog.models.map((item) => item.id), ['newly-released', 'free-new', 'unknown-rate'])
  assert.equal(catalog.models[1].multiplier, 0)
  assert.equal(catalog.models[2].multiplier, null)
  const info = modelInfo('provider', catalog.models[0], 'unsupported')
  assert.equal(info.name, 'newly-released · ×0.07')
  assert.deepEqual(info.reasoning.efforts, [{ id: 'high', name: 'High' }])
  assert.equal(info.reasoning.defaultEffort, undefined)
  assert.equal(info.context.contextWindow, 1000000)
  assert.deepEqual(info.inputModalities, ['text', 'image'])
  const textOnly = modelInfo('provider', { id: 'text-only', name: 'text-only', supportsImages: false })
  assert.deepEqual(textOnly.inputModalities, ['text'])
})

test('refreshes new models and prices after expiry, deduplicates concurrent discovery, and preserves stale results on failure', async () => {
  let time = 0
  let calls = 0
  let fail = false
  const cache = createModelCatalog(async () => {
    calls += 1
    if (fail) throw new Error('private diagnostic')
    return normalizeCatalog(response(calls === 1 ? ['first'] : ['first', 'new-after-update']))
  }, { now: () => time, ttlMs: 100, retryMs: 10 })
  const config = { cliPath: '', configDir: '' }
  const [first, same] = await Promise.all([cache.get(config), cache.get(config, { force: true })])
  assert.equal(calls, 1)
  assert.deepEqual(first.models, same.models)
  await cache.get(config)
  assert.equal(calls, 1)
  time = 101
  assert.equal((await cache.get(config)).models.length, 2)
  fail = true
  const stale = await cache.get(config, { force: true })
  assert.equal(stale.state, 'stale')
  assert.equal(stale.models.length, 2)
  assert.ok(!JSON.stringify(stale).includes('private diagnostic'))
  assert.equal(cache.snapshot({ ...config, configDir: 'other-account' }).models.length, 0)
})

test('ACP discovery uses initialize and session/new only, with tools disabled', async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'dsh-catalog-test-'))
  let child
  let closed
  t.after(async () => { if (closed) await closed; await rm(directory, { recursive: true, force: true }) })
  const fixture = fileURLToPath(new URL('./fixtures/fake-codebuddy.cjs', import.meta.url))
  const result = await queryModelCatalog({ cliPath: process.execPath }, {
    timeoutMs: 5000,
    spawnImpl(command, args, options) {
      assert.equal(args.includes('--print'), false)
      assert.equal(args[args.indexOf('--tools') + 1], '')
      assert.equal(options.env.CODEBUDDY_INTERNET_ENVIRONMENT, 'public')
      child = spawn(process.execPath, [fixture, '--acp'], { ...options, env: { ...options.env, DSH_FIXTURE_DIR: directory } })
      closed = once(child, 'close')
      return child
    }
  })
  assert.equal(result.models[0].name, '未来 Alpha')
  assert.deepEqual((await readFile(path.join(directory, 'requests.jsonl'), 'utf8')).trim().split('\n').map((line) => JSON.parse(line).method), ['initialize', 'session/new'])
})

test('aborting discovery settles without sending a model prompt', async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'dsh-cancel-test-'))
  let closed
  t.after(async () => { if (closed) await closed; await rm(directory, { recursive: true, force: true }) })
  const controller = new AbortController()
  const pending = queryModelCatalog({ cliPath: process.execPath }, {
    signal: controller.signal,
    spawnImpl(command, args, options) {
      const child = spawn(process.execPath, [fileURLToPath(new URL('./fixtures/fake-codebuddy.cjs', import.meta.url)), '--acp', '--hang'], { ...options, env: { ...options.env, DSH_FIXTURE_DIR: directory } })
      closed = once(child, 'close')
      setTimeout(() => controller.abort(), 80)
      return child
    }
  })
  await assert.rejects(pending, (error) => error.code === 'ABORTED')
})
