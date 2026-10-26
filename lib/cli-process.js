import spawn from 'cross-spawn'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { CodeBuddyCliError, cliOutputError } from './cli-response.js'

export function terminateProcess(child) {
  if (process.platform === 'win32' && Number.isInteger(child.pid)) {
    const taskkill = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'taskkill.exe')
    const killer = spawn(taskkill, ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' })
    killer.on('error', () => { try { child.kill() } catch {} })
    killer.on('exit', (code) => { if (code !== 0) { try { child.kill() } catch {} } })
    killer.unref()
  } else {
    try { child.kill('SIGKILL') } catch {}
  }
}

export function runProcess(command, args, {
  env = process.env, input = '', timeoutMs = 30000, signal, maxStdoutBytes = 20 * 1024 * 1024
} = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new CodeBuddyCliError('ABORTED', '请求已取消。'))
    const child = spawn(command, args, { cwd: tmpdir(), env, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    let stdoutBytes = 0
    let settled = false
    let timedOut = false
    let overflow = false
    const startedAt = performance.now()
    let stderrBytes = 0
    const timeoutError = () => {
      const error = new CodeBuddyCliError('CLI_TIMEOUT', `CodeBuddy CLI 在 ${Math.round(timeoutMs / 1000)} 秒内未完成调用。版本检查通过不代表模型请求已连通。`)
      error.processDiagnostics = { timeoutMs, elapsedMs: Math.round(performance.now() - startedAt), stdoutBytes, stderrBytes }
      error.responseDiagnostics = { outputMode: 'native-json-schema', reason: 'deadline', noticeClass: 'none', noticeSource: 'none' }
      return error
    }
    const finish = (error, value) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      if (error) reject(error)
      else resolve(value)
    }
    const onAbort = () => terminateProcess(child)
    const timer = setTimeout(() => {
      timedOut = true
      // Settle even if process-tree cleanup does not emit close promptly.
      finish(timeoutError())
      terminateProcess(child)
    }, timeoutMs)
    timer.unref?.()
    signal?.addEventListener('abort', onAbort, { once: true })
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk) => {
      stdoutBytes += Buffer.byteLength(chunk)
      if (stdoutBytes > maxStdoutBytes) { overflow = true; terminateProcess(child); return }
      stdout += chunk
    })
    child.stderr.on('data', (chunk) => { stderrBytes += Buffer.byteLength(chunk); stderr = (stderr + chunk).slice(-32768) })
    child.stdin.on('error', () => {})
    child.once('error', (error) => finish(new CodeBuddyCliError(
      error?.code === 'ENOENT' ? 'CLI_NOT_FOUND' : 'CLI_START_FAILED',
      error?.code === 'ENOENT' ? '找不到 CodeBuddy CLI，请点击“一键配置 CLI”。' : '无法启动 CodeBuddy CLI。'
    )))
    child.once('close', (code) => {
      const processDiagnostics = { timeoutMs, elapsedMs: Math.round(performance.now() - startedAt), stdoutBytes, stderrBytes, exitCode: code }
      if (signal?.aborted) finish(new CodeBuddyCliError('ABORTED', '请求已取消。'))
      else if (timedOut) finish(timeoutError())
      else if (overflow) finish(new CodeBuddyCliError('CLI_OUTPUT_TOO_LARGE', 'CodeBuddy CLI 输出超过安全上限。'))
      else if (code !== 0) finish(cliOutputError(stdout, stderr, processDiagnostics, `CLI_EXIT_${code ?? 'UNKNOWN'}`, `CodeBuddy CLI 退出，代码 ${code ?? '未知'}。`))
      else finish(undefined, { stdout, stderr, processDiagnostics })
    })
    child.stdin.end(input)
  })
}
