# Image input (International 0.1.6)

[简体中文](IMAGE-INPUT.md) · [Home](../README.en.md)

## Supported scope

Image input is enabled only for models explicitly marked `supportsImages` by the live official CLI catalog. The settings page adds an **Image input** column: images are sent only when it says **Declared by catalog**. **Not declared** means the adapter refuses image requests; it does not claim the official model cannot process images.

Accepted attachment formats are PNG, JPEG, WebP and GIF. The plugin reads local attachments through DSH's `ctx.attachments.readImageRequest` API and requests bounded dimensions and encoded size. Images are sent as native `image` blocks in the official CLI stream-json input, not converted into prose or public URLs. Text requests keep the existing JSON output mode. Image requests use stream-json input and output, then read native `structured_output` from one unique final record. Only `StructuredOutput` is enabled in the CLI; DSH continues to execute business tools.

The official documentation describes stream-json image input and `--json-schema` structured output separately, without specifying their combination for every CLI/model version. The combined mode is an adapter implementation and needs validation on the target CLI version and account.

Post-build validation on 2026-10-24 used the actual adapter and International CLI with deepseek-v4.1-flash. A synthetic 360x240 six-color image passed every color check, with no DSH business tools executed. The gpt-5.6-luna text control returned `CLI_OUTPUT_INVALID`, so no image was sent to that model. This does not cover every model or verify the actual DSH upload UI.

## Adapter request limits

- Up to 5 retained images in one DSH request history. Images already offloaded by DSH are not reread, and their contents are not inferred.
- Up to 2 MiB per request image, 8 MiB aggregate Base64, and a 1920-pixel target longest edge.
- Image bytes, attachment IDs and Base64 are excluded from diagnostics. Basic logs keep only image counts and byte totals.
- Cancellation, read errors, unsupported formats, undeclared model capability and exceeded budgets fail the request; partial image content is never sent.

These are adapter safeguards, not claims about official service maximums or credits. Actual model capability, processing, access and billing are determined by the official service.

## Validation scope

All 77 synthetic automated checks pass. They use synthetic attachments and a fake CLI to cover native image blocks, image order, multi-image history, catalog capability checks, budget failures, cancellation, DSH tool-plan continuation and diagnostic privacy, without real model usage.

The live check for this release ran text-only native Schema controls using the existing International CLI profile. Both `gpt-5.6-luna` and `deepseek-v4.1-flash` returned `CLI_AUTH_REQUIRED` (401), so no image request was sent and live International image recognition remains unverified. Earlier timeouts resulted from a relative path resolving to the wrong profile; an earlier bare image call did not verify the CLI error state or image recognition. Neither counts as validation, and China-version results do not validate the International route. A catalog image-capability declaration does not guarantee this account has model access. This release has not verified every model or the DSH upload UI flow; a live call needs valid International CLI sign-in and model access.

References:

- [CodeBuddy CLI Headless Mode: stream-json input, image messages and JSON Schema output](https://www.codebuddy.ai/docs/cli/headless)
- [DSH attachment service API](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/attachment/attachment/src/index.ts)
- [DSH attachment and ImageRequestTarget types](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/attachment/attachment/src/types.ts)
