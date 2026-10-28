import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

const MAX_ENTRIES = 100
const MAX_BYTES = 2 * 1024 * 1024
const SAMPLE_BYTES = 256 * 1024
const MAX_DIAGNOSTIC_BYTES = 2_147_483_647
const number = (value) => Number.isFinite(value) && value >= 0 ? value : undefined
const label = (value) => typeof value === 'string' ? value.replace(/[^a-zA-Z0-9_.:/ -]/gu, '_').slice(0, 128) : undefined
const numeric = (value, keys) => Object.fromEntries(keys.filter(key => number(value?.[key]) !== undefined).map(key => [key, value[key]]))
const boundedInteger = (value, maximum) => Number.isSafeInteger(value) && value >= 0 && value <= maximum ? value : undefined
const PROCESS_NUMBER_LIMITS = {
  timeoutMs: 600_000, elapsedMs: 7_200_000, stdoutBytes: 64 * 1024 * 1024, stderrBytes: 1024 * 1024 * 1024,
  frameIndex: 1_000_000, frameBytes: 20 * 1024 * 1024, frameCount: 1_000_000, initCount: 1_000_000, resultCount: 1_000_000
}
const REQUEST_NUMBER_LIMITS = {
  messageCount: 1_000_000, toolCount: 100_000,
  promptBytes: MAX_DIAGNOSTIC_BYTES, systemBytes: MAX_DIAGNOSTIC_BYTES, messagesBytes: MAX_DIAGNOSTIC_BYTES,
  toolsBytes: MAX_DIAGNOSTIC_BYTES, schemaBytes: MAX_DIAGNOSTIC_BYTES, envelopeOverheadBytes: MAX_DIAGNOSTIC_BYTES,
  imageCount: 1_000_000, offloadedImageCount: 1_000_000,
  imageBytes: MAX_DIAGNOSTIC_BYTES, imageBase64Bytes: MAX_DIAGNOSTIC_BYTES,
  streamInputBytes: MAX_DIAGNOSTIC_BYTES, cliInputBytes: MAX_DIAGNOSTIC_BYTES,
  requestBytes: MAX_DIAGNOSTIC_BYTES, requestLimitBytes: MAX_DIAGNOSTIC_BYTES,
  inlineImageDataUriCount: 1_000_000, inlineImageDataUriChars: MAX_DIAGNOSTIC_BYTES
}
function boundedNumbers(value, limits) {
  if (!value || typeof value !== 'object') return {}
  return Object.fromEntries(Object.entries(limits).flatMap(([key, maximum]) => {
    const safe = boundedInteger(value[key], maximum)
    return safe === undefined ? [] : [[key, safe]]
  }))
}
const safeEnums = {
  streamReason: new Set(['none', 'json-parse', 'frame-shape', 'duplicate-init', 'post-result-sequence', 'result-before-init', 'multiple-results', 'error-frame', 'permission-frame', 'missing-init', 'missing-result', 'nonzero-exit', 'deadline', 'cancelled', 'output-too-large', 'spawn-error']),
  streamPhase: new Set(['await-init', 'after-init', 'after-result', 'draining', 'closed']),
  parseStage: new Set(['none', 'line', 'tail']),
  lastFrameClass: new Set(['none', 'system-init', 'system', 'assistant', 'result', 'error', 'control-request', 'other', 'malformed']),
  terminationInitiator: new Set(['none', 'adapter-error', 'adapter-drain', 'deadline', 'external-cancel', 'child-error', 'natural-close', 'spawn-error']),
  structuredOutputType: new Set(['missing', 'null', 'object', 'array', 'string', 'number', 'boolean', 'undefined']),
  finalSubtypeClass: new Set(['missing', 'success', 'error', 'other']),
  noticeClass: new Set(['none', 'unclassified', 'context-limit', 'insufficient-balance', 'authentication', 'access-denied', 'rate-limit', 'local-permission', 'network']),
  noticeSource: new Set(['none', 'stderr', 'stdout', 'assistant-text', 'error-frame', 'result-frame', 'mixed']),
  requestLimitStage: new Set(['envelope', 'cli-input'])
}
function fixedEnums(value, keys) {
  return Object.fromEntries(keys.filter(key => safeEnums[key]?.has(value?.[key])).map(key => [key, value[key]]))
}
export function sanitizeRequestDiagnostics(value) {
  if (!value || typeof value !== 'object') return {}
  return {
    ...boundedNumbers(value, REQUEST_NUMBER_LIMITS),
    ...fixedEnums(value, ['requestLimitStage'])
  }
}
function processSummary(value) {
  if (!value || typeof value !== 'object') return undefined
  return {
    ...boundedNumbers(value, PROCESS_NUMBER_LIMITS),
    ...(Number.isSafeInteger(value.exitCode) && value.exitCode >= 0 && value.exitCode <= 255 ? { exitCode: value.exitCode } : {}),
    ...fixedEnums(value, ['streamReason', 'streamPhase', 'parseStage', 'lastFrameClass', 'terminationInitiator']),
    ...Object.fromEntries(['firstFinalSeen', 'closeObserved', 'deadlineReached'].filter(key => typeof value[key] === 'boolean').map(key => [key, value[key]]))
  }
}
function responseSummary(value) {
  if (!value || typeof value !== 'object') return undefined
  const result = numeric(value, ['characters', 'bytes', 'completeContainers', 'toolCount', 'validProtocolCandidates', 'ignoredContainers', 'duplicateProtocolCandidates', 'openContainerDepth', 'finalResultCount'])
  for (const key of ['inputType', 'valueType', 'textType', 'toolCallsType', 'reason']) if (typeof value[key] === 'string') result[key] = label(value[key])
  Object.assign(result, fixedEnums(value, ['structuredOutputType', 'finalSubtypeClass', 'noticeClass', 'noticeSource']))
  if (value.outputMode === 'native-json-schema') result.outputMode = 'native-json-schema'
  for (const key of ['hasText', 'hasToolCalls', 'hasStructuredOutput', 'resultTypeValid', 'containerSummariesTruncated', 'scanIncomplete', 'scanBroken', 'insideString', 'incompleteTailIgnored']) {
    if (typeof value[key] === 'boolean') result[key] = value[key]
  }
  result.normalizations = Array.isArray(value.normalizations) ? value.normalizations.slice(0, 16).map(label).filter(Boolean) : []
  if (Array.isArray(value.containerSummaries)) result.containerSummaries = value.containerSummaries.slice(0, 12).map(item => ({
    ...numeric(item, ['characters', 'bytes', 'toolCount']),
    ...Object.fromEntries(['jsonValid', 'hasText', 'hasToolCalls'].filter(key => typeof item[key] === 'boolean').map(key => [key, item[key]])),
    ...Object.fromEntries(['valueType', 'textType', 'toolCallsType'].filter(key => typeof item[key] === 'string').map(key => [key, label(item[key])]))
  }))
  return result
}
function summary(call) {
  return {
    id: typeof call.id === 'string' && /^[a-f0-9-]{36}$/u.test(call.id) ? call.id : randomUUID(),
    ...numeric(call, ['at', 'durationMs', 'timeoutMs', 'inputTokens', 'outputTokens', 'uncachedInputTokens', 'cacheReadTokens', 'cacheWriteTokens', 'toolCalls']),
    ...(typeof call.accountId === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u.test(call.accountId) ? { accountId: call.accountId } : {}),
    state: call.state === 'success' ? 'success' : 'error', model: label(call.model), effort: label(call.effort),
    errorCode: label(call.errorCode), cliVersion: label(call.cliVersion), pluginVersion: label(call.pluginVersion),
    ...(call.captureAttempted === true ? { captureAttempted: true } : {}),
    ...(call.imageRequest === true ? { imageRequest: true } : {}),
    ...(call.cancelled === true ? { cancelled: true } : {}),
    ...(boundedInteger(call.offloadImagesRequested, 1_000_000) > 0 ? { offloadImagesRequested: call.offloadImagesRequested } : {}),
    ...(boundedInteger(call.historyOffloadedImages, 1_000_000) > 0 ? { historyOffloadedImages: call.historyOffloadedImages } : {}),
    diagnostics: sanitizeRequestDiagnostics(call.diagnostics),
    processDiagnostics: processSummary(call.processDiagnostics),
    responseDiagnostics: responseSummary(call.responseDiagnostics)
  }
}
function sample(value) {
  if (value === undefined) return undefined
  let text
  try { text = typeof value === 'string' ? value : JSON.stringify(value) } catch { return undefined }
  if (typeof text !== 'string') return undefined
  const buffer = Buffer.from(text)
  // Preserve both ends for debugging missing endings and wrapper syntax.
  const truncated = buffer.length > SAMPLE_BYTES
  let headEnd = truncated ? SAMPLE_BYTES / 2 : buffer.length
  let tailStart = buffer.length - SAMPLE_BYTES / 2
  if (truncated) {
    while ((buffer[headEnd] & 0xc0) === 0x80) headEnd--
    while ((buffer[tailStart] & 0xc0) === 0x80) tailStart++
  }
  return { originalBytes: buffer.length, truncated,
    head: buffer.subarray(0, headEnd).toString('utf8'),
    ...(truncated ? { tail: buffer.subarray(tailStart).toString('utf8') } : {}) }
}
export function diagnosticsDirectory() {
  const base = process.platform === 'win32' ? process.env.LOCALAPPDATA || path.join(homedir(), 'AppData', 'Local')
    : process.platform === 'darwin' ? path.join(homedir(), 'Library', 'Application Support')
      : process.env.XDG_STATE_HOME || path.join(homedir(), '.local', 'state')
  return path.join(base, 'dsh-codebuddy-cli-intl', 'logs')
}

