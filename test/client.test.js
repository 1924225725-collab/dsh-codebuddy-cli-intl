import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import React from 'react'
import renderer, { act } from 'react-test-renderer'

test('settings UI displays live rates, refreshes new models, and saves a portable CLI path from one-click setup', async (t) => {
  let api
  let page
  let pageProps
  let locales
  const listeners = new Set()
  let snapshot = { status: 'ready', writable: true, revision: 1, value: { cliPath: '', configDir: '', model: '', effort: '', timeoutMs: 180000 } }
  const form = {
    getSnapshot: () => snapshot,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    async mutate(operations) {
      snapshot = { ...snapshot, revision: snapshot.revision + 1, value: { ...snapshot.value } }
      for (const operation of operations) snapshot.value[operation.path[0]] = operation.value
      for (const listener of listeners) listener()
    }
  }
  const status = {
    pluginVersion: '0.2.4', timeoutMs: 180000,
    activeCalls: 0, cliCheck: { state: 'available', version: '9.8.7' }, setup: { state: 'idle' },
    usage: { calls: 12, inputTokens: 170000, outputTokens: 100, uncachedInputTokens: 10000, cacheReadTokens: 150000, cacheWriteTokens: 10000,
      lastCall: { state: 'success', model: 'future-alpha', at: 1000, inputTokens: 1250, outputTokens: 7, uncachedInputTokens: 100, cacheReadTokens: 1100, cacheWriteTokens: 50, durationMs: 2345,
        diagnostics: { messageCount: 1, toolCount: 2, promptBytes: 3200, systemBytes: 4, messagesBytes: 100, toolsBytes: 2000 } } }, loginCommand: "& 'C:\\Users\\Another User\\CLI\\codebuddy.cmd'",
    catalog: { state: 'ready', fetchedAt: 1000, models: [{ id: 'future-alpha', name: 'Future Alpha', multiplier: 0.33, credits: 'x0.33 credits', efforts: [{ id: 'high', name: 'High' }], contextWindow: 1000000 }] }
  }
  const actions = []
  const context = vm.createContext({
    window: { __ModuleLoader__: { load(module) { api = module.factory((name) => { if (name === 'react') return React; throw Error(name) }) } } },
    AbortController, setInterval: () => 1, clearInterval: () => {}, setTimeout: (callback) => { queueMicrotask(callback); return 1 },
    navigator: { clipboard: { writeText: async () => {} } },
    async fetch(url, options = {}) {
      if (options.method === 'POST') {
        assert.equal(options.headers['X-DSH-CodeBuddy-Action'], '1')
        const action = JSON.parse(options.body).action
        actions.push(action)
        if (action === 'setup') status.setup = { state: 'detecting' }
        if (action === 'refreshModels' && status.catalog.models.length === 1) status.catalog.models.push({ id: 'brand-new-after-update', name: 'Brand New', multiplier: 0, credits: 'x0.00 credits', efforts: [], contextWindow: null })
      }
      const response = structuredClone(status)
      if (!options.method && status.setup.state === 'detecting') status.setup = { state: 'ready', path: 'C:\\Users\\Another User\\CLI\\codebuddy.cmd', version: '9.8.7' }
      return { ok: true, json: async () => response }
    }
  })
  vm.runInContext(await readFile(new URL('../lib/client.js', import.meta.url), 'utf8'), context)
  const ctx = {
    effect(callback) { return callback() },
    locale: { register(ns, values) { locales = values; return () => {} }, bind() { return (key) => locales.zh[key] } },
    configForms: { get: () => form, whileServed(ns, callback) { callback(); return () => {} } },
    slots: { inject(name, callback) { callback(); return () => {} }, register(options, component) { page = component; pageProps = options.inject(); return () => {} } }
  }
  api.apply(ctx)
  let tree
  await act(async () => { tree = renderer.create(React.createElement(page, pageProps)) })
  t.after(() => { act(() => tree.unmount()) })
  const text = () => JSON.stringify(tree.toJSON())
  assert.ok(text().includes('×0.33'))
  assert.ok(text().includes('future-alpha'))
  assert.ok(text().includes('累计请求 12 次'))
  assert.ok(text().includes('累计输入（含缓存）170000'))
  assert.ok(text().includes('单次输入（含缓存）1250'))
  assert.ok(text().includes('缓存命中 1100'))
  assert.ok(text().includes('2.35 秒'))
  assert.ok(text().includes('发送文本 3200 字节'))
  assert.ok(text().includes('CLI 程序可启动'))
  assert.ok(text().includes('不验证账号登录'))
  assert.ok(text().includes('0.2.4'))
  const button = (name) => tree.root.findAllByType('button').find((item) => item.children.join('') === name)
  await act(async () => { await button('刷新模型与倍率').props.onClick() })
  assert.ok(text().includes('brand-new-after-update'))
  assert.ok(text().includes('×0'))
  await act(async () => { await button('一键配置 CLI').props.onClick() })
  assert.equal(snapshot.value.cliPath, 'C:\\Users\\Another User\\CLI\\codebuddy.cmd')
  assert.deepEqual(actions, ['refreshModels', 'setup', 'refreshModels'])
  const modelInput = tree.root.findAllByType('input').find((item) => item.props.list === 'dsh-codebuddy-models')
  await act(async () => { modelInput.props.onChange({ target: { value: 'custom-future-model' } }) })
  assert.equal(button('一键配置 CLI').props.disabled, true)
  await act(async () => { await button('保存设置').props.onClick() })
  assert.equal(snapshot.value.model, 'custom-future-model')
  status.usage.lastCall = { state: 'error', model: 'future-alpha', at: 2000, errorCode: 'CLI_TIMEOUT', errorMessage: 'fixture timeout details', durationMs: 180005,
    processDiagnostics: { timeoutMs: 180000, elapsedMs: 180005, stdoutBytes: 0, stderrBytes: 25 } }
  await act(async () => { await button('刷新模型与倍率').props.onClick() })
  assert.ok(text().includes('CLI_TIMEOUT'))
  assert.ok(text().includes('fixture timeout details'))
  assert.ok(text().includes('标准输出 0 字节'))
  status.usage.lastCall = { state: 'success', model: 'future-alpha', at: 3000, inputTokens: 1, outputTokens: 2, responseDiagnostics: { reason: 'valid', inputType: 'string', bytes: 50, normalizations: ['markdown-fence'] } }
  status.usage.recentFailures = [{ at: 2000, model: 'future-alpha', errorCode: 'STRUCTURED_OUTPUT_INVALID', errorMessage: 'synthetic failure', responseDiagnostics: { reason: 'possibly-truncated-json', inputType: 'string', bytes: 25, normalizations: [] } }]
  await act(async () => { await button('刷新模型与倍率').props.onClick() })
  assert.ok(text().includes('结构有效'))
  assert.ok(text().includes('markdown-fence'))
  assert.ok(text().includes('最近失败记录'))
  assert.ok(text().includes('JSON 未闭合，可能截断'))
  assert.ok(text().includes('不保存回复正文'))
})
