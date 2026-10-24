import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createDiagnosticsStore } from '../lib/diagnostics.js'

async function setup(t) {
  const directory = await mkdtemp(path.join(tmpdir(), 'dsh-diagnostics-test-'))
  t.after(async () => {
    const relative = path.relative(tmpdir(), directory)
    if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) await rm(directory, { recursive: true, force: true })
  })
  return { directory, store: createDiagnosticsStore({ directory }) }
}
const call = { state: 'error', at: 1000, model: 'test-model', durationMs: 20, errorCode: 'STRUCTURED_OUTPUT_INVALID',
  diagnostics: { promptBytes: 10, messageCount: 2 }, responseDiagnostics: { reason: 'possibly-truncated-json', completeContainers: 1,
    scanIncomplete: true, scanBroken: false, insideString: true, openContainerDepth: 1, incompleteTailIgnored: false, normalizations: [] } }

test('basic logs use a field allowlist, persist across restarts and exclude raw replies from every basic export', async t => {
  const { directory, store } = await setup(t)
  await store.record({ ...call, errorMessage: 'SECRET_MESSAGE', configDir: 'SECRET_PATH', diagnostics: { ...call.diagnostics, prompt: 'SECRET_PROMPT' }, responseDiagnostics: { ...call.responseDiagnostics, arbitrary: 'SECRET_KEYS' } }, 'SECRET_REPLY')
  assert.equal(JSON.stringify(await store.export(true)).includes('SECRET'), false)
  store.arm()
  await store.record(call, 'PRIVATE_REPLY')
  assert.equal(store.status().captureArmed, false)
  const basic = JSON.stringify(await store.export())
  assert.equal(basic.includes('PRIVATE_REPLY'), false)
  assert.equal(JSON.parse(basic).privacy.includesRawReplies, false)
  assert.equal(JSON.parse(basic).entries[1].sampleAvailable, true)
  assert.equal(JSON.parse(basic).entries[0].responseDiagnostics.scanIncomplete, true)
  assert.equal(JSON.parse(basic).entries[0].responseDiagnostics.scanBroken, false)
  assert.equal(JSON.parse(basic).entries[0].responseDiagnostics.insideString, true)
  assert.equal(JSON.parse(basic).entries[0].responseDiagnostics.openContainerDepth, 1)
  const restored = createDiagnosticsStore({ directory })
  await restored.ready
  assert.equal(restored.status().captureArmed, false)
  assert.equal(restored.status().entries, 2)
  const detailed = await restored.export(true)
  assert.equal(detailed.entries[1].sample.head, 'PRIVATE_REPLY')
  assert.equal(detailed.entries[1].pluginVersion, '0.1.5')
  assert.equal(detailed.privacy.includesRawReplies, true)
  assert.equal(JSON.stringify(await restored.export()).includes('PRIVATE_REPLY'), false)
})

test('one-time capture survives success, captures only the next failure and supports cancellation and clearing', async t => {
  const { directory, store } = await setup(t)
  store.arm()
  await store.record({ ...call, state: 'success' }, 'SUCCESS_PRIVATE')
  assert.equal(store.status().captureArmed, true)
  await store.record(call, 'FIRST_PRIVATE')
  await store.record(call, 'SECOND_PRIVATE')
  let detailed = JSON.stringify(await store.export(true))
  assert.equal(detailed.includes('SUCCESS_PRIVATE'), false)
  assert.equal(detailed.includes('FIRST_PRIVATE'), true)
  assert.equal(detailed.includes('SECOND_PRIVATE'), false)
  store.arm(); store.disarm()
  await store.record(call, 'CANCELLED_PRIVATE')
  assert.equal(JSON.stringify(await store.export(true)).includes('CANCELLED_PRIVATE'), false)
  store.arm(); await store.clear()
  assert.equal(store.status().captureArmed, false)
  assert.deepEqual((await store.export(true)).entries, [])
  assert.equal((await readFile(path.join(directory, 'diagnostics.json'), 'utf8')).includes('PRIVATE'), false)
  const restored = createDiagnosticsStore({ directory }); await restored.ready
  assert.equal(restored.status().entries, 0)
})

test('user-aborted requests preserve failure capture for the next real failure', async t => {
  const { store } = await setup(t)
  store.arm()
  await store.record({ ...call, errorCode: 'ABORTED' }, 'CANCELLED_PARTIAL_PRIVATE')
  assert.equal(store.status().captureArmed, true)
  assert.equal(store.status().samples, 0)
  assert.equal((await store.export()).entries[0].captureAttempted, undefined)
  await store.record(call, 'NEXT_REAL_FAILURE_PRIVATE')
  assert.equal(store.status().captureArmed, false)
  const report = await store.export(true)
  assert.equal(report.entries[1].sample.head, 'NEXT_REAL_FAILURE_PRIVATE')
  assert.equal(JSON.stringify(report).includes('CANCELLED_PARTIAL_PRIVATE'), false)
  assert.equal(JSON.stringify(await store.export()).includes('NEXT_REAL_FAILURE_PRIVATE'), false)
})

test('bounds stored records and raw samples, preserves both ends and serializes concurrent writes', async t => {
  const { directory, store } = await setup(t)
  await Promise.all(Array.from({ length: 105 }, (_, n) => store.record({ ...call, at: n })))
  assert.equal(store.status().entries, 100)
  assert.equal((await store.export()).entries[0].at, 5)
  store.arm()
  await store.record(call, 'HEAD_' + 'x'.repeat(400000) + '_TAIL')
  const detailed = await store.export(true)
  const sample = detailed.entries.at(-1).sample
  assert.equal(sample.truncated, true)
  assert.equal(sample.originalBytes, 400010)
  assert.ok(sample.head.startsWith('HEAD_'))
  assert.ok(sample.tail.endsWith('_TAIL'))
  assert.ok(Buffer.byteLength(sample.head) + Buffer.byteLength(sample.tail) <= 256 * 1024)
  assert.ok(Buffer.byteLength(await readFile(path.join(directory, 'diagnostics.json'))) <= 2 * 1024 * 1024)
  store.arm()
  await store.record(call, '你'.repeat(100000))
  const unicode = (await store.export(true)).entries.at(-1).sample
  assert.ok(Buffer.byteLength(unicode.head) + Buffer.byteLength(unicode.tail) <= 256 * 1024)
  assert.equal((unicode.head + unicode.tail).includes('\uFFFD'), false)
})

test('storage failures do not reject model logging and leave in-memory exports available', async t => {
  const { directory } = await setup(t)
  const blocker = path.join(directory, 'blocker')
  await writeFile(blocker, 'not a directory')
  const store = createDiagnosticsStore({ directory: blocker })
  await store.record(call)
  assert.equal(store.status().storageError, 'LOG_WRITE_FAILED')
  assert.equal((await store.export()).entries.length, 1)
})
