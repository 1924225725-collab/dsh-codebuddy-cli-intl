export class CodeBuddyCliError extends Error {
  constructor(code, message, { requestId } = {}) {
    const id = typeof requestId === 'string' && /^[a-f0-9-]{36}$/u.test(requestId) ? requestId : undefined
    super(id ? `${message} [diagnostic-id:${id}]` : message)
    this.name = 'CodeBuddyCliError'
    this.code = code
    // DSH accepts foreign errors only with matching own code + failure facts.
    const status = { CLI_AUTH_REQUIRED: 401, CLI_ACCESS_DENIED: 403, CLI_RATE_LIMITED: 429 }[code]
    this.failure = Object.freeze({ code, message: this.message,
      ...(id ? { requestId: id } : {}), ...(status ? { status } : {}) })
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

function finalResult(document) {
  if (!Array.isArray(document)) return document

  for (let index = document.length - 1; index >= 0; index -= 1) {
    const item = document[index]
    if (isRecord(item)
      && (item.type === 'result' || item.structured_output !== undefined || item.result !== undefined)) {
      return item
    }
  }
  throw new CodeBuddyCliError('CLI_OUTPUT_INVALID', 'CodeBuddy CLI 返回了 JSON 数组，但其中没有最终结果记录。')
}

function readResult(stdout, { stderr = '', processDiagnostics } = {}) {
  let document
  try { document = JSON.parse(stdout.trim()) } catch {
    throw cliOutputError(stdout, stderr, processDiagnostics)
  }
  document = finalResult(document)
  if (!isRecord(document)) {
    const kind = document === null ? 'null' : Array.isArray(document) ? '数组' : typeof document
    throw new CodeBuddyCliError('CLI_OUTPUT_INVALID', `CodeBuddy CLI 返回了 JSON ${kind}，插件无法识别其响应格式。`)
  }
  const subtype = typeof document.subtype === 'string' ? document.subtype : ''
  if (document.is_error === true || subtype === 'error' || subtype.startsWith('error_')) {
    const error = new CodeBuddyCliError('CLI_REQUEST_FAILED', 'CodeBuddy CLI 请求失败；请检查登录状态、模型权限或额度。')
    if (document.usage && typeof document.usage === 'object') error.usage = document.usage
    if (document.modelUsage && typeof document.modelUsage === 'object') error.modelUsage = document.modelUsage
    throw error
  }
  const result = document.structured_output ?? document.result
  if (result === undefined) throw new CodeBuddyCliError('CLI_RESULT_MISSING', 'CodeBuddy CLI 未返回最终模型结果。')
  return { result, usage: document.usage ?? {}, ...(document.modelUsage ? { modelUsage: document.modelUsage } : {}) }
}

export function collectResult(stdout, options = {}) {
  try { return readResult(stdout, options) }
  catch (error) {
    if (error instanceof CodeBuddyCliError) withDiagnostics(error, options.processDiagnostics)
    throw error
  }
}
