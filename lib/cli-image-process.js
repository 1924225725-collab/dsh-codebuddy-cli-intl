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
    let sawInit = false
    let settled = false
    let stopping = false
    let drainTimer
    let cleanupTimer

    const processDiagnostics = code => ({
      timeoutMs,
      elapsedMs: Math.round(performance.now() - startedAt),
      stdoutBytes,
      stderrBytes,
      ...(Number.isInteger(code) ? { exitCode: code } : {})
    })
    const finish = (error, code) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      clearTimeout(drainTimer)
      clearTimeout(cleanupTimer)
      signal?.removeEventListener('abort', onAbort)
      if (error) {
        error.processDiagnostics = processDiagnostics(code)
        terminateProcess(child)
        reject(error)
      } else {
        resolve({ stdout: JSON.stringify(finals), stderr: '', processDiagnostics: processDiagnostics(code) })
      }
    }
    const invalidFrame = () => new CodeBuddyCliError('CLI_STREAM_INVALID', 'CLI 图片通道返回了不合法或未闭合的 JSONL 帧；未交付工具调用。')
    const authenticationOrFailure = (text, fallbackCode, fallbackMessage) =>
      cliOutputError(text, stderr, processDiagnostics(), fallbackCode, fallbackMessage)

    const consume = line => {
      if (!line.trim() || settled) return
      let frame
      try { frame = JSON.parse(line) } catch { finish(invalidFrame()); return }
      if (!frame || typeof frame !== 'object' || Array.isArray(frame) || typeof frame.type !== 'string') {
        finish(invalidFrame())
        return
      }

      if (frame.type === 'error') {
        const detail = typeof frame.error === 'string'
          ? frame.error
          : typeof frame.error?.message === 'string' ? frame.error.message : ''
        finish(authenticationOrFailure(detail, 'CLI_REQUEST_FAILED', 'CodeBuddy CLI 图片请求失败；请检查登录、模型权限或额度。'))
        return
      }
      if (frame.type === 'control_request') {
        finish(new CodeBuddyCliError('CLI_PERMISSION_REQUIRED', 'CLI 图片通道请求了交互控制或工具权限，插件未自动放行。请更新官方 CLI 并检查配置。'))
        return
      }
      if (frame.type === 'system' && frame.subtype === 'init') {
        if (sawInit || finals.length > 0) { finish(invalidFrame()); return }
        sawInit = true
        return
      }
      if (frame.type === 'assistant') {
        for (const block of frame.message?.content ?? []) {
          if (block?.type !== 'text' || typeof block.text !== 'string') continue
          const classified = cliOutputError(block.text, '', undefined, 'CLI_STREAM_NOTICE')
          if (classified.code !== 'CLI_STREAM_NOTICE') notice = block.text
        }
      }
      if (frame.type === 'result') {
        if (!sawInit) { finish(invalidFrame()); return }
        finals.push(frame)
        if (finals.length > 1) {
          const error = new CodeBuddyCliError('STRUCTURED_OUTPUT_INVALID', 'CLI 图片通道返回多个最终结果，未选择其中任何一份或交付工具。 [STRUCTURED_OUTPUT_INVALID:native-final-results]')
          error.responseDiagnostics = { outputMode: 'native-json-schema', reason: 'native-final-results', finalResultCount: finals.length }
          finish(error)
          return
        }
        // Drain queued frames so delayed conflicting terminal records cannot be selected away.
        drainTimer = setTimeout(() => {
          stopping = true
          terminateProcess(child)
          cleanupTimer = setTimeout(() => {
            if (pending.trim()) {
              const tail = pending
              pending = ''
              consume(tail)
            }
            if (signal?.aborted) finish(new CodeBuddyCliError('ABORTED', '请求已取消。'))
            else if (!settled) finish()
          }, 1500)
        }, terminalDrainMs)
        return
      }
      if (finals.length > 0) finish(invalidFrame())
    }

    const onAbort = () => finish(new CodeBuddyCliError('ABORTED', '请求已取消。'))
    const timer = setTimeout(() => finish(authenticationOrFailure(notice, 'CLI_TIMEOUT', 'CodeBuddy CLI 图片调用超时；请检查登录、模型权限和图片大小。')), timeoutMs)
    signal?.addEventListener('abort', onAbort, { once: true })
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', chunk => {
      if (settled) return
      stdoutBytes += Buffer.byteLength(chunk)
      if (stdoutBytes > maxStdoutBytes) {
        finish(new CodeBuddyCliError('CLI_OUTPUT_TOO_LARGE', 'CLI 图片通道输出超过安全上限。'))
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
    child.once('error', error => finish(new CodeBuddyCliError(
      error?.code === 'ENOENT' ? 'CLI_NOT_FOUND' : 'CLI_START_FAILED',
      error?.code === 'ENOENT' ? '找不到 CodeBuddy CLI，请点击“一键配置 CLI”。' : '无法启动官方 CLI 图片通道。'
    )))
    child.once('close', code => {
      if (settled) return
      if (pending.trim()) {
        const tail = pending
        pending = ''
        consume(tail)
      }
      if (settled) return
      if (signal?.aborted) { onAbort(); return }
      if (code !== 0 && !stopping) {
        finish(authenticationOrFailure(notice, 'CLI_RESULT_MISSING', `CodeBuddy CLI 图片通道退出（${code ?? 'unknown'}），未返回最终结果。`), code)
      } else if (!sawInit || finals.length === 0) {
        finish(authenticationOrFailure(notice, 'CLI_RESULT_MISSING', 'CLI 图片通道未返回唯一最终结果；未使用普通文字替代。'), code)
      } else {
        finish(undefined, code)
      }
    })
    child.stdin.end(input)
  })
}
