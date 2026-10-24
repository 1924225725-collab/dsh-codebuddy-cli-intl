export class CodeBuddyCliError extends Error {
  constructor(code, message, { requestId, offloadImages } = {}) {
    const id = typeof requestId === 'string' && /^[a-f0-9-]{36}$/u.test(requestId) ? requestId : undefined
    super(id ? `${message} [diagnostic-id:${id}]` : message)
    this.name = 'CodeBuddyCliError'
    this.code = code
    // DSH accepts foreign errors only with matching own code + failure facts.
    const status = { CLI_AUTH_REQUIRED: 401, CLI_ACCESS_DENIED: 403, CLI_RATE_LIMITED: 429 }[code]
    const count = code === 'IMAGE_OFFLOAD_REQUIRED' && Number.isSafeInteger(offloadImages) && offloadImages > 0
      ? offloadImages : undefined
    this.failure = Object.freeze({ code, message: this.message,
      ...(id ? { requestId: id } : {}), ...(status ? { status } : {}), ...(count ? { offloadImages: count } : {}) })
  }
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function withDiagnostics(error, diagnostics) {
  if (diagnostics) error.processDiagnostics = Object.fromEntries(
    ['timeoutMs', 'elapsedMs', 'stdoutBytes', 'stderrBytes', 'exitCode']
      .filter(key => Number.isFinite(diagnostics[key])).map(key => [key, diagnostics[key]])
  )
  return error
}

// Official CLI can report authentication failure on stderr and still exit 0.
// Inspect fixed notice patterns only; never expose stderr, URLs or credentials.
export function cliOutputError(stdout = '', stderr = '', diagnostics, fallbackCode = 'CLI_OUTPUT_INVALID', fallbackMessage) {
  const notices = `${stderr}\n${stdout}`.replace(/\u001b\[[0-?]*[ -/]*[@-~]/gu, '')
  const patterns = [
    [/^\s*(?:Error:\s*)?401\b[^\r\n]*(?:authentication required|unauthorized|sign in|login)/imu, 'CLI_AUTH_REQUIRED', 'CodeBuddy CLI 登录鉴权失败（401）。请在官方 CLI 中执行 /login，选择 International Site 并完成登录，再刷新模型。程序版本检查通过不代表登录有效。'],
    [/^\s*(?:Error:\s*)?403\b[^\r\n]*(?:forbidden|access denied|permission)/imu, 'CLI_ACCESS_DENIED', 'CodeBuddy CLI 服务拒绝访问（403）。请检查账号及模型权限。'],
    [/^\s*(?:Error:\s*)?429\b[^\r\n]*(?:rate|limit|too many)/imu, 'CLI_RATE_LIMITED', 'CodeBuddy CLI 请求受到频率限制（429）。请稍后重试；插件不会自动重试。'],
    [/^\s*(?:Error:\s*)?(?:EPERM|EACCES):\s*(?:operation not permitted|permission denied)/imu, 'CLI_LOCAL_PERMISSION_DENIED', 'CodeBuddy CLI 无法访问本机文件或目录（权限不足）。请检查当前用户对 CLI 配置和缓存目录的访问权限。']
  ]
  const match = patterns.find(([pattern]) => pattern.test(notices))
  const code = match?.[1] ?? fallbackCode
  const message = match?.[2] ?? fallbackMessage ?? (stdout.trim()
    ? 'CodeBuddy CLI 返回了非 JSON 输出。请查看诊断日志中的错误分类和输出字节数。'
    : 'CodeBuddy CLI 标准输出为空，未返回 JSON 结果。请查看诊断日志；版本检查通过不代表登录或模型调用成功。')
  return withDiagnostics(new CodeBuddyCliError(code, message), diagnostics)
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
    const error = new CodeBuddyCliError('CLI_REQUEST_FAILED', 'CodeBuddy CLI 请求失败；请检查登录状态、模型权限或额度。')
    if (document.usage && typeof document.usage === 'object') error.usage = document.usage
    if (document.modelUsage && typeof document.modelUsage === 'object') error.modelUsage = document.modelUsage
    if (native) error.responseDiagnostics = { outputMode: 'native-json-schema', reason: 'cli-request-failed', finalResultCount }
    throw error
  }
  if (native && (!Object.hasOwn(document, 'structured_output') || document.structured_output === null
    || document.structured_output === undefined || (document.type !== undefined && document.type !== 'result'))) {
    const error = new CodeBuddyCliError('CLI_STRUCTURED_OUTPUT_MISSING', '官方国际版 CLI 未返回原生 structured_output 结果；未使用普通文本替代或交付工具。请检查 CLI 与模型支持情况，并查看插件故障指南。')
    error.usage = document.usage ?? {}
    if (document.modelUsage) error.modelUsage = document.modelUsage
    error.responseDiagnostics = { outputMode: 'native-json-schema', reason: 'native-structured-output-missing', finalResultCount }
    Object.defineProperty(error, 'rawResult', { value: document.result })
    throw error
  }
  const result = document.structured_output ?? document.result
  if (result === undefined) throw new CodeBuddyCliError('CLI_RESULT_MISSING', 'CodeBuddy CLI 未返回最终模型结果。')
  return { result, usage: document.usage ?? {}, ...(document.modelUsage ? { modelUsage: document.modelUsage } : {}), ...(native ? { finalResultCount } : {}) }
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
