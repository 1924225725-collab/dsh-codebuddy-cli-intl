import z from '@deepseek-ai/schemastery'
import { LlmAdapter } from '@deepseek-ai/dsh-llm'
import { CodeBuddyCliError, collectResult } from './cli-response.js'
import { runProcess } from './cli-process.js'
import { cliEnv, inspectCli, resolveCli, ensureCli, loginCommand } from './cli-runtime.js'
import { createModelCatalog, queryModelCatalog, modelInfo } from './model-catalog.js'
import { trustedLocalRequest, readAction } from './local-http.js'
import { cliInvocation } from './cli-invocation.js'
import { normalizeCliUsage } from './usage.js'
import { makeRequest, MODEL_SYSTEM_PROMPT } from './request.js'
import { parseModelResponse } from './model-response.js'
import { performance } from 'node:perf_hooks'

export const name = 'llm-codebuddy-cli-intl'
export const inject = ['llm']

const PROVIDER = 'codebuddy-cli-intl'
const STATUS_PATH = '/plugins/dsh-codebuddy-cli-intl/status'
const ACTION_PATH = '/plugins/dsh-codebuddy-cli-intl/actions'
const DEFAULT_MODEL = ''
const DEFAULT_EFFORT = ''
const OFFICIAL_HOME = 'https://www.codebuddy.ai'

export const Config = z.object({
  cliPath: z.string().description('CodeBuddy CLI 可执行文件路径；留空时自动检测当前电脑的安装位置。').default('').volatile(),
  configDir: z.string().description('可选：CLI 登录配置目录。留空时使用 ~/.dsh-codebuddy-cli-intl。该目录隔离配置文件，不保证隔离官方 CLI 的系统账号存储。').default('').volatile(),
  model: z.string().description('默认模型 ID（可选）；模型目录自动检测，实际使用 DSH 会话中选择的模型。').default(DEFAULT_MODEL).volatile(),
  effort: z.string().description('默认推理强度（可选）；留空时跟随模型默认值，可选项从 CLI 自动检测。').default(DEFAULT_EFFORT).volatile(),
  timeoutMs: z.number().description('单次 CLI 调用超时（毫秒）。').default(180000).volatile()
})

const runtimeStatus = {
  activeCalls: 0,
  cliCheck: { state: 'not-checked' },
  setup: { state: 'idle' },
  totals: { calls: 0, inputTokens: 0, uncachedInputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0, toolCalls: 0 },
  lastCall: undefined,
  recentFailures: []
}

function currentValue(value, fallback) {
  if (value !== null && typeof value === 'object' && typeof value.get === 'function') {
    return currentValue(value.get(), fallback)
  }
  return value === undefined || value === null ? fallback : value
}

function configOf(config) {
  return {
    cliPath: String(currentValue(config?.cliPath, '')).trim(),
    configDir: String(currentValue(config?.configDir, '')).trim(),
    model: String(currentValue(config?.model, DEFAULT_MODEL)).trim() || DEFAULT_MODEL,
    effort: String(currentValue(config?.effort, DEFAULT_EFFORT)).trim() || DEFAULT_EFFORT,
    timeoutMs: clampNumber(currentValue(config?.timeoutMs, 180000), 15000, 600000, 180000)
  }
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value)
  return Number.isSafeInteger(n) ? Math.max(min, Math.min(max, n)) : fallback
}

async function checkCli(config, signal) {
  runtimeStatus.cliCheck = { state: 'checking' }
  try {
    runtimeStatus.cliCheck = { state: 'available', ...await inspectCli(config, { signal }) }
  } catch (error) {
    runtimeStatus.cliCheck = { state: 'unavailable', code: safeErrorCode(error), checkedAt: Date.now() }
  }
  return runtimeStatus.cliCheck
}

function safeErrorCode(error) {
  return error instanceof CodeBuddyCliError ? error.code : 'CLI_ERROR'
}

function safeMessage(error) {
  if (error instanceof CodeBuddyCliError) return error.message
  return 'CodeBuddy CLI 调用失败；请检查登录状态与 CLI 配置。'
}

function requestTools(options) {
  const source = options.tools ?? options.toolHistory?.tools ?? []
  return source.filter((tool) => tool && typeof tool.name === 'string' && tool.name.length > 0)
    .map((tool) => ({
      name: tool.name,
      description: typeof tool.description === 'string' ? tool.description : '',
      parameters: tool.parameters && typeof tool.parameters === 'object' && !Array.isArray(tool.parameters)
        ? tool.parameters
        : { type: 'object', properties: {} }
    }))
}

