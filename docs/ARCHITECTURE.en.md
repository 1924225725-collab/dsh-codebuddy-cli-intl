# Architecture

DSH supplies history/tool schemas → local adapter builds an envelope → official CLI --print --output-format json calls the international service → local response validation → text/tool requests return to DSH.

DSH executes tools under its permissions and returns results in the next round. Native CLI tools, MCP and session persistence are disabled. Unknown tools, damaged arguments and incomplete/conflicting results are rejected without guessed repairs or additional model requests.

The plugin does not expose a general-purpose model HTTP service. Local status routes serve settings. Official CLI owns authentication and remote requests. Provider IDs, configuration files and installation directories differ from the China plugin; system credential storage is controlled by the official CLI.
