import test from 'node:test'
import assert from 'node:assert/strict'
import { prepareImages, imageTarget, IMAGE_LIMITS } from '../lib/images.js'
import { modelInfo } from '../lib/model-catalog.js'

const ref = (id, bytes = 3) => ({ attachmentId: id, mediaType: 'image/png', bytes, width: 300, height: 200 })
const image = (id, offloaded = false) => ({ type: 'image', attachment: ref(id), ...(offloaded ? { offloaded: true } : {}) })
const version = data => ({ data, bytes: data.byteLength, mediaType: 'image/png', width: 300, height: 200 })
const options = content => ({ messages: [{ role: 'user', content }] })

test('native image projection preserves order, association, duplicates and immutable DSH history', async () => {
  const source = { messages: [
    { role: 'user', content: [{ type: 'text', text: 'first' }, image('PRIVATE_ATTACHMENT_ID_A'), image('PRIVATE_ATTACHMENT_ID_B')] },
    { role: 'assistant', content: 'prior' },
    { role: 'user', content: [image('PRIVATE_ATTACHMENT_ID_A'), { type: 'text', text: 'compare' }] }
  ] }
  const original = JSON.stringify(source)
  const reads = []
  const result = await prepareImages(source, {
    supportsImages: true,
    attachments: {
      async readImageRequest(attachment, target) {
        reads.push(attachment.attachmentId)
        assert.deepEqual(target, { width: 300, height: 200, maxBytes: 2097152 })
        return version(Buffer.from(attachment.attachmentId))
      }
    }
  })
  assert.deepEqual(reads, ['PRIVATE_ATTACHMENT_ID_A', 'PRIVATE_ATTACHMENT_ID_B'])
  assert.deepEqual(result.nativeImages.map(item => Buffer.from(item.source.data, 'base64').toString()), reads.concat(reads[0]))
  assert.match(result.options.messages[2].content[0].text, /CLI image 3/u)
  assert.equal(result.options.messages[0].content[0].text, 'first')
  assert.equal(JSON.stringify(source), original)
  assert.equal(result.diagnostics.imageCount, 3)
  assert.equal(JSON.stringify(result.options).includes('PRIVATE_ATTACHMENT_ID'), false)
  assert.equal(JSON.stringify(result.diagnostics).includes(Buffer.from('PRIVATE_ATTACHMENT_ID_A').toString('base64')), false)
})

test('DSH-offloaded images become an honest text placeholder without reading or disclosing the ref', async () => {
  const result = await prepareImages(options([image('PRIVATE_OLD_IMAGE_ID', true)]), {
    supportsImages: false,
    attachments: { readImageRequest() { throw Error('must not be read') } }
  })
  assert.deepEqual(result.nativeImages, [])
  assert.match(result.options.messages[0].content[0].text, /offloaded/u)
  assert.match(result.options.messages[0].content[0].text, /not included/u)
  assert.equal(JSON.stringify(result.options).includes('PRIVATE_OLD_IMAGE_ID'), false)
  assert.equal(result.diagnostics.offloadedImageCount, 1)
  assert.equal(result.imageRequest, false)
})

test('image capability, attachment service, role and reference validation fail explicitly', async () => {
  for (const supportsImages of [false, undefined]) {
    await assert.rejects(prepareImages(options([image('A')]), { supportsImages }), { code: 'IMAGE_MODEL_UNSUPPORTED' })
  }
  await assert.rejects(prepareImages(options([image('A')]), { supportsImages: true }), { code: 'IMAGE_SERVICE_UNAVAILABLE' })
  await assert.rejects(prepareImages({ messages: [{ role: 'tool', content: [image('A')] }] }, { supportsImages: true }), { code: 'IMAGE_ROLE_UNSUPPORTED' })
  await assert.rejects(prepareImages(options([{ type: 'image', attachment: { ...ref('A'), mediaType: 'image/svg+xml' } }])), { code: 'IMAGE_ATTACHMENT_INVALID' })
  assert.deepEqual(modelInfo('p', { id: 'image-model', name: 'image-model', supportsImages: true }).inputModalities, ['text', 'image'])
  assert.deepEqual(modelInfo('p', { id: 'unknown-model', name: 'unknown-model' }).inputModalities, ['text'])
})

test('count and exact encoded-byte budgets request ordered DSH offloading', async () => {
  await assert.rejects(prepareImages(options(Array.from({ length: 7 }, (_, index) => image(String(index)))), {
    supportsImages: true
  }), error => error.code === 'IMAGE_OFFLOAD_REQUIRED' && error.failure.offloadImages === 2)

  const attachments = { async readImageRequest() { return version(Buffer.alloc(IMAGE_LIMITS.maxImageBytes)) } }
  await assert.rejects(prepareImages(options([image('A'), image('B'), image('C'), image('D')]), {
    supportsImages: true,
    attachments
  }), error => error.failure.code === 'IMAGE_OFFLOAD_REQUIRED' && error.failure.offloadImages === 2)
})

test('request target preserves aspect ratio and rejects invalid or oversized image data', async () => {
  assert.deepEqual(imageTarget({ width: 8000, height: 4000 }), { width: 1920, height: 960, maxBytes: 2097152 })
  for (const response of [
    { ...version(Buffer.from('x')), bytes: 99 },
    version(Buffer.alloc(IMAGE_LIMITS.maxImageBytes + 1)),
    { ...version(Buffer.from('x')), mediaType: 'image/svg+xml' },
    { ...version(Buffer.from('x')), width: 9999 }
  ]) {
    await assert.rejects(prepareImages(options([image('A')]), {
      supportsImages: true,
      attachments: { async readImageRequest() { return response } }
    }), error => ['IMAGE_ATTACHMENT_INVALID', 'IMAGE_TOO_LARGE'].includes(error.code))
  }
})

test('attachment failures and cancellation never send partial image content or expose internal paths', async () => {
  await assert.rejects(prepareImages(options([image('A')]), {
    supportsImages: true,
    attachments: { async readImageRequest() { throw Error('PRIVATE_ATTACHMENT_PATH') } }
  }), error => error.code === 'IMAGE_READ_FAILED' && !error.message.includes('PRIVATE'))

  const controller = new AbortController()
  await assert.rejects(prepareImages({ ...options([image('A')]), signal: controller.signal }, {
    supportsImages: true,
    attachments: {
      async readImageRequest(_ref, _target, signal) {
        assert.equal(signal, controller.signal)
        controller.abort()
        return version(Buffer.from('x'))
      }
    }
  }), { code: 'ABORTED' })
})