function outputSchema(tools) {
  const names = [...new Set(tools.map((tool) => tool.name))]
  const toolNameSchema = names.length > 0
    ? { type: 'string', enum: names }
    : { type: 'string' }
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      text: { type: 'string' },
      toolCalls: {
        type: 'array',
        ...(names.length === 0 ? { maxItems: 0 } : {}),
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            name: toolNameSchema,
            arguments: { type: 'object' }
          },
          required: ['name', 'arguments']
        }
      }
    },
    required: ['text', 'toolCalls']
  }
}

function rememberFailure(call) {
  runtimeStatus.recentFailures.unshift({
    at: call.at, model: call.model, errorCode: call.errorCode, errorMessage: call.errorMessage,
    durationMs: call.durationMs, responseDiagnostics: call.responseDiagnostics
  })
  runtimeStatus.recentFailures.length = Math.min(runtimeStatus.recentFailures.length, 5)
}

function recordCall({ state, config, usage, modelUsage, diagnostics, durationMs, toolCalls = 0, errorCode, errorMessage, processDiagnostics, responseDiagnostics }) {
  const normalized = normalizeCliUsage(usage, modelUsage)
  runtimeStatus.totals.calls += 1
  runtimeStatus.totals.inputTokens += normalized.inputTokens + normalized.cacheReadTokens + normalized.cacheWriteTokens
  runtimeStatus.totals.uncachedInputTokens += normalized.inputTokens
  runtimeStatus.totals.cacheReadTokens += normalized.cacheReadTokens
  runtimeStatus.totals.cacheWriteTokens += normalized.cacheWriteTokens
  runtimeStatus.totals.outputTokens += normalized.outputTokens
  runtimeStatus.totals.toolCalls += toolCalls
  runtimeStatus.lastCall = {
    state,
    model: config.model,
    at: Date.now(),
    inputTokens: normalized.inputTokens + normalized.cacheReadTokens + normalized.cacheWriteTokens,
    outputTokens: normalized.outputTokens,
    uncachedInputTokens: normalized.inputTokens,
    cacheReadTokens: normalized.cacheReadTokens,
    cacheWriteTokens: normalized.cacheWriteTokens,
    durationMs,
    diagnostics,
    ...(responseDiagnostics ? { responseDiagnostics } : {}),
    usageSource: modelUsage ? 'cli-model-usage' : 'cli-aggregate',
    toolCalls,
    ...(errorCode ? { errorCode, errorMessage, processDiagnostics } : {})
  }
  if (errorCode) rememberFailure(runtimeStatus.lastCall)
  return normalized
}

function publicStatus(config, catalog) {
  return {
    provider: PROVIDER,
    model: config.model,
    effort: config.effort,
    pluginVersion: '0.1.0',
    timeoutMs: config.timeoutMs,
    activeCalls: runtimeStatus.activeCalls,
    cliCheck: runtimeStatus.cliCheck,
    setup: runtimeStatus.setup,
    catalog: catalog.snapshot(config),
    loginCommand: loginCommand(config, runtimeStatus.cliCheck.path),
    installationGuide: 'https://www.codebuddy.ai/docs/cli/installation',
    usage: {
      ...runtimeStatus.totals,
      lastCall: runtimeStatus.lastCall ?? null,
      recentFailures: runtimeStatus.recentFailures
    },
    balance: {
      available: false,
      officialHome: OFFICIAL_HOME
    }
  }
}

function jsonResponse(res, status, value) {
  const body = JSON.stringify(value)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body)
  })
  res.end(body)
}

