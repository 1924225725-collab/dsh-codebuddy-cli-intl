export function isLoopbackHost(hostHeader) {
  if (typeof hostHeader !== 'string' || hostHeader.length > 260) return false
  try {
    const hostname = new URL(`http://${hostHeader}`).hostname.toLowerCase().replace(/^\[|\]$/gu, '')
    return hostname === 'localhost' || hostname === '::1' || /^127(?:\.\d{1,3}){3}$/u.test(hostname)
  } catch { return false }
}

export function trustedLocalRequest(req, mutation = false) {
  if (!isLoopbackHost(req.headers?.host)) return false
  if (mutation && (req.headers['x-dsh-codebuddy-action'] !== '1'
    || req.headers['content-type']?.split(';')[0].trim() !== 'application/json')) return false
  const origin = req.headers?.origin
  if (origin === undefined) return true
  try {
    const parsed = new URL(origin)
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && isLoopbackHost(parsed.host)
      && (!mutation || parsed.host.toLowerCase() === req.headers.host.toLowerCase())
  } catch { return false }
}

export async function readAction(req) {
  let body = ''
  for await (const chunk of req) {
    body += chunk.toString('utf8')
    if (Buffer.byteLength(body) > 2048) throw new Error('request-too-large')
  }
  const action = JSON.parse(body).action
  if (!['setup', 'refreshModels'].includes(action)) throw new Error('unknown-action')
  return action
}
