# Architecture

DSH supplies history/tool schemas → local adapter builds a constrained prompt and JSON Schema → official CLI `--print --output-format json --json-schema … --tools StructuredOutput` calls the international service → the adapter validates `structured_output` → text/DSH-tool requests return to DSH.

`StructuredOutput` is the only enabled CLI built-in tool and is used only to submit the schema-constrained result. Business tools such as filesystem, shell and network tools, plus MCP, remain disabled. The CLI's structured processing rounds are bounded; the configured request timeout and cancellation signal remain active.

The adapter reads `structured_output` only from a unique final result record, then strictly validates the `{ text, toolCalls }` object. It never substitutes the free-form `result`, scans text, or falls back to the old protocol. Missing fields, invalid shapes or any non-unique final-record count fail explicitly, including identical duplicate records. Repeated DSH tool calls inside a single structured plan remain in order. No automatic model-repair request or replay of completed tools is made.

The adapter starts one CLI process per DSH request. `--max-turns 4` bounds structured processing rounds inside the CLI; it does not guarantee one model inference or fixed usage per request. The official usage details remain authoritative. The configured overall timeout and cancellation signal remain active.

The adapter retains DSH tool-name allowlisting and object-argument checks. DSH executes tools under its permissions and returns results/errors in later history. The plugin does not expose a general-purpose model HTTP service. Official CLI owns authentication and remote requests. Provider IDs, configuration and log directories remain separate from the China plugin.

Images in standard tool results preserve toolCallId and isError and are projected in DSH history order alongside user images. Tool names are not allowlisted; a tool must return a standard DSH attachment reference. The adapter does not read paths, URLs or Base64 returned as ordinary text.
