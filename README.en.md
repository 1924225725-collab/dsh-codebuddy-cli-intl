# DSH CodeBuddy CLI (International)

[简体中文](README.md) · **English**

[Download 0.1.4](https://github.com/1924225725-collab/dsh-codebuddy-cli-intl/releases/download/v0.1.4/dsh-codebuddy-cli-intl-0.1.4.tgz) · [Repository fallback](releases/dsh-codebuddy-cli-intl-0.1.4.tgz) · [Installation](docs/INSTALL.en.md) · [Troubleshooting](docs/USER_GUIDE.en.md) · [Changelog](CHANGELOG.md)

Use models available to your international account in DeepSeek Harness (DSH) through the official CodeBuddy CLI running locally. The adapter translates model requests and results; DSH continues to manage conversations, permissions and tool execution. It runs no relay server and does not import WorkBuddy desktop credentials.

## What changed in 0.1.4

- Use native JSON Schema output from the official CLI and read `structured_output` only from a unique final record. DSH still manages conversations and tool execution.
- Validate the exact response shape, DSH tool allowlist and object arguments. Missing output, invalid structures or a non-unique final record fail explicitly; free text and `result` are never fallback sources.
- The adapter starts one CLI process per DSH request, with up to four internal structured-processing rounds. One invocation does not mean one model inference or fixed usage; check official usage details.
- Show native output mode and final-record count in status/diagnostics; retain separate international configuration, timeout/cancellation and log privacy controls.
- All 63 synthetic automated checks pass. The new route has not been live-tested with an international model.

International and [China](https://github.com/1924225725-collab/dsh-codebuddy-cli-cn) are separate plugins, with distinct provider IDs, region routes and CLI configuration directories. Versioning is independent: the current release is 0.1.4. After 0.1.9, the next version will be 0.2.0; there will be no 0.1.10.

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

The CLI runs locally in its public international environment; the plugin does not call CodeBuddy services directly. Text input is supported, and DSH executes tools. Check balances on the official account page. The plugin does not read billing records or convert token counts into credits.

This is a third-party adapter, not an official endorsement or an account-safety guarantee. Model access, available credits and service terms are determined by the official account and service.

## Development

Run `npm test` with Node.js ≥ 22.19.0. Automated checks use a synthetic CLI and fixtures; they need no account and send no model requests. Source and automated tests remain in the repository; the install package excludes tests, research files and logs.
