# Image input (International 0.1.7)

[简体中文](IMAGE-INPUT.md) · [Home](../README.en.md)

## Supported scope

User and tool-result images are enabled only for models explicitly marked `supportsImages` by the live official CLI catalog. The settings page adds an **Image input** column: images are sent only when it says **Declared by catalog**. **Not declared** means the adapter refuses image requests; it does not claim the official model cannot process images.

Tool images have no tool-name allowlist. Any DSH tool may provide an image when its model-visible result is a standard `role: "tool"` message with a non-empty `toolCallId` and a standard ImageAttachmentRef image block in content. The adapter preserves `toolCallId`, `isError` and content order; tool images share the user-image processing path. Missing tool IDs fail explicitly with `IMAGE_TOOL_CALL_INVALID`. Images in assistant, system and developer messages remain unsupported.

Accepted attachment formats are PNG, JPEG, WebP and GIF. Both user and tool-result images are read only through DSH's `ctx.attachments.readImageRequest` API with bounded dimensions and encoded size; arbitrary local paths, URLs and raw Base64 are not read. Images are sent as native `image` blocks in the official CLI stream-json input, not converted into prose or public URLs. Text requests keep the existing JSON output mode. Image requests use stream-json input and output, then read native `structured_output` from one unique final record. Only `StructuredOutput` is enabled in the CLI; DSH continues to execute business tools.

The official documentation describes stream-json image input and `--json-schema` structured output separately, without specifying their combination for every CLI/model version. The combined mode is an adapter implementation and needs validation on the target CLI version and account.

Post-build validation on 2026-10-24 used the actual adapter and International CLI with deepseek-v4.1-flash. A synthetic 360x240 six-color image passed every color check, with no DSH business tools executed. The gpt-5.6-luna text control returned `CLI_OUTPUT_INVALID`, so no image was sent to that model. This does not cover every model or verify the actual DSH upload UI.

## Adapter request limits

- User and tool-result images share one budget: up to 5 retained images in one DSH request history. Images already offloaded by DSH are not reread, and their contents are not inferred.
- Up to 2 MiB per request image, 8 MiB aggregate Base64, and a 1920-pixel target longest edge.
- Image bytes, attachment IDs and Base64 are excluded from diagnostics. Basic logs keep only image counts and byte totals.
- Cancellation, read errors, unsupported formats, undeclared model capability and exceeded budgets fail the request; partial image content is never sent.

## Sources not adapted

Desktop, window, region, browser, image-reading and third-party tools have no name restriction, but this release has not individually tested their actual outputs. They work only when the returned image uses the standard DSH attachment structure above; tools that return local paths, URLs, raw Base64 or custom screenshot objects are not adapted. Native audio/video, PDF content extraction and image generation are also outside this image-input route. The actual DSH screenshot/upload UI was not verified.

These are adapter safeguards, not claims about official service maximums or credits. Actual model capability, processing, access and billing are determined by the official service.

## Validation scope

All 80 synthetic automated checks pass. Synthetic attachments and a fake CLI cover mixed user/tool images, tool-only screenshots, toolCallId/isError/order, shared budgets and offloading, CLI error-frame classification, log privacy and existing image handling. They use no live model and execute no real DSH tools.

Inherited 0.1.5 adapter validation passed International CLI text and a synthetic six-color image on `deepseek-v4.1-flash`. The `gpt-5.6-luna` text control returned `CLI_OUTPUT_INVALID`, and no image was sent to it. Release 0.1.7 made no new model request. Tool-result images were tested with synthetic adapter fixtures only; actual DSH desktop, browser, region-capture or third-party tool outputs and the upload UI were not individually verified. Not all models were tested. A catalog image-capability declaration does not guarantee account access; live use requires valid International CLI sign-in and model access.

References:

- [CodeBuddy CLI Headless Mode: stream-json input, image messages and JSON Schema output](https://www.codebuddy.ai/docs/cli/headless)
- [DSH attachment service API](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/attachment/attachment/src/index.ts)
- [DSH attachment and ImageRequestTarget types](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/attachment/attachment/src/types.ts)
