import { access, readFile, stat } from 'node:fs/promises'
import path from 'node:path'

export async function cliInvocation(executable) {
  // Launch official npm installations directly: cmd.exe wrappers can consume
  // protocol stdin and keep grandchildren alive after cancellation on Windows.
  if (process.platform === 'win32' && /^(?:codebuddy|codebuddy-code|cbc)\.cmd$/iu.test(path.basename(executable))) {
    const directory = path.dirname(executable)
    const entries = [path.join(directory, 'node_modules', '@tencent-ai', 'codebuddy-code', 'bin', 'codebuddy')]
    try {
      if ((await stat(executable)).size < 65536) {
        const shim = await readFile(executable, 'utf8')
        for (const match of shim.matchAll(/"([^"\r\n]*@tencent-ai[\\/]codebuddy-code[\\/]bin[\\/]codebuddy)"/giu)) {
          const candidate = match[1].replace(/^%~dp0/iu, `${directory}\\`).replace(/^%dp0%/iu, directory)
          if (!candidate.includes('%')) entries.unshift(path.resolve(directory, candidate))
        }
      }
    } catch {}
    const nodes = [path.join(directory, 'node.exe'), ...(path.basename(process.execPath).toLowerCase() === 'node.exe' ? [process.execPath] : [])]
    const pathKey = Object.keys(process.env).find((key) => key.toLowerCase() === 'path')
    for (const dir of (process.env[pathKey] || '').split(path.delimiter).filter(Boolean)) nodes.push(path.join(dir, 'node.exe'))
    for (const entry of entries) {
      try {
        await access(entry)
        for (const node of nodes) {
          try { await access(node); return { command: node, args: [entry] } } catch {}
        }
      } catch {}
    }
  }
  return { command: executable, args: [] }
}