export function createDiagnosticsStore({ directory = diagnosticsDirectory(), pluginVersion = '0.2.2' } = {}) {
  const file = path.join(directory, 'diagnostics.json')
  let entries = [], armed = false, storageError = null, queue = Promise.resolve()
  const ready = (async () => {
    try {
      if ((await stat(file)).size > MAX_BYTES) { storageError = 'LOG_FILE_TOO_LARGE'; return }
      const data = JSON.parse(await readFile(file, 'utf8'))
      if (!Array.isArray(data.entries)) throw Error('shape')
      entries = data.entries.slice(-MAX_ENTRIES).map(entry => ({ ...summary(entry),
        ...(entry.state === 'error' && entry.imageRequest !== true && entry.sample && typeof entry.sample.head === 'string' ? { sample: {
          originalBytes: number(entry.sample.originalBytes), truncated: entry.sample.truncated === true,
          head: entry.sample.head.slice(0, SAMPLE_BYTES), ...(typeof entry.sample.tail === 'string' ? { tail: entry.sample.tail.slice(0, SAMPLE_BYTES / 2) } : {})
        } } : {}) }))
    } catch (error) { if (error.code !== 'ENOENT') storageError = 'LOG_READ_FAILED' }
  })()
  const enqueue = (work) => {
    queue = queue.then(() => ready).then(work).catch(() => { storageError = 'LOG_WRITE_FAILED' })
    return queue
  }
  const persist = async () => {
    let body = JSON.stringify({ schemaVersion: 1, entries })
    while (entries.length && Buffer.byteLength(body) > MAX_BYTES) {
      entries.shift(); body = JSON.stringify({ schemaVersion: 1, entries })
    }
    await mkdir(directory, { recursive: true, mode: 0o700 })
    await writeFile(`${file}.tmp`, body, { mode: 0o600 })
    await rename(`${file}.tmp`, file)
    storageError = null
  }
  const report = (detailed) => ({
    schemaVersion: 1, exportedAt: Date.now(), pluginVersion,
    environment: { platform: process.platform, arch: process.arch, nodeVersion: process.versions.node },
    privacy: { includesRawReplies: detailed && entries.some(entry => entry.sample), includesRequests: false, automaticUpload: false },
    storageError, entries: entries.map(entry => detailed ? { ...entry } : { ...summary(entry), sampleAvailable: !!entry.sample })
  })
  return {
    ready,
    status: () => ({ entries: entries.length, failures: entries.filter(entry => entry.state === 'error').length,
      samples: entries.filter(entry => entry.sample).length, captureArmed: armed, storageError, maxEntries: MAX_ENTRIES, maxBytes: MAX_BYTES, sampleBytes: SAMPLE_BYTES }),
    arm() { armed = true },
    disarm() { armed = false },
    record(call, rawResult) {
      const capture = call.state === 'error' && call.errorCode !== 'ABORTED' && armed
      if (capture) armed = false
      const entry = summary({ ...call, pluginVersion })
      if (capture) {
        entry.captureAttempted = true
        if (call.imageRequest !== true) entry.sample = sample(rawResult)
      }
      return enqueue(async () => { entries.push(entry); entries = entries.slice(-MAX_ENTRIES); await persist() })
    },
    clear() { armed = false; return enqueue(async () => { entries = []; await persist() }) },
    async export(detailed = false) { await ready; await queue; return structuredClone(report(detailed)) }
  }
}
