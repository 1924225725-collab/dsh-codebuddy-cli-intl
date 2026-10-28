# Installation and usage (International 0.2.2)

[简体中文](安装教程.md) · [Home](../README.en.md) · [Troubleshooting](USER_GUIDE.en.md)

The International 0.2.2 package is distributed from the GitHub repository's `main/releases/` directory, without creating a new formal Release or tag; the latest formal Release remains v0.1.8. Version 0.2.0 was previously distributed from the repository. Version 0.2.1 was an intermediate candidate and was not distributed independently; its diagnostic changes are included in 0.2.2. The 0.1.9 isolated-account feature still has unverified areas; see the [account guide](ACCOUNT_GUIDE.en.md).

Compatibility is declared for DSH **0.2.1-rc.2** and **0.2.1-rc.3** only; other DSH versions are not claimed.

1. Download the [International 0.2.2 package](https://raw.githubusercontent.com/1924225725-collab/dsh-codebuddy-cli-intl/main/releases/dsh-codebuddy-cli-intl-0.2.2.tgz) (repository [relative-path fallback](../releases/dsh-codebuddy-cli-intl-0.2.2.tgz)) and import the `.tgz` through DSH plugin management. Do not import GitHub's source ZIP.
2. Enable `dsh-codebuddy-cli-intl` and open component `llm-codebuddy-cli-intl` settings. If the page is missing, confirm the plugin is enabled and restart DSH.
3. Click **Set up CLI**. Existing installations are checked first; otherwise the official international installer or official npm package is used. The setup does not read or import WorkBuddy desktop credentials.
4. Copy the sign-in command from settings into PowerShell (Terminal on macOS/Linux). Run the CLI, enter `/login`, choose **International Site**, and wait for the CLI to confirm sign-in.
5. Return to DSH, refresh models/rates and select a model from the international provider. Start with a short prompt in a new conversation and expand the task gradually.

Version 0.2.1 was not distributed independently; do not look for or install a 0.2.1 package. Version 0.2.2 includes its tool-turn and request-size diagnostic updates. The previously distributed 0.2.0 package is retained unchanged.

Since 0.1.7, standard DSH tool-result image attachments are accepted when a toolCallId is present; see [image-input scope](IMAGE-INPUT.en.md) for model and format limits. Version 0.1.8 safely classifies known CLI network/TLS errors; it cannot repair connectivity or retry automatically. The declared DSH compatibility range remains 0.2.1-rc.2 and 0.2.1-rc.3 only.

The default CLI configuration directory is `~/.dsh-codebuddy-cli-intl` and can be changed in settings. It separates configuration files but does not guarantee isolation of the official CLI system credential store. Use the official sign-in flow when switching accounts.

## Troubleshooting

- **CLI_NOT_FOUND**: run setup again or enter the actual executable path on this computer.
- **The CLI version check passes but model calls fail**: check sign-in, model access, network and credits. The version check only confirms that the executable starts.
- **CLI_AUTH_REQUIRED**: run `/login`, choose **International Site**, complete sign-in and refresh models.
- **CLI_TIMEOUT**: split the task and check connectivity before increasing the per-call deadline. More time does not fix authentication or conflicting results.
- **REQUEST_TOO_LARGE**: check the local stage, actual UTF-8 bytes and limit in settings or basic logs. The International plugin keeps a 12 MiB text-envelope limit and a 24 MiB final stream-json input limit in image mode. This local refusal differs from an upstream context error (400). The adapter does not delete history, drop images, truncate schemas or retry automatically.
- **Image JSONL stream failure**: previews since 0.2.0 show a fixed stream reason, phase, frame position/size, init/result state and process-close facts. Logs exclude image frames and raw stderr. These fields distinguish adapter rejection paths but do not prove a CLI or model root cause.
- **Missing `structured_output` or non-unique final records**: open **Troubleshooting and usage guide** in settings. Confirm the CLI/model supports native structured output and check completed DSH tools before retrying.

The **Diagnostic logs and feedback** section provides local log viewing, basic export and clearing. Basic logs exclude conversation bodies. To retain a failed raw reply, read the privacy notice and explicitly arm one-failure capture; preview and remove private information before sharing. See the [full guide](USER_GUIDE.en.md).

Text input is supported; DSH manages tool execution. The adapter starts one CLI process per request, with up to four structured-processing rounds inside the CLI, so one CLI invocation does not mean one model inference. Model access, account credits and service status are determined by the official provider. Check remaining credits on the official account page.

Image input is available only for models explicitly marked as image-capable in the live catalog. DSH's attachment service reads images, which are sent using the CLI's native stream-json image blocks. Each request history is limited to 5 retained images, 2 MiB per image and 8 MiB total Base64. Unsupported models and exceeded limits fail explicitly. See [image input details](IMAGE-INPUT.en.md).
