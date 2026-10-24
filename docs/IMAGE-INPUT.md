# 图片输入（国际版 0.1.7）

[English](IMAGE-INPUT.en.md) · [返回首页](../README.md)

## 支持范围

用户消息图片和工具结果图片只对官方 CLI 动态模型目录明确标记 `supportsImages` 的模型开启。设置页“可用模型与积分倍率”增加“图片输入”栏：显示“官方目录声明支持”时才会发送图片；显示“目录未声明”时插件会拒绝图片请求。目录未声明不等于官方模型能力判断，只表示本插件不会猜测。

工具截图没有工具名白名单。任何 DSH 工具都可以提供图片，只要其模型可见结果是标准 `role: "tool"` 消息、带非空 `toolCallId`，并在 content 中用标准 ImageAttachmentRef 图片块返回。插件保留 `toolCallId`、`isError` 和内容顺序；工具图与用户上传图片共用处理流程。缺少工具调用 ID 会以 `IMAGE_TOOL_CALL_INVALID` 明确失败。assistant、system 和 developer 消息中的图片仍不支持。

支持的附件格式为 PNG、JPEG、WebP 和 GIF。用户图片和工具结果图片都只通过 DSH `ctx.attachments.readImageRequest` 读取本机附件，并请求适配后的图片尺寸和编码大小；不会读取任意本地路径、URL 或裸 Base64。图片作为官方 CLI stream-json 输入中的原生 `image` block 发送，不会转成普通文本或公网链接。文本请求仍沿用 CLI 的 JSON 输出方式；含图片请求才改用 stream-json 输入和输出，再从唯一最终结果读取原生 `structured_output`。CLI 中只启用 `StructuredOutput`，业务工具仍由 DSH 执行。

官方文档分别描述 stream-json 图片输入和 `--json-schema` 结构化结果，没有说明两者组合对所有 CLI/模型版本都可用。因此这属于适配器实现，实际可用性仍需在目标 CLI 版本和账号上验证。

2026-10-24 的构建后验证使用实际适配器、国际 CLI 与 deepseek-v4.1-flash，识别合成 360×240 六色图片并通过全部颜色核对；调用没有执行 DSH 业务工具。gpt-5.6-luna 文字对照返回 `CLI_OUTPUT_INVALID`，因此未对它发送图片。此结果不覆盖所有模型，也没有验证真实 DSH 上传界面。

## 本插件的请求限制

- 用户图片和工具结果图片共享预算：每次 DSH 请求所带的保留历史最多 5 张图片；已由 DSH 卸载的旧图片不重新读取，也不推断其内容。
- 单张图片请求版本不超过 2 MiB；所有图片 Base64 合计不超过 8 MiB；图像请求目标最长边不超过 1920 像素。
- 图片、附件 ID 和 Base64 不写入诊断日志。普通日志只记图片数量、原始请求字节数与 Base64 字节数。
- 取消、读取失败、格式不支持、模型能力未声明或预算超限时，本次请求失败，不发送部分图片内容。

## 尚未适配的图片来源

桌面、窗口、区域、浏览器、读图或第三方工具都没有名称限制；只有其返回值符合上述标准 DSH 附件结构时，插件才能处理。本轮未逐个实测这些工具的实际返回，也未验收 DSH 的截图或上传界面。直接返回本机路径、URL、裸 Base64 或自定义截图对象的工具尚不适配。原生音频/视频、PDF 内容解析和图片生成也不在本插件的图片输入范围内。

这些限制是插件自身的保护值，不代表官方服务的最大输入值或额度承诺。图片模型的真实能力、处理方式、服务权限和费用由官方决定。

## 验证范围

80 项合成自动检查通过，使用合成附件和假 CLI，覆盖用户与工具图片混排、工具单独截图、toolCallId/isError/顺序、共用预算与卸载、CLI error 帧分类、日志隐私及原有图片处理，不产生真实模型用量或执行真实 DSH 工具。

沿用 0.1.5 的历史实际适配器验证：`deepseek-v4.1-flash` 文字与合成六色图片通过；`gpt-5.6-luna` 文字对照返回 `CLI_OUTPUT_INVALID`，未向该模型发送图片。0.1.7 没有发起新模型调用。新增工具图片路径只经过合成适配器测试；未逐个验证实际 DSH 桌面、浏览器、区域截图或第三方工具，也未验收上传 UI。未验证所有模型；真实调用需有效的国际 CLI 登录和模型权限。

参考：

- [CodeBuddy CLI 无头模式：stream-json 输入、图片消息和 JSON Schema 输出](https://www.codebuddy.ai/docs/cli/headless)
- [DSH 附件服务 API](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/attachment/attachment/src/index.ts)
- [DSH 附件和 ImageRequestTarget 类型](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/attachment/attachment/src/types.ts)
