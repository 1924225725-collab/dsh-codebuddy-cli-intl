import test from 'node:test'
import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import { trustedLocalRequest, readAction } from '../lib/local-http.js'

test('installation and refresh actions require same-origin JSON requests with a custom header', () => {
  const headers = { host: 'localhost:8080', origin: 'http://localhost:8080', 'x-dsh-codebuddy-action': '1', 'content-type': 'application/json' }
  assert.equal(trustedLocalRequest({ headers }, true), true)
  for (const replacement of [{ origin: 'https://external.example' }, { origin: 'http://localhost:9999' }, { 'x-dsh-codebuddy-action': undefined }, { host: 'external.example' }, { 'content-type': 'text/plain' }]) {
    assert.equal(trustedLocalRequest({ headers: { ...headers, ...replacement } }, true), false)
  }
})

test('the action endpoint accepts only fixed actions and bounded bodies', async () => {
  assert.equal(await readAction(Readable.from(['{"action":"setup"}'])), 'setup')
  await assert.rejects(readAction(Readable.from(['{"action":"arbitrary-command"}'])))
  await assert.rejects(readAction(Readable.from(['x'.repeat(2049)])))
})
