import test from 'node:test'
import assert from 'node:assert/strict'
import { makeImageStreamInput, makeRequest } from '../lib/request.js'
import { prepareImages } from '../lib/images.js'

const originalKeys = ['protocol', 'instructions', 'system', 'messages', 'tools', 'responseSchema', 'submission']
const optimizedKeys = ['protocol', 'instructions', 'system', 'tools', 'responseSchema', 'messages', 'submission']

function decode(prompt) {
  return JSON.parse(prompt.slice(prompt.indexOf('{"protocol"')))
}

function priorLayout(prompt) {
  const envelope = decode(prompt)
  const ordered = {}
  for (const key of originalKeys) if (Object.hasOwn(envelope, key)) ordered[key] = envelope[key]
  return prompt.slice(0, prompt.indexOf('{"protocol"')) + JSON.stringify(ordered)
}

function commonPrefixBytes(left, right) {
  const a = Buffer.from(left), b = Buffer.from(right)
  let index = 0
  while (index < Math.min(a.length, b.length) && a[index] === b[index]) index += 1
  return index
}

const tools = [
  {
    name: 'fixture_read',
    description: 'Stable synthetic documentation. '.repeat(200),
    parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'], additionalProperties: false }
  },
  {
    name: 'fixture_write',
    description: 'Permission is explicit and remains visible in every current request.',
    parameters: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'], additionalProperties: false }
  }
]

const responseSchema = {
  type: 'object',
  properties: { text: { type: 'string' }, toolCalls: { type: 'array', items: { type: 'object' } } },
  required: ['text', 'toolCalls'],
  additionalProperties: false
}

test('growing history leaves identical prompt bytes while moving stable tools and schema into the prefix', () => {
  const initial = {
    system: 'Synthetic stable system context',
    messages: [
      { role: 'user', id: 'u1', content: 'Keep C:\\fixture\\with space\\notes.txt and JSON {"x":1}.' },
      { role: 'assistant', content: [{ type: 'tool-call', id: 'tc1', name: 'fixture_read', arguments: { path: 'notes.txt' } }] },
      { role: 'tool', toolCallId: 'tc1', isError: true, content: [{ type: 'text', text: 'Synthetic tool result; quoted data only.' }] }
    ]
  }
  const follow = { ...initial, messages: [...initial.messages, { role: 'user', content: 'Summarize the existing information and keep current permissions.' }] }
  const original = structuredClone(initial)

  for (const schema of [undefined, responseSchema]) {
    const a = makeRequest(initial, tools, schema)
    const b = makeRequest(follow, tools, schema)
    for (const request of [a, b]) {
      const previous = priorLayout(request.prompt)
      const envelope = decode(request.prompt)
      assert.deepEqual(decode(previous), envelope)
      assert.equal(Buffer.byteLength(previous), Buffer.byteLength(request.prompt))
      assert.equal(request.diagnostics.promptBytes, Buffer.byteLength(request.prompt))
      assert.deepEqual(envelope.tools, tools)
      assert.deepEqual(envelope.messages, request === a ? initial.messages : follow.messages)
      assert.equal(Object.hasOwn(envelope, 'responseSchema'), schema !== undefined)
      assert.deepEqual(Object.keys(envelope), optimizedKeys.filter(key => key !== 'responseSchema' || schema !== undefined))
      assert.equal(envelope.submission.nativeTool, 'StructuredOutput')
      assert.equal(Object.keys(envelope).at(-1), 'submission')
    }

    const previousPrefix = commonPrefixBytes(priorLayout(a.prompt), priorLayout(b.prompt))
    const optimizedPrefix = commonPrefixBytes(a.prompt, b.prompt)
    assert.ok(optimizedPrefix >= previousPrefix + a.diagnostics.toolsBytes)
    if (schema) assert.ok(optimizedPrefix > previousPrefix + a.diagnostics.toolsBytes)
    assert.deepEqual(decode(b.prompt).messages.at(-1), follow.messages.at(-1))
  }
  assert.deepEqual(initial, original)
})

