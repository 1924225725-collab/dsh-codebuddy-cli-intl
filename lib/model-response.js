import { randomUUID } from 'node:crypto'
import { CodeBuddyCliError } from './cli-response.js'
import { recoverTextEnvelope } from './text-envelope.js'

const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const kind = (value) => value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value
const own = (value, key) => Object.hasOwn(value, key)

// The official structured_output value is already decoded JSON. Validate it
// directly; never scan prose, unwrap wrappers or repair malformed output here.
export function parseStructuredResponse(value, tools = []) {
  const diagnostics = { inputType: kind(value), valueType: kind(value), outputMode: 'native-json-schema', normalizations: [] }
  const fail = (reason, message, code = 'STRUCTURED_OUTPUT_INVALID') => {
    const error = new CodeBuddyCliError(code, `${message} [${code}:${reason}]`)
    error.responseDiagnostics = { ...diagnostics, reason }
    throw error
  }
  if (!record(value) || Object.keys(value).length !== 2 || !own(value, 'text') || !own(value, 'toolCalls')) {
    fail('native-envelope', '原生结构结果必须恰好包含 text 与 toolCalls；不会回退解析普通文本。')
  }
  if (Array.isArray(value.toolCalls)) for (const call of value.toolCalls) {
    if (!record(call) || Object.keys(call).length !== 2 || !own(call, 'name') || !own(call, 'arguments')) {
      fail('native-tool-envelope', '结构化工具请求的字段不符合协议。', 'TOOL_CALL_INVALID')
    }
    if (!record(call.arguments)) fail('invalid-tool-arguments', '结构化工具参数必须是对象；不会解析或修复参数字符串。', 'TOOL_CALL_INVALID')
  }
  try {
    const response = parseModelResponse(value, tools)
    response.responseDiagnostics.outputMode = 'native-json-schema'
    return response
  } catch (error) {
    if (error.responseDiagnostics) error.responseDiagnostics.outputMode = 'native-json-schema'
    throw error
  }
}

// Ignore only complete, unrelated examples/annotations. Protocol-like keys,
// tool aliases and malformed JSON remain blockers even beside a valid reply.
function unrelated(value, depth = 0) {
  if (depth > 8) return false
  if (Array.isArray(value)) return value.every(item => unrelated(item, depth + 1))
  if (typeof value === 'string') {
    try { return unrelated(JSON.parse(value), depth + 1) }
    catch { return !/"(?:text|tool.?calls?|name|arguments|function.*)"\s*:/iu.test(value) }
  }
  if (!record(value)) return true
  return Object.entries(value).every(([key, item]) => !/^(?:text|tool.?calls?|tool|calls?|name|arguments|args|function.*|data|result|content|role|type|commands?|cmd|script|shell)$/iu.test(key) && unrelated(item, depth + 1))
}

