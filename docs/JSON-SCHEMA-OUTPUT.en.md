# Native JSON Schema output from the international CLI (0.1.6)

[简体中文](JSON-SCHEMA-OUTPUT.md) · [Home](../README.en.md)

This note describes the International 0.1.6 implementation carried forward from 0.1.5. Image requests use stream-json for both input and output while text-only requests retain JSON output. The official documentation describes these modes separately, so their combined behavior must be verified against the installed CLI and account. An actual adapter call with a synthetic six-color image passed on 2026-10-24 with deepseek-v4.1-flash; other models and the DSH upload UI remain unverified.

## Request path

The adapter asks the official CLI for constrained output with `--output-format json` and `--json-schema`, enabling `StructuredOutput` as the only CLI built-in tool. It reads `structured_output` only from a unique final result record. The official headless-mode documentation describes that field; the official tool reference describes `StructuredOutput` as the JSON Schema output tool.

- [CodeBuddy International Headless Mode](https://www.codebuddy.ai/docs/cli/headless)
- [CodeBuddy International Tools Reference](https://www.codebuddy.ai/docs/cli/tools-reference)

CLI business tools for files, commands and network access remain disabled, as does MCP. The adapter sends DSH conversation history and tool schemas to the CLI. If the model requests a DSH tool, it must return the exact name and arguments through `toolCalls`. DSH remains responsible for allowlisting, object-argument checks, permissions, execution and adding results/errors to later history.

## Failure boundaries

The plugin accepts only `structured_output` from a unique final result record and requires exactly the top-level fields `text` and `toolCalls`. Each tool request must be an exact `{ name, arguments }` object, with arguments represented as a JSON object. Missing fields, CLI request failures, malformed structures, or zero or multiple final records fail explicitly. Even identical duplicate records are rejected. The adapter never guesses a substitute from free text or `result`, and never chooses the last record. Repeated DSH calls inside one plan remain in order.

The adapter starts one CLI process per DSH request. It does not append an automatic model-repair request after a schema-output failure or replay completed tool calls. The CLI is limited to four internal structured-processing turns, and the configured overall timeout and user cancellation signal remain active. Those internal rounds may involve additional model processing, so one CLI invocation does not mean one model inference or fixed usage. Official token and credit details are authoritative. Timeouts, authentication, account limits, model refusals and incomplete structures may still fail.

Diagnostics retain the existing privacy controls: basic logs omit conversation bodies; raw reply capture is off until the user explicitly arms the next eligible failure. Logs are not uploaded automatically.

Image requests require `supportsImages` in the live model catalog. The plugin obtains bounded local image data through DSH's attachment service and sends native stream-json image blocks. `StructuredOutput` remains the only enabled CLI tool; DSH continues to execute files, commands and other business tools. Image bytes, Base64 and attachment IDs are excluded from diagnostics. See [image input details](IMAGE-INPUT.en.md).

## Validation scope

Automated regression covers native structured-result extraction, missing fields and CLI errors, zero/multiple final records, DSH tool allowlisting and object arguments, tool continuation, timeout, cancellation, log privacy and diagnostic IDs. The image path uses a synthetic CLI for input, boundary and result-processing checks. Tests with the China CLI do not prove that every international model behaves the same way. This release makes no such guarantee.