function registerStatusRoute(ctx, getConfig, catalog, signal) {
  let setupPromise
  const releaseStatus = ctx.webServer.register({
    kind: 'exact', path: STATUS_PATH,
    handler: async (req, res) => {
      if (req.method !== 'GET') return jsonResponse(res, 405, { error: 'method-not-allowed' })
      if (!trustedLocalRequest(req)) return jsonResponse(res, 403, { error: 'request-not-trusted' })
      try {
        const config = configOf(getConfig())
        const url = new URL(req.url ?? STATUS_PATH, 'http://localhost')
        if (url.searchParams.get('checkCli') === '1'
          && (runtimeStatus.cliCheck.checkedAt === undefined || Date.now() - runtimeStatus.cliCheck.checkedAt > 5000)) {
          await checkCli(config, signal)
        }
        jsonResponse(res, 200, publicStatus(config, catalog))
      } catch { jsonResponse(res, 500, { error: 'status-unavailable' }) }
    }
  })
  const releaseAction = ctx.webServer.register({
    kind: 'exact', path: ACTION_PATH,
    handler: async (req, res) => {
      if (req.method !== 'POST') return jsonResponse(res, 405, { error: 'method-not-allowed' })
      if (!trustedLocalRequest(req, true)) return jsonResponse(res, 403, { error: 'request-not-trusted' })
      let action
      try { action = await readAction(req) } catch { return jsonResponse(res, 400, { error: 'invalid-action' }) }
      const config = configOf(getConfig())
      if (action === 'refreshModels') {
        await catalog.get(config, { force: true })
      } else if (action === 'setup') {
        if (!setupPromise) {
          setupPromise = ensureCli(config, {
            signal,
            onStage: (state) => { runtimeStatus.setup = { state } }
          }).then((result) => {
            runtimeStatus.cliCheck = { state: 'available', path: result.path, version: result.version, checkedAt: result.checkedAt }
            runtimeStatus.setup = { state: 'ready', ...result }
          }).catch((error) => {
            runtimeStatus.setup = { state: 'error', code: safeErrorCode(error), message: safeMessage(error) }
          }).finally(() => { setupPromise = undefined })
        }
        return jsonResponse(res, 202, publicStatus(configOf(getConfig()), catalog))
      }
      jsonResponse(res, 200, publicStatus(configOf(getConfig()), catalog))
    }
  })
  ctx.effect(() => () => { releaseAction(); releaseStatus() }, 'dsh-codebuddy-cli-intl: local routes')
}

class CodeBuddyCliAdapter extends LlmAdapter {
  constructor(getConfig, catalog) {
    super()
    this.getConfig = getConfig
    this.catalog = catalog
  }

  providerInfo(provider) {
    return { id: provider, name: 'CodeBuddy CLI（国际版）' }
  }

  async listModels(provider) {
    const config = configOf(this.getConfig())
    const catalog = await this.catalog.get(config)
    const models = catalog.models.map((model) => ({ provider, id: model.id, name: modelInfo(provider, model).name, inputModalities: ['text'] }))
    if (config.model && !models.some((model) => model.id === config.model)) {
      models.push({ provider, id: config.model, name: config.model, inputModalities: ['text'] })
    }
    return models
  }

  async resolveModel(provider, model) {
    const config = configOf(this.getConfig())
    const catalog = await this.catalog.get(config)
    const found = catalog.models.find((item) => item.id === model)
    return found ? modelInfo(provider, found, config.effort) : { provider, id: model, name: model, inputModalities: ['text'] }
  }

