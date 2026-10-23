# 更新记录 / Changelog

## [0.1.4](https://github.com/1924225725-collab/dsh-codebuddy-cli-intl/releases/tag/v0.1.4)

- 将模型响应改为官方 CLI `--json-schema` 与 `StructuredOutput` 路线，只读取唯一最终结果记录的 `structured_output`。CLI 业务工具关闭，MCP 配置为空；DSH 继续负责工具执行。
- 严格校验 `{ text, toolCalls }` 和对象型工具参数。缺少结构结果、结构无效、CLI 报错或最终结果记录不是唯一一条时明确失败；相同内容的多条最终记录也不合并。单份计划内部的重复工具调用按原顺序保留。
- 适配器每个请求只启动一次 CLI，不会自动追加修复请求或重放已完成工具；CLI 内部最多 4 轮结构化处理。一次 CLI 调用不保证一次模型推理或固定用量，实际消耗以官方明细为准。
- 配置页和基础日志标明 `native-json-schema` 输出模式与最终记录数；保留 CLI 进程诊断、超时、取消、日志隐私和国际版独立配置/登录。
- 63 项合成自动检查通过。本版未使用国际版真实模型验证新的结构化输出路线；国内版测试不作为国际模型验证证据。

- Move model responses to the official CLI `--json-schema` and `StructuredOutput` route, consuming `structured_output` only from a unique final result record. CLI business tools stay disabled and MCP is empty; DSH continues to execute tools.
- Strictly validate `{ text, toolCalls }` and object-valued tool arguments. Missing native output, invalid structures, CLI errors or any non-unique final-record count fail explicitly; identical duplicate records are not merged. Repeated calls inside one plan remain in order.
- The adapter starts one CLI process per request and does not append a repair request or replay completed tools. The CLI may use up to four internal structured-processing rounds. One CLI invocation does not guarantee one model inference or fixed usage; official usage details are authoritative.
- Show `native-json-schema` mode and final-record count in status/diagnostics; retain process diagnostics, timeout, cancellation, log privacy and separate international configuration/sign-in.
- All 63 synthetic automated checks pass. This release did not live-test the new structured-output route with an international model; China-version tests are not evidence of international model behavior.

## [0.1.3](https://github.com/1924225725-collab/dsh-codebuddy-cli-intl/tree/v0.1.3)

- 按国内版 0.3.0 的通用修复逐项对照移植，保留国际 CLI 的 `public` 环境、International Site 登录、`codebuddy.ai` 服务入口、独立配置目录、插件 ID 与本机日志目录。
- 多个完整协议结果只有在交付文字及有序工具名称/最终参数完全一致时才去重为一份；不选择最后方案、不合并冲突，也不删除单一计划内部的重复调用。
- 文字转义恢复仅适用于完整且恰好包含 `text` 与空 `toolCalls` 的对象；不补全结构或修复工具参数。未闭合输出、冲突方案和无效工具请求继续失败。
- 兼容明确无工具的纯文字与无关完整示例；保留扫描诊断。失败时不部分交付、不自动追加模型修复请求，也不重跑已完成工具。
- 分类 CLI 空输出、401 鉴权、固定权限和限流提示；保留 DSH 机器错误码、diagnostic-id 和工具结果 `isError`。完成的 CLI 调用及时释放活动计数。
- 主动取消 `ABORTED` 不消耗已开启的一次失败回复采集。普通日志不含正文；详细样本仍需手动开启、预览并在分享前检查。
- 设置页增加中英故障处理指南。55 项合成自动检查通过；本版没有新增真实账号或模型请求验证。

This release selectively ports the region-neutral fixes compared with China 0.3.0 while retaining the international CLI's public environment, International Site sign-in, `codebuddy.ai` service route, separate profile, plugin identity and local log directory.
- Identical complete protocol results are deduplicated only when delivered text and ordered tool names/final arguments match exactly. Conflicts are never selected or merged; repeated calls inside one plan remain intact.
- Text escape recovery is limited to complete objects containing exactly `text` and empty `toolCalls`. It does not invent structure or repair tool arguments. Incomplete output, conflicting plans and invalid tools still fail.
- Support clear tool-free plain text and unrelated complete examples with scan diagnostics. Failures never partially deliver tools, request an automatic model repair or replay completed tools.
- Classify empty CLI output, 401 sign-in, fixed permission and rate-limit notices. Preserve DSH error codes, diagnostic IDs and tool-result `isError`; release completed request counts promptly.
- User-aborted `ABORTED` requests do not consume armed failure capture. Basic logs exclude reply bodies; detailed samples remain opt-in and require review before sharing.
- Add bilingual in-settings troubleshooting. All 55 synthetic automated checks pass; no new live account or model requests were made for this release.

International versioning is independent. Releases advance through 0.1.9 and then continue at 0.2.0; no 0.1.10 release will be created.

## 0.1.0

首次国际版独立发布，基于已验证的 0.1.0-alpha.1 适配器。包含官方 CLI 国际站登录与 `public` 区域调用、动态模型目录和倍率、一键配置、独立 CLI 配置目录、中英设置页、DSH 工具续接及 Token 统计。旧安装包保留在对应历史版本中。

First independent international release, prepared from the verified 0.1.0-alpha.1 adapter. Includes official CLI international sign-in and public routing, dynamic model/rate discovery, one-click setup, a separate CLI profile, bilingual settings, DSH tool continuation and token statistics. The original package remains available in its historical release.
