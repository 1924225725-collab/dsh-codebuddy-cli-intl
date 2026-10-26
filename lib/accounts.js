import { mkdir, readFile, writeFile, rename, open, unlink, lstat, readdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { CodeBuddyCliError } from './cli-response.js'
import { inspectCli } from './cli-runtime.js'
import { cliInvocation } from './cli-invocation.js'

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u
const PREFIX = 'dshcbi-account:'
export const ACCOUNT_CLI_VERSION = '2.174.0'
const fail = (code, message) => new CodeBuddyCliError(code, message)
const quotePs = value => `'${String(value).replaceAll("'", "''")}'`
const quoteWindowsArg = value => '"' + String(value).replace(/(\\*)"/gu, '$1$1\\"').replace(/\\+$/u, '$&$&') + '"'
export function assertAccountInvocation(invocation) {
  if (path.win32.basename(invocation.command).toLowerCase() !== 'node.exe' || !invocation.args.some(arg => /[\\/]node_modules[\\/]@tencent-ai[\\/]codebuddy-code[\\/]bin[\\/]codebuddy$/iu.test(arg))) {
    throw fail('ACCOUNT_CLI_RUNTIME_UNVERIFIED', '国际版多账号隔离仅核查 Windows 官方 npm/Node CLI。请选择其 codebuddy.cmd；原生 exe 和其他入口尚未验证，已阻止登录或调用。')
  }
}
export function accountDirectory() {
  const base = process.env.LOCALAPPDATA || path.join(homedir(), 'AppData', 'Local')
  return path.join(base, 'dsh-codebuddy-cli-intl', 'accounts')
}
export function accountModelId(id, model) {
  if (!UUID.test(id) || typeof model !== 'string' || !model || model.length > 256) throw fail('ACCOUNT_MODEL_INVALID', '账号模型标识无效，请重新选择模型。')
  return `${PREFIX}${id}:${encodeURIComponent(model)}`
}
export function parseAccountModel(value) {
  if (typeof value !== 'string' || !value.startsWith(PREFIX)) return null
  const tail = value.slice(PREFIX.length), colon = tail.indexOf(':')
  const id = tail.slice(0, colon)
  let model
  try { model = decodeURIComponent(tail.slice(colon + 1)) } catch {}
  if (colon < 0 || !UUID.test(id) || typeof model !== 'string' || !model || model.length > 256 || /[\x00-\x1f\x7f]/u.test(model)) throw fail('ACCOUNT_MODEL_INVALID', '账号模型标识无效，请重新选择模型。')
  return { id, model }
}
export function isolatedAccountEnv(config, inherited = process.env, platform = process.platform) {
  if (!config.accountHome) throw fail('ACCOUNT_ENV_INVALID', '账号隔离目录缺失，已阻止调用。')
  const env = { ...inherited }
  for (const key of Object.keys(env)) {
    if (/^(?:CODEBUDDY|WORKBUDDY|ACC_PRODUCT_CONFIG|ANTHROPIC_)/iu.test(key) || /^(?:HOME|USERPROFILE|LOCALAPPDATA|APPDATA|XDG_CONFIG_HOME|XDG_DATA_HOME|XDG_STATE_HOME|NODE_OPTIONS)$/iu.test(key)) delete env[key]
  }
  Object.assign(env, { HOME: config.accountHome, USERPROFILE: config.accountHome,
    LOCALAPPDATA: path.join(config.accountHome, 'AppData', 'Local'), APPDATA: path.join(config.accountHome, 'AppData', 'Roaming'),
    XDG_CONFIG_HOME: path.join(config.accountHome, '.config'), XDG_DATA_HOME: path.join(config.accountHome, '.local', 'share'), XDG_STATE_HOME: path.join(config.accountHome, '.local', 'state'),
    CODEBUDDY_CONFIG_DIR: config.configDir, CODEBUDDY_INTERNET_ENVIRONMENT: 'public', DISABLE_AUTOUPDATER: '1', DISABLE_TELEMETRY: '1',
    CODEBUDDY_DISABLE_AUTO_MEMORY: '1', CODEBUDDY_CODE_DISABLE_BACKGROUND_TASKS: '1' })
  return env
}

export function createAccountStore({ directory = accountDirectory(), platform = process.platform, resolveInvocation = cliInvocation } = {}) {
  const root = path.resolve(directory), file = path.join(root, 'index.json')
  let state = { version: 1, selectedId: null, accounts: [] }, queue = Promise.resolve(), storageError = null, metadataSeen = false
  const calls = new Map()
  function supported() { if (platform !== 'win32') throw fail('ACCOUNT_PLATFORM_UNVERIFIED', '国际版多账号隔离目前仅支持已核查的 Windows 环境；其他系统请继续使用默认 CLI 登录。') }
  async function load() {
    try {
      await noLinks(root)
      const stat = await lstat(file)
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 65536) throw Error('invalid-file')
      const value = JSON.parse(await readFile(file, 'utf8'))
      if (value.version !== 1 || !Array.isArray(value.accounts) || value.accounts.length > 20 || ![null, ...value.accounts.map(x => x.id)].includes(value.selectedId)) throw Error('invalid-state')
      const ids = new Set()
      for (const item of value.accounts) {
        if (!UUID.test(item.id) || ids.has(item.id) || typeof item.label !== 'string' || !item.label.trim() || item.label.length > 40 || /[\x00-\x1f\x7f]/u.test(item.label) || !Number.isSafeInteger(item.createdAt) || item.createdAt < 0) throw Error('invalid-entry')
        ids.add(item.id)
      }
      state = { version: 1, selectedId: value.selectedId, accounts: value.accounts.map(x => ({ id: x.id, label: x.label, createdAt: x.createdAt })) }
      metadataSeen = true
      storageError = null
    } catch (error) {
      if (error.code === 'ENOENT') {
        let existingProfiles = false
        try { existingProfiles = (await readdir(root)).some(name => UUID.test(name)) } catch (listError) { if (listError.code !== 'ENOENT') existingProfiles = true }
        if (metadataSeen || existingProfiles) { storageError = 'ACCOUNT_STORE_INVALID'; throw fail(storageError, '已有账号环境的管理列表缺失，已阻止回落到默认账号。请保留本机数据并反馈。') }
        state = { version: 1, selectedId: null, accounts: [] }; storageError = null
      }
      else { storageError = 'ACCOUNT_STORE_INVALID'; throw fail(storageError, '账号列表无法读取，已阻止回落到默认账号。请保留本机数据并查看使用指南。') }
    }
  }
  async function noLinks(target) {
    const relative = path.relative(root, target)
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw fail('ACCOUNT_PATH_INVALID', '账号目录超出隔离范围。')
    let current = root
    for (const part of ['', ...relative.split(path.sep).filter(Boolean)]) {
      if (part) current = path.join(current, part)
      try { const stat = await lstat(current); if (!stat.isDirectory() || stat.isSymbolicLink()) throw fail('ACCOUNT_PATH_INVALID', '账号目录包含链接或异常文件，已阻止调用。') }
      catch (error) { if (error.code !== 'ENOENT') throw error }
    }
  }
  const paths = id => ({ accountRoot: path.join(root, id), accountHome: path.join(root, id, 'home'), configDir: path.join(root, id, 'config') })
  const authDir = config => path.join(config.accountHome, 'AppData', 'Local', 'CodeBuddyExtension', 'Data', 'Public', 'auth')
  async function credentialPresent(config) {
    const directory = authDir(config)
    await noLinks(directory)
    try {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.endsWith('.info')) continue
        const target = path.join(directory, entry.name)
        try { await lstat(`${target}.logged-out`); continue } catch (error) { if (error.code !== 'ENOENT') throw error }
        if ((await lstat(target)).size > 0) return true
      }
      return false
    } catch (error) { if (error.code === 'ENOENT') return false; throw error }
  }
  async function configFor(base, id) {
    if (!id) return { ...base }
    supported()
    const account = state.accounts.find(x => x.id === id)
    if (!account) throw fail('ACCOUNT_NOT_FOUND', '此会话绑定的账号已移出列表；请重新选择账号模型，插件不会改用其他账号。')
    const result = { ...base, ...paths(id), accountId: id, accountLabel: account.label }
    await noLinks(result.accountHome); await noLinks(result.configDir)
    return Object.freeze(result)
  }
  async function mutate(work) {
    const task = queue.then(async () => {
      supported(); await mkdir(root, { recursive: true, mode: 0o700 }); await noLinks(root)
      let lock
      try { lock = await open(path.join(root, '.lock'), 'wx', 0o600) }
      catch { throw fail('ACCOUNT_STORE_BUSY', '账号列表正在由另一操作更新，请稍后重试。') }
      try {
        await load(); const result = await work()
        const temporary = path.join(root, `index-${randomUUID()}.tmp`)
        try { await writeFile(temporary, JSON.stringify(state), { mode: 0o600, flag: 'wx' }); await rename(temporary, file) }
        finally { await unlink(temporary).catch(() => {}) }
        return result
      } finally { await lock.close(); await unlink(path.join(root, '.lock')) }
    })
    queue = task.catch(() => {})
    return task
  }
  return {
    async selected(base) { await load(); return configFor(base, state.selectedId) },
    async route(base, model, { required = false } = {}) {
      await load(); const target = parseAccountModel(model)
      if (target) return { config: await configFor(base, target.id), model: target.model }
      if (required && state.selectedId) throw fail('ACCOUNT_MODEL_REQUIRED', '已选择独立账号，请在 DSH 模型选择器中重新选择带账号名称的模型；旧模型不会自动改扣其他账号。')
      return { config: await configFor(base, required ? null : state.selectedId), model }
    },
    async assertReady(config, inspect = inspectCli, { signal } = {}) {
      if (!config.accountId) return
      await load(); await configFor(config, config.accountId)
      if (!await credentialPresent(config)) throw fail('ACCOUNT_LOGIN_REQUIRED', '此国际版独立账号尚无本地登录凭据，请在账号管理中生成官方登录命令，选择 International Site 并完成登录；不会沿用默认账号。')
      const cli = await inspect(config, { signal })
      if (cli.version !== ACCOUNT_CLI_VERSION) throw fail('ACCOUNT_CLI_UNVERIFIED', `国际版多账号隔离目前仅核查官方 CLI ${ACCOUNT_CLI_VERSION}；检测到其他版本，已阻止调用。默认单账号模式仍可照常使用。`)
      assertAccountInvocation(await resolveInvocation(cli.path))
      return cli
    },
    begin(config) {
      if (config.accountId) calls.set(config.accountId, (calls.get(config.accountId) || 0) + 1)
      let released = false
      return () => { if (!released && config.accountId) { calls.set(config.accountId, Math.max(0, (calls.get(config.accountId) || 0) - 1)); released = true } }
    },
    async snapshot() {
      try { await load() } catch {}
      const accounts = []
      if (!storageError) for (const account of state.accounts) {
        let credentialsPresent = false, pathError = false
        try { credentialsPresent = await credentialPresent(paths(account.id)) } catch { pathError = true }
        let loginPrepared = false
        try { loginPrepared = (await lstat(path.join(root, account.id, 'login.ps1'))).isFile() } catch {}
        accounts.push({ ...account, selected: state.selectedId === account.id, credentialsPresent, pathError, activeCalls: calls.get(account.id) || 0,
          loginCommand: loginPrepared ? `powershell.exe -NoProfile -ExecutionPolicy Bypass -File ${quotePs(path.join(root, account.id, 'login.ps1'))}` : '' })
      }
      return { supported: platform === 'win32', requiredCliVersion: ACCOUNT_CLI_VERSION, selectedId: storageError ? undefined : state.selectedId, accounts, storageError,
        validation: 'login-refresh-billing-unverified' }
    },
    async add(label) {
      if (typeof label !== 'string' || !label.trim() || label.trim().length > 40 || /[\x00-\x1f\x7f]/u.test(label)) throw fail('ACCOUNT_LABEL_INVALID', '账号备注需为 1–40 个字符，不能包含控制字符。')
      return mutate(async () => {
        if (state.accounts.length >= 20) throw fail('ACCOUNT_LIMIT', '最多保存 20 个独立账号环境。')
        const item = { id: randomUUID(), label: label.trim(), createdAt: Date.now() }, profile = paths(item.id)
        for (const directory of [profile.accountHome, profile.configDir, path.join(profile.accountHome, 'AppData', 'Local'), path.join(profile.accountHome, 'AppData', 'Roaming')]) await mkdir(directory, { recursive: true, mode: 0o700 })
        state.accounts.push(item)
        return item
      })
    },
    async select(id) {
      return mutate(async () => {
        if (id !== null && !state.accounts.some(x => x.id === id)) throw fail('ACCOUNT_NOT_FOUND', '账号不存在，请刷新列表。')
        state.selectedId = id
      })
    },
    async remove(id) {
      return mutate(async () => {
        if (!state.accounts.some(x => x.id === id)) throw fail('ACCOUNT_NOT_FOUND', '账号不存在，请刷新列表。')
        if (state.selectedId === id || (calls.get(id) || 0) > 0) throw fail('ACCOUNT_IN_USE', '请先切换到默认登录，并等待此账号调用结束，再移出列表。')
        state.accounts = state.accounts.filter(x => x.id !== id)
        // Deliberately retain the isolated official login files. No recursive
        // deletion of a directory that may contain user-created CLI data.
      })
    },
    async prepareLogin(base, id) {
      await load(); const config = await configFor(base, id)
      if (!config.accountId) throw fail('ACCOUNT_NOT_FOUND', '请选择一个独立账号。')
      const cli = await inspectCli(config)
      if (cli.version !== ACCOUNT_CLI_VERSION) throw fail('ACCOUNT_CLI_UNVERIFIED', `国际版多账号登录仅核查官方 CLI ${ACCOUNT_CLI_VERSION}；当前检测到 ${String(cli.version || 'unknown').slice(0, 40)}，已阻止登录。`)
      const invocation = await resolveInvocation(cli.path)
      assertAccountInvocation(invocation)
      const env = isolatedAccountEnv(config, {})
      const settings = Object.entries(env).map(([key, value]) => `[Environment]::SetEnvironmentVariable(${quotePs(key)}, ${quotePs(value)}, 'Process')`).join('\r\n')
      // ProcessStartInfo preserves empty argv on Windows PowerShell 5.1;
      // invoking `& cli --tools ''` there silently drops the empty argument.
      const argumentsText = [...invocation.args, '--tools', '', '--setting-sources', '', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}'].map(quoteWindowsArg).join(' ')
      const versionArguments = [...invocation.args, '--version'].map(quoteWindowsArg).join(' ')
      const script = `# Local official CLI sign-in. No credentials in this script.\r\n$ErrorActionPreference='Stop'\r\n${settings}\r\nGet-ChildItem Env: | Where-Object { $_.Name -match '^(CODEBUDDY|WORKBUDDY|ACC_PRODUCT_CONFIG|ANTHROPIC_)' -and $_.Name -notin @(${Object.keys(env).map(quotePs).join(',')}) } | ForEach-Object { [Environment]::SetEnvironmentVariable($_.Name, $null, 'Process') }\r\n[Environment]::SetEnvironmentVariable('NODE_OPTIONS', $null, 'Process')\r\nSet-Location -LiteralPath ${quotePs(config.accountRoot)}\r\nWrite-Host 'Complete official International Site login, then /exit. This environment stores one login.'\r\n$start=New-Object System.Diagnostics.ProcessStartInfo\r\n$start.UseShellExecute=$false\r\n$start.FileName=${quotePs(invocation.command)}\r\n$start.Arguments=${quotePs(argumentsText)}\r\n$start.WorkingDirectory=${quotePs(config.accountRoot)}\r\n$child=[System.Diagnostics.Process]::Start($start)\r\n$child.WaitForExit()\r\nexit $child.ExitCode\r\n`
      const versionGuard = `$check=New-Object System.Diagnostics.ProcessStartInfo\r\n$check.UseShellExecute=$false\r\n$check.CreateNoWindow=$true\r\n$check.RedirectStandardOutput=$true\r\n$check.RedirectStandardError=$true\r\n$check.FileName=${quotePs(invocation.command)}\r\n$check.Arguments=${quotePs(versionArguments)}\r\n$checkProcess=[System.Diagnostics.Process]::Start($check)\r\nif(-not $checkProcess.WaitForExit(10000)){ $checkProcess.Kill(); throw 'CLI version check timed out; sign-in was not started.' }\r\n$versionText=$checkProcess.StandardOutput.ReadToEnd()\r\nif($checkProcess.ExitCode -ne 0 -or $versionText.Trim() -notmatch '^(?:CodeBuddy CLI\\s+)?2\\.174\\.0$'){ throw 'Account isolation requires CLI 2.174.0; sign-in was not started.' }\r\n`
      const guardedScript = script.replace("Write-Host 'Complete official", () => versionGuard + "Write-Host 'Complete official")
      await noLinks(config.accountRoot)
      const scriptPath = path.join(config.accountRoot, 'login.ps1')
      try { const stat = await lstat(scriptPath); if (!stat.isFile() || stat.isSymbolicLink()) throw fail('ACCOUNT_PATH_INVALID', '登录脚本路径异常，已停止。') } catch (error) { if (error.code !== 'ENOENT') throw error }
      await writeFile(scriptPath, '\ufeff' + guardedScript, { mode: 0o600 })
      return config
    }
  }
}

