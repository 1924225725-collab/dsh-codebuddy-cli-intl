export class CodeBuddyCliError extends Error {
  constructor(code, message, { requestId, offloadImages } = {}) {
    const id = typeof requestId === 'string' && /^[a-f0-9-]{36}$/u.test(requestId) ? requestId : undefined
    super(id ? `${message} [diagnostic-id:${id}]` : message)
    this.name = 'CodeBuddyCliError'
    this.code = code
    // DSH accepts foreign errors only with matching own code + failure facts.
    const status = { CLI_CONTEXT_TOO_LARGE: 400, CLI_AUTH_REQUIRED: 401, CLI_INSUFFICIENT_BALANCE: 402,
      CLI_ACCESS_DENIED: 403, CLI_RATE_LIMITED: 429 }[code]
    const count = code === 'IMAGE_OFFLOAD_REQUIRED' && Number.isSafeInteger(offloadImages) && offloadImages > 0
      ? offloadImages : undefined
    this.failure = Object.freeze({ code, message: this.message,
      ...(id ? { requestId: id } : {}), ...(status ? { status } : {}), ...(count ? { offloadImages: count } : {}) })
  }
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function failureNotice(document) {
  const parts = []
  const collect = (value, depth = 0) => {
    if (typeof value === 'string') {
      if (value) parts.push(value.slice(0, 4096))
      return
    }
    if (!isRecord(value) || depth >= 2) return
    for (const key of ['message', 'error', 'detail', 'description', 'code']) collect(value[key], depth + 1)
  }
  collect(document.error)
  collect(document.message)
  collect(document.result)
  const status = [document.status, document.error?.status, document.result?.status]
    .map(value => String(value ?? ''))
    .find(value => value === '400' || value === '402')
  return [status ? `HTTP ${status}` : '', ...parts].filter(Boolean).join(' ')
}

function withDiagnostics(error, diagnostics) {
  if (diagnostics) {
    const limits = {
      timeoutMs: 600_000, elapsedMs: 7_200_000, stdoutBytes: 64 * 1024 * 1024, stderrBytes: 1024 * 1024 * 1024,
      frameIndex: 1_000_000, frameBytes: 20 * 1024 * 1024, frameCount: 1_000_000, initCount: 1_000_000, resultCount: 1_000_000
    }
    const processDiagnostics = Object.fromEntries(Object.entries(limits).flatMap(([key, maximum]) => {
      const value = diagnostics[key]
      return Number.isSafeInteger(value) && value >= 0 && value <= maximum ? [[key, value]] : []
    }))
    if (Number.isSafeInteger(diagnostics.exitCode) && diagnostics.exitCode >= 0 && diagnostics.exitCode <= 255) {
      processDiagnostics.exitCode = diagnostics.exitCode
    }
    const enums = {
      streamReason: ['none', 'json-parse', 'frame-shape', 'duplicate-init', 'post-result-sequence', 'result-before-init', 'multiple-results', 'error-frame', 'permission-frame', 'missing-init', 'missing-result', 'nonzero-exit', 'deadline', 'cancelled', 'output-too-large', 'spawn-error'],
      streamPhase: ['await-init', 'after-init', 'after-result', 'draining', 'closed'],
      parseStage: ['none', 'line', 'tail'],
      lastFrameClass: ['none', 'system-init', 'system', 'assistant', 'result', 'error', 'control-request', 'other', 'malformed'],
      terminationInitiator: ['none', 'adapter-error', 'adapter-drain', 'deadline', 'external-cancel', 'child-error', 'natural-close', 'spawn-error']
    }
    for (const [key, allowed] of Object.entries(enums)) if (allowed.includes(diagnostics[key])) processDiagnostics[key] = diagnostics[key]
    for (const key of ['firstFinalSeen', 'closeObserved', 'deadlineReached']) if (typeof diagnostics[key] === 'boolean') processDiagnostics[key] = diagnostics[key]
    error.processDiagnostics = processDiagnostics
  }
  return error
}

const NOTICE_SOURCE = new Set(['none', 'stderr', 'stdout', 'assistant-text', 'error-frame', 'result-frame', 'mixed'])

function structuredOutputFacts(document) {
  const hasStructuredOutput = Object.hasOwn(document, 'structured_output')
  const value = document.structured_output
  const structuredOutputType = !hasStructuredOutput ? 'missing'
    : value === null ? 'null'
      : Array.isArray(value) ? 'array'
        : typeof value === 'object' ? 'object' : typeof value
  const subtype = typeof document.subtype === 'string' ? document.subtype : undefined
  const finalSubtypeClass = subtype === undefined ? 'missing'
    : subtype === 'success' ? 'success'
      : subtype === 'error' || subtype.startsWith('error_') ? 'error' : 'other'
  return {
    hasStructuredOutput,
    structuredOutputType,
    resultTypeValid: document.type === undefined || document.type === 'result',
    finalSubtypeClass
  }
}

// Official CLI can report authentication failure on stderr and still exit 0.
// Inspect fixed notice patterns only; never expose stderr, URLs or credentials.
export function cliOutputError(stdout = '', stderr = '', diagnostics, fallbackCode = 'CLI_OUTPUT_INVALID', fallbackMessage, sourceHint = 'stdout') {
  const clean = value => `${value}`.replace(/\u001b\[[0-?]*[ -/]*[@-~]/gu, '')
  const cleanStderr = clean(stderr)
  const cleanStdout = clean(stdout)
  const notices = `${cleanStderr}\n${cleanStdout}`
  const patterns = [
    [/^\s*(?:(?:API\s+)?Error:\s*)?(?:HTTP\s+)?402\b[^\r\n]*(?:insufficient[ _-]balance|balance[ _-]insufficient)/imu,
      'CLI_INSUFFICIENT_BALANCE', 'CodeBuddy 官方服务返回余额不足（402）。请在官方账户用量页面核对额度和模型权限；插件不会切换账号或模型。', 'insufficient-balance'],
    [/^\s*(?:(?:API\s+)?Error:\s*)?(?:HTTP\s+)?400\b[^\r\n]*(?:prompt\s+(?:is\s+)?too\s+long|context\s+(?:length|window)\s+(?:is\s+)?too\s+long|tokens?\s*>\s*[\d,]+\s+maximum)/imu,
      'CLI_CONTEXT_TOO_LARGE', '本次对话超过模型输入上下文上限（400）。请缩短历史、改用 DSH 图片附件，或新建对话并附上必要摘要；不要连续重试同一份过长请求。', 'context-limit'],
    [/^\s*(?:Error:\s*)?401\b[^\r\n]*(?:authentication required|unauthorized|sign in|login)/imu, 'CLI_AUTH_REQUIRED', 'CodeBuddy CLI 登录鉴权失败（401）。请在官方 CLI 中执行 /login，选择 International Site 并完成登录，再刷新模型。程序版本检查通过不代表登录有效。', 'authentication'],
    [/^\s*(?:Error:\s*)?403\b[^\r\n]*(?:forbidden|access denied|permission)/imu, 'CLI_ACCESS_DENIED', 'CodeBuddy CLI 服务拒绝访问（403）。请检查账号及模型权限。', 'access-denied'],
    [/^\s*(?:Error:\s*)?429\b[^\r\n]*(?:rate|limit|too many)/imu, 'CLI_RATE_LIMITED', 'CodeBuddy CLI 请求受到频率限制（429）。请稍后重试；插件不会自动重试。', 'rate-limit'],
    [/^\s*(?:Error:\s*)?(?:EPERM|EACCES):\s*(?:operation not permitted|permission denied)/imu, 'CLI_LOCAL_PERMISSION_DENIED', 'CodeBuddy CLI 无法访问本机文件或目录（权限不足）。请检查当前用户对 CLI 配置和缓存目录的访问权限。', 'local-permission'],
    [/^\s*(?:(?:API\s+)?Error:\s*)?(?:(?:(?:read|write|connect)\s+)?ECONNRESET\b|Client network socket disconnected before secure TLS connection was established\b|502\b[^\r\n]*(?:安全连接建立失败|Client network socket disconnected before secure TLS connection was established))/imu,
      'CLI_NETWORK_ERROR', 'CodeBuddy CLI 网络连接失败（连接中断或 TLS 建立失败）。请检查到官方国际服务的网络或代理后重试；插件不会自动重试。', 'network']
  ]
  const match = patterns.find(([pattern]) => pattern.test(notices))
  const code = match?.[1] ?? fallbackCode
  const message = match?.[2] ?? fallbackMessage ?? (stdout.trim()
    ? 'CodeBuddy CLI 返回了非 JSON 输出。请查看诊断日志中的错误分类和输出字节数。'
    : 'CodeBuddy CLI 标准输出为空，未返回 JSON 结果。请查看诊断日志；版本检查通过不代表登录或模型调用成功。')
  const safeSourceHint = NOTICE_SOURCE.has(sourceHint) && sourceHint !== 'none' ? sourceHint : 'stdout'
  const noticeSource = !match ? cleanStderr.trim() ? 'stderr' : cleanStdout.trim() ? safeSourceHint : 'none'
    : match[0].test(cleanStderr) ? 'stderr'
      : match[0].test(cleanStdout) ? safeSourceHint : 'mixed'
  const error = new CodeBuddyCliError(code, message)
  error.responseDiagnostics = {
    outputMode: 'native-json-schema',
    reason: match ? 'cli-notice' : fallbackCode === 'CLI_TIMEOUT' ? 'deadline' : 'cli-output-invalid',
    noticeClass: match?.[3] ?? (cleanStderr.trim() || cleanStdout.trim() ? 'unclassified' : 'none'),
    noticeSource
  }
  return withDiagnostics(error, diagnostics)
}

function finalResult(document, native = false) {
  if (!Array.isArray(document)) return document

  if (native) {
    const finals = document.filter(item => isRecord(item) && item.type === 'result')
    if (finals.length !== 1) {
      const error = new CodeBuddyCliError('STRUCTURED_OUTPUT_INVALID', 'CodeBuddy CLI 未返回唯一的最终结果记录；未选择任何结果或交付工具。 [STRUCTURED_OUTPUT_INVALID:native-final-results]')
      error.responseDiagnostics = { outputMode: 'native-json-schema', reason: 'native-final-results', finalResultCount: finals.length }
      Object.defineProperty(error, 'rawResult', { value: finals.map(item => item.structured_output ?? item.result) })
      throw error
    }
    return finals[0]
  }

  for (let index = document.length - 1; index >= 0; index -= 1) {
    const item = document[index]
    if (isRecord(item)
      && (item.type === 'result' || item.structured_output !== undefined || item.result !== undefined)) {
      return item
    }
  }
  throw new CodeBuddyCliError('CLI_OUTPUT_INVALID', 'CodeBuddy CLI 返回了 JSON 数组，但其中没有最终结果记录。')
}

function readResult(stdout, { stderr = '', processDiagnostics, native = false } = {}) {
  let document
  try { document = JSON.parse(stdout.trim()) } catch {
    throw cliOutputError(stdout, stderr, processDiagnostics)
  }
  const finalResultCount = native
    ? Array.isArray(document) ? document.filter(item => isRecord(item) && item.type === 'result').length
      : isRecord(document) && (document.type === undefined || document.type === 'result') ? 1 : 0
    : undefined
  document = finalResult(document, native)
  if (!isRecord(document)) {
    const kind = document === null ? 'null' : Array.isArray(document) ? '数组' : typeof document
    const error = new CodeBuddyCliError('CLI_OUTPUT_INVALID', `CodeBuddy CLI 返回了 JSON ${kind}，插件无法识别其响应格式。`)
    if (native) error.responseDiagnostics = { outputMode: 'native-json-schema', finalResultCount }
    throw error
  }
  const subtype = typeof document.subtype === 'string' ? document.subtype : ''
  if (document.is_error === true || subtype === 'error' || subtype.startsWith('error_')) {
    const classified = cliOutputError(failureNotice(document), '', undefined, 'CLI_REQUEST_FAILED', undefined, 'result-frame')
    const knownFailure = ['CLI_CONTEXT_TOO_LARGE', 'CLI_INSUFFICIENT_BALANCE'].includes(classified.code)
    const error = new CodeBuddyCliError(knownFailure ? classified.code : 'CLI_REQUEST_FAILED', knownFailure
      ? classified.message : 'CodeBuddy CLI 请求失败；请检查登录状态、模型权限或额度。')
    if (document.usage && typeof document.usage === 'object') error.usage = document.usage
    if (document.modelUsage && typeof document.modelUsage === 'object') error.modelUsage = document.modelUsage
    if (native) error.responseDiagnostics = {
      outputMode: 'native-json-schema', reason: 'cli-request-failed', finalResultCount,
      ...structuredOutputFacts(document), ...classified.responseDiagnostics
    }
    throw error
  }
  const nativeFacts = native ? structuredOutputFacts(document) : undefined
  if (native && (!Object.hasOwn(document, 'structured_output') || document.structured_output === null
    || document.structured_output === undefined || (document.type !== undefined && document.type !== 'result'))) {
    const error = new CodeBuddyCliError('CLI_STRUCTURED_OUTPUT_MISSING', '官方国际版 CLI 未返回原生 structured_output 结果；未使用普通文本替代或交付工具。请检查 CLI 与模型支持情况，并查看插件故障指南。')
    error.usage = document.usage ?? {}
    if (document.modelUsage) error.modelUsage = document.modelUsage
    error.responseDiagnostics = { outputMode: 'native-json-schema', reason: 'native-structured-output-missing', finalResultCount, ...nativeFacts }
    Object.defineProperty(error, 'rawResult', { value: document.result })
    throw error
  }
  const result = document.structured_output ?? document.result
  if (result === undefined) throw new CodeBuddyCliError('CLI_RESULT_MISSING', 'CodeBuddy CLI 未返回最终模型结果。')
  return { result, usage: document.usage ?? {}, ...(document.modelUsage ? { modelUsage: document.modelUsage } : {}),
    ...(native ? { finalResultCount, responseDiagnostics: { outputMode: 'native-json-schema', reason: 'native-result', ...nativeFacts } } : {}) }
}

export function collectResult(stdout, options = {}) {
  try { return readResult(stdout, options) }
  catch (error) {
    if (error instanceof CodeBuddyCliError) withDiagnostics(error, options.processDiagnostics)
    throw error
  }
}

// Native mode never uses the CLI's free-form result as model output.
export function collectStructuredResult(stdout, options = {}) {
  try { return readResult(stdout, { ...options, native: true }) }
  catch (error) {
    if (error instanceof CodeBuddyCliError) {
      withDiagnostics(error, options.processDiagnostics)
      if (!error.responseDiagnostics) error.responseDiagnostics = { outputMode: 'native-json-schema' }
    }
    throw error
  }
}
