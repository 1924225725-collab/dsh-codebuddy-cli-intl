import test from 'node:test'
import assert from 'node:assert/strict'
import { parseModelResponse, parseStructuredResponse } from '../lib/model-response.js'

const envelope = { text: 'hello', toolCalls: [] }
const tool = { name: 'edit_demo' }
const toolEnvelope = { text: '', toolCalls: [{ name: tool.name, arguments: { content: 'quoted "text"\nC:\\demo\\file.txt { [ ] }' } }] }

test('native structured results preserve literal text and repeated DSH calls without scanning examples', () => {
  const text = 'C:\\fictional\\sample\n{"text":"example"} {"toolCalls":[]}'
  const value = { text, toolCalls: [toolEnvelope.toolCalls[0], toolEnvelope.toolCalls[0]] }
  const parsed = parseStructuredResponse(value, [tool])
  assert.equal(parsed.text, text)
  assert.equal(parsed.calls.length, 2)
  assert.equal(parsed.responseDiagnostics.outputMode, 'native-json-schema')
  assert.deepEqual(parsed.responseDiagnostics.normalizations, [])
})

test('native structured mode rejects strings, wrappers, partial and extra protocol fields', () => {
  for (const value of [JSON.stringify(envelope), 'plain text', '{"text":', [envelope], { data: envelope }, { text: 'text only' }, { toolCalls: [] }, { ...envelope, extra: true }]) {
    assert.throws(() => parseStructuredResponse(value, [tool]), error => error.code === 'STRUCTURED_OUTPUT_INVALID'
      && error.responseDiagnostics.reason === 'native-envelope'
      && error.responseDiagnostics.outputMode === 'native-json-schema')
  }
  for (const args of ['{}', [], null]) {
    assert.throws(() => parseStructuredResponse({ text: '', toolCalls: [{ name: tool.name, arguments: args }] }, [tool]), error => error.code === 'TOOL_CALL_INVALID')
  }
})

test('accepts exact envelopes and complete wrappers without changing reply or tool arguments', () => {
  const json = JSON.stringify(toolEnvelope)
  for (const result of [toolEnvelope, json, `\uFEFF${json}`, `\n\`\`\`json\n${json}\n\`\`\`\n`, JSON.stringify(json), { data: toolEnvelope }, { result: json }, [toolEnvelope], `模型结果如下：\n${json}\n以上为结果。`]) {
    const parsed = parseModelResponse(result, [tool])
    assert.equal(parsed.text, toolEnvelope.text)
    assert.deepEqual(JSON.parse(parsed.calls[0].arguments), toolEnvelope.toolCalls[0].arguments)
    assert.equal(parsed.responseDiagnostics.reason, 'valid')
  }
})

test('normalizes only unambiguous text-only and nonempty tool-only envelopes', () => {
  assert.deepEqual(parseModelResponse({ text: 'hello' }).calls, [])
  for (const value of [{ toolCalls: toolEnvelope.toolCalls }, { text: null, toolCalls: toolEnvelope.toolCalls }]) {
    const parsed = parseModelResponse(value, [tool])
    assert.equal(parsed.text, '')
    assert.equal(parsed.calls.length, 1)
  }
  for (const value of [{ toolCalls: [] }, { text: null, toolCalls: [] }, { text: 'hello', tool_calls: [toolEnvelope.toolCalls[0]] }]) {
    assert.throws(() => parseModelResponse(value, [tool]), (error) => error.code === 'STRUCTURED_OUTPUT_INVALID')
  }
})

test('decodes complete string arguments but rejects truncated or non-object arguments', () => {
  const value = { ...toolEnvelope, toolCalls: [{ name: tool.name, arguments: JSON.stringify({ content: 'ok' }) }] }
  assert.deepEqual(JSON.parse(parseModelResponse(value, [tool]).calls[0].arguments), { content: 'ok' })
  for (const args of ['{"content":"unfinished', '[]', 'null', '42', [], null]) {
    assert.throws(() => parseModelResponse({ text: '', toolCalls: [{ name: tool.name, arguments: args }] }, [tool]), (error) => error.code === 'TOOL_CALL_INVALID')
  }
})

