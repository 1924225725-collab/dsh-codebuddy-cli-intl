# DSH CodeBuddy CLI (International)

[简体中文](README.md) · **English**

[Download 0.1.0](releases/dsh-codebuddy-cli-intl-0.1.0.tgz) · [Installation](docs/INSTALL.en.md) · [Architecture](docs/ARCHITECTURE.en.md) · [Validation](docs/验证与限制.md) · [Changelog](CHANGELOG.md)

Use models available to your international account in DeepSeek Harness through the local official CodeBuddy CLI. DSH manages conversations, permissions and tool execution. The author runs no relay server and imports no WorkBuddy desktop credentials.

## Independent versions

International and [China](https://github.com/1924225725-collab/dsh-codebuddy-cli-cn) are separate plugins and repositories. This first release is 0.1.0, preserving the verified adapter based on China 0.2.4. It excludes the China 0.2.5 logging/multi-fragment additions. That synchronization is paused; the next international update is reserved for 0.3.0 and is not released.

## Features

- Discover current international models and credit multipliers through ACP, without a fixed allowlist. Refresh every 15 minutes or manually.
- Find or install the official CLI using current-user paths.
- Convert DSH history and tool schemas into a headless CLI request; validate responses locally and return tools to DSH.
- Display cumulative and per-call usage, cache counters and basic error summaries. Remaining credits are checked on the official site.

## Interface previews

Actual 0.1.0 settings component, with labeled fictional state/models/rates. These are layout previews, not account screenshots or an official catalog.

![International settings with example data](docs/images/ui-setup.png)

![Fictional model catalog and rates](docs/images/ui-models.png)

## Quick start

1. Download the .tgz and import it through DSH plugin management. The source ZIP is not an installable plugin package.
2. Enable dsh-codebuddy-cli-intl, then open the llm-codebuddy-cli-intl component configuration page.
3. Run automatic CLI setup. Copy the sign-in command to PowerShell or Terminal, run /login and choose **International Site**. Wait for CLI confirmation after browser login.
4. Refresh models/rates and select a model in DSH. Start with a short prompt in a new conversation.

Default configuration directory: ~/.dsh-codebuddy-cli-intl. Existing alpha users can retain their configured directory. File separation does not guarantee isolation of the CLI system credential store. Do not replace international authentication with a China route.

## Validation and limits

34 synthetic checks pass. Earlier Windows x64 tests with official CLI 2.172.1 verified a real international response and two adapter rounds with a synthetic host tool result. The user confirmed corresponding usage in the same international WorkBuddy account. No billing records or desktop credentials were collected.

Installed DSH file-tool acceptance, every model/account/plan, and physical macOS/Linux flows remain unverified. Only text inputs are supported; complete JSON delivery does not expose true decoding speed. This third-party integration is not an official endorsement or an account-safety guarantee.

![Request and tool flow](docs/images/architecture.svg)

## Development

npm test uses synthetic fixtures without credentials or model calls. Node.js ≥22.19.0; peer dependencies are listed in package.json.
