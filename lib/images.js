import { CodeBuddyCliError } from './cli-response.js'

// Local adapter limits, not claims about every upstream model's maximum.
export const IMAGE_LIMITS = Object.freeze({
  maxImages: 5,
  maxImageBytes: 2 * 1024 * 1024,
  maxBase64Bytes: 8 * 1024 * 1024,
  maxDimension: 1920
})

const mediaTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
const positive = value => Number.isSafeInteger(value) && value > 0

export function hasImageBlocks(options) {
  return (options.messages ?? []).some(message => Array.isArray(message?.content)
    && message.content.some(block => block?.type === 'image'))
}

export function hasRetainedImageBlocks(options) {
  return (options.messages ?? []).some(message => Array.isArray(message?.content)
    && message.content.some(block => block?.type === 'image' && block.offloaded !== true))
}

export function imageTarget(image) {
  if (!positive(image?.width) || !positive(image?.height)) {
    throw new CodeBuddyCliError('IMAGE_ATTACHMENT_INVALID', '图片附件缺少有效尺寸，请重新上传。')
  }
  const scale = Math.min(1, IMAGE_LIMITS.maxDimension / Math.max(image.width, image.height))
  return {
    width: Math.max(1, Math.round(image.width * scale)),
    height: Math.max(1, Math.round(image.height * scale)),
    maxBytes: IMAGE_LIMITS.maxImageBytes
  }
}

function validRef(ref) {
  if (!ref || typeof ref.attachmentId !== 'string' || !ref.attachmentId || ref.attachmentId.length > 256
    || !mediaTypes.has(ref.mediaType) || !positive(ref.bytes) || !positive(ref.width) || !positive(ref.height)) {
    throw new CodeBuddyCliError('IMAGE_ATTACHMENT_INVALID', '图片附件引用无效，请从 DSH 重新上传图片。')
  }
}

function requireOffload(count) {
  throw new CodeBuddyCliError('IMAGE_OFFLOAD_REQUIRED',
    '本次图片历史超过请求预算，需要 DSH 卸载较早的图片后继续；若当前 DSH 未启用图片卸载，请减少图片或新建会话。',
    { offloadImages: count })
}

function replaceImages(messages, replacements) {
  return messages.map((message, messageIndex) => !Array.isArray(message?.content) ? message : {
    ...message,
    content: message.content.map((block, blockIndex) => replacements.get(`${messageIndex}:${blockIndex}`) ?? block)
  })
}

/** Prepare DSH image references for the official CLI's native base64 image blocks. */
export async function prepareImages(options, { attachments, supportsImages } = {}) {
  const occurrences = []
  for (const [messageIndex, message] of (options.messages ?? []).entries()) {
    if (!Array.isArray(message?.content)) continue
    for (const [blockIndex, block] of message.content.entries()) {
      if (block?.type !== 'image') continue
      if (message.role === 'tool'
        && (typeof message.toolCallId !== 'string' || message.toolCallId.trim() === '')) {
        throw new CodeBuddyCliError('IMAGE_TOOL_CALL_INVALID', '工具结果中的图片缺少有效的 toolCallId，无法关联到对应工具调用。')
      }
      if (message.role !== 'user' && message.role !== 'tool') {
        throw new CodeBuddyCliError('IMAGE_ROLE_UNSUPPORTED', '图片只支持用户消息或带有效 toolCallId 的工具结果；assistant、system 和 developer 图片不受支持。')
      }
      validRef(block.attachment)
      occurrences.push({ messageIndex, blockIndex, block })
    }
  }

  const retained = occurrences.filter(item => item.block.offloaded !== true)
  if (retained.length && supportsImages !== true) {
    throw new CodeBuddyCliError('IMAGE_MODEL_UNSUPPORTED', '当前模型未声明支持图片，或模型目录尚未就绪。请刷新目录并选择标记“图片”的模型。')
  }
  if (retained.length > IMAGE_LIMITS.maxImages) requireOffload(retained.length - IMAGE_LIMITS.maxImages)
  if (retained.length && typeof attachments?.readImageRequest !== 'function') {
    throw new CodeBuddyCliError('IMAGE_SERVICE_UNAVAILABLE', 'DSH 图片附件服务不可用，请更新 DSH 并重新启用插件。')
  }

  const versions = new Map()
  const nativeImages = []
  const replacements = new Map()
  const base64Lengths = []
  let imageBytes = 0
  let imageBase64Bytes = 0

  for (const item of occurrences) {
    if (options.signal?.aborted) throw new CodeBuddyCliError('ABORTED', '请求已取消。')
    const ref = item.block.attachment
    const key = `${item.messageIndex}:${item.blockIndex}`
    if (item.block.offloaded === true) {
      replacements.set(key, {
        type: 'text',
        text: `[Earlier DSH image (${ref.width}x${ref.height}) was offloaded. Its image bytes are not included in this request; do not infer its contents.]`
      })
      continue
    }

    let version = versions.get(ref.attachmentId)
    if (!version) {
      try { version = await attachments.readImageRequest(ref, imageTarget(ref), options.signal) }
      catch {
        if (options.signal?.aborted) throw new CodeBuddyCliError('ABORTED', '请求已取消。')
        throw new CodeBuddyCliError('IMAGE_READ_FAILED', '无法读取 DSH 图片附件，请重新上传；未发送不完整图片。')
      }
      if (options.signal?.aborted) throw new CodeBuddyCliError('ABORTED', '请求已取消。')
      if (!(version?.data instanceof Uint8Array) || !version.data.byteLength || !mediaTypes.has(version.mediaType)
        || version.bytes !== version.data.byteLength || !positive(version.width) || !positive(version.height)
        || version.width > IMAGE_LIMITS.maxDimension || version.height > IMAGE_LIMITS.maxDimension) {
        throw new CodeBuddyCliError('IMAGE_ATTACHMENT_INVALID', 'DSH 返回的图片请求数据不合法，请更新 DSH 或重新上传。')
      }
      if (version.data.byteLength > IMAGE_LIMITS.maxImageBytes) {
        throw new CodeBuddyCliError('IMAGE_TOO_LARGE', '单张图片转换后仍超过 2 MiB，请缩小图片后重新上传。')
      }
      versions.set(ref.attachmentId, version)
    }

    const data = Buffer.from(version.data).toString('base64')
    imageBytes += version.bytes
    imageBase64Bytes += data.length
    base64Lengths.push(data.length)
    const imageIndex = nativeImages.length + 1
    replacements.set(key, {
      type: 'text',
      text: `[CLI image ${imageIndex} (${version.width}x${version.height}); the matching native image block follows the DSH history in CLI image index order.]`
    })
    nativeImages.push({ type: 'image', source: { type: 'base64', media_type: version.mediaType, data } })
  }

  if (imageBase64Bytes > IMAGE_LIMITS.maxBase64Bytes) {
    let remaining = imageBase64Bytes
    let count = 0
    while (remaining > IMAGE_LIMITS.maxBase64Bytes && count < base64Lengths.length) remaining -= base64Lengths[count++]
    requireOffload(Math.max(1, count))
  }

  return {
    options: { ...options, messages: replaceImages(options.messages ?? [], replacements) },
    nativeImages,
    imageRequest: retained.length > 0,
    diagnostics: {
      imageCount: retained.length,
      offloadedImageCount: occurrences.length - retained.length,
      imageBytes,
      imageBase64Bytes
    }
  }
}