test('never selects between conflicting results, repairs incomplete JSON or accepts unknown tools', () => {
  const json = JSON.stringify(toolEnvelope)
  for (const value of ['prefix\n' + json + '\n{"text":', json + '}', json.slice(0, -1), '```json\n' + json.slice(0, -1), '[{"text":"ok","toolCalls":[]},', JSON.stringify({ text: 'hello', toolCalls: [] }).slice(0, -4)]) {
    assert.throws(() => parseModelResponse(value, [tool]), (error) => error.code === 'STRUCTURED_OUTPUT_INVALID')
  }
  assert.throws(() => parseModelResponse(toolEnvelope, []), (error) => error.code === 'TOOL_CALL_INVALID' && error.responseDiagnostics.reason === 'unknown-tool')
  assert.throws(() => parseModelResponse([envelope, envelope]), (error) => error.responseDiagnostics.reason === 'invalid-envelope')
})

test('recovers raw controls and illegal escapes only inside complete explicitly text-only replies', () => {
  const raw = '输出 5\r\n退出码 0\t路径 C:\\project\\demo；字面值 \\q 与 \\uZZZZ'
  for (const source of ['{"text":"' + raw + '","toolCalls":[]}', '{"toolCalls": [ ], "text":"' + raw + '"}', '```json\n{"text":"' + raw + '","toolCalls":[]}\n```']) {
    const result = parseModelResponse(source, [tool])
    assert.equal(result.text, raw)
    assert.deepEqual(result.calls, [])
    assert.ok(result.responseDiagnostics.normalizations.includes('text-string-escape-recovery'))
    assert.equal(result.responseDiagnostics.scanIncomplete, false)
    assert.equal(JSON.stringify(result.responseDiagnostics).includes('project'), false)
  }
  const mixed = parseModelResponse('{"text":"literal \\q; newline \\n; unicode \\u4e2d; quote \\"ok\\"","toolCalls":[]}')
  assert.equal(mixed.text, 'literal \\q; newline \n; unicode 中; quote "ok"')
  assert.deepEqual(mixed.calls, [])
})

test('text escape recovery never completes structure or accepts extra fields or possible tool requests', () => {
  const text = '"text":"line one\nline two"'
  const cases = [
    '{' + text + '}', '{' + text + ',"toolCalls":[',
    '{' + text + ',"toolCalls":[]', '{' + text + ',"toolCalls":[],}',
    '{' + text + ',"toolCalls":null}', '{' + text + ',"toolCalls":[],"extra":0}',
    '{' + text + ',"text":"again","toolCalls":[]}',
    '{"toolCalls":[],"toolCalls":[], ' + text + '}',
    '{' + text + ',"toolCalls":[{"name":"edit_demo","arguments":{}}]}',
    '{' + text + ',"tool_calls":[]}', '{' + text + ',"toolCalls":[]} {"example":1}',
    '{"text":"bad "quote"\ntext","toolCalls":[]}',
    '{"text":"fine","toolCalls":[{"name":"edit_demo","arguments":{"path":"C:\\project"}}]}'
  ]
  for (const source of cases) assert.throws(() => parseModelResponse(source, [tool]), error => error.code === 'STRUCTURED_OUTPUT_INVALID')
})

test('accepts delimiter-free plain text as a text-only response without inferring or executing tools', () => {
  const reply = '工作区文件没有列出；请先确认当前测试文件夹已放入 DSH 工作区。'
  const result = parseModelResponse(reply, [tool])
  assert.equal(result.text, reply)
  assert.deepEqual(result.calls, [])
  assert.equal(result.responseDiagnostics.reason, 'plain-text-fallback')
  assert.ok(result.responseDiagnostics.normalizations.includes('plain-text-fallback'))
  for (const malformed of ['{"text":', '{]bad', 'prefix {"text":"ok"']) {
    assert.throws(() => parseModelResponse(malformed, [tool]), error => error.code === 'STRUCTURED_OUTPUT_INVALID')
  }
})

test('preserves complete JSON examples and bracket labels as ordinary text when no protocol result exists', () => {
  for (const reply of [
    'Example: {"example":1}',
    '```json\n{"example":1}\n```',
    'Stage marker [阶段一]',
    'Stages: [阶段一] then [阶段二]',
    'Examples: {} and []',
    '```text\nC:\\测试目录\\含 空格\\demo.txt\n{"example":1} [阶段一] [阶段二]\n他说："hello"；反斜杠是 \\\n```'
  ]) {
    const result = parseModelResponse(reply, [tool])
    assert.equal(result.text, reply)
    assert.deepEqual(result.calls, [])
    assert.equal(result.responseDiagnostics.reason, 'plain-text-fallback')
  }
})

