# Usage and troubleshooting guide

[简体中文](使用与故障处理指南.md) · [Installation](INSTALL.en.md) · [Home](../README.en.md)

For International 0.1.6. Plugin settings contain an offline-readable troubleshooting summary. This page provides the full guide.

## Check the failure stage before retrying

The adapter converts model replies into DSH text and tool requests. DSH executes files and commands. A failed final reply does not undo tools that completed earlier. Check tool records, actual files and exit codes before retrying.

“No tools were delivered from this result” refers to the failed model response, not the entire multi-step task. Format recovery does not automatically request another model reply or replay tools.

## Symptoms and next steps

| Symptom | When it can occur | What to do |
| --- | --- | --- |
| `native-final-results` | The CLI returned zero or multiple final result records, including identical duplicates | Do not pick the last record or merge them. Check completed operations, then use a short fresh conversation with a necessary summary and one clear next action. Capture a raw failure before reporting a recurrence |
| `CLI_STRUCTURED_OUTPUT_MISSING` | The CLI did not return the official `structured_output` field | Check the international CLI, account and model support for this output. The adapter does not substitute free text or `result`. Verify completed tools before retrying a smaller request |
| `invalid-json` or field errors | CLI JSON is invalid or native object fields do not match the protocol | Keep the error code and diagnostic ID. Native structured objects are not scanned, escape-repaired or completed from text. Verify completed tools first |
| `TOOL_CALL_INVALID` | A tool name is undeclared or arguments are invalid | Confirm the intended DSH tools are enabled and make the request precise. Never substitute a similar tool name and execute it. Include DSH/CLI/plugin versions in the report |
| Final failure after successful command output | A tool completed, but the following summary or next-step response failed | Check output, exit codes and files. If only the summary is missing, explicitly request a summary of existing results without repeating operations |
| Changed quotes, code or backslashes | The model may add/remove escaping or alter literal content | Ask for only the affected small block and compare characters. The adapter never unescapes every valid text field a second time; verify content before executing it |
| `CLI_AUTH_REQUIRED` / 401 | Official CLI sign-in or authorization expired | Copy the sign-in command from settings, run `/login`, choose **International Site**, then verify one short request. The plugin cannot restore account rights or credits |
| `CLI_TIMEOUT` | The total CLI deadline expired, including startup, model processing and process exit | Split the task, check connectivity/service status, and adjust the deadline if needed. A longer deadline cannot resolve conflicting JSON plans |
| `IMAGE_MODEL_UNSUPPORTED` | The selected model is not explicitly marked image-capable by the catalog | Refresh the catalog and choose a model marked image-capable. Undeclared support fails explicitly; the image is not silently dropped |
| `IMAGE_OFFLOAD_REQUIRED` or `IMAGE_TOO_LARGE` | Image count, aggregate Base64 or a converted image exceeds the adapter limit | Reduce or resize images; start a shorter conversation if needed. Images already offloaded by DSH are not resent |
| `IMAGE_READ_FAILED` or `IMAGE_SERVICE_UNAVAILABLE` | DSH cannot provide the requested image variant, or image reading is unavailable in this DSH build | Check that the image remains in the conversation, update DSH's attachment package and upload again. Partial image requests are never sent |
| Missing file, `grantWrite`, ACL or permission error | Wrong workspace, absent path, or DSH/OS access refusal | Verify the workspace and path in the file manager and follow actual DSH permissions. Do not classify every permission error as model formatting, or change permissions to fix formatting |

## Native structured-output boundary

The adapter starts one CLI process for each DSH request and reads only `structured_output` from a unique final result record. The top-level object must contain exactly `text` and `toolCalls`. Missing fields, invalid shapes, undeclared tools, non-object arguments, or zero/multiple final records fail explicitly. Identical duplicate records are not deduplicated or selected. Repeated calls inside one valid plan remain in order.

Image requests are enabled only when the live model catalog declares `supportsImages`; they use native CLI stream-json image blocks. Text-only requests keep the current JSON output route. Each request history is bounded to 5 retained images, 2 MiB per image and 8 MiB total Base64, with a 1920-pixel target longest edge. Image content and attachment IDs are excluded from logs. See [image input details](IMAGE-INPUT.en.md).

`--max-turns 4` bounds structured-processing rounds inside the CLI. One CLI start does not guarantee exactly one model inference or fixed usage; official usage details are authoritative. The adapter does not append a repair request or replay completed DSH tools.

## Reducing failures in long conversations

Large histories mix code, tool output, old instructions and previous errors. They may make protocol adherence harder, but are not a proven cause of every failure. For repeated failures, start a fresh conversation with an accurate short summary: completed work, relevant paths, operations that must not be repeated, and one next action.

Use small batches and read/edit long files in bounded steps. These practices reduce pressure without promising that a particular model will never fail.

## Useful diagnostics

1. Open plugin `dsh-codebuddy-cli-intl`, component `llm-codebuddy-cli-intl`, and find **Diagnostic logs and feedback**. Record the running version.
2. Export basic logs with the full error, diagnostic ID, time, model/effort and reproduction steps. Basic logs exclude chat/reply bodies.
3. When a raw result is necessary, read the notice and arm **Capture next failed reply** before reproducing. Earlier raw replies cannot be recovered retroactively.
4. Successes and user-aborted tasks preserve capture. The next non-user-aborted failure consumes it; cancelling capture, clearing logs or restarting disables it. Startup/sign-in errors without a model body may have no detailed sample.
5. Preview and review every exported sample, removing private information before sharing. Raw samples are capped at 256 KiB with both ends retained if truncated; a truncated sample is not a complete original reply. Logs are never uploaded automatically.

For international CLI sign-in, select **International Site** in the official login menu. Retain necessary diagnostics before retrying. One later success does not establish the cause of the original failure.
