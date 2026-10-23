# 国际 CLI 原生 JSON Schema 输出（0.1.4）

[English](JSON-SCHEMA-OUTPUT.en.md) · [返回首页](../README.md)

本页说明国际版 0.1.4 的实现路线。国内 CLI 的验证不代表国际模型已完成真实调用验证；本版没有使用国际版真实模型验证新的结构化输出路线。

## 调用路线

适配器通过官方 CLI 的 `--output-format json` 与 `--json-schema` 请求受约束结果，并将 `StructuredOutput` 作为唯一允许的 CLI 内置工具。插件只读取唯一最终结果记录中的 `structured_output` 字段。官方无头模式文档说明了 `structured_output` 字段；官方工具参考将 `StructuredOutput` 描述为返回 JSON Schema 结果的工具。

- [CodeBuddy 国际版无头模式文档](https://www.codebuddy.ai/docs/cli/headless)
- [CodeBuddy 国际版工具参考](https://www.codebuddy.ai/docs/cli/tools-reference)

文件、命令、网络等 CLI 业务工具和 MCP 不开放。适配器将 DSH 对话历史与工具 schema 传给 CLI；模型若要调用 DSH 工具，只能按输出 schema 在 `toolCalls` 中提出名称与参数。DSH 仍负责白名单检查、参数对象检查、权限控制、工具执行和把结果/错误加入后续历史。

## 失败边界

插件只接受唯一最终结果记录中的官方 `structured_output` 对象，并严格要求顶层只有 `text` 和 `toolCalls` 两个字段，工具请求也必须是精确的 `{ name, arguments }` 对象且参数为 JSON 对象。字段缺失、CLI 请求失败、结构错误或最终结果记录为零条/多条时，本轮明确失败；即使重复记录内容相同也不会合并。插件不会从自由文本或 `result` 字段猜测替代结果，也不会选取“最后一份”。单个计划中重复出现的工具调用仍按原顺序保留。

适配器每个 DSH 请求只启动一个 CLI 进程，不会因输出失败而自动追加模型修复请求，也不会把已完成工具调用重放。CLI 内部最多允许 4 个结构化处理轮次，并保留配置中的整体超时与用户取消信号。CLI 内部轮次可能涉及额外模型处理，因此“一次 CLI 调用”不能理解为“一次模型推理”或固定消耗；Token 与积分消耗以官方用量明细为准。超时、鉴权、额度、模型拒绝或结构不完整仍可能导致失败。

详细诊断仍遵循现有隐私设置：基础日志不保存对话正文；原始回复采集默认关闭，仅在用户手动开启后采集下一次适用失败。诊断记录不自动上传。

## 验证范围

自动回归覆盖官方结构结果读取、缺字段与 CLI 错误、零条/多条最终记录、DSH 工具白名单与参数对象、工具续接、超时、取消、日志隐私和诊断 ID。国内 CLI 的合成样例不能证明国际 CLI 所有模型均支持相同输出行为。本版不作这种保证。