function protocolLike(text, tools) {
  if (/(?:^|[,{]\s*)["']?(?:text|tool.?calls?|tool|calls?|name|arguments?|args|function|commands?|cmd|script|shell)["']?\s*:/imu.test(text)) return true
  return tools.some((tool) => typeof tool?.name === 'string' && tool.name && text.includes(tool.name))
}

// Compare the exact text and ordered tool payloads that DSH would receive.
// IDs are generated locally and must not make identical replies look distinct.
// Extra fields and wrapper/alias forms are deliberately excluded from deduping.
function deliveryFingerprint(value, parsed) {
  if (!record(value) || Object.keys(value).length !== 2 || typeof value.text !== 'string' || !Array.isArray(value.toolCalls)) return null
  if (!value.toolCalls.every(call => record(call) && Object.keys(call).length === 2 && own(call, 'name') && own(call, 'arguments'))) return null
  return JSON.stringify([parsed.text, parsed.calls.map(call => [call.name, call.arguments])])
}

// Scan complete outer containers, respecting quoted/escaped braces. Never close
// an unfinished container or select one of several possible model responses.
function containers(text) {
  const spans = []
  const stack = []
  let start = -1, quoted = false, escaped = false, broken = false
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    if (!stack.length) {
      if (char === '{' || char === '[') { start = index; stack.push(char) }
      else if (char === '}' || char === ']') { broken = true; break }
      continue
    }
    if (quoted) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') quoted = false
    } else if (char === '"') quoted = true
    else if (char === '{' || char === '[') stack.push(char)
    else if (char === '}' || char === ']') {
      if (stack.at(-1) !== (char === '}' ? '{' : '[')) { broken = true; break }
      stack.pop()
      if (!stack.length) {
        spans.push(text.slice(start, index + 1))
      }
    }
  }
  return { spans, incomplete: quoted || stack.length > 0, broken, openDepth: stack.length,
    insideString: quoted }
}

export function parseModelResponse(result, tools = []) {
  const diagnostics = { inputType: kind(result), normalizations: [] }
  if (typeof result === 'string') {
    diagnostics.characters = result.length
    diagnostics.bytes = Buffer.byteLength(result)
  }
  const fail = (reason, message, code = 'STRUCTURED_OUTPUT_INVALID') => {
    const error = new CodeBuddyCliError(code, `${message} [${code}:${reason}]`)
    error.responseDiagnostics = { ...diagnostics, normalizations: [...diagnostics.normalizations], reason }
    throw error
  }
  const decode = (input) => {
    const originalText = input.trim()
    let text = originalText
    if (!text) fail('empty-result', 'CLI 返回的模型结果为空。')
    const fence = text.match(/^```(?:json)?[ \t]*\r?\n([\s\S]*?)\r?\n?```[ \t]*$/iu)
    if (fence) {
      text = fence[1].trim()
      diagnostics.normalizations.push('markdown-fence')
    }
    if (!text) fail('empty-result', 'CLI 返回的模型结果为空。')
    try {
      const value = JSON.parse(text)
      if (unrelated(value)) {
        diagnostics.normalizations.push('plain-text-fallback')
        return { text: originalText, toolCalls: [] }
      }
      return value
    } catch {}
    const scanned = containers(text)
    diagnostics.completeContainers = scanned.spans.length
    diagnostics.containerSummaries = scanned.spans.slice(0, 12).map(span => {
      const item = { characters: span.length, bytes: Buffer.byteLength(span), jsonValid: false }
      try {
        const value = JSON.parse(span)
        Object.assign(item, { jsonValid: true, valueType: kind(value) })
        if (record(value)) Object.assign(item, { hasText: own(value, 'text'), textType: kind(value.text),
          hasToolCalls: own(value, 'toolCalls'), toolCallsType: kind(value.toolCalls),
          ...(Array.isArray(value.toolCalls) ? { toolCount: value.toolCalls.length } : {}) })
      } catch {}
      return item
    })
    diagnostics.containerSummariesTruncated = scanned.spans.length > 12
    diagnostics.scanIncomplete = scanned.incomplete
    diagnostics.scanBroken = scanned.broken
    diagnostics.openContainerDepth = scanned.openDepth
    diagnostics.insideString = scanned.insideString
    if (scanned.broken) fail('invalid-json', '模型 JSON 的括号或语法不合法。')
    if (scanned.incomplete) fail('possibly-truncated-json', '模型 JSON 未闭合，可能被截断；未补全内容或执行工具。')
    const recoveredText = recoverTextEnvelope(text)
    if (recoveredText) {
      diagnostics.normalizations.push('text-string-escape-recovery')
      return recoveredText
    }
    // Some CLI builds return a plain text final answer despite the requested
    // JSON envelope. Treat delimiter-free text as text only; never infer tools.
    if (scanned.spans.length === 0 && !scanned.broken) {
      diagnostics.normalizations.push('plain-text-fallback')
      return { text, toolCalls: [] }
    }
    if (scanned.spans.length > 1) {
      const candidates = []
      const fingerprints = []
      let ignored = 0
      let malformedUnrelated = 0
      for (const span of scanned.spans) {
        let value
        try { value = JSON.parse(span) } catch {
          // Plain bracket labels such as [阶段一] are prose, not broken JSON.
          if (/^\[[\p{L}\p{N} _-]+\]$/u.test(span) && !/text|tool|function|arguments|result|data/iu.test(span)) ignored++
          else if (!protocolLike(span, tools)) malformedUnrelated++
          continue
        }
        try {
          const parsed = parseModelResponse(value, tools)
          candidates.push(value)
          fingerprints.push(deliveryFingerprint(value, parsed))
        }
        catch { if (unrelated(value)) ignored++ }
      }
      diagnostics.validProtocolCandidates = candidates.length
      diagnostics.ignoredContainers = ignored
      if (candidates.length === 1 && ignored === scanned.spans.length - 1 && !text.startsWith('"') && !text.startsWith('```')) {
        diagnostics.normalizations.push('unique-protocol-result')
        return candidates[0]
      }
      if (candidates.length > 1 && ignored === scanned.spans.length - candidates.length
        && fingerprints[0] !== null && fingerprints.every(value => value === fingerprints[0])
        && !text.startsWith('"') && !text.startsWith('```')) {
        diagnostics.duplicateProtocolCandidates = candidates.length - 1
        diagnostics.normalizations.push('duplicate-protocol-result')
        return candidates[0]
      }
      if (candidates.length === 0 && ignored + malformedUnrelated === scanned.spans.length) {
        diagnostics.normalizations.push('plain-text-fallback')
        return { text: originalText, toolCalls: [] }
      }
      fail('ambiguous-json', '回复包含无法确认一致的多个协议片段；本次结果未交付工具调用。请查看插件配置页的“故障处理与使用指南”。')
    }
    // A quoted JSON string that failed decoding must not be salvaged by
    // extracting its inner braces. Reject other code languages as well.
    if (scanned.spans.length === 1 && !text.startsWith('"') && !text.startsWith('```')) {
      if (/^\[[\p{L}\p{N} _-]+\]$/u.test(scanned.spans[0])
        && !/text|tool|function|arguments|result|data/iu.test(scanned.spans[0])) {
        diagnostics.normalizations.push('plain-text-fallback')
        return { text: originalText, toolCalls: [] }
      }
      try {
        const value = JSON.parse(scanned.spans[0])
        if (unrelated(value)) {
          diagnostics.normalizations.push('plain-text-fallback')
          return { text: originalText, toolCalls: [] }
        }
        diagnostics.normalizations.push('surrounding-text')
        return value
      } catch {
        if (!protocolLike(scanned.spans[0], tools)) {
          diagnostics.normalizations.push('plain-text-fallback')
          return { text: originalText, toolCalls: [] }
        }
      }
    }
    fail('invalid-json', '模型回复不是可识别的完整 JSON。')
  }

  let value = result
  for (let depth = 0; depth < 5; depth++) {
    if (typeof value === 'string') {
      if (depth) diagnostics.normalizations.push('encoded-json')
      value = decode(value)
      continue
    }
    if (Array.isArray(value) && value.length === 1 && record(value[0])) {
      value = value[0]
      diagnostics.normalizations.push('single-item-array')
      continue
    }
    if (record(value) && Object.keys(value).length === 1 && !own(value, 'text') && !own(value, 'toolCalls')) {
      const key = own(value, 'data') ? 'data' : own(value, 'result') ? 'result' : null
      if (key && (record(value[key]) || typeof value[key] === 'string')) {
        value = value[key]
        diagnostics.normalizations.push(`${key}-wrapper`)
        continue
      }
    }
    break
  }
  diagnostics.valueType = kind(value)
  if (!record(value)) fail('invalid-envelope', '模型结果必须是包含 text 和 toolCalls 的对象。')
  diagnostics.hasText = own(value, 'text')
  diagnostics.textType = kind(value.text)
  diagnostics.hasToolCalls = own(value, 'toolCalls')
  diagnostics.toolCallsType = kind(value.toolCalls)

  let text = value.text
  let calls = value.toolCalls
  // Only infer empty fields for unambiguous single-purpose responses. Unknown
  // aliases or other keys must never cause a tool request to be silently lost.
  if (!own(value, 'toolCalls') && typeof text === 'string' && Object.keys(value).length === 1) {
    calls = []
    diagnostics.normalizations.push('text-only')
  }
  if ((!own(value, 'text') || text === null) && Array.isArray(calls) && calls.length > 0
    && Object.keys(value).every((key) => key === 'text' || key === 'toolCalls')) {
    text = ''
    diagnostics.normalizations.push('tools-only')
  }
  if (typeof text !== 'string') fail('invalid-text-field', '模型结果的 text 字段缺失或类型错误。')
  if (!Array.isArray(calls)) fail('invalid-tool-calls-field', '模型结果的 toolCalls 字段必须是数组。')
  if (!text.trim() && calls.length === 0) fail('empty-content', '模型返回了空回复且没有工具调用，本轮未交付内容。')
  diagnostics.toolCount = calls.length
  const allowed = new Set(tools.map((tool) => tool.name))
  const converted = calls.map((call) => {
    if (!record(call) || typeof call.name !== 'string' || !allowed.has(call.name)) {
      fail('unknown-tool', '模型返回了未声明的 DSH 工具调用。', 'TOOL_CALL_INVALID')
    }
    let args = call.arguments
    if (typeof args === 'string') {
      try { args = JSON.parse(args) } catch { fail('invalid-tool-arguments-json', '工具参数不是完整 JSON；未补全或执行工具。', 'TOOL_CALL_INVALID') }
      diagnostics.normalizations.push('encoded-tool-arguments')
    }
    if (!record(args)) fail('invalid-tool-arguments', '工具参数必须是 JSON 对象。', 'TOOL_CALL_INVALID')
    return { id: `cb-${randomUUID()}`, name: call.name, arguments: JSON.stringify(args) }
  })
  diagnostics.normalizations = [...new Set(diagnostics.normalizations)]
  diagnostics.reason = diagnostics.normalizations.includes('plain-text-fallback') ? 'plain-text-fallback'
    : 'valid'
  return { text, calls: converted, responseDiagnostics: diagnostics }
}
