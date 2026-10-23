// Documentation previews of the real component. All state is fictional.
// No credentials, CLI processes or external model requests are used.
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import vm from 'node:vm'
import React from 'react'
import renderer, { act } from 'react-test-renderer'
import { renderToStaticMarkup } from 'react-dom/server'

const root = new URL('../', import.meta.url)
const output = new URL('../.preview/', import.meta.url)
let api, page, pageProps, locales
const formSnapshot = { status: 'ready', writable: true, revision: 1, value: { cliPath: '', configDir: '', model: '', effort: '', timeoutMs: 180000 } }
const status = {
  pluginVersion: '0.1.3', timeoutMs: 180000, activeCalls: 0,
  cliCheck: { state: 'available', version: '2.x（示例）' }, setup: { state: 'idle' },
  loginCommand: "$env:CODEBUDDY_INTERNET_ENVIRONMENT='public'; & 'codebuddy'",
  usage: { calls: 0, inputTokens: 0, outputTokens: 0, uncachedInputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
  logs: { entries: 0, failures: 0, samples: 0, captureArmed: false },
  catalog: { state: 'ready', fetchedAt: Date.UTC(2026, 9, 22, 2, 0), models: [
    { id: 'example-model-a', name: '示例模型 A（虚构）', multiplier: 0.5, credits: '×0.5（示例）', efforts: [{ id: 'medium', name: 'Medium' }, { id: 'high', name: 'High' }], contextWindow: 128000 },
    { id: 'example-model-b', name: '示例模型 B（虚构）', multiplier: 1, credits: '×1（示例）', efforts: [], contextWindow: 200000 },
    { id: 'example-model-c', name: '示例模型 C（虚构）', multiplier: null, credits: '', efforts: [], contextWindow: null }
  ] }
}
const context = vm.createContext({
  window: { __ModuleLoader__: { load(module) { api = module.factory(name => { if (name === 'react') return React; throw Error(name) }) } } },
  AbortController, setInterval: () => 1, clearInterval() {},
  fetch: async () => ({ ok: true, json: async () => structuredClone(status) })
})
vm.runInContext(await readFile(new URL('lib/client.js', root), 'utf8'), context)
api.apply({
  effect: callback => callback(),
  locale: { register(ns, values) { locales = values; return () => {} }, bind: () => key => locales.zh[key] },
  configForms: { get: () => ({ getSnapshot: () => formSnapshot, subscribe: () => () => {} }), whileServed(ns, cb) { cb(); return () => {} } },
  slots: { inject(name, cb) { cb(); return () => {} }, register(options, component) { page = component; pageProps = options.inject(); return () => {} } }
})
let tree
await act(async () => { tree = renderer.create(React.createElement(page, pageProps)) })
const snapshot = tree.toJSON()
function convert(node) {
  if (node == null || typeof node === 'string') return node
  if (Array.isArray(node)) return node.map(convert)
  const props = Object.fromEntries(Object.entries(node.props).filter(([key, value]) => !key.startsWith('on') && typeof value !== 'function'))
  if (node.type === 'button') props.disabled = true
  if (node.type === 'input' || node.type === 'select') props.readOnly = true
  return React.createElement(node.type, props, ...(node.children ?? []).map(convert))
}
function html(content, title) {
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>${title}</title><style>
  *{box-sizing:border-box}body{margin:0;background:#111820;color:#edf1f8;font:16px/1.55 "Microsoft YaHei","PingFang SC",sans-serif}
  .frame{max-width:1200px;margin:0 auto;padding:26px 32px 40px}.badge{background:#25344c;color:#d3e5ff;border:1px solid #415779;border-radius:10px;padding:14px 18px;margin:0 18px 8px}
  .badge b{display:block;font-size:20px;margin-bottom:3px}.badge span{color:#b7c5d9;font-size:14px}a{color:#84b9ff}button,input,select{font:inherit}button:disabled{opacity:.9}code{font-family:Consolas,monospace}summary{padding:2px 0}section{background:#151f2c}input,select{background:#101924!important}h2{font-size:27px}h3{font-size:19px}p{color:#bfcada!important}
  </style><div class="frame"><div class="badge"><b>${title}</b><span>0.1.3 国际版实际设置组件 · 合成示例状态 · 虚构模型与倍率 · 非真实账号数据</span></div>${renderToStaticMarkup(content)}</div></html>`
}
await mkdir(output, { recursive: true })
await writeFile(new URL('setup.html', output), html(convert(snapshot), 'CLI 配置页预览'))
const models = snapshot.children.find(node => node?.props?.['aria-label'] === '可用模型与积分倍率')
const usage = snapshot.children.find(node => node?.props?.['aria-label'] === '本次运行的累计 Token 用量')
const credits = snapshot.children.find(node => node?.props?.['aria-label'] === '积分余额')
await writeFile(new URL('models.html', output), html(React.createElement('div', { style: { display: 'grid', gap: 16, padding: 18 } }, ...[models, usage, credits].map(convert)), '模型目录与用量预览'))
await act(async () => { tree.unmount() })
console.log('Rendered documentation previews to .preview (example data only).')
