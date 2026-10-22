import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { homedir } from 'node:os'
import { cliEnv, loginCommand } from '../lib/cli-runtime.js'

test('international routes override inherited CN environment and always select an independent CLI profile', () => {
  const inherited = { CODEBUDDY_INTERNET_ENVIRONMENT: 'internal', CODEBUDDY_CONFIG_DIR: '/existing-cn-profile', KEEP: 'value' }
  const env = cliEnv({}, inherited)
  assert.equal(env.CODEBUDDY_INTERNET_ENVIRONMENT, 'public')
  assert.equal(env.CODEBUDDY_CONFIG_DIR, path.join(homedir(), '.dsh-codebuddy-cli-intl'))
  assert.equal(env.KEEP, 'value')
  assert.equal(inherited.CODEBUDDY_CONFIG_DIR, '/existing-cn-profile')
  assert.equal(cliEnv({ configDir: '/explicit-international-profile' }, inherited).CODEBUDDY_CONFIG_DIR, '/explicit-international-profile')
  for (const platform of ['win32', 'linux']) {
    const command = loginCommand({}, 'codebuddy', platform)
    assert.ok(command.includes('public'))
    assert.ok(command.includes('CODEBUDDY_CONFIG_DIR'))
    assert.ok(command.includes('.dsh-codebuddy-cli-intl'))
    assert.ok(!command.includes("='internal'"))
  }
})
