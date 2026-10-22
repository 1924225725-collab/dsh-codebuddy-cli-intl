import { access, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import path from 'node:path'
import { CodeBuddyCliError } from './cli-response.js'
import { runProcess } from './cli-process.js'
import { cliInvocation } from './cli-invocation.js'

function envValue(env, key) {
  return env[Object.keys(env).find((item) => item.toLowerCase() === key.toLowerCase())] || ''
}

export function cliEnv(config = {}, env = process.env) {
  return {
    ...env,
    CODEBUDDY_INTERNET_ENVIRONMENT: 'public',
    CODEBUDDY_CONFIG_DIR: config.configDir || path.join(homedir(), '.dsh-codebuddy-cli-intl')
  }
}

export function cliCandidates(configured = '', {
  platform = process.platform, env = process.env, home = homedir(), execPath = process.execPath, allowFallback = false
} = {}) {
  const p = platform === 'win32' ? path.win32 : path.posix
  let selected = String(configured).trim().replace(/^"(.*)"$/u, '$1').replace(/^\/([a-z]:[\\/])/iu, '$1')
  if (selected.startsWith('~/') || selected.startsWith('~\\')) selected = p.join(home, selected.slice(2))
  if (platform === 'win32') selected = selected.replace(/%([^%]+)%/gu, (match, name) => envValue(env, name) || match)
  const generic = !selected || /^(?:codebuddy|cbc)(?:\.cmd|\.exe)?$/iu.test(selected)
  const names = platform === 'win32' ? ['codebuddy.exe', 'codebuddy.cmd', 'cbc.cmd'] : ['codebuddy', 'cbc']
  const dirs = [p.dirname(execPath), ...envValue(env, 'PATH').split(platform === 'win32' ? ';' : ':').filter(Boolean)]
  if (platform === 'win32') {
    const local = envValue(env, 'LOCALAPPDATA') || p.join(home, 'AppData', 'Local')
    const roaming = envValue(env, 'APPDATA') || p.join(home, 'AppData', 'Roaming')
    dirs.push(p.join(local, 'codebuddy', 'bin'), p.join(roaming, 'npm'),
      p.join(home, '.local', 'bin'),
      p.join(local, 'Programs', 'nodejs'), p.join(local, 'Programs', 'dkn-node'),
      p.join(envValue(env, 'ProgramFiles') || 'C:\\Program Files', 'nodejs'),
      envValue(env, 'NVM_SYMLINK'), p.join(local, 'dsh-codebuddy-cli-intl', 'cli'))
  } else {
    dirs.push(p.join(home, '.local', 'bin'), '/usr/local/bin', '/opt/homebrew/bin',
      p.join(home, '.npm-global', 'bin'), p.join(home, '.dsh-codebuddy-cli-intl', 'cli', 'bin'))
  }
  const candidates = []
  if (selected && !generic) {
    if (p.isAbsolute(selected) || selected.includes('/') || selected.includes('\\')) candidates.push(p.resolve(selected))
    else for (const dir of dirs.filter(Boolean)) candidates.push(p.join(dir.replace(/^"|"$/gu, ''), selected))
    if (!allowFallback) return [...new Set(candidates)]
  }
  for (const dir of dirs.filter(Boolean)) for (const name of names) candidates.push(p.join(dir.replace(/^"|"$/gu, ''), name))
  const seen = new Set()
  return candidates.filter((candidate) => {
    const key = platform === 'win32' ? candidate.toLowerCase() : candidate
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export async function resolveCli(config, options = {}) {
  for (const candidate of cliCandidates(config.cliPath, options)) {
    try {
      await access(candidate, process.platform === 'win32' ? constants.F_OK : constants.X_OK)
      return candidate
    } catch {}
  }
  throw new CodeBuddyCliError('CLI_NOT_FOUND', '找不到 CodeBuddy CLI，请点击“一键配置 CLI”。')
}

export async function inspectCli(config, { signal, allowFallback = false, run = runProcess } = {}) {
  let lastError
  for (const candidate of cliCandidates(config.cliPath, { allowFallback })) {
    try { await access(candidate, process.platform === 'win32' ? constants.F_OK : constants.X_OK) } catch { continue }
    try {
      const invocation = await cliInvocation(candidate)
      const { stdout } = await run(invocation.command, [...invocation.args, '--version'], { env: cliEnv(config), signal, timeoutMs: 7000, maxStdoutBytes: 4096 })
      const version = stdout.match(/\b\d+\.\d+\.\d+(?:[-+][\w.-]+)?\b/u)?.[0]
      if (!version) throw new CodeBuddyCliError('CLI_VERSION_INVALID', 'CLI 版本信息无法识别，请选择官方 CodeBuddy CLI。')
      return { path: candidate, version, checkedAt: Date.now() }
    } catch (error) {
      if (signal?.aborted) throw error
      lastError = error
    }
  }
  throw lastError || new CodeBuddyCliError('CLI_NOT_FOUND', '找不到 CodeBuddy CLI，请点击“一键配置 CLI”。')
}

export function loginCommand(config, executable, platform = process.platform) {
  config = { ...config, configDir: config.configDir || path.join(homedir(), '.dsh-codebuddy-cli-intl') }
  if (!executable) return ''
  if (platform === 'win32') {
    const quote = (value) => `'${String(value).replaceAll("'", "''")}'`
    return `$env:CODEBUDDY_INTERNET_ENVIRONMENT='public'; ${config.configDir ? `$env:CODEBUDDY_CONFIG_DIR=${quote(config.configDir)}; ` : ''}& ${quote(executable)}`
  }
  const quote = (value) => `'${String(value).replaceAll("'", "'\\''")}'`
  return `CODEBUDDY_INTERNET_ENVIRONMENT=public ${config.configDir ? `CODEBUDDY_CONFIG_DIR=${quote(config.configDir)} ` : ''}${quote(executable)}`
}

async function locateNpm() {
  const name = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const directories = [...new Set(cliCandidates('', { allowFallback: true }).map((file) => path.dirname(file)))]
  for (const directory of directories) {
    const candidate = path.join(directory, name)
    try { await access(candidate, process.platform === 'win32' ? constants.F_OK : constants.X_OK); return candidate } catch {}
  }
  return null
}

export async function ensureCli(config, {
  signal, onStage = () => {}, run = runProcess, fetchImpl = fetch, inspect = inspectCli, findNpm = locateNpm
} = {}) {
  onStage('detecting')
  try { return { ...await inspect(config, { signal, allowFallback: true, run }), installed: false } } catch (error) {
    if (signal?.aborted) throw error
  }
  if (!['win32', 'darwin', 'linux'].includes(process.platform)
    || !['x64', 'arm64'].includes(process.arch) || (process.platform === 'win32' && process.arch !== 'x64')) {
    throw new CodeBuddyCliError('CLI_INSTALL_PLATFORM', '此平台请先按官方安装指南安装 CLI，再自动检测。')
  }
  onStage('installing')
  const directory = await mkdtemp(path.join(tmpdir(), 'dsh-codebuddy-install-'))
  try {
    const extension = process.platform === 'win32' ? 'ps1' : 'sh'
    const downloadSignal = AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(30000)])
    const response = await fetchImpl(`https://www.codebuddy.cn/cli/install.${extension}`, { signal: downloadSignal })
    if (!response.ok) throw new Error('download failed')
    const reader = response.body.getReader()
    const chunks = []
    let size = 0
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.length
      if (size > 256 * 1024) { await reader.cancel(); throw new Error('installer too large') }
      chunks.push(Buffer.from(value))
    }
    const installer = path.join(directory, `install.${extension}`)
    await writeFile(installer, Buffer.concat(chunks), { mode: 0o700 })
    const command = process.platform === 'win32'
      ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
      : '/bin/bash'
    const args = process.platform === 'win32'
      ? ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', installer]
      : [installer]
    await run(command, args, { env: cliEnv(config), signal, timeoutMs: 240000, maxStdoutBytes: 1024 * 1024 })
    onStage('detecting')
    return { ...await inspect({ ...config, cliPath: '' }, { signal, allowFallback: true, run }), installed: true }
  } catch (error) {
    if (signal?.aborted) throw new CodeBuddyCliError('ABORTED', '配置已取消。')
    const npm = await findNpm()
    if (npm) {
      try {
        onStage('installing')
        const base = process.platform === 'win32'
          ? path.join(envValue(process.env, 'LOCALAPPDATA') || path.join(homedir(), 'AppData', 'Local'), 'dsh-codebuddy-cli-intl')
          : path.join(homedir(), '.dsh-codebuddy-cli-intl')
        await run(npm, ['install', '--prefix', path.join(base, 'cli'), '--registry', 'https://registry.npmjs.org',
          '--no-audit', '--no-fund', '@tencent-ai/codebuddy-code@latest'], {
          env: { ...cliEnv(config), npm_config_cache: path.join(base, 'npm-cache') },
          signal, timeoutMs: 240000, maxStdoutBytes: 1024 * 1024
        })
        onStage('detecting')
        return { ...await inspect({ ...config, cliPath: '' }, { signal, allowFallback: true, run }), installed: true }
      } catch {}
    }
    if (signal?.aborted) throw new CodeBuddyCliError('ABORTED', '配置已取消。')
    throw new CodeBuddyCliError('CLI_INSTALL_FAILED', '官方 CLI 安装未完成，请检查网络，或打开官方安装指南后重试自动检测。')
  } finally {
    const relative = path.relative(tmpdir(), directory)
    if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) await rm(directory, { recursive: true, force: true }).catch(() => {})
  }
}
