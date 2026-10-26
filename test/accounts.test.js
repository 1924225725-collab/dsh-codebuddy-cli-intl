import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, rm, rmdir, symlink, unlink } from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { createAccountStore, isolatedAccountEnv, accountModelId, parseAccountModel, assertAccountInvocation } from '../lib/accounts.js'
import { cliEnv } from '../lib/cli-runtime.js'

async function setup(t, options = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), 'dsh-accounts-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  return { directory, store: createAccountStore({ directory, platform: 'win32', ...options }) }
}
test('accounts persist only bounded metadata, require explicit selection and retain private files on removal', async t => {
  const { directory, store } = await setup(t)
  const a = await store.add('账号 A'), b = await store.add('账号 B')
  assert.equal((await store.snapshot()).selectedId, null)
  await store.select(a.id)
  const config = await store.selected({ configDir: '/old', cliPath: '/cli' })
  assert.equal(config.accountId, a.id)
  assert.notEqual(config.configDir, '/old')
  assert.ok(config.accountHome.startsWith(directory))
  const afterRestart = createAccountStore({ directory, platform: 'win32' })
  assert.equal((await afterRestart.selected({})).accountId, a.id)
  await assert.rejects(store.remove(a.id), e => e.code === 'ACCOUNT_IN_USE')
  const release = store.begin(config)
  await store.select(b.id)
  await assert.rejects(store.remove(a.id), e => e.code === 'ACCOUNT_IN_USE')
  release(); release()
  await store.remove(a.id)
  assert.ok(await readFile(path.join(directory, 'index.json'), 'utf8'))
  const metadata = JSON.parse(await readFile(path.join(directory, 'index.json'), 'utf8'))
  assert.equal(metadata.accounts.length, 1)
  assert.equal(JSON.stringify(metadata).includes('accountHome'), false)
  await assert.rejects(store.route({}, accountModelId(a.id, 'model'), { required: true }), e => e.code === 'ACCOUNT_NOT_FOUND')
})
test('a selected account never accepts legacy models or redirects a model bound to another account', async t => {
  const { store } = await setup(t, { resolveInvocation: async () => ({ command: 'C:\\Program Files\\nodejs\\node.exe', args: ['C:\\npm\\node_modules\\@tencent-ai\\codebuddy-code\\bin\\codebuddy'] }) })
  const a = await store.add('A'), b = await store.add('B')
  await store.select(a.id)
  await assert.rejects(store.route({}, 'legacy-model', { required: true }), e => e.code === 'ACCOUNT_MODEL_REQUIRED')
  const model = accountModelId(a.id, 'future:model/a %中')
  assert.ok(model.startsWith('dshcbi-account:'))
  assert.equal(model.startsWith('dshcb-account:'), false)
  assert.equal(parseAccountModel(model).model, 'future:model/a %中')
  await store.select(b.id)
  assert.equal((await store.route({}, model, { required: true })).config.accountId, a.id)
  await store.select(null)
  assert.equal((await store.route({}, model, { required: true })).config.accountId, a.id)
  assert.equal((await store.route({}, 'legacy-model', { required: true })).config.accountId, undefined)
  for (const value of ['dshcbi-account:../x:a', `dshcbi-account:${a.id}:%ZZ`, `dshcbi-account:${a.id}:`]) assert.throws(() => parseAccountModel(value), e => e.code === 'ACCOUNT_MODEL_INVALID')
})
test('isolated child env scrubs competing credentials and preserves the parent and network proxy', () => {
  const parent = { USERPROFILE: 'old', Home: 'old', localappdata: 'old', CODEBUDDY_API_KEY: 'PRIVATE_A', codebuddy_auth_token: 'PRIVATE_B', CODEBUDDY_CLI_AUTH_FILE: '/private', CODEBUDDY_BASE_URL: '/other', WORKBUDDY_CONFIG_DIR: '/other', ACC_PRODUCT_CONFIG_PATH: '/other', ANTHROPIC_AUTH_TOKEN: 'PRIVATE_C', NODE_OPTIONS: '--require private', HTTPS_PROXY: 'http://proxy', Path: '/node' }
  const config = { accountHome: path.resolve('isolated home'), configDir: path.resolve('isolated config') }
  const env = isolatedAccountEnv(config, parent)
  assert.equal(env.USERPROFILE, config.accountHome)
  assert.equal(env.CODEBUDDY_CONFIG_DIR, config.configDir)
  assert.equal(env.CODEBUDDY_INTERNET_ENVIRONMENT, 'public')
  assert.equal(env.HTTPS_PROXY, 'http://proxy')
  assert.equal(JSON.stringify(env).includes('PRIVATE_'), false)
  assert.equal(env.CODEBUDDY_BASE_URL, undefined)
  assert.equal(env.NODE_OPTIONS, undefined)
  assert.equal(parent.USERPROFILE, 'old')
  assert.deepEqual(cliEnv(config, parent), env)
  assert.equal(cliEnv({}, parent).CODEBUDDY_API_KEY, 'PRIVATE_A', 'legacy behavior remains unchanged')
})
test('missing credentials and unverified CLI versions fail closed without reading token contents', async t => {
  const { store } = await setup(t, { resolveInvocation: async () => ({ command: 'C:\\Program Files\\nodejs\\node.exe', args: ['C:\\npm\\node_modules\\@tencent-ai\\codebuddy-code\\bin\\codebuddy'] }) })
  const a = await store.add('A'); await store.select(a.id)
  const config = await store.selected({})
  let inspections = 0
  const inspect = async () => { inspections++; return { version: '2.174.0', path: 'C:\\npm\\codebuddy.cmd' } }
  await assert.rejects(store.assertReady(config, inspect), e => e.code === 'ACCOUNT_LOGIN_REQUIRED')
  assert.equal(inspections, 0)
  const auth = path.join(config.accountHome, 'AppData', 'Local', 'CodeBuddyExtension', 'Data', 'Public', 'auth')
  await mkdir(auth, { recursive: true }); await writeFile(path.join(auth, 'synthetic.info'), 'SYNTHETIC_NOT_A_TOKEN')
  await store.assertReady(config, inspect)
  await assert.rejects(store.assertReady(config, async () => ({ version: '2.175.0', path: 'C:\\npm\\codebuddy.cmd' })), e => e.code === 'ACCOUNT_CLI_UNVERIFIED')
  const snapshot = await store.snapshot()
  assert.equal(snapshot.accounts[0].credentialsPresent, true)
  assert.equal(JSON.stringify(snapshot).includes('SYNTHETIC_NOT_A_TOKEN'), false)
  await writeFile(path.join(auth, 'synthetic.info.logged-out'), '')
  await assert.rejects(store.assertReady(config, inspect), e => e.code === 'ACCOUNT_LOGIN_REQUIRED')
})
test('corrupt metadata cannot silently select the default account, and platform support is explicit', async t => {
  const { directory, store } = await setup(t)
  await writeFile(path.join(directory, 'index.json'), '{')
  await assert.rejects(store.selected({}), e => e.code === 'ACCOUNT_STORE_INVALID')
  assert.equal((await store.snapshot()).storageError, 'ACCOUNT_STORE_INVALID')
  const other = createAccountStore({ directory: path.join(directory, 'other'), platform: 'linux' })
  assert.equal((await other.snapshot()).supported, false)
  assert.equal((await other.selected({ cliPath: '/legacy' })).cliPath, '/legacy')
  await assert.rejects(other.add('A'), e => e.code === 'ACCOUNT_PLATFORM_UNVERIFIED')
})
test('concurrent additions serialize and invalid labels or arbitrary paths are rejected', async t => {
  const { store } = await setup(t)
  await Promise.all([store.add('A'), store.add('B')])
  assert.equal((await store.snapshot()).accounts.length, 2)
  for (const label of ['', 'x'.repeat(41), 'line\nfeed']) await assert.rejects(store.add(label), e => e.code === 'ACCOUNT_LABEL_INVALID')
  await assert.rejects(store.select('../../other'), e => e.code === 'ACCOUNT_NOT_FOUND')
})
test('linked configuration directories cannot escape the account environment', async t => {
  const { directory, store } = await setup(t)
  const a = await store.add('A'); await store.select(a.id)
  const config = await store.selected({})
  const outside = path.join(directory, 'outside'); await mkdir(outside)
  await rmdir(config.configDir)
  try { await symlink(outside, config.configDir, process.platform === 'win32' ? 'junction' : 'dir') }
  catch (error) { if (error.code === 'EPERM') { t.skip('symlink unavailable'); return }; throw error }
  await assert.rejects(store.selected({}), error => error.code === 'ACCOUNT_PATH_INVALID')
})
test('native executables and unrelated Node entrypoints cannot claim the verified account runtime', () => {
  assert.throws(() => assertAccountInvocation({ command: 'C:\\bin\\codebuddy.exe', args: [] }), error => error.code === 'ACCOUNT_CLI_RUNTIME_UNVERIFIED')
  assert.throws(() => assertAccountInvocation({ command: 'C:\\bin\\node.exe', args: ['C:\\custom.js'] }), error => error.code === 'ACCOUNT_CLI_RUNTIME_UNVERIFIED')
  assert.doesNotThrow(() => assertAccountInvocation({ command: 'C:\\bin\\node.exe', args: ['C:\\npm\\node_modules\\@tencent-ai\\codebuddy-code\\bin\\codebuddy'] }))
})
test('a missing index beside existing profiles cannot turn into default-account fallback, including after restart', async t => {
  const { directory, store } = await setup(t)
  const a = await store.add('A'); await store.select(a.id)
  await unlink(path.join(directory, 'index.json'))
  await assert.rejects(store.selected({}), e => e.code === 'ACCOUNT_STORE_INVALID')
  await assert.rejects(createAccountStore({ directory, platform: 'win32' }).selected({}), e => e.code === 'ACCOUNT_STORE_INVALID')
  assert.equal((await store.snapshot()).storageError, 'ACCOUNT_STORE_INVALID')
})

test('an existing cross-process lock is never taken over and account removal retains official login files', async t => {
  const { directory, store } = await setup(t)
  const account = await store.add('Retained profile')
  const home = path.join(directory, account.id, 'home')
  const auth = path.join(home, 'AppData', 'Local', 'CodeBuddyExtension', 'Data', 'Public', 'auth')
  await mkdir(auth, { recursive: true })
  const authFile = path.join(auth, 'synthetic.info')
  await writeFile(authFile, 'SYNTHETIC_LOGIN_FILE')
  const lock = path.join(directory, '.lock')
  await writeFile(lock, 'held by another process')
  await assert.rejects(store.add('Blocked'), error => error.code === 'ACCOUNT_STORE_BUSY')
  assert.equal(await readFile(lock, 'utf8'), 'held by another process')
  await unlink(lock)
  await store.remove(account.id)
  assert.equal(await readFile(authFile, 'utf8'), 'SYNTHETIC_LOGIN_FILE')
})

