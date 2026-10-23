import test from 'node:test'
import assert from 'node:assert/strict'
import { access, readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { cliCandidates, ensureCli, loginCommand } from '../lib/cli-runtime.js'
import { runProcess } from '../lib/cli-process.js'
import { CodeBuddyCliError } from '../lib/cli-response.js'
import { cliInvocation } from '../lib/cli-invocation.js'

test('Windows discovery uses the current user paths and finds native/npm installs without a fixed username', () => {
  const paths = cliCandidates('', { platform: 'win32', home: 'C:\\Users\\Someone Else', execPath: 'C:\\DSH\\node.exe', env: { LOCALAPPDATA: 'C:\\Users\\Someone Else\\AppData\\Local', APPDATA: 'C:\\Users\\Someone Else\\AppData\\Roaming', Path: 'D:\\Node Runtime;C:\\Tools' } })
  assert.ok(paths.includes('D:\\Node Runtime\\codebuddy.cmd'))
  assert.ok(paths.includes('C:\\Users\\Someone Else\\AppData\\Local\\codebuddy\\bin\\codebuddy.exe'))
  assert.ok(paths.includes('C:\\Users\\Someone Else\\AppData\\Roaming\\npm\\codebuddy.cmd'))
  assert.ok(!paths.some((item) => item.includes('Users\\admin')))
  assert.deepEqual(cliCandidates('D:\\Custom Folder\\codebuddy.cmd', { platform: 'win32' }), ['D:\\Custom Folder\\codebuddy.cmd'])
})

test('macOS and Linux discovery includes native, Homebrew, and user-local paths', () => {
  for (const platform of ['darwin', 'linux']) {
    const paths = cliCandidates('', { platform, home: '/home/another', execPath: '/app/node', env: { PATH: '/usr/bin:/custom/bin' } })
    assert.ok(paths.includes('/home/another/.local/bin/codebuddy'))
    assert.ok(paths.includes('/opt/homebrew/bin/codebuddy'))
    assert.ok(paths.includes('/custom/bin/codebuddy'))
  }
})

test('setup reuses an existing CLI and never downloads an installer', async () => {
  const result = await ensureCli({}, {
    inspect: async () => ({ path: '/existing/cli', version: '1.2.3' }),
    fetchImpl: async () => { throw new Error('must not download') }
  })
  assert.equal(result.installed, false)
  assert.equal(result.path, '/existing/cli')
})

test('fresh setup downloads the official installer, verifies the installed CLI, and removes its temporary script', async () => {
  let checks = 0
  let installer
  let executed = false
  const result = await ensureCli({}, {
    inspect: async () => { if (++checks === 1) throw new CodeBuddyCliError('CLI_NOT_FOUND', 'missing'); return { path: '/new/cli', version: '2.3.4' } },
    fetchImpl: async (url) => { assert.match(url, /^https:\/\/copilot\.tencent\.com\/cli\/install\.(ps1|sh)$/u); return new Response('# official fixture installer') },
    run: async (command, args) => {
      installer = args.at(-1)
      assert.equal(await readFile(installer, 'utf8'), '# official fixture installer')
      executed = true
      return { stdout: '', stderr: '' }
    }
  })
  assert.equal(executed, true)
  assert.equal(result.installed, true)
  assert.equal(checks, 2)
  await assert.rejects(access(installer))
})

test('setup falls back to the official npm package in its own user directory', async () => {
  let checks = 0
  let installArgs
  const result = await ensureCli({}, {
    inspect: async () => { if (++checks === 1) throw Error('missing'); return { path: '/managed/cli', version: '2.3.4' } },
    fetchImpl: async () => { throw Error('native download failed') },
    findNpm: async () => '/test/npm',
    run: async (command, args) => { assert.equal(command, '/test/npm'); installArgs = args; return { stdout: '' } }
  })
  assert.equal(result.installed, true)
  assert.ok(installArgs.includes('@tencent-ai/codebuddy-code@latest'))
  assert.ok(installArgs.includes('--prefix'))
  assert.ok(!installArgs.includes('-g'))
})

test('installer failures use a safe message and do not expose raw command output', async () => {
  await assert.rejects(ensureCli({}, {
    inspect: async () => { throw Error('missing') },
    fetchImpl: async () => { throw Error('private data') }, findNpm: async () => null
  }), (error) => error.code === 'CLI_INSTALL_FAILED' && !error.message.includes('private data'))
})

test('login commands quote paths safely for PowerShell and POSIX shells', () => {
  assert.ok(loginCommand({ configDir: "D:\\Account's Config" }, "D:\\User's Tools\\cli.cmd", 'win32').includes("'D:\\User''s Tools\\cli.cmd'"))
  assert.ok(loginCommand({}, "/home/a'b/cli", 'linux').includes("'\\''"))
})

test('process output preserves Chinese characters split across UTF-8 chunks', async () => {
  const result = await runProcess(process.execPath, ['-e', "const b=Buffer.from('模型正常');process.stdout.write(b.subarray(0,1));setTimeout(()=>process.stdout.write(b.subarray(1)),5)"], { timeoutMs: 5000 })
  assert.equal(result.stdout, '模型正常')
})

test('a hanging CLI times out with numeric diagnostics without exposing stdout or stderr contents', async () => {
  const startedAt = Date.now()
  await assert.rejects(runProcess(process.execPath, ['-e', "process.stdout.write('progress');process.stderr.write('private fixture diagnostic');setInterval(()=>{},1000)"], { timeoutMs: 1500 }), (error) => {
    assert.equal(error.code, 'CLI_TIMEOUT')
    assert.equal(error.processDiagnostics.timeoutMs, 1500)
    assert.ok(error.processDiagnostics.elapsedMs >= 1400)
    assert.equal(error.processDiagnostics.stdoutBytes, 8)
    assert.equal(error.processDiagnostics.stderrBytes, Buffer.byteLength('private fixture diagnostic'))
    assert.ok(!JSON.stringify(error).includes('private fixture diagnostic'))
    assert.equal('stdout' in error, false)
    return true
  })
  assert.ok(Date.now() - startedAt < 6000, 'the deadline must settle without waiting indefinitely for process cleanup')
})

test('Windows npm/pnpm shims resolve their actual CLI entry even outside the shim directory', { skip: process.platform !== 'win32' }, async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'dsh-shim-test-'))
  t.after(async () => {
    const relative = path.relative(tmpdir(), directory)
    if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) await rm(directory, { recursive: true, force: true })
  })
  const shimDirectory = path.join(directory, 'shim folder')
  const entry = path.join(directory, 'global dir', 'node_modules', '@tencent-ai', 'codebuddy-code', 'bin', 'codebuddy')
  await mkdir(shimDirectory, { recursive: true })
  await mkdir(path.dirname(entry), { recursive: true })
  await writeFile(entry, '')
  const shim = path.join(shimDirectory, 'codebuddy.cmd')
  await writeFile(shim, '"%~dp0\\..\\global dir\\node_modules\\@tencent-ai\\codebuddy-code\\bin\\codebuddy" %*')
  const invocation = await cliInvocation(shim)
  assert.equal(invocation.command, process.execPath)
  assert.deepEqual(invocation.args, [entry])
})
