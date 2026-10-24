# 图片输入（国际版 0.1.5）

[English](IMAGE-INPUT.en.md) · [返回首页](../README.md)

## 支持范围

图片输入只对官方 CLI 动态模型目录明确标记 `supportsImages` 的模型开启。设置页“可用模型与积分倍率”增加“图片输入”栏：显示“官方目录声明支持”时才会发送图片；显示“目录未声明”时插件会拒绝图片请求。目录未声明不等于官方模型能力判断，只表示本插件不会猜测。

支持的附件格式为 PNG、JPEG、WebP 和 GIF。插件通过 DSH `ctx.attachments.readImageRequest` 读取本机附件，并请求适配后的图片尺寸和编码大小。图片作为官方 CLI stream-json 输入中的原生 `image` block 发送，不会转成普通文本或公网链接。文本请求仍沿用 CLI 的 JSON 输出方式；含图片请求才改用 stream-json 输入和输出，再从唯一最终结果读取原生 `structured_output`。CLI 中只启用 `StructuredOutput`，业务工具仍由 DSH 执行。

官方文档分别描述 stream-json 图片输入和 `--json-schema` 结构化结果，没有说明两者组合对所有 CLI/模型版本都可用。因此这属于适配器实现，实际可用性仍需在目标 CLI 版本和账号上验证。

## 本插件的请求限制

- 每次 DSH 请求所带的保留历史最多 5 张图片；已由 DSH 卸载的旧图片不重新读取，也不推断其内容。
- 单张图片请求版本不超过 2 MiB；所有图片 Base64 合计不超过 8 MiB；图像请求目标最长边不超过 1920 像素。
- 图片、附件 ID 和 Base64 不写入诊断日志。普通日志只记图片数量、原始请求字节数与 Base64 字节数。
- 取消、读取失败、格式不支持、模型能力未声明或预算超限时，本次请求失败，不发送部分图片内容。

这些限制是插件自身的保护值，不代表官方服务的最大输入值或额度承诺。图片模型的真实能力、处理方式、服务权限和费用由官方决定。

## 验证范围

77 项合成自动检查通过，使用合成附件和假 CLI，覆盖原生 image block、图片顺序、多图历史、模型能力检查、超限失败、取消、工具计划续接和诊断隐私，不产生真实模型用量。

本版真实联调使用既有国际 CLI 配置运行纯文本原生 Schema 对照：`gpt-5.6-luna` 和 `deepseek-v4.1-flash` 均返回 `CLI_AUTH_REQUIRED`（401），因此没有发送图片请求，国际站真实识图仍未验证。此前因相对路径指向错误配置目录而产生的超时，以及一次未核实 CLI 错误状态和识图内容的裸图片调用，不计入验证；国内版结果也不能替代国际版。模型目录声明支持图片不代表当前账号已有模型权限。本版没有验证所有模型或 DSH 界面上传流程；真实调用需有效的国际 CLI 登录和模型权限。

参考：

- [CodeBuddy CLI 无头模式：stream-json 输入、图片消息和 JSON Schema 输出](https://www.codebuddy.ai/docs/cli/headless)
- [DSH 附件服务 API](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/attachment/attachment/src/index.ts)
- [DSH 附件和 ImageRequestTarget 类型](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/attachment/attachment/src/types.ts)
