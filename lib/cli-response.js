export class CodeBuddyCliError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'CodeBuddyCliError'
    this.code = code
  }
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
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

export function collectResult(stdout) {
  let document
  try { document = JSON.parse(stdout.trim()) } catch {
    throw new CodeBuddyCliError('CLI_OUTPUT_INVALID', 'CodeBuddy CLI 没有返回有效的 JSON 响应。')
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
