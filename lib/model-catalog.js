import spawn from 'cross-spawn'
import { tmpdir } from 'node:os'
import { CodeBuddyCliError } from './cli-response.js'
import { terminateProcess } from './cli-process.js'
import { cliEnv, resolveCli } from './cli-runtime.js'
import { cliInvocation } from './cli-invocation.js'

export function normalizeCatalog(result) {
  const source = result?.models?.availableModels
  if (!Array.isArray(source)) throw new CodeBuddyCliError('MODEL_CATALOG_INVALID', 'CLI 没有返回可识别的模型目录，请更新官方 CLI 后重试。')
  const models = []
  const seen = new Set()
  for (const item of source) {
    if (typeof item?.modelId !== 'string' || !item.modelId.trim() || item.modelId.length > 256 || seen.has(item.modelId)) continue
    const meta = item._meta ?? {}
    const credits = typeof meta.credits === 'string' ? meta.credits.slice(0, 256) : null
    const rate = credits?.match(/(?:x|×)\s*(\d+(?:\.\d+)?)/iu)
    const multiplier = rate ? Number(rate[1]) : null
    const efforts = Array.isArray(meta.effortOptions) ? meta.effortOptions
      .filter((option) => typeof option?.value === 'string' && /^[\w-]{1,40}$/u.test(option.value))
      .map((option) => ({ id: option.value, name: typeof option.name === 'string' ? option.name.slice(0, 80) : option.value })) : []
    seen.add(item.modelId)
    models.push({
      id: item.modelId,
      name: typeof item.name === 'string' && item.name ? item.name.slice(0, 200) : item.modelId,
      credits,
      multiplier: Number.isFinite(multiplier) ? multiplier : null,
      supportsReasoning: meta.supportsReasoning === true,
      supportsImages: meta.supportsImages === true,
      contextWindow: Number.isSafeInteger(meta.maxInputTokens) && meta.maxInputTokens > 0 ? meta.maxInputTokens : null,
      efforts
    })
  }
  if (!models.length) throw new CodeBuddyCliError('MODEL_CATALOG_EMPTY', 'CLI 暂未返回可用模型，请先完成国际账号登录，再刷新模型。')
  return { models, currentModelId: typeof result.models.currentModelId === 'string' ? result.models.currentModelId : null }
}