test('treats balanced malformed non-protocol examples as text but rejects malformed protocol-shaped results', () => {
  for (const reply of ['Example: {"example":,}', '```json\n{"example":,}\n```', 'Text {"example":,} and [label]']) {
    const result = parseModelResponse(reply, [tool])
    assert.equal(result.text, reply)
    assert.deepEqual(result.calls, [])
    assert.equal(result.responseDiagnostics.reason, 'plain-text-fallback')
  }
  for (const reply of ['{"text":,}', '{"toolCalls":,}', '{"name":"edit_demo","arguments":,}']) {
    assert.throws(() => parseModelResponse(reply, [tool]), error => error.code === 'STRUCTURED_OUTPUT_INVALID')
  }
})

test('rejects incomplete tails even after a complete text-only candidate', () => {
  const json = JSON.stringify(envelope)
  for (const tail of ['{"example":', '{"toolCalls":', '{"name":"edit_demo"', '{"text":"second']) {
    assert.throws(() => parseModelResponse(`${json}\n${tail}`, [tool]), error => {
      assert.equal(error.responseDiagnostics.reason, 'possibly-truncated-json')
      assert.equal(error.responseDiagnostics.scanIncomplete, true)
      assert.equal(error.responseDiagnostics.incompleteTailIgnored, undefined)
      return true
    })
  }
  assert.throws(() => parseModelResponse(`${JSON.stringify(toolEnvelope)}\n{"example":`, [tool]), error => error.responseDiagnostics.reason === 'possibly-truncated-json')
})

test('diagnostics distinguish empty, syntax and shape failures without including response content or keys', () => {
  const secret = 'PRIVATE_CONTENT_NEVER_LOG'
  const cases = [['', 'empty-result'], ['{] ' + secret, 'invalid-json'], ['{"text":"' + secret, 'possibly-truncated-json'], [{ [secret]: secret }, 'invalid-text-field'], [{ text: secret, toolCalls: '[]' }, 'invalid-tool-calls-field']]
  for (const [value, reason] of cases) {
    assert.throws(() => parseModelResponse(value), (error) => {
      assert.equal(error.responseDiagnostics.reason, reason)
      assert.equal(JSON.stringify(error.responseDiagnostics).includes(secret), false)
      assert.equal(error.message.includes(secret), false)
      if (reason === 'possibly-truncated-json') {
        assert.equal(error.responseDiagnostics.scanIncomplete, true)
        assert.equal(error.responseDiagnostics.scanBroken, false)
        assert.equal(error.responseDiagnostics.insideString, true)
      }
      if (reason === 'invalid-json') assert.equal(error.responseDiagnostics.scanBroken, true)
      return true
    })
  }
})

test('large complete replies and multiline tool content pass without truncation', () => {
  const content = '长文本 "quoted" C:\\demo\\path\n{[content]}\n'.repeat(40000)
  const parsed = parseModelResponse(JSON.stringify({ text: content, toolCalls: [{ name: tool.name, arguments: { content } }] }), [tool])
  assert.equal(parsed.text, content)
  assert.equal(JSON.parse(parsed.calls[0].arguments).content, content)
})

test('empty or whitespace-only text without tools fails instead of silently ending the turn', () => {
  for (const value of [{ text: '', toolCalls: [] }, { text: ' \n\t', toolCalls: [] }, { text: '' }]) {
    assert.throws(() => parseModelResponse(value), error => error.code === 'STRUCTURED_OUTPUT_INVALID' && error.responseDiagnostics.reason === 'empty-content')
  }
  assert.equal(parseModelResponse(toolEnvelope, [tool]).calls.length, 1)
})

test('selects one validated protocol result beside unrelated complete fragments only', () => {
  const json = JSON.stringify(toolEnvelope)
  for (const prefix of ['说明 [阶段一] [阶段二]\n', '{}\n[]\n', '{"example":1}\n["example"]\n']) {
    const parsed = parseModelResponse(prefix + json, [tool])
    assert.equal(parsed.calls.length, 1)
    assert.deepEqual(JSON.parse(parsed.calls[0].arguments), toolEnvelope.toolCalls[0].arguments)
    assert.equal(parsed.responseDiagnostics.validProtocolCandidates, 1)
    assert.equal(parsed.responseDiagnostics.ignoredContainers, 2)
    assert.ok(parsed.responseDiagnostics.normalizations.includes('unique-protocol-result'))
  }
})