  async *stream(options) {
    const config = configOf(this.getConfig())
    if (options.signal?.aborted) throw new CodeBuddyCliError('ABORTED', '请求已取消。')
    const tools = requestTools(options)
    const { prompt, diagnostics } = makeRequest(options, tools, outputSchema(tools))
    const selectedModel = options.model || config.model
    const catalog = this.catalog.snapshot(config)
    void this.catalog.get(config)
    const model = catalog.models.find((item) => item.id === (selectedModel || catalog.currentModelId))
    let effort = options.reasoningEffort || config.effort
    if (model && (!model.supportsReasoning || (model.efforts.length && !model.efforts.some((option) => option.id === effort)))) effort = ''
    const callConfig = { ...config, model: selectedModel || catalog.currentModelId || 'CLI default' }
    const command = await cliInvocation(await resolveCli(config))
    const args = [
      '--print',
      '--output-format', 'json',
      '--tools', '',
      '--setting-sources', 'user',
      '--strict-mcp-config',
      ...(selectedModel ? ['--model', selectedModel] : []),
      ...(effort ? ['--effort', effort] : []),
      '--max-turns', '1',
      '--no-session-persistence',
      '--system-prompt', MODEL_SYSTEM_PROMPT
    ]
    const input = prompt
    runtimeStatus.activeCalls += 1
    let raw
    let normalized = normalizeCliUsage({})
    const startedAt = performance.now()
    let recorded = false
    let toolCount = 0
    try {
      const processResult = await runProcess(command.command, [...command.args, ...args], {
        env: { ...cliEnv(config), CODEBUDDY_DISABLE_AUTO_MEMORY: '1', CODEBUDDY_CODE_DISABLE_BACKGROUND_TASKS: '1' },
        input,
        timeoutMs: config.timeoutMs,
        signal: options.signal
      })
      raw = collectResult(processResult.stdout)
      normalized = normalizeCliUsage(raw.usage, raw.modelUsage)
      const response = parseModelResponse(raw.result, tools)
      toolCount = response.calls.length
      recordCall({ state: 'success', config: callConfig, usage: raw.usage, modelUsage: raw.modelUsage, diagnostics, durationMs: Math.round(performance.now() - startedAt), toolCalls: toolCount, responseDiagnostics: response.responseDiagnostics })
      recorded = true

      // JSON mode delivers complete blocks. Synthetic deltas would make DSH
      // measure delivery time as model decode time and report impossible speeds.
      let index = 0
      if (response.text.length > 0) {
        yield { type: 'block-start', index, blockType: 'text' }
        yield { type: 'block-end', index, block: { type: 'text', text: response.text } }
        index += 1
      }
      for (const call of response.calls) {
        yield { type: 'block-start', index, blockType: 'tool-call' }
        yield {
          type: 'block-end',
          index,
          block: { type: 'tool-call', id: call.id, name: call.name, arguments: call.arguments }
        }
        index += 1
      }
      yield { type: 'usage', usage: normalized }
      yield { type: 'finish', reason: toolCount > 0 ? { kind: 'tool-calls' } : { kind: 'stop' } }
    } catch (error) {
      const errorCode = safeErrorCode(error)
      const failedUsage = raw?.usage ?? error?.usage
      const errorMessage = safeMessage(error)
      const processDiagnostics = error instanceof CodeBuddyCliError ? error.processDiagnostics : undefined
      const responseDiagnostics = error instanceof CodeBuddyCliError ? error.responseDiagnostics : undefined
      if (!recorded && (failedUsage || raw?.modelUsage || error?.modelUsage)) recordCall({ state: 'error', config: callConfig, usage: failedUsage, modelUsage: raw?.modelUsage ?? error?.modelUsage, diagnostics, durationMs: Math.round(performance.now() - startedAt), toolCalls: toolCount, errorCode, errorMessage, processDiagnostics, responseDiagnostics })
      else if (!recorded) {
        runtimeStatus.totals.calls += 1
        runtimeStatus.lastCall = { state: 'error', model: callConfig.model, at: Date.now(), errorCode, errorMessage, processDiagnostics, responseDiagnostics, diagnostics, durationMs: Math.round(performance.now() - startedAt) }
        rememberFailure(runtimeStatus.lastCall)
      }
      throw new CodeBuddyCliError(errorCode, safeMessage(error))
    } finally {
      runtimeStatus.activeCalls = Math.max(0, runtimeStatus.activeCalls - 1)
    }
  }
}

export function apply(ctx, config) {
  const getConfig = () => config
  const controller = new AbortController()
  const catalog = createModelCatalog(async (current) => {
    const cli = await checkCli(current, controller.signal)
    if (cli.state !== 'available') throw new CodeBuddyCliError(cli.code, '请先完成 CLI 配置，再刷新模型。')
    return queryModelCatalog({ ...current, cliPath: cli.path }, { signal: controller.signal })
  }, {
    onRefresh: () => { if (!controller.signal.aborted) ctx.emit('llm/adapters-updated') }
  })
  const adapter = new CodeBuddyCliAdapter(getConfig, catalog)
  const releaseAdapter = ctx.llm.registerAdapter([PROVIDER], adapter)
  ctx.effect(() => () => releaseAdapter(), 'dsh-codebuddy-cli-intl: model adapter')
  ctx.on('settings/document-updated', () => ctx.emit('llm/adapters-updated'))
  ctx.inject(['webServer'], (webCtx) => registerStatusRoute(webCtx, getConfig, catalog, controller.signal))
  void catalog.get(configOf(getConfig()))
  const timer = setInterval(() => { void catalog.get(configOf(getConfig()), { force: true }) }, 15 * 60000)
  timer.unref?.()
  ctx.effect(() => () => { clearInterval(timer); controller.abort() }, 'dsh-codebuddy-cli-intl: catalog refresh')
}

