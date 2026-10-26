# Installation and usage (International 0.2.0)

[简体中文](安装教程.md) · [Home](../README.en.md) · [Troubleshooting](USER_GUIDE.en.md)

Version 0.2.0 is available from the repository and includes structural diagnostics and isolated accounts as a preview feature. Real two-account sign-in, refresh and billing attribution remain unverified; see the [account guide](ACCOUNT_GUIDE.en.md).

Compatibility is declared for DSH **0.2.1-rc.2** and **0.2.1-rc.3** only; other DSH versions are not claimed.

1. Download the [International 0.2.0 package](https://raw.githubusercontent.com/1924225725-collab/dsh-codebuddy-cli-intl/main/releases/dsh-codebuddy-cli-intl-0.2.0.tgz) and import the `.tgz` through DSH plugin management. Do not import GitHub's source ZIP.
2. Enable `dsh-codebuddy-cli-intl` and open component `llm-codebuddy-cli-intl` settings. If the page is missing, confirm the plugin is enabled and restart DSH.
3. Click **Set up CLI**. Existing installations are checked first; otherwise the official international installer or official npm package is used. The setup does not read or import WorkBuddy desktop credentials.
4. Copy the sign-in command from settings into PowerShell (Terminal on macOS/Linux). Run the CLI, enter `/login`, choose **International Site**, and wait for the CLI to confirm sign-in.
5. Return to DSH, refresh models/rates and select a model from the international provider. Start with a short prompt in a new conversation and expand the task gradually.

After installation, confirm running version 0.2.0 in settings.

Since 0.1.7, standard DSH tool-result image attachments are accepted when a toolCallId is present; see [image-input scope](IMAGE-INPUT.en.md) for model and format limits. Version 0.1.8 safely classifies known CLI network/TLS errors; it cannot repair connectivity or retry automatically. The declared DSH compatibility range remains 0.2.1-rc.2 and 0.2.1-rc.3 only.

The default CLI configuration directory is `~/.dsh-codebuddy-cli-intl` and can be changed in settings. It separates configuration files but does not guarantee isolation of the official CLI system credential store. Use the official sign-in flow when switching accounts.

## Troubleshooting

- **CLI_NOT_FOUND**: run setup again or enter the actual executable path on this computer.
- **The CLI version check passes but model calls fail**: check sign-in, model access, network and credits. The version check only confirms that the executable starts.
- **CLI_AUTH_REQUIRED**: run `/login`, choose **International Site**, complete sign-in and refresh models.
- **CLI_TIMEOUT**: split the task and check connectivity before increasing the per-call deadline. More time does not fix authentication or conflicting results.
- **Image JSONL stream failure**: the 0.2.0 preview shows a fixed stream reason, phase, frame position/size, init/result state and process-close facts. Logs exclude image frames and raw stderr. These fields distinguish adapter rejection paths but do not prove a CLI or model root cause.
- **Missing `structured_output` or non-unique final records**: open **Troubleshooting and usage guide** in settings. Confirm the CLI/model supports native structured output and check completed DSH tools before retrying.

The **Diagnostic logs and feedback** section provides local log viewing, basic export and clearing. Basic logs exclude conversation bodies. To retain a failed raw reply, read the privacy notice and explicitly arm one-failure capture; preview and remove private information before sharing. See the [full guide](USER_GUIDE.en.md).

Text input is supported; DSH manages tool execution. The adapter starts one CLI process per request, with up to four structured-processing rounds inside the CLI, so one CLI invocation does not mean one model inference. Model access, account credits and service status are determined by the official provider. Check remaining credits on the official account page.

Image input is available only for models explicitly marked as image-capable in the live catalog. DSH's attachment service reads images, which are sent using the CLI's native stream-json image blocks. Each request history is limited to 5 retained images, 2 MiB per image and 8 MiB total Base64. Unsupported models and exceeded limits fail explicitly. See [image input details](IMAGE-INPUT.en.md).
