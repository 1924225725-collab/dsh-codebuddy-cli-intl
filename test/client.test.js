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
    pluginVersion: '0.2.2', timeoutMs: 180000,
    accounts: { supported: true, requiredCliVersion: '2.174.0', selectedId: '13838045-0be0-4d93-9551-786b43f14ed1', accounts: [
      { id: '13838045-0be0-4d93-9551-786b43f14ed1', label: 'Synthetic International', selected: true, credentialsPresent: true, pathError: false, activeCalls: 0,
        usage: { calls: 3, inputTokens: 420, outputTokens: 72, cancelledRequests: 1, imageOffloadRequests: 1, offloadImagesRequested: 2, historyOffloadedImages: 3 }, loginCommand: '' }
    ] },
    logs: { entries: 12, failures: 1, samples: 0, captureArmed: false },
    activeCalls: 0, cliCheck: { state: 'available', version: '9.8.7' }, setup: { state: 'idle' },
    usage: { calls: 12, inputTokens: 170000, outputTokens: 100, uncachedInputTokens: 10000, cacheReadTokens: 150000, cacheWriteTokens: 10000,
      cancelledRequests: 2, imageOffloadRequests: 1, offloadImagesRequested: 2, historyOffloadedImages: 3,
      lastCall: { state: 'success', model: 'future-alpha', at: 1000, inputTokens: 1250, outputTokens: 7, uncachedInputTokens: 100, cacheReadTokens: 1100, cacheWriteTokens: 50, durationMs: 2345,
        diagnostics: { messageCount: 1, toolCount: 2, promptBytes: 3200, systemBytes: 4, messagesBytes: 100, toolsBytes: 2000, schemaBytes: 80, envelopeOverheadBytes: 1016, cliInputBytes: 3200 } } }, loginCommand: "& 'C:\\Users\\Another User\\CLI\\codebuddy.cmd'",
    catalog: { state: 'ready', fetchedAt: 1000, models: [{ id: 'future-alpha', name: 'Future Alpha', multiplier: 0.33, credits: 'x0.33 credits', efforts: [{ id: 'high', name: 'High' }], contextWindow: 1000000, supportsImages: true }] }
  }
  const actions = [], accountPayloads = []
  const logActions = [], downloads = [], blobs = new Map()
  const context = vm.createContext({
    window: { __ModuleLoader__: { load(module) { api = module.factory((name) => { if (name === 'react') return React; throw Error(name) }) } } },
    AbortController, setInterval: () => 1, clearInterval: () => {}, setTimeout: (callback) => { queueMicrotask(callback); return 1 },
    navigator: { clipboard: { writeText: async () => {} } },
    Blob, URL: { createObjectURL(blob) { blobs.set('blob:fixture', blob); return 'blob:fixture' }, revokeObjectURL() {} },
    document: { body: { appendChild() {} }, createElement() { return { click() { downloads.push({ href: this.href, filename: this.download, blob: blobs.get(this.href) }) }, remove() {} } } },
    async fetch(url, options = {}) {
      if (url.endsWith('/diagnostics')) {
        const action = options.method === 'POST' ? JSON.parse(options.body).action : null
        if (action) { assert.equal(options.headers['X-DSH-CodeBuddy-Action'], '1'); logActions.push(action) }
        if (action === 'armCapture') status.logs.captureArmed = true
        if (action === 'cancelCapture') status.logs.captureArmed = false
        if (action === 'clearLogs') status.logs = { entries: 0, failures: 0, samples: 0, captureArmed: false }
        const report = { schemaVersion: 1, entries: [{ state: 'error', ...(action === 'exportDetailedLogs' ? { sample: { head: '<script>PRIVATE_TEST_REPLY</script>' } } : {}) }] }
        return { ok: true, json: async () => structuredClone(['armCapture', 'cancelCapture', 'clearLogs'].includes(action) ? status : report) }
      }
      if (options.method === 'POST') {
        assert.equal(options.headers['X-DSH-CodeBuddy-Action'], '1')
        const action = JSON.parse(options.body).action
        actions.push(action)
        if (url.endsWith('/accounts')) accountPayloads.push(JSON.parse(options.body))
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
  assert.ok(text().includes('官方目录声明支持'))
  assert.ok(text().includes('最多 5 张'))
  assert.ok(text().includes('累计请求 12 次'))
  assert.ok(text().includes('累计输入（含缓存）170000'))
  assert.ok(text().includes('单次输入（含缓存）1250'))
  assert.ok(text().includes('缓存命中 1100'))
  assert.ok(text().includes('2.35 秒'))
  assert.ok(text().includes('提示封装 3200 UTF-8 字节'))
  assert.ok(text().includes('响应 Schema 80 / 封装固定指令与结构 1016 / 计算后的 CLI 输入 3200 字节'))
  assert.ok(text().includes('CLI 程序可启动'))
  assert.ok(text().includes('不验证账号登录'))
  assert.ok(text().includes('独立账号环境'))
  assert.ok(text().includes('Synthetic International'))
  assert.ok(text().includes('本地统计：3 次请求'))
  assert.ok(text().includes('取消 2 次'))
  assert.ok(text().includes('DSH 图片卸载请求 1 次'))
  assert.ok(text().includes('建议卸载 2 张'))
  assert.ok(text().includes('卸载请求不代表 DSH 已执行'))
  assert.ok(text().includes('故障处理与使用指南'))
  assert.ok(text().includes('最终回复失败不代表之前的工具没有执行'))
  assert.ok(locales.en.guideTitle.includes('Troubleshooting'))
  assert.ok(locales.en.outcomeTotals.includes('does not confirm DSH completed it'))
  const guideLink = tree.root.findAllByType('a').find(link => link.children.join('') === '查看完整用户指南')
  assert.ok(guideLink.props.href.endsWith('/docs/使用与故障处理指南.md'))
  assert.equal(guideLink.props.rel, 'noreferrer')
  assert.ok(text().includes('0.2.2'))
  assert.ok(text().includes('CLI_NETWORK_ERROR'))
  assert.ok(text().includes('不能修复网络'))
  const button = (name) => tree.root.findAllByType('button').find((item) => item.children.join('') === name)
  const accountLabel = tree.root.findAllByType('input').find(item => item.props['aria-label'] === '环境备注')
  await act(async () => { accountLabel.props.onChange({ target: { value: 'Second profile' } }) })
  await act(async () => { await button('新增环境').props.onClick() })
  assert.deepEqual(accountPayloads, [{ action: 'add', label: 'Second profile' }])
  await act(async () => { await button('生成官方登录命令').props.onClick() })
  assert.deepEqual(accountPayloads[1], { action: 'prepareLogin', id: '13838045-0be0-4d93-9551-786b43f14ed1' })
  assert.ok(text().includes('已生成该隔离环境的官方登录命令'))
  assert.ok(locales.en.accountPrepared.includes('official sign-in command is ready'))
  await act(async () => { await button('刷新模型与倍率').props.onClick() })
  assert.ok(text().includes('brand-new-after-update'))
  assert.ok(text().includes('×0'))
  await act(async () => { await button('一键配置 CLI').props.onClick() })
  assert.equal(snapshot.value.cliPath, 'C:\\Users\\Another User\\CLI\\codebuddy.cmd')
  assert.deepEqual(actions, ['add', 'prepareLogin', 'refreshModels', 'setup', 'refreshModels'])
  const modelInput = tree.root.findAllByType('input').find((item) => item.props.list === 'dsh-codebuddy-models')
  await act(async () => { modelInput.props.onChange({ target: { value: 'custom-future-model' } }) })
  assert.equal(button('一键配置 CLI').props.disabled, true)
  await act(async () => { await button('保存设置').props.onClick() })
  assert.equal(snapshot.value.model, 'custom-future-model')
  status.usage.lastCall = { state: 'error', model: 'future-alpha', at: 2000, errorCode: 'CLI_TIMEOUT', errorMessage: 'fixture timeout details', durationMs: 180005,
    diagnostics: { promptBytes: 100, schemaBytes: 10, envelopeOverheadBytes: 20, cliInputBytes: 25165827, requestLimitStage: 'cli-input', requestBytes: 25165827, requestLimitBytes: 25165824 },
    processDiagnostics: { timeoutMs: 180000, elapsedMs: 180005, stdoutBytes: 0, stderrBytes: 25, streamReason: 'deadline', streamPhase: 'after-init', parseStage: 'line', frameIndex: 1, frameBytes: 50, frameCount: 1, initCount: 1, resultCount: 0, lastFrameClass: 'system-init', firstFinalSeen: false, terminationInitiator: 'deadline', closeObserved: false, deadlineReached: true } }
  await act(async () => { await button('刷新模型与倍率').props.onClick() })
  assert.ok(text().includes('CLI_TIMEOUT'))
  assert.ok(text().includes('fixture timeout details'))
  assert.ok(text().includes('本机大小检查：CLI 编码输入 · 25165827 / 25165824 字节'))
  assert.ok(text().includes('请求在启动 CLI 模型调用前被拒绝，未提交给模型'))
  assert.ok(text().includes('标准输出 0 字节'))
  assert.ok(text().includes('流诊断：达到总时限'))
  status.usage.lastCall = { state: 'success', model: 'future-alpha', at: 3000, inputTokens: 1, outputTokens: 2, responseDiagnostics: { reason: 'valid', outputMode: 'native-json-schema', finalResultCount: 1, inputType: 'object', normalizations: [], hasStructuredOutput: true, structuredOutputType: 'object', resultTypeValid: true, finalSubtypeClass: 'success' } }
  status.usage.recentFailures = [{ at: 2000, model: 'future-alpha', errorCode: 'CLI_STRUCTURED_OUTPUT_MISSING', errorMessage: 'synthetic failure', processDiagnostics: { streamReason: 'json-parse', streamPhase: 'after-init', parseStage: 'line', frameIndex: 2, frameBytes: 88, frameCount: 2, initCount: 1, resultCount: 0, lastFrameClass: 'malformed', firstFinalSeen: false, terminationInitiator: 'adapter-error', closeObserved: false, deadlineReached: false }, responseDiagnostics: { reason: 'native-structured-output-missing', outputMode: 'native-json-schema', finalResultCount: 1, inputType: 'object', normalizations: [], hasStructuredOutput: false, structuredOutputType: 'missing', resultTypeValid: true, finalSubtypeClass: 'missing', noticeClass: 'authentication', noticeSource: 'stderr' } }]
  await act(async () => { await button('刷新模型与倍率').props.onClick() })
  assert.ok(text().includes('结构有效'))
  assert.ok(text().includes('原生 JSON Schema'))
  assert.ok(text().includes('structured_output：已返回（对象）'))
  assert.ok(text().includes('最近失败记录'))
  assert.ok(text().includes('缺少 structured_output'))
  assert.ok(text().includes('JSON 解析失败'))
  assert.ok(text().includes('提示分类：鉴权'))
  assert.ok(text().includes('基础诊断不含正文'))
  assert.ok(text().includes('诊断日志与问题反馈'))
  assert.ok(locales.en.guideRequestSize.includes('24 MiB'))
  assert.ok(locales.en.budgetDetail.includes('was not submitted to the model'))
  assert.equal(button('采集下一次失败回复').props.disabled, true)
  assert.equal(button('导出详细日志（含原始回复）').props.disabled, true)
  await act(async () => { await button('查看普通日志').props.onClick() })
  assert.ok(text().includes('schemaVersion'))
  assert.equal(text().includes('PRIVATE_TEST_REPLY'), false)
  await act(async () => { await button('导出普通日志').props.onClick() })
  assert.ok(downloads[0].filename.startsWith('dsh-codebuddy-basic-'))
  assert.equal((await downloads[0].blob.text()).includes('PRIVATE_TEST_REPLY'), false)
  const consent = tree.root.findAllByType('input').find(item => item.props.type === 'checkbox')
  await act(async () => { consent.props.onChange({ target: { checked: true } }) })
  await act(async () => { await button('采集下一次失败回复').props.onClick() })
  assert.ok(text().includes('等待下一次非主动取消的失败'))
  await act(async () => { await button('取消详细采集').props.onClick() })
  status.logs.samples = 1
  await act(async () => { await button('刷新模型与倍率').props.onClick() })
  await act(async () => { await button('预览详细日志').props.onClick() })
  assert.ok(text().includes('PRIVATE_TEST_REPLY'))
  assert.equal(tree.root.findAllByType('script').length, 0)
  await act(async () => { await button('导出详细日志（含原始回复）').props.onClick() })
  assert.ok((await downloads[1].blob.text()).includes('PRIVATE_TEST_REPLY'))
  await act(async () => { await button('清空日志').props.onClick() })
  assert.equal(logActions.includes('clearLogs'), false)
  await act(async () => { await button('确认清空全部日志和详细样本').props.onClick() })
  assert.equal(logActions.includes('clearLogs'), true)
  assert.equal(text().includes('PRIVATE_TEST_REPLY'), false)
  assert.equal(button('采集下一次失败回复').props.disabled, true)
  status.usage.lastCall = { id: '13838045-0be0-4d93-9551-786b43f14ed1', state: 'error', model: 'future-alpha', at: 4000, errorCode: 'CLI_AUTH_REQUIRED', errorMessage: 'CodeBuddy CLI 登录鉴权失败（401）。请执行 /login。', processDiagnostics: { elapsedMs: 2500, stdoutBytes: 0, stderrBytes: 200, exitCode: 0 } }
  await act(async () => { await button('刷新模型与倍率').props.onClick() })
  assert.ok(text().includes('CLI_AUTH_REQUIRED'))
  assert.ok(text().includes('诊断 ID：13838045-0be0-4d93-9551-786b43f14ed1'))
  const loginDetails = tree.root.findAllByType('details').find(item => item.findAllByType('summary').some(summary => summary.children.join('') === '首次登录或切换账号'))
  assert.equal(loginDetails.props.open, true)
  assert.ok(text().includes('CLI 进程诊断'))
})
