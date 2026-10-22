function count(value) {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : 0
}

// CLI modelUsage uses disjoint billing buckets. The result's aggregate usage
// folds cached tokens into input_tokens, so adding caches again double-counts.
export function normalizeCliUsage(usage = {}, modelUsage) {
  const models = modelUsage && typeof modelUsage === 'object' && !Array.isArray(modelUsage)
    ? Object.values(modelUsage) : []
  const validModels = models.length > 0 && models.every((model) => model && typeof model === 'object'
    && Number.isFinite(model.inputTokens) && model.inputTokens >= 0
    && Number.isFinite(model.outputTokens) && model.outputTokens >= 0)
  let inputTokens = 0, outputTokens = 0, cacheReadTokens = 0, cacheWriteTokens = 0
  if (validModels) {
    for (const model of models) {
      inputTokens += count(model.inputTokens)
      outputTokens += count(model.outputTokens)
      cacheReadTokens += count(model.cacheReadInputTokens)
      cacheWriteTokens += count(model.cacheCreationInputTokens)
    }
  } else {
    const totalInput = count(usage?.input_tokens ?? usage?.inputTokens)
    outputTokens = count(usage?.output_tokens ?? usage?.outputTokens)
    cacheReadTokens = Math.min(totalInput, count(usage?.cache_read_input_tokens ?? usage?.cacheReadInputTokens))
    cacheWriteTokens = Math.min(totalInput - cacheReadTokens, count(usage?.cache_creation_input_tokens ?? usage?.cacheCreationInputTokens))
    inputTokens = totalInput - cacheReadTokens - cacheWriteTokens
  }
  return { inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens,
    totalTokens: inputTokens + cacheReadTokens + cacheWriteTokens + outputTokens }
}