test('never ignores a conflicting, malformed, wrapped or undeclared tool candidate', () => {
  const json = JSON.stringify(envelope)
  for (const other of [JSON.stringify({ text: 'another reply', toolCalls: [] }), JSON.stringify(toolEnvelope), '{"text":42,"toolCalls":[]}', '{"tool_calls":[{"name":"edit_demo"}]}', '{"data":{"text":42}}', '{"name":"edit_demo","arguments":{}}', '{"command":"do not execute"}', JSON.stringify([JSON.stringify(toolEnvelope)]), '{"x":}', '[1,]', '{"text":']) {
    assert.throws(() => parseModelResponse(json + '\n' + other), error => error.code === 'STRUCTURED_OUTPUT_INVALID')
  }
  assert.throws(() => parseModelResponse(json + '\n' + JSON.stringify(toolEnvelope)), error => {
    assert.equal(error.responseDiagnostics.reason, 'ambiguous-json')
    assert.equal(error.responseDiagnostics.containerSummaries[1].toolCount, 1)
    assert.equal(JSON.stringify(error.responseDiagnostics).includes('content'), false)
    return true
  })
  assert.throws(() => parseModelResponse(Array.from({ length: 20 }, (_, i) => JSON.stringify({ text: `reply ${i}`, toolCalls: [] })).join('\n')), error => {
    assert.equal(error.responseDiagnostics.containerSummaries.length, 12)
    assert.equal(error.responseDiagnostics.completeContainers, 20)
    assert.equal(error.responseDiagnostics.containerSummariesTruncated, true)
    return true
  })
})

test('delivers identical validated protocol results only once, preserving literal text and ordered tool payloads', () => {
  const text = 'Literal \\q \\n "quoted"\nActual newline'
  const value = { text, toolCalls: toolEnvelope.toolCalls }
  const reordered = { toolCalls: value.toolCalls.map(call => ({ arguments: JSON.stringify(call.arguments), name: call.name })), text }
  for (const input of [JSON.stringify(value) + '\n' + JSON.stringify(value), '{}\n' + JSON.stringify(value) + '\n' + JSON.stringify(reordered)]) {
    const result = parseModelResponse(input, [tool])
    assert.equal(result.text, text)
    assert.equal(result.calls.length, 1)
    assert.deepEqual(JSON.parse(result.calls[0].arguments), value.toolCalls[0].arguments)
    assert.ok(result.responseDiagnostics.normalizations.includes('duplicate-protocol-result'))
    assert.equal(result.responseDiagnostics.validProtocolCandidates, 2)
    assert.equal(result.responseDiagnostics.duplicateProtocolCandidates, 1)
  }
  const result = parseModelResponse(Array(20).fill(JSON.stringify(envelope)).join('\n'))
  assert.equal(result.text, envelope.text)
  assert.equal(result.responseDiagnostics.duplicateProtocolCandidates, 19)
  assert.equal(result.responseDiagnostics.containerSummaries.length, 12)
})

test('duplicate recovery rejects changed text, tool counts, order, arguments, extra fields and malformed neighbours', () => {
  const plan = { text: 'plan', toolCalls: [{ name: tool.name, arguments: { target: 'one' } }, { name: tool.name, arguments: { target: 'two' } }] }
  const base = JSON.stringify(plan)
  const others = [
    { ...plan, text: 'changed plan' }, { ...plan, toolCalls: plan.toolCalls.slice(0, 1) },
    { ...plan, toolCalls: [...plan.toolCalls].reverse() },
    { ...plan, toolCalls: [{ name: tool.name, arguments: { target: 'changed' } }, plan.toolCalls[1]] },
    { ...plan, extra: true }, { data: plan },
    { ...plan, toolCalls: plan.toolCalls.map(call => ({ ...call, extra: true })) }
  ]
  for (const other of others) assert.throws(() => parseModelResponse(base + '\n' + JSON.stringify(other), [tool]), error => error.code === 'STRUCTURED_OUTPUT_INVALID')
  for (const tail of ['{"x":}', '{"text":', '{"toolCalls":[{"name":"undeclared","arguments":{}}]}']) {
    assert.throws(() => parseModelResponse(base + '\n' + base + '\n' + tail, [tool]), error => error.code === 'STRUCTURED_OUTPUT_INVALID')
  }
})

test('never removes repeated tool calls from within one valid plan', () => {
  const value = { text: '', toolCalls: [toolEnvelope.toolCalls[0], toolEnvelope.toolCalls[0]] }
  assert.equal(parseModelResponse(value, [tool]).calls.length, 2)
  const result = parseModelResponse(JSON.stringify(value) + '\n' + JSON.stringify(value), [tool])
  assert.equal(result.calls.length, 2)
  assert.notEqual(result.calls[0].id, result.calls[1].id)
})