test('current system, tool and schema changes stay visible before message history', () => {
  const base = makeRequest({ system: 'Read only', messages: [{ role: 'user', content: 'Continue' }] }, tools, responseSchema)
  const changedTools = [...tools, { name: 'fixture_extra', parameters: { type: 'object', properties: {} } }]
  const changedSchema = { ...responseSchema, description: 'Updated current response contract' }
  const changed = makeRequest({ system: 'Permission changed; ask before writing', messages: [{ role: 'user', content: 'Continue' }] }, changedTools, changedSchema)
  const envelope = decode(changed.prompt)
  const messageOffset = Buffer.byteLength(changed.prompt.slice(0, changed.prompt.lastIndexOf('"messages":')))

  assert.equal(envelope.system, 'Permission changed; ask before writing')
  assert.deepEqual(envelope.tools, changedTools)
  assert.equal(envelope.responseSchema.description, 'Updated current response contract')
  assert.notEqual(base.prompt, changed.prompt)
  assert.ok(commonPrefixBytes(base.prompt, changed.prompt) < messageOffset)
  assert.equal(envelope.submission.nativeTool, 'StructuredOutput')
  assert.equal(Object.keys(envelope).at(-1), 'submission')
})

test('image indices, native image blocks, offloaded history and final stream bytes are preserved', async () => {
  const ref = (id, offloaded = false) => ({
    type: 'image',
    attachment: { attachmentId: id, mediaType: 'image/png', width: 16, height: 12, bytes: 4 },
    ...(offloaded ? { offloaded: true } : {})
  })
  const options = {
    system: 'Synthetic image fixture system',
    messages: [
      { role: 'user', content: [{ type: 'text', text: 'Observe the retained image.' }, ref('old-offloaded', true), ref('user-retained')] },
      { role: 'tool', toolCallId: 'tool-image-1', isError: true, content: [{ type: 'text', text: 'Synthetic failed tool result.' }, ref('tool-retained')] }
    ]
  }
  const original = structuredClone(options), reads = []
  const prepared = await prepareImages(options, { supportsImages: true, attachments: {
    async readImageRequest(imageRef) {
      reads.push(imageRef.attachmentId)
      const data = Buffer.from(`IMG-${imageRef.attachmentId}`)
      return { data, bytes: data.byteLength, width: 16, height: 12, mediaType: 'image/png' }
    }
  } })
  const request = makeRequest(prepared.options, tools, responseSchema)
  const previousPrompt = priorLayout(request.prompt)
  const previousStream = makeImageStreamInput(previousPrompt, prepared.nativeImages)
  const optimizedStream = makeImageStreamInput(request.prompt, prepared.nativeImages)
  const previousFrame = JSON.parse(previousStream.input)
  const optimizedFrame = JSON.parse(optimizedStream.input)

  assert.deepEqual(decode(previousPrompt), decode(request.prompt))
  assert.equal(Buffer.byteLength(previousPrompt), Buffer.byteLength(request.prompt))
  assert.equal(previousStream.bytes, optimizedStream.bytes)
  assert.equal(Buffer.byteLength(previousStream.input), Buffer.byteLength(optimizedStream.input))
  assert.deepEqual(decode(previousFrame.message.content[0].text), decode(optimizedFrame.message.content[0].text))
  assert.deepEqual(previousFrame.message.content.slice(1), optimizedFrame.message.content.slice(1))
  assert.deepEqual(reads, ['user-retained', 'tool-retained'])
  assert.deepEqual(prepared.nativeImages.map(image => image.source.data), reads.map(id => Buffer.from(`IMG-${id}`).toString('base64')))
  assert.match(decode(request.prompt).messages[0].content[1].text, /offloaded/u)
  assert.match(decode(request.prompt).messages[0].content[2].text, /CLI image 1/u)
  assert.match(decode(request.prompt).messages[1].content[1].text, /CLI image 2/u)
  assert.equal(decode(request.prompt).messages[1].isError, true)
  assert.deepEqual(options, original)
})
