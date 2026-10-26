import spawn from 'cross-spawn'
import { tmpdir } from 'node:os'
import { performance } from 'node:perf_hooks'
import { CodeBuddyCliError, cliOutputError } from './cli-response.js'
import { terminateProcess } from './cli-process.js'

// One DSH request is one JSONL user turn. Never parse JSON candidates from prose.
export function runImageProcess(command, args, {
  env = process.env,
  input,
  timeoutMs = 180000,
  signal,
  maxStdoutBytes = 20 * 1024 * 1024,
  terminalDrainMs = 1000,
  spawnImpl = spawn
} = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new CodeBuddyCliError('ABORTED', '请求已取消。'))
    const child = spawnImpl(command, args, { cwd: tmpdir(), env, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] })
    const startedAt = performance.now()
    const finals = []
    let pending = ''
    let stdoutBytes = 0
    let stderrBytes = 0
    let stderr = ''
    let notice = ''
    let noticeSource = 'none'
    let sawInit = false
    let settled = false
    let stopping = false
    let drainTimer
    let cleanupTimer
    let streamReason = 'none'
    let streamPhase = 'await-init'
    let parseStage = 'none'
    let frameIndex = 0
    let frameBytes = 0
    let frameCount = 0
    let initCount = 0
    let resultCount = 0
    let lastFrameClass = 'none'
    let firstFinalSeen = false
    let terminationInitiator = 'none'
    let closeObserved = false
    let observedExitCode
    let deadlineReached = false

    const processDiagnostics = code => ({
      timeoutMs,
      elapsedMs: Math.round(performance.now() - startedAt),
      stdoutBytes,
      stderrBytes,
      streamReason,
      streamPhase,
      parseStage,
      frameIndex,
      frameBytes,
      frameCount,
      initCount,
      resultCount,
      lastFrameClass,
      firstFinalSeen,
      terminationInitiator,
      closeObserved,
      deadlineReached,
      ...(Number.isSafeInteger(code ?? observedExitCode) && closeObserved ? { exitCode: code ?? observedExitCode } : {})
    })
    const finish = (error, code, { reason, initiator } = {}) => {
      if (settled) return
      if (reason) streamReason = reason
      if (initiator && terminationInitiator === 'none') terminationInitiator = initiator
      if (error && terminationInitiator === 'none') terminationInitiator = 'adapter-error'
      settled = true
      clearTimeout(timer)
      clearTimeout(drainTimer)
      clearTimeout(cleanupTimer)
      signal?.removeEventListener('abort', onAbort)
      if (error) {
        error.processDiagnostics = processDiagnostics(code)
        if (!closeObserved) terminateProcess(child)
        reject(error)
      } else {
        resolve({ stdout: JSON.stringify(finals), stderr: '', processDiagnostics: processDiagnostics(code) })
      }
    }
    const invalidFrame = reason => {
      streamReason = reason
      return new CodeBuddyCliError('CLI_STREAM_INVALID', 'CLI 图片通道帧序列不符合已支持的 JSONL 结构；未交付工具调用。')
    }
    const authenticationOrFailure = (text, fallbackCode, fallbackMessage, sourceHint = 'stdout') =>
      cliOutputError(text, stderr, processDiagnostics(), fallbackCode, fallbackMessage, sourceHint)

    const consume = (line, stage = 'line') => {
      if (!line.trim() || settled) return
      frameCount += 1
      frameIndex = frameCount
      frameBytes = Buffer.byteLength(line)
      parseStage = stage
      let frame
      try { frame = JSON.parse(line) } catch {
        lastFrameClass = 'malformed'
        finish(invalidFrame('json-parse'))
        return
      }
      if (!frame || typeof frame !== 'object' || Array.isArray(frame) || typeof frame.type !== 'string') {
        lastFrameClass = 'malformed'
        finish(invalidFrame('frame-shape'))
        return
      }

      const frameClasses = { system: 'system', assistant: 'assistant', result: 'result', error: 'error', control_request: 'control-request' }
      lastFrameClass = frame.type === 'system' && frame.subtype === 'init'
        ? 'system-init' : Object.hasOwn(frameClasses, frame.type) ? frameClasses[frame.type] : 'other'

      if (frame.type === 'error') {
        const detail = typeof frame.error === 'string'
          ? frame.error
          : typeof frame.error?.message === 'string' ? frame.error.message : ''
        const status = [frame.status, frame.error?.status].map(value => String(value ?? ''))
          .find(value => ['400', '401', '402', '403', '429'].includes(value))
        const error = authenticationOrFailure(`${status ? `HTTP ${status} ` : ''}${detail}`, 'CLI_REQUEST_FAILED', 'CodeBuddy CLI 图片请求失败；请检查登录、模型权限或额度。', 'error-frame')
        error.responseDiagnostics = { ...error.responseDiagnostics, reason: 'error-frame' }
        finish(error, undefined, { reason: 'error-frame' })
        return
      }
      if (frame.type === 'control_request') {
        const error = new CodeBuddyCliError('CLI_PERMISSION_REQUIRED', 'CLI 图片通道请求了交互控制或工具权限，插件未自动放行。请更新官方 CLI 并检查配置。')
        error.responseDiagnostics = { outputMode: 'native-json-schema', reason: 'permission-frame', noticeClass: 'none', noticeSource: 'none' }
        finish(error, undefined, { reason: 'permission-frame' })
        return
      }
      if (frame.type === 'system' && frame.subtype === 'init') {
        initCount += 1
        if (initCount > 1) { finish(invalidFrame('duplicate-init')); return }
        if (resultCount > 0) { finish(invalidFrame('post-result-sequence')); return }
        sawInit = true
        streamPhase = 'after-init'
        return
      }
      if (frame.type === 'assistant') {
        const content = frame.message?.content
        if (content !== undefined && !Array.isArray(content)) {
          finish(invalidFrame('frame-shape'))
          return
        }
        for (const block of content ?? []) {
          if (block?.type !== 'text' || typeof block.text !== 'string') continue
          const classified = cliOutputError(block.text, '', undefined, 'CLI_STREAM_NOTICE', undefined, 'assistant-text')
          if (classified.code !== 'CLI_STREAM_NOTICE') {
            notice = block.text
            noticeSource = 'assistant-text'
          }
        }
      }
      if (frame.type === 'result') {
        resultCount += 1
        firstFinalSeen = true
        if (!sawInit) {
          const error = invalidFrame('result-before-init')
          error.responseDiagnostics = { outputMode: 'native-json-schema', reason: 'result-before-init', finalResultCount: resultCount }
          finish(error)
          return
        }
        finals.push(frame)
        if (finals.length > 1) {
          streamReason = 'multiple-results'
          const error = new CodeBuddyCliError('STRUCTURED_OUTPUT_INVALID', 'CLI 图片通道返回多个最终结果，未选择其中任何一份或交付工具。 [STRUCTURED_OUTPUT_INVALID:native-final-results]')
          error.responseDiagnostics = { outputMode: 'native-json-schema', reason: 'native-final-results', finalResultCount: finals.length }
          finish(error)
          return
        }
        streamPhase = 'after-result'
        // Drain queued frames so delayed conflicting terminal records cannot be selected away.
        drainTimer = setTimeout(() => {
          stopping = true
          streamPhase = 'draining'
          if (terminationInitiator === 'none') terminationInitiator = 'adapter-drain'
          terminateProcess(child)
          cleanupTimer = setTimeout(() => {
            if (pending.trim()) {
              const tail = pending
              pending = ''
              consume(tail, 'tail')
            }
            if (signal?.aborted) finish(new CodeBuddyCliError('ABORTED', '请求已取消。'), undefined, { reason: 'cancelled', initiator: 'external-cancel' })
            else if (!settled) finish()
          }, 1500)
        }, terminalDrainMs)
        return
      }
      if (firstFinalSeen) finish(invalidFrame('post-result-sequence'))
    }

    const onAbort = () => finish(new CodeBuddyCliError('ABORTED', '请求已取消。'), undefined, { reason: 'cancelled', initiator: 'external-cancel' })
    const timer = setTimeout(() => {
      deadlineReached = true
      streamReason = 'deadline'
      if (terminationInitiator === 'none') terminationInitiator = 'deadline'
      const sourceHint = noticeSource === 'assistant-text' ? noticeSource : 'stderr'
      finish(authenticationOrFailure(notice, 'CLI_TIMEOUT', 'CodeBuddy CLI 调用已达到设置的总时限；尚未取得可交付结果。请检查已完成的 DSH 工具后，再决定是否重试。', sourceHint), undefined, { reason: 'deadline', initiator: 'deadline' })
    }, timeoutMs)
    signal?.addEventListener('abort', onAbort, { once: true })
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', chunk => {
      if (settled) return
      stdoutBytes += Buffer.byteLength(chunk)
      if (stdoutBytes > maxStdoutBytes) {
        finish(new CodeBuddyCliError('CLI_OUTPUT_TOO_LARGE', 'CLI 图片通道输出超过安全上限。'), undefined, { reason: 'output-too-large' })
        return
      }
      pending += chunk
      let newline
      while (!settled && (newline = pending.indexOf('\n')) !== -1) {
        const line = pending.slice(0, newline)
        pending = pending.slice(newline + 1)
        consume(line)
      }
    })
    child.stderr.on('data', chunk => {
      stderrBytes += Buffer.byteLength(chunk)
      stderr = (stderr + chunk).slice(-32768)
    })
    child.stdin.on('error', () => {})
    child.once('error', error => {
      const code = error?.code === 'ENOENT' ? 'CLI_NOT_FOUND' : 'CLI_START_FAILED'
      const message = error?.code === 'ENOENT' ? '找不到 CodeBuddy CLI，请点击“一键配置 CLI”。' : '无法启动官方 CLI 图片通道。'
      finish(new CodeBuddyCliError(code, message), undefined, { reason: 'spawn-error', initiator: 'spawn-error' })
    })
    child.once('close', code => {
      closeObserved = true
      observedExitCode = code
      if (terminationInitiator === 'none') terminationInitiator = 'natural-close'
      streamPhase = 'closed'
      if (settled) return
      if (pending.trim()) {
        const tail = pending
        pending = ''
        consume(tail, 'tail')
      }
      if (settled) return
      if (signal?.aborted) { onAbort(); return }
      if (code !== 0 && !stopping) {
        finish(authenticationOrFailure(notice, 'CLI_RESULT_MISSING', `CodeBuddy CLI 图片通道退出（${code ?? 'unknown'}），未返回最终结果。`, noticeSource === 'assistant-text' ? noticeSource : 'stderr'), code, { reason: 'nonzero-exit' })
      } else if (!sawInit) {
        finish(authenticationOrFailure(notice, 'CLI_RESULT_MISSING', 'CLI 图片通道未返回初始化帧及唯一最终结果。', noticeSource === 'assistant-text' ? noticeSource : 'stderr'), code, { reason: 'missing-init' })
      } else if (finals.length === 0) {
        finish(authenticationOrFailure(notice, 'CLI_RESULT_MISSING', 'CLI 图片通道在初始化后关闭，未返回最终结果。', noticeSource === 'assistant-text' ? noticeSource : 'stderr'), code, { reason: 'missing-result' })
      } else {
        finish(undefined, code)
      }
    })
    child.stdin.end(input)
  })
}