export async function queryModelCatalog(config, { signal, spawnImpl = spawn, timeoutMs = 45000 } = {}) {
  const command = await resolveCli(config)
  const invocation = await cliInvocation(command)
  if (signal?.aborted) throw new CodeBuddyCliError('ABORTED', '模型检测已取消。')
  return new Promise((resolve, reject) => {
    const child = spawnImpl(invocation.command, [...invocation.args,
      '--acp', '--tools', '', '--setting-sources', '', '--strict-mcp-config',
      '--mcp-config', '{"mcpServers":{}}', '--no-session-persistence'
    ], {
      cwd: tmpdir(), windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...cliEnv(config), DISABLE_AUTOUPDATER: '1', CODEBUDDY_CODE_DISABLE_BACKGROUND_TASKS: '1', CODEBUDDY_DISABLE_AUTO_MEMORY: '1' }
    })
    let pending = ''
    let bytes = 0
    let settled = false
    let result
    let cleanupTimer
    const finish = (error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      clearTimeout(cleanupTimer)
      signal?.removeEventListener('abort', onAbort)
      if (error) { terminateProcess(child); reject(error) }
      else resolve(result)
    }
    const onAbort = () => finish(new CodeBuddyCliError('ABORTED', '模型检测已取消。'))
    const timer = setTimeout(() => finish(new CodeBuddyCliError('MODEL_CATALOG_TIMEOUT', '模型检测超时，请检查 CLI 登录和网络后重试。')), timeoutMs)
    timer.unref?.()
    signal?.addEventListener('abort', onAbort, { once: true })
    const send = (id, method, params) => child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`)
    child.stdin.on('error', () => {})
    child.stderr.resume()
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk) => {
      if (settled || result) return
      bytes += Buffer.byteLength(chunk)
      if (bytes > 8 * 1024 * 1024) return finish(new CodeBuddyCliError('MODEL_CATALOG_TOO_LARGE', '模型目录输出超过安全上限。'))
      pending += chunk
      let newline
      while ((newline = pending.indexOf('\n')) >= 0) {
        const line = pending.slice(0, newline)
        pending = pending.slice(newline + 1)
        let message
        try { message = JSON.parse(line) } catch { continue }
        if (message.id !== 1 && message.id !== 2) continue
        if (message.error) {
          const needsLogin = /auth|login|登录/iu.test(String(message.error.message))
          return finish(new CodeBuddyCliError(needsLogin ? 'CLI_LOGIN_REQUIRED' : 'MODEL_CATALOG_FAILED',
            needsLogin ? '请先完成官方 CLI 国际账号登录，再刷新模型。' : 'CLI 模型检测失败，请检查登录状态和网络。'))
        }
        if (message.id === 1) send(2, 'session/new', { cwd: tmpdir(), mcpServers: [] })
        if (message.id === 2) {
          try { result = normalizeCatalog(message.result) } catch (error) { finish(error); return }
          child.stdin.end()
          finish()
          cleanupTimer = setTimeout(() => terminateProcess(child), 1200)
          cleanupTimer.unref?.()
        }
      }
    })
    child.once('error', () => finish(new CodeBuddyCliError('CLI_START_FAILED', '无法启动 CLI 进行模型检测。')))
    child.once('close', () => {
      clearTimeout(cleanupTimer)
      if (!settled) result ? finish() : finish(new CodeBuddyCliError('MODEL_CATALOG_FAILED', 'CLI 在返回模型目录前退出，请检查登录和网络。'))
    })
    send(1, 'initialize', {
      protocolVersion: 1,
      clientInfo: { name: 'dsh-codebuddy-model-catalog', version: '0.2.0' },
      clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false }
    })
  })
}

export function createModelCatalog(loader, { now = Date.now, ttlMs = 15 * 60000, retryMs = 60000, onRefresh = () => {} } = {}) {
  const entries = new Map()
  const keyOf = (config) => JSON.stringify([config.cliPath, config.configDir])
  const entryOf = (config) => {
    const key = keyOf(config)
    if (!entries.has(key)) entries.set(key, { state: 'not-checked', models: [], currentModelId: null })
    return entries.get(key)
  }
  return {
    snapshot(config) {
      const { promise, ...publicEntry } = entryOf(config)
      return publicEntry
    },
    async get(config, { force = false } = {}) {
      const entry = entryOf(config)
      if (entry.promise) { await entry.promise; return this.snapshot(config) }
      const age = now() - (entry.attemptedAt ?? 0)
      if (!force && entry.attemptedAt !== undefined && age < (entry.errorCode ? retryMs : ttlMs)) return this.snapshot(config)
      entry.state = 'checking'
      entry.attemptedAt = now()
      entry.promise = Promise.resolve().then(() => loader(config)).then((result) => {
        Object.assign(entry, result, { state: 'ready', fetchedAt: now() })
        delete entry.errorCode
        delete entry.errorMessage
        try { onRefresh() } catch {}
      }).catch((error) => {
        entry.state = entry.models.length ? 'stale' : 'error'
        entry.errorCode = error instanceof CodeBuddyCliError ? error.code : 'MODEL_CATALOG_FAILED'
        entry.errorMessage = error instanceof CodeBuddyCliError ? error.message : '模型检测失败，请检查 CLI 和网络。'
      }).finally(() => { delete entry.promise })
      await entry.promise
      return this.snapshot(config)
    }
  }
}

export function modelLabel(model) {
  return `${model.name}${Number.isFinite(model.multiplier) ? ` · ×${model.multiplier}` : model.credits ? ` · ${model.credits}` : ''}`
}

export function modelInfo(provider, model, configuredEffort = '') {
  return {
    provider, id: model.id, name: modelLabel(model), inputModalities: model.supportsImages === true ? ['text', 'image'] : ['text'],
    ...(model.contextWindow ? { context: { contextWindow: model.contextWindow } } : {}),
    ...(model.supportsReasoning && model.efforts.length ? {
      reasoning: {
        efforts: model.efforts,
        ...(model.efforts.some((option) => option.id === configuredEffort) ? { defaultEffort: configuredEffort } : {})
      }
    } : {})
  }
}
