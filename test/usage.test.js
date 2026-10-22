import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeCliUsage } from '../lib/usage.js'

test('counts the real CLI DeepSeek result cache fields once, not twice', () => {
  assert.deepEqual(normalizeCliUsage({ input_tokens: 14317, output_tokens: 389, cache_creation_input_tokens: 749, cache_read_input_tokens: 13568 }), {
    inputTokens: 0, outputTokens: 389, cacheReadTokens: 13568, cacheWriteTokens: 749, totalTokens: 14706
  })
  const oldResult = { input_tokens: 74, output_tokens: 29, cache_creation_input_tokens: 74, cache_read_input_tokens: 0 }
  assert.equal(normalizeCliUsage(oldResult).totalTokens, 103)
})

test('prefers and sums disjoint per-model counters instead of mixing two accounting formats', () => {
  const usage = normalizeCliUsage({ input_tokens: 99999, output_tokens: 99999 }, {
    alpha: { inputTokens: 10, outputTokens: 7, cacheReadInputTokens: 80, cacheCreationInputTokens: 20 },
    beta: { inputTokens: 5, outputTokens: 3, cacheReadInputTokens: 0, cacheCreationInputTokens: 4 }
  })
  assert.deepEqual(usage, { inputTokens: 15, outputTokens: 10, cacheReadTokens: 80, cacheWriteTokens: 24, totalTokens: 129 })
})

test('handles missing, invalid and inconsistent aggregate cache counters without negative or duplicated totals', () => {
  assert.equal(normalizeCliUsage({ input_tokens: 100, output_tokens: 2, cache_read_input_tokens: 30, cache_creation_input_tokens: 20 }).inputTokens, 50)
  assert.equal(normalizeCliUsage({ input_tokens: 10, output_tokens: 2, cache_read_input_tokens: 30 }).totalTokens, 12)
  assert.equal(normalizeCliUsage(null).totalTokens, 0)
  assert.equal(normalizeCliUsage({ input_tokens: NaN, output_tokens: -2 }).totalTokens, 0)
  assert.equal(normalizeCliUsage({ input_tokens: 10 }, { invalid: {} }).totalTokens, 10)
})
