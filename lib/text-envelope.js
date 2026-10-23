// Recover only lexical string errors in an exact, complete text-only envelope.
// No missing delimiters, duplicate/extra fields or nonempty tool arrays are
// accepted. Valid JSON escapes keep their normal JSON meaning.
export function recoverTextEnvelope(source) {
  let index = 0, changed = false, content
  const seen = new Set()
  const space = () => { while (index < source.length && /[ \t\r\n]/u.test(source[index])) index++ }
  const take = (char) => {
    space()
    if (source[index] !== char) return false
    index++
    return true
  }
  const string = (recover) => {
    if (source[index++] !== '"') return null
    let encoded = '"'
    while (index < source.length) {
      const char = source[index++]
      if (char === '"') {
        try { return { value: JSON.parse(encoded + '"') } } catch { return null }
      }
      if (char === '\\') {
        const next = source[index]
        if (next === undefined) return null
        if ('"\\/bfnrt'.includes(next)) { encoded += char + next; index++ }
        else if (next === 'u' && /^[0-9a-f]{4}$/iu.test(source.slice(index + 1, index + 5))) {
          encoded += source.slice(index - 1, index + 5)
          index += 5
        } else {
          if (!recover) return null
          encoded += '\\\\'
          changed = true
        }
      } else if (char.charCodeAt(0) < 32) {
        if (!recover) return null
        encoded += JSON.stringify(char).slice(1, -1)
        changed = true
      } else encoded += char
    }
    return null
  }
  if (!take('{')) return null
  for (let count = 0; count < 2; count++) {
    space()
    const key = string(false)?.value
    if (!['text', 'toolCalls'].includes(key) || seen.has(key) || !take(':')) return null
    seen.add(key)
    if (key === 'text') {
      space()
      const result = string(true)
      if (!result) return null
      content = result.value
    } else if (!take('[') || !take(']')) return null
    if (count === 0 && !take(',')) return null
  }
  if (!take('}')) return null
  space()
  if (index !== source.length || !changed) return null
  return { text: content, toolCalls: [] }
}
