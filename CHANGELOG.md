# 更新记录 / Changelog

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
