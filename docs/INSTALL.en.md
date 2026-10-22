# Installation: International 0.1.0

[简体中文](安装教程.md) · [Home](../README.en.md)

Download the [0.1.0 .tgz](../releases/dsh-codebuddy-cli-intl-0.1.0.tgz), import it through DSH Plugins, enable dsh-codebuddy-cli-intl, and open component llm-codebuddy-cli-intl settings. The source ZIP is not an installable package.

Click Set up CLI, copy the sign-in command into PowerShell/Terminal, run /login and choose **International Site**. Wait for CLI confirmation after browser login. Refresh models and rates, then select an international model in a new DSH conversation.

The default configuration directory is ~/.dsh-codebuddy-cli-intl. Existing alpha users can keep their configured directory. File separation does not guarantee isolation of the official CLI system credential store. Do not paste tokens/cookies/passwords into plugin settings or copy developer-specific paths.

Executable checks do not verify authentication or real requests. For timeouts, first test a short prompt; extending the deadline to 300000–600000 ms cannot fix authentication/network problems. Catalog visibility is not proof of model permission. Tokens are not billed credits. Check the official account center for remaining credits.

Version 0.1.0 does not include the paused China 0.2.5 persistent/detailed logging additions. For issue reports include plugin/DSH/CLI versions, model, error code and reproduction steps; exclude credentials and private conversations.
