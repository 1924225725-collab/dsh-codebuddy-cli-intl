# DSH CodeBuddy CLI (International)

[简体中文](README.md) · **English**

[Download 0.2.0](https://raw.githubusercontent.com/1924225725-collab/dsh-codebuddy-cli-intl/main/releases/dsh-codebuddy-cli-intl-0.2.0.tgz) · [Historical Releases](https://github.com/1924225725-collab/dsh-codebuddy-cli-intl/releases) · [Installation](docs/INSTALL.en.md) · [Account guide](docs/ACCOUNT_GUIDE.en.md) · [Image input](docs/IMAGE-INPUT.en.md) · [Troubleshooting](docs/USER_GUIDE.en.md) · [Changelog](CHANGELOG.md)

> Version 0.2.0 is available from the repository; its separate Release entry is pending. All 43 targeted synthetic checks passed. This update made no live International model request and does not claim to eliminate every intermittent failure.

Use models available to your international account in DeepSeek Harness (DSH) through the official CodeBuddy CLI running locally. The adapter translates model requests and results; DSH continues to manage conversations, permissions and tool execution. It runs no relay server and does not import WorkBuddy desktop credentials.

## 0.2.0: structural diagnostics and isolated accounts

- Image-stream failures now report a fixed reason, parse stage, frame size/index, init/result state, termination initiator, observed close and deadline state.
- Native-result diagnostics record only whether `structured_output` exists and its fixed type, result-type validity, a bounded subtype class, and the class/source of known CLI notices. No frame body, raw stderr or arbitrary field names/values are logged.
- Settings and local logs separately count user cancellations, DSH image-offload requests and requested image counts, as well as images already marked offloaded in request history. An offload request does not prove that DSH completed it; diagnostic numbers use bounded integer allowlists.
- This adds diagnosis without relaxing JSONL order, unique-result handling, native Schema, DSH tool validation or rejection boundaries. The original intermittent failure remains unverified without its raw frame.

## CLI network error classification in 0.1.8

- When no valid model result is available and official CLI error text clearly reports a reset connection, failed TLS setup or related 502, the adapter reports `CLI_NETWORK_ERROR` instead of a generic response-format error.
- The user sees a fixed safe message; raw stderr, URLs and credentials are not exposed. The plugin does not change network, proxy or sign-in settings and does not retry automatically.
- The settings guide and bilingual troubleshooting pages explain that classification aids diagnosis but cannot restore connectivity or prove the root cause. All 83 synthetic automated checks pass; this release made no model request and did not reproduce a real network failure.

## Tool-result images in 0.1.7

- Accept image attachments in standard DSH role=tool results from any tool name, provided the message has a valid toolCallId and the image uses a standard DSH content attachment reference. There is no tool-name allowlist; format support does not mean every third-party tool was individually tested.
- Preserve toolCallId, isError and content order. Tool-result images share the attachment API, 5-image/2 MiB/8 MiB budgets, DSH offloading and log privacy handling used for user images. Missing toolCallId fails explicitly; assistant, system and developer images remain unsupported.
- Do not read arbitrary local paths, URLs or raw Base64. Native audio/video, PDF content extraction, image generation and non-standard tool screenshot formats are not adapted. DSH continues to execute business tools.
- Safely handle official CLI image-channel error frames. All 80 synthetic automated checks pass, including mixed images, tool-only screenshots, failure state and log privacy. Actual DSH desktop/browser/third-party screenshot tools and upload UI were not individually verified.

## DSH compatibility from 0.1.6

- Supports DSH 0.2.1-rc.2 and 0.2.1-rc.3 only; other DSH versions are not claimed.

## User-image input carried forward from 0.1.5

- Add image input on top of 0.1.4's native JSON Schema path. Images are enabled only when the live official catalog explicitly marks `supportsImages`.
- DSH attachments are read locally and sent as native image blocks through official CLI stream-json input. Text-only requests keep the JSON output route. CLI business tools remain disabled; DSH manages files, commands and tool execution.
- Limit each request history to 5 retained images, 2 MiB per image and 8 MiB total Base64. The longest edge targets at most 1920 pixels. Unsupported models and exceeded limits fail explicitly rather than silently dropping images.
- Logs exclude image bytes, Base64 and attachment IDs; diagnostics retain only image counts and byte totals. Images already offloaded by DSH are not reread.
- Continue reading `structured_output` only from one unique final record; one CLI invocation does not guarantee one model inference or fixed usage.

**Historical validation scope:** The 0.1.5 release passed 77 synthetic automated checks. On 2026-10-24, the actual adapter and International CLI passed a text control and synthetic 360x240 six-color image recognition using deepseek-v4.1-flash, with no DSH business tools executed. The gpt-5.6-luna text control returned `CLI_OUTPUT_INVALID`; no image was sent. The 0.1.7 tool-result image route was tested with synthetic adapter fixtures, with no new model request and no acceptance test of actual DSH screenshot tools or upload UI. Not all models were verified. Live calls require valid International CLI sign-in and model access.

International and [China](https://github.com/1924225725-collab/dsh-codebuddy-cli-cn) are separate plugins, with distinct provider IDs, region routes and CLI configuration directories. Versioning is independent: the latest repository package is 0.2.0; the historical formal Release is 0.1.8. Versions advance at ten; there will be no 0.1.10.

## Isolated account environments included in 0.2.0 (preview feature)

- Each account gets its own CLI configuration directory and Windows user-directory environment. The user completes official sign-in through a generated PowerShell command and selects **International Site** in the CLI.
- DSH models labelled with an environment stay bound to it when the settings page switches to another environment. Authentication, network, balance or permission failures never rotate accounts or fall back to the default sign-in.
- Isolated accounts are limited to Windows and the verified official npm/Node CodeBuddy CLI `2.174.0`. Native executables, other operating systems and unverified CLI versions fail closed; the default single-account route remains available.
- Per-environment figures are CLI-reported calls/tokens accumulated by the plugin, not official billing or balance. Use the official usage details for account charges.
- Adds fixed classifications for 400 context-limit and 402 insufficient-balance errors, and an aggregate character limit for inline image data URIs. Image content is not written to logs.
- The isolated-account candidate passed 96 automated checks. No second account was signed in, no model request was made, and billing attribution was not tested. See the [account guide](docs/ACCOUNT_GUIDE.en.md).

## Install and sign in

1. Download the `.tgz`, import it through DSH plugin management and enable **CodeBuddy CLI (International)**.
2. Open component `llm-codebuddy-cli-intl` settings and click **Set up CLI**. Existing installations are detected; new installations use the official international installer or official npm package.
3. Copy the sign-in command to PowerShell or Terminal, run `/login`, choose **International Site**, and complete official sign-in.
4. Return to DSH, refresh models/rates and select a model from the international provider. Start with a short prompt before larger tasks.

The default CLI configuration directory is `~/.dsh-codebuddy-cli-intl`; it can be changed in settings. This separates configuration files, but does not guarantee that the official CLI system credential store is isolated. Use the official sign-in flow when switching accounts.

## Troubleshooting and privacy

See the [full guide](docs/USER_GUIDE.en.md). Basic diagnostics retain up to 100 calls in a 2 MiB local file. They exclude request/reply bodies, CLI stderr, credentials and configuration paths, and are never uploaded automatically.

To inspect a raw reply, read the notice and explicitly arm one-failure capture in settings. It is limited to 256 KiB and excludes requests, login files and CLI stderr. Preview and review every detail before sharing; remove private information.

## Interface previews

These interface images show the layout captured from the 0.1.0 settings component; later troubleshooting, diagnostic and native-output status controls are not shown. Model names, rates and status values are fictional and do not represent an account catalog or balance.

![International settings example](docs/images/ui-setup.png)

![Fictional model catalog and rates](docs/images/ui-models.png)

## Flow and limits

![DSH, adapter and official CLI request flow](docs/images/architecture.svg)

The CLI runs locally in its public international environment; the plugin does not call CodeBuddy services directly. Text and images for models that declare image support go through the official CLI; DSH executes tools. Check balances on the official account page. The plugin does not read billing records or convert token counts into credits.

This is a third-party adapter, not an official endorsement or an account-safety guarantee. Model access, available credits and service terms are determined by the official account and service.

## Development

Run `npm test` with Node.js ≥ 22.19.0. Automated checks use a synthetic CLI and fixtures; they need no account and send no model requests. Source and automated tests remain in the repository; the install package excludes tests, research files and logs.
