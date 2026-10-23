# Usage and troubleshooting guide

[简体中文](使用与故障处理指南.md) · [Installation](INSTALL.en.md) · [Home](../README.en.md)

For International 0.1.3. Plugin settings contain an offline-readable troubleshooting summary. This page provides the full guide.

## Check the failure stage before retrying

The adapter converts model replies into DSH text and tool requests. DSH executes files and commands. A failed final reply does not undo tools that completed earlier. Check tool records, actual files and exit codes before retrying.

“No tools were delivered from this result” refers to the failed model response, not the entire multi-step task. Format recovery does not automatically request another model reply or replay tools.

## Symptoms and next steps

| Symptom | When it can occur | What to do |
| --- | --- | --- |
| `ambiguous-json` | One result contains different complete replies/tool plans or unresolved protocol fragments | Do not pick the last plan or merge them. Check completed operations, then use a short fresh conversation with a necessary summary and one clear next action. Capture a raw failure before reporting a recurrence |
| `possibly-truncated-json` | A string or container is unclosed; content may be missing | Split large tasks and reduce single-response code/file volume. Missing content cannot be reliably reconstructed. Verify completed tools first |
| `invalid-json` or field errors | Escapes, quotes, types or the root object violate the protocol | Update the adapter and try a smaller task. Limited text recovery does not repair every syntax error. Keep the error code and diagnostic ID |
| `TOOL_CALL_INVALID` | A tool name is undeclared or arguments are invalid | Confirm the intended DSH tools are enabled and make the request precise. Never substitute a similar tool name and execute it. Include DSH/CLI/plugin versions in the report |
| Final failure after successful command output | A tool completed, but the following summary or next-step response failed | Check output, exit codes and files. If only the summary is missing, explicitly request a summary of existing results without repeating operations |
| Changed quotes, code or backslashes | The model may add/remove escaping or alter literal content | Ask for only the affected small block and compare characters. The adapter never unescapes every valid text field a second time; verify content before executing it |
| `CLI_AUTH_REQUIRED` / 401 | Official CLI sign-in or authorization expired | Copy the sign-in command from settings, run `/login`, choose **International Site**, then verify one short request. The plugin cannot restore account rights or credits |
| `CLI_TIMEOUT` | The total CLI deadline expired, including startup, model processing and process exit | Split the task, check connectivity/service status, and adjust the deadline if needed. A longer deadline cannot resolve conflicting JSON plans |
| Missing file, `grantWrite`, ACL or permission error | Wrong workspace, absent path, or DSH/OS access refusal | Verify the workspace and path in the file manager and follow actual DSH permissions. Do not classify every permission error as model formatting, or change permissions to fix formatting |

## Recovery boundaries

- A unique validated protocol result can be recovered beside clearly unrelated complete annotations/examples.
- Complete results with identical text, ordered tool names and delivered arguments are delivered once. This does not remove repeated operations inside a single plan.
- Raw controls/illegal escapes can be recovered only inside text in a complete object containing exactly text and explicit empty toolCalls. Existing valid JSON escapes keep their meaning.
- Clearly non-protocol plain text can be delivered as text, without inferring tools.

Different plans, missing content, ambiguous fields and invalid tool requests may still fail. No adapter can guarantee recovery of every future model response.

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
