window.__ModuleLoader__.load({
  id: 'dsh-codebuddy-cli-intl',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    const React = require('react')
    const h = React.createElement
    const NS = 'llm-codebuddy-cli-intl'
    const STATUS_PATH = '/plugins/dsh-codebuddy-cli-intl/status'
    const ACTION_PATH = '/plugins/dsh-codebuddy-cli-intl/actions'
    const DIAGNOSTICS_PATH = '/plugins/dsh-codebuddy-cli-intl/diagnostics'
    const ACCOUNTS_PATH = '/plugins/dsh-codebuddy-cli-intl/accounts'
    const localeZh = {
      title: 'CodeBuddy CLI（国际版）',
      intro: '通过官方 CodeBuddy CLI 原生 JSON Schema 输出接入国际版模型。模型目录和积分倍率自动同步；DSH 继续管理对话与工具执行。',
      quickSetup: 'CLI 自动配置', setup: '一键配置 CLI', setupBusy: '配置中…',
      setupNote: '先查找本机安装；未安装时下载并运行官方安装器。支持 Windows x64、macOS 和 Linux，无需手填用户名或安装路径。',
      detecting: '正在查找并检查 CLI…', installing: '正在安装官方 CLI，请稍候…',
      setupReady: 'CLI 已配置，版本 {version}。', actionFailed: '操作未完成，请检查网络后重试。',
      installationGuide: '官方安装指南', loginTitle: '首次登录或切换账号', copyLogin: '复制登录命令', copied: '已复制登录命令',
      loginHelp: '在 PowerShell（macOS/Linux 使用终端）中粘贴运行，输入 /login，选择 International Site 并完成登录，然后点击“刷新模型与倍率”。若提示 401，请重新执行官方登录流程。',
      loginMissing: '先完成 CLI 自动配置，再获取登录命令。',
      accountsTitle: '独立账号环境', accountNote: '每个环境使用单独的配置目录和 Windows 用户目录。切换环境后请在 DSH 模型列表中选择带备注的模型；已有会话仍固定使用原账号。不会自动轮换或在失败后切回其他账号。',
      accountValidation: '多账号范围：Windows、官方 npm/Node CLI 2.174.0。实际双账号登录、刷新与官方扣费归属尚未实测。',
      accountLabel: '环境备注', accountAdd: '新增环境', accountUse: '设为当前环境', accountLegacy: '使用默认单账号', accountPrepare: '生成官方登录命令', accountRemove: '从列表移除',
      accountSelected: '当前环境', accountHasCredential: '检测到本环境有登录文件；未读取其内容。', accountNoCredential: '尚未检测到本环境的登录文件。', accountPathError: '隔离目录异常，已阻止请求。',
      accountUnsupported: '当前系统尚未验证多账号隔离；默认单账号仍可使用。', accountStoreError: '账号列表不可读或损坏；请求已阻止，请保留本机数据并查看指南。',
      accountAdded: '环境已建立。请生成命令，在新的 PowerShell 窗口运行，并选择 International Site 完成官方登录。',
      accountPrepared: '已生成该隔离环境的官方登录命令。请在新的 PowerShell 窗口运行，并选择 International Site。',
      accountRemoved: '已从列表移除；官方登录文件会保留。不会退出登录或清除凭据。旧会话不会改用其他账号。',
      accountUsage: '本地统计：{calls} 次请求 · 输入 {input} / 输出 {output} tokens · 取消 {cancelled} 次 · DSH 卸载请求 {offloads} 次（建议卸载 {images} 张） · 历史已卸载图片 {history} 张；卸载请求不代表 DSH 已执行。',
      accountPrivacy: '插件不会导入或复制日常使用的登录凭据。添加和切换环境不发送模型问题；账号不会自动轮换。请分别通过官方流程登录。',
      accountGuide: '多账号使用说明', accountGuideSteps: '1. 新增隔离环境并填写本地备注。2. 生成命令并在新 PowerShell 窗口运行。3. 选择 International Site，核对登录身份后退出 CLI。4. 在设置页选择环境并刷新模型。5. 在 DSH 会话中选带该环境备注的模型。',
      accountGuideErrors: '登录文件缺失时请在对应环境重新运行官方登录命令。旧模型 ID 不会自动沿用当前账号。401、网络或额度错误不会触发账号轮换；移出列表也不会注销或删除官方登录文件。',
      accountGuideLink: '打开完整的多账号指南', accountGuideUrl: 'https://github.com/1924225725-collab/dsh-codebuddy-cli-intl/blob/main/docs/多账号使用指南.md',
      accountConfirmRemove: '确认移出列表', accountCancel: '取消', accountStoreScope: '备注仅用于本机区分环境，不代表已核验的官方账号身份。',
      settings: '高级连接与默认值（可选）', cliPath: 'CLI 路径（留空自动检测）', configDir: '配置目录（留空使用 ~/.dsh-codebuddy-cli-intl）',
      model: '默认模型 ID（可选）', modelPlaceholder: '留空跟随 CLI 默认，可从下拉候选中选择',
      modelNote: '实际使用 DSH 会话中选择的模型；这里仅作为未指定模型时的默认值，也可填写未列出的模型 ID。',
      effort: '默认推理强度', followDefault: '跟随模型默认值', timeoutMs: '单次调用超时（毫秒）',
      save: '保存设置', saving: '保存中…', saved: '设置已保存', saveFailed: '保存失败，请重试',
      saveFirst: '有未保存的设置，请先保存后再执行检测或配置。',
      inspect: '检查 CLI 程序', inspectBusy: '检查中…', notChecked: '正在等待 CLI 程序检查',
      cliAvailable: 'CLI 程序可启动：{version}', cliUnavailable: 'CLI 程序检查失败（{code}），请点击“一键配置 CLI”或检查路径。',
      cliCheckNote: '此检查仅运行版本命令，不验证账号登录、网络连通性或模型响应。模型目录可刷新也不等于模型调用成功。',
      timeoutHelp: '这是启动 CLI 到整次调用结束的总时限，包含模型处理和 CLI 退出。复杂任务可设为 300000–600000（5–10 分钟）；超时后不会自动重试。',
      runtimeVersion: '插件运行版本：{version} · 当前调用超时：{seconds} 秒',
      timeoutDetail: 'CLI 进程诊断：耗时 {seconds} 秒 · 标准输出 {stdout} 字节 · 诊断输出 {stderr} 字节；这些大小不代表模型生成进度。',
      streamDetail: '流诊断：{reason} · 阶段 {phase} · 解析 {stage} · 帧 {index}/{count}（{bytes} 字节）· init/result {inits}/{results} · 最近帧 {frame} · 终止 {terminator} · close 已观察 {closed} · 到达时限 {deadline}。',
      responseDetail: '结果诊断：{mode} · {reason} · 最终记录 {finals} 条 · 返回类型 {type} · 兼容处理 {normalized}。{facts} {notice}基础诊断不含正文。',
      nativeOutput: '原生 JSON Schema', parseValid: '结构有效', parsePlainText: '纯文本答复（未执行工具）', parseEmpty: '模型结果为空', parseIncomplete: 'JSON 未闭合，可能被截断', parseSyntax: 'CLI 输出不是有效 JSON', parseAmbiguous: '多个协议片段存在歧义', parseFinalCount: '最终结果记录不是唯一一条', parseEnvelope: '根结构不符合协议', parseText: 'text 字段缺失或类型错误', parseCalls: 'toolCalls 结构错误', parseUnknownTool: '工具未声明', parseArguments: '工具参数必须是对象', parseOutputMissing: '缺少 structured_output', noNormalization: '无需处理',
      parseNativeResult: '收到原生最终结果', parseNotice: 'CLI 错误提示', parseOutputInvalid: 'CLI 输出无有效结果', parseDeadline: '调用到达总时限', parseStreamError: 'CLI 返回错误帧', parsePermissionFrame: 'CLI 请求交互权限', parseResultBeforeInit: '最终结果早于初始化帧', parsePostResult: '最终结果后出现额外帧',
      structuredFacts: 'structured_output：{present}（{type}）；result 类型{resultType}；终态 subtype：{subtype}。', noticeDetail: '提示分类：{classification} · 来源：{source}。',
      streamReasonNone: '无流错误', streamReasonJson: 'JSON 解析失败', streamReasonShape: '帧结构无效', streamReasonDuplicateInit: '重复初始化帧', streamReasonPostResult: '最终结果后序列冲突', streamReasonResultBeforeInit: '结果早于初始化', streamReasonMultiple: '出现多个最终结果', streamReasonError: '收到错误帧', streamReasonPermission: '收到权限控制帧', streamReasonMissingInit: '关闭前缺少初始化帧', streamReasonMissingResult: '关闭前缺少最终结果', streamReasonExit: 'CLI 非零退出', streamReasonDeadline: '达到总时限', streamReasonCancelled: '请求被取消', streamReasonTooLarge: '输出超出上限', streamReasonSpawn: 'CLI 启动失败',
      streamPhaseAwait: '等待初始化', streamPhaseInit: '已初始化', streamPhaseResult: '已收到最终结果', streamPhaseDrain: '终态排空', streamPhaseClosed: '进程已关闭', parseStageLine: '换行帧', parseStageTail: '无换行尾帧', parseStageNone: '无',
      frameNone: '无', frameInit: '初始化', frameSystem: '系统帧', frameAssistant: 'assistant 帧', frameResult: 'result 帧', frameError: 'error 帧', frameControl: '权限控制帧', frameOther: '其他帧', frameMalformed: '无法解析帧',
      terminatorNone: '尚未终止', terminatorAdapter: '解析器主动停止', terminatorDrain: '终态排空停止', terminatorDeadline: '总时限停止', terminatorCancel: '外部取消', terminatorChildError: '子进程错误', terminatorClose: '自然关闭', terminatorSpawn: '启动失败',
      noticeNone: '无匹配提示', noticeUnknown: '未分类提示', noticeContext: '上下文限制', noticeBalance: '余额不足', noticeAuth: '鉴权', noticeAccess: '服务拒绝访问', noticeRate: '频率限制', noticeLocalPermission: '本地权限', noticeNetwork: '网络连接', noticeSourceStderr: '标准错误', noticeSourceStdout: '标准输出', noticeSourceAssistant: 'assistant 文本帧', noticeSourceError: 'error 帧', noticeSourceResult: 'result 帧', noticeSourceMixed: '多个输出通道',
      factReported: '已返回', factMissing: '缺失', factObject: '对象', factArray: '数组', factString: '字符串', factNumber: '数字', factBoolean: '布尔值', factNull: 'null', factUndefined: 'undefined', factYes: '有效', factNo: '无效', subtypeSuccess: '成功', subtypeError: '错误', subtypeOther: '其他', subtypeMissing: '未提供',
      recentFailures: '最近失败记录（最多 5 条，重启后清空）',
      diagnosticId: '诊断 ID：{id}（可在导出日志中查找）',
      guideTitle: '故障处理与使用指南', guideIntro: '格式错误不一定能自动恢复。先确认已执行的操作，再按对应情况处理；不要盲目重复写入或运行命令。',
      guideMultipleTitle: '最终结果记录不唯一', guideMultiple: '原生输出模式要求 CLI 只返回一条最终结果记录；缺少或出现多条记录（即使内容看起来相同）都会失败。插件不会挑选最后一条、合并结果或执行部分工具。先查看 DSH 已完成的工具和文件状态，再发起简短的新请求。',
      guideIncompleteTitle: 'CLI 没有返回有效结构结果', guideIncomplete: '插件只接受官方 structured_output 中的 JSON 对象，不会从普通文本提取协议字段、补齐缺失内容或自动请求模型修复。缩小任务并重试前，先核对已完成的工具操作。',
      guideProgressTitle: '工具做完了，最后仍提示失败', guideProgress: '最终回复失败不代表之前的工具没有执行。先核对工具记录、文件内容和退出码，再决定是否重试；只让模型汇总已有结果时，明确说明不要重复已完成操作。',
      guideLiteralTitle: '路径、代码或反斜杠显示不符', guideLiteral: '插件按原样传递结构结果中的 text，不会再解析或反转义其中的内容。若文字本身有差异，只要求重写相关的小片段并逐字符核对。',
      guideAccessTitle: 'CLI、登录、超时或文件权限', guideAccess: '版本检查只说明程序能启动。401 请走官方登录；模型权限或额度由官方判断。超时可拆分任务并按需增加时限。文件或 ACL 错误先确认 DSH 工作区与路径，不要为修复格式错误更改权限。',
      guideRequestSizeTitle: '本机请求尺寸上限', guideRequestSize: 'REQUEST_TOO_LARGE 表示本机大小检查拒绝了本轮请求：国际版文字请求封装上限为 12 MiB，图片模式最终 stream-json CLI 输入上限为 24 MiB，均按 UTF-8 字节计算，不是 Token 数。图片卸载不会压缩文字历史，JSONL 编码和图片块会计入最终图片输入。配置页和普通日志会显示已测得的阶段、实际字节、上限及尺寸分解；旧日志没有保存的尺寸无法补算。插件不会自动删除历史、丢弃图片、截断 Schema、切换模型或重试。',
      guideLimitsTitle: '上下文上限或余额错误（400 / 402）', guideLimits: '400 表示服务明确报告输入超过上下文上限，缩短历史或新建会话后再试；402 表示官方服务报告余额不足，请查看官方用量页面。插件不会自动换模型、换账号或重试。',
      guideNetworkTitle: 'CLI_NETWORK_ERROR：连接中断或 TLS 错误', guideNetwork: '该分类表示官方 CLI 报告连接被重置或 TLS 握手未完成。请检查当前网络到官方国际服务的连通性及代理设置。插件只识别错误文本，不能修复网络或确认具体原因，也不会自动重试；核对已完成的 DSH 操作后，再自行决定是否重试。',
      guideLogsTitle: '如何保留有效反馈', guideLogs: '导出普通日志并记录诊断 ID、时间和复现步骤。需要原文时先开启下一次失败采集，分享前检查内容。成功调用与主动停止任务不消耗采集机会；取消采集、清空日志或重启会关闭开关。',
      guideFull: '查看完整用户指南', guideFullUrl: 'https://github.com/1924225725-collab/dsh-codebuddy-cli-intl/blob/main/docs/使用与故障处理指南.md',
      logsTitle: '诊断日志与问题反馈', logsNote: '普通日志自动保存在本机，最多保留 100 次调用、总计 2 MiB，重启后仍可查看。包含版本、模型、耗时、用量和结构统计；不含请求正文、回复正文、登录凭据或配置路径。不会自动上传。',
      logsStatus: '已保存 {entries} 条 · 失败 {failures} 条 · 详细样本 {samples} 份',
      viewLogs: '查看普通日志', hideLogs: '收起日志', exportLogs: '导出普通日志',
      captureNotice: '为定位格式错误，可手动采集下一次失败的原始模型回复（不采集请求、CLI 标准错误或登录文件）。回复可能包含聊天、代码、文件内容和工具参数，并可能复述敏感信息。最多采集 256 KiB，超出时保留首尾并标明截断。',
      captureConsent: '我了解详细样本可能包含私人内容，会在分享前检查并删除敏感信息。',
      armCapture: '采集下一次失败回复', cancelCapture: '取消详细采集', captureArmed: '已开启：等待下一次非主动取消的失败，随后自动关闭。重启也会关闭；成功调用和主动停止任务不消耗采集机会。无法补录开启前的失败。',
      previewDetailed: '预览详细日志', exportDetailed: '导出详细日志（含原始回复）',
      clearLogs: '清空日志', confirmClear: '确认清空全部日志和详细样本', cancelClear: '取消',
      logsExported: '已生成日志下载，请确认文件已保存；分享前先检查内容。', logsFailed: '日志操作失败，请重试。',
      logsStorageError: '本机日志读写失败（{code}）；当前可见记录仍可导出，但重启后可能丢失。',
      logsHelp: '反馈时附上日志 JSON、报错截图和复现步骤。普通日志不够定位时，再开启一次详细采集并复现。清空会删除本机记录并关闭详细采集，已下载的文件需要自行删除。',
      models: '可用模型与积分倍率', refreshModels: '刷新模型与倍率', refreshing: '正在检测模型…',
      catalogReady: '检测到 {count} 个模型 · 更新于 {time}', catalogEmpty: '尚未获取模型目录，请完成 CLI 配置和登录后刷新。',
      catalogStale: '刷新未成功，暂时显示上次目录。{message}',
      catalogNote: '每 15 分钟自动同步，也可手动刷新；检测不发送模型问题，不消耗模型调用额度。',
      imageInput: '图片输入', imagesSupported: '官方目录声明支持', imagesUnknown: '目录未声明',
      imageNote: '仅对官方动态模型目录明确标记 supportsImages 的模型开放图片。插件通过 DSH 附件服务读取图片，并以官方 CLI 的原生 stream-json 图片块发送；模型未声明支持时会明确报错，不会静默丢图。每次请求历史最多 5 张、单张最大 2 MiB、总图片 Base64 最大 8 MiB，最长边按需缩至 1920 像素。历史中的内联图片 data URI 总长超过 32,768 字符时会在发起模型请求前拒绝；图片内容不会写入诊断日志。',
      creditsNote: '倍率来自本次 CLI 返回的官方目录；×0 表示当前目录标记为免费。活动和计费可能调整，实际扣费以官方为准。',
      searchModels: '搜索模型名称或 ID', modelName: '模型 / ID', multiplier: '积分倍率', efforts: '推理强度', context: '上下文',
      unknown: '官方未提供', noEffort: '模型默认', noMatches: '没有匹配的模型。',
      usage: '本次运行的累计 Token 用量', usageNote: '累计输入包含未缓存、缓存命中和缓存写入，每项只计一次；不是单条提问的字数，也不代表积分扣费。适配器每次启动一个 CLI 进程，但 CLI 内部结构化处理可能包含多轮，实际用量以官方明细为准。重启后清零。',
      usageTotals: '累计请求 {calls} 次 · 累计输入（含缓存）{input} · 累计输出 {output} Token',
      outcomeTotals: '本地事件统计（重启后清零）：取消 {cancelled} 次 · DSH 图片卸载请求 {offloads} 次（建议卸载 {images} 张） · 请求历史中已卸载图片 {history} 张。卸载请求不代表 DSH 已执行。',
      usageBreakdown: '输入明细：未缓存 {uncached} · 缓存命中 {read} · 缓存写入 {write} Token',
      requestSize: '最近请求封装：{messages} 条历史消息 · {tools} 个工具；提示封装 {total} UTF-8 字节（系统 {system} / 历史 {history} / 工具 {schemas}）。这表示本机组装的请求大小，不等于 Token 数或已发送内容。',
      sizeUnknown: '未记录', budgetEnvelope: '文字封装', budgetInput: 'CLI 编码输入',
      budgetDetail: '本机大小检查：{stage} · {actual} / {limit} 字节；请求在启动 CLI 模型调用前被拒绝，未提交给模型。',
      requestSizeExtra: '其他尺寸：响应 Schema {schema} / 封装固定指令与结构 {overhead} / 计算后的 CLI 输入 {input} 字节。图片模式包含最终 JSONL 编码和原生图片块；本机拒绝时该值不是已发送证明。',
      requestTime: '最近调用总耗时 {seconds} 秒。当前为完整 JSON 返回，不提供模型生成速度。',
      noUsage: '尚未通过 DSH 发起模型请求。插件不会自动发送测试问题。',
      lastCall: '最近一次：{model} · {time} · 单次输入（含缓存）{input} / 输出 {output} Token',
      lastFailed: '最近一次请求失败：{code}', active: '当前正在处理 {count} 个请求',
      balance: '积分余额', balanceNote: '剩余积分请在 CodeBuddy 官网“个人主页 → 套餐与用量”查看。模型倍率和本页 Token 统计不代表剩余额度。',
      openHome: '打开 CodeBuddy 官网查看用量',
      toolNote: '模型目录和图片能力以当前国际 CLI 返回结果为准，账号权限由官方判断。图片请求经 CLI 原生图片输入；CLI 业务工具仍关闭，DSH 负责执行工具。'
    }
    const localeEn = {
      title: 'CodeBuddy CLI (International)',
      intro: 'Connect international models through the official CodeBuddy CLI native JSON Schema output. Models and credit multipliers refresh automatically; DSH manages conversations and tool execution.',
      quickSetup: 'Automatic CLI setup', setup: 'Set up CLI', setupBusy: 'Setting up…',
      setupNote: 'Find an existing installation, or download and run the official installer. Supports Windows x64, macOS and Linux without entering a user-specific path.',
      detecting: 'Finding and checking CLI…', installing: 'Installing the official CLI…',
      setupReady: 'CLI configured, version {version}.', actionFailed: 'The action failed. Check your network and retry.',
      installationGuide: 'Official installation guide', loginTitle: 'Sign in or switch account', copyLogin: 'Copy sign-in command', copied: 'Sign-in command copied',
      loginHelp: 'Paste into PowerShell (Terminal on macOS/Linux), run /login, choose International Site and complete sign-in, then refresh models. Repeat official sign-in for a 401 error.',
      loginMissing: 'Set up the CLI first to obtain its sign-in command.',
      accountsTitle: 'Isolated account environments', accountNote: 'Each environment has its own CLI configuration and Windows user directories. After switching, choose a model labelled with that environment in DSH; existing conversations remain bound to their original account. There is no automatic rotation or fallback.',
      accountValidation: 'Scope: Windows with the official npm/Node CLI 2.174.0. Real dual-account sign-in, refresh and official billing attribution have not been tested.',
      accountLabel: 'Local label', accountAdd: 'Add environment', accountUse: 'Use this environment', accountLegacy: 'Use default single account', accountPrepare: 'Prepare official sign-in command', accountRemove: 'Remove from list',
      accountSelected: 'Current environment', accountHasCredential: 'A sign-in file is present in this environment; its contents were not read.', accountNoCredential: 'No sign-in file detected in this environment.', accountPathError: 'Invalid isolation directory; requests are blocked.',
      accountUnsupported: 'Multiple-account isolation is not verified on this system. The default single-account mode remains available.', accountStoreError: 'The account list is unreadable or corrupt. Requests are blocked; preserve local data and see the guide.',
      accountAdded: 'Environment created. Prepare its command, run it in a new PowerShell window, and choose International Site for official sign-in.',
      accountPrepared: 'The official sign-in command is ready for this isolated environment. Run it in a new PowerShell window and choose International Site.',
      accountRemoved: 'Removed from the list; official sign-in files are retained. This does not sign out or clear credentials. Existing conversations will not switch accounts.',
      accountUsage: 'Local counters: {calls} requests · input {input} / output {output} tokens · {cancelled} cancellations · {offloads} DSH image-offload requests ({images} images requested) · {history} already-offloaded images in history. A request does not confirm DSH completed it.',
      accountPrivacy: 'The plugin does not import or copy your everyday sign-in credentials. Adding or selecting an environment sends no model prompt. Accounts never rotate automatically; sign in separately through the official flow.',
      accountGuide: 'Multiple-account guide', accountGuideSteps: '1. Add an isolated environment and a local label. 2. Prepare its command and run it in a new PowerShell window. 3. Choose International Site, verify the identity, then exit the CLI. 4. Select the environment and refresh models. 5. Choose its labelled model in a DSH conversation.',
      accountGuideErrors: 'If sign-in is missing, rerun the official command for that environment. Old model IDs never inherit the current account. A 401, network or credit error never rotates accounts; removing an entry does not sign out or delete official sign-in files.',
      accountGuideLink: 'Open the full account guide', accountGuideUrl: 'https://github.com/1924225725-collab/dsh-codebuddy-cli-intl/blob/main/docs/ACCOUNT_GUIDE.en.md',
      accountConfirmRemove: 'Confirm removal from list', accountCancel: 'Cancel', accountStoreScope: 'Labels are local hints and do not verify the official account identity.',
      settings: 'Connection and defaults', cliPath: 'CLI path (blank: auto-detect)', configDir: 'Configuration directory (default: ~/.dsh-codebuddy-cli-intl)',
      model: 'Default model ID (optional)', modelPlaceholder: 'Follow CLI default, or choose a discovered model',
      modelNote: 'The DSH conversation model takes priority. This is a fallback; unlisted model IDs can also be entered.',
      effort: 'Default reasoning effort', followDefault: 'Use model default', timeoutMs: 'Request timeout (ms)',
      save: 'Save settings', saving: 'Saving…', saved: 'Settings saved', saveFailed: 'Could not save settings. Try again.',
      saveFirst: 'Save your pending changes before checking or configuring the CLI.',
      inspect: 'Check CLI executable', inspectBusy: 'Checking…', notChecked: 'Waiting for CLI executable check',
      cliAvailable: 'CLI executable starts: {version}', cliUnavailable: 'CLI executable check failed ({code}). Run setup or check its path.',
      cliCheckNote: 'This runs the version command only. It does not verify sign-in, network connectivity or model responses. Catalog discovery is not a model-call test.',
      timeoutHelp: 'Total deadline from CLI startup to process exit, including model processing. Complex tasks may need 300000–600000 ms (5–10 minutes). Timeouts are not retried automatically.',
      runtimeVersion: 'Running plugin: {version} · Call timeout: {seconds} seconds',
      timeoutDetail: 'CLI process diagnostics: {seconds}s · stdout {stdout} bytes · stderr {stderr} bytes. Byte counts do not measure model generation progress.',
      streamDetail: 'Stream diagnostics: {reason} · phase {phase} · parse {stage} · frame {index}/{count} ({bytes} bytes) · init/results {inits}/{results} · last frame {frame} · termination {terminator} · close observed {closed} · deadline reached {deadline}.',
      responseDetail: 'Result: {mode} · {reason} · {finals} final record(s) · type {type} · normalization {normalized}. {facts} {notice}Basic diagnostics contain no reply content.',
      nativeOutput: 'Native JSON Schema', parseValid: 'Valid structure', parsePlainText: 'Plain-text reply (no tools executed)', parseEmpty: 'Empty result', parseIncomplete: 'Unclosed JSON, possibly truncated', parseSyntax: 'CLI output is not valid JSON', parseAmbiguous: 'Ambiguous protocol fragments', parseFinalCount: 'Final result record is not unique', parseEnvelope: 'Invalid root structure', parseText: 'Missing or invalid text', parseCalls: 'Invalid toolCalls structure', parseUnknownTool: 'Undeclared tool', parseArguments: 'Tool arguments must be an object', parseOutputMissing: 'Missing structured_output', noNormalization: 'None',
      parseNativeResult: 'Native final result received', parseNotice: 'CLI notice', parseOutputInvalid: 'CLI output has no valid result', parseDeadline: 'Request deadline reached', parseStreamError: 'CLI error frame', parsePermissionFrame: 'CLI requested interactive permission', parseResultBeforeInit: 'Result before init frame', parsePostResult: 'Extra frame after final result',
      structuredFacts: 'structured_output: {present} ({type}); result type {resultType}; final subtype: {subtype}.', noticeDetail: 'Notice class: {classification} · source: {source}.',
      streamReasonNone: 'No stream error', streamReasonJson: 'JSON parse failed', streamReasonShape: 'Invalid frame shape', streamReasonDuplicateInit: 'Duplicate init frame', streamReasonPostResult: 'Conflicting sequence after result', streamReasonResultBeforeInit: 'Result before init', streamReasonMultiple: 'Multiple final results', streamReasonError: 'Error frame received', streamReasonPermission: 'Permission control frame received', streamReasonMissingInit: 'Init frame missing at close', streamReasonMissingResult: 'Final result missing at close', streamReasonExit: 'CLI exited nonzero', streamReasonDeadline: 'Request deadline reached', streamReasonCancelled: 'Request cancelled', streamReasonTooLarge: 'Output limit exceeded', streamReasonSpawn: 'CLI failed to start',
      streamPhaseAwait: 'Waiting for init', streamPhaseInit: 'Initialized', streamPhaseResult: 'Final result received', streamPhaseDrain: 'Draining terminal output', streamPhaseClosed: 'Process closed', parseStageLine: 'Newline frame', parseStageTail: 'Unterminated tail frame', parseStageNone: 'None',
      frameNone: 'None', frameInit: 'Init', frameSystem: 'System frame', frameAssistant: 'Assistant frame', frameResult: 'Result frame', frameError: 'Error frame', frameControl: 'Permission control frame', frameOther: 'Other frame', frameMalformed: 'Unparseable frame',
      terminatorNone: 'Not terminated', terminatorAdapter: 'Adapter stopped process', terminatorDrain: 'Terminal drain stopped process', terminatorDeadline: 'Deadline stopped process', terminatorCancel: 'External cancellation', terminatorChildError: 'Child process error', terminatorClose: 'Natural close', terminatorSpawn: 'Spawn failure',
      noticeNone: 'No matching notice', noticeUnknown: 'Unclassified notice', noticeContext: 'Context limit', noticeBalance: 'Insufficient balance', noticeAuth: 'Authentication', noticeAccess: 'Service access denied', noticeRate: 'Rate limit', noticeLocalPermission: 'Local permission', noticeNetwork: 'Network connection', noticeSourceStderr: 'stderr', noticeSourceStdout: 'stdout', noticeSourceAssistant: 'assistant text frame', noticeSourceError: 'error frame', noticeSourceResult: 'result frame', noticeSourceMixed: 'multiple output channels',
      factReported: 'present', factMissing: 'missing', factObject: 'object', factArray: 'array', factString: 'string', factNumber: 'number', factBoolean: 'boolean', factNull: 'null', factUndefined: 'undefined', factYes: 'valid', factNo: 'invalid', subtypeSuccess: 'success', subtypeError: 'error', subtypeOther: 'other', subtypeMissing: 'not provided',
      recentFailures: 'Recent failures (up to 5, cleared on restart)',
      diagnosticId: 'Diagnostic ID: {id} (search for this in exported logs)',
      guideTitle: 'Troubleshooting and usage guide', guideIntro: 'Some format failures cannot be recovered automatically. Check completed operations before retrying a write or command.',
      guideMultipleTitle: 'Final result record is not unique', guideMultiple: 'Native output requires exactly one final CLI result record. Missing or multiple records fail, even if their contents appear identical. The adapter does not choose the last record, merge results or execute partial tools. Check completed DSH tools and file state before sending a short new request.',
      guideIncompleteTitle: 'No valid structured result from the CLI', guideIncomplete: 'The adapter accepts only the official structured_output JSON object. It does not extract protocol fields from prose, invent missing content or request an automatic model repair. Check completed tools before retrying a smaller task.',
      guideProgressTitle: 'Tools completed but the final reply failed', guideProgress: 'A failed final reply does not undo earlier tools. Check tool records, file contents and exit codes before retrying. When requesting only a summary of completed work, explicitly ask not to repeat completed operations.',
      guideLiteralTitle: 'Paths, code or backslashes differ', guideLiteral: 'The adapter passes the structured text field through as-is and does not parse or unescape its contents again. If the text itself differs, request only the affected short section and compare literal characters.',
      guideAccessTitle: 'CLI, sign-in, deadlines or file permissions', guideAccess: 'A version check only proves the executable starts. Use official sign-in for 401 errors; model access and credits are controlled by the service. Split slow tasks or adjust the deadline. For file or ACL failures, confirm the DSH workspace and path rather than changing permissions to fix response formatting.',
      guideRequestSizeTitle: 'Local request size limits', guideRequestSize: 'REQUEST_TOO_LARGE means a local size check refused this request: the international text envelope is limited to 12 MiB, and the final stream-json CLI input in image mode to 24 MiB. Both use UTF-8 bytes, not tokens. Image offloading does not compress text history; JSONL encoding and image blocks count toward final image input. Settings and basic logs show the measured stage, actual bytes, limit and size breakdown; sizes absent from older logs cannot be reconstructed. The adapter never automatically deletes history, drops images, truncates schemas, switches models or retries.',
      guideLimitsTitle: 'Context or credit errors (400 / 402)', guideLimits: '400 means the service explicitly reported that the input exceeded the model context limit; shorten history or start a new session before retrying. 402 means the official service reported insufficient balance; check the official usage page. The plugin does not switch models or accounts or retry automatically.',
      guideNetworkTitle: 'CLI_NETWORK_ERROR: connection reset or TLS failure', guideNetwork: 'This classification means the official CLI reported a reset connection or an incomplete TLS handshake. Check connectivity to the official International service and your proxy settings. The adapter only classifies the CLI message; it cannot repair connectivity or confirm the exact cause, and it does not retry automatically. Check completed DSH actions before you decide whether to retry.',
      guideLogsTitle: 'Useful issue reports', guideLogs: 'Export basic logs with the diagnostic ID, time and reproduction steps. Arm failure capture beforehand only when raw replies are needed, and review before sharing. Successes and user-aborted tasks preserve capture; cancelling capture, clearing logs or restarting disables it.',
      guideFull: 'Read the full user guide', guideFullUrl: 'https://github.com/1924225725-collab/dsh-codebuddy-cli-intl/blob/main/docs/USER_GUIDE.en.md',
      logsTitle: 'Diagnostic logs and feedback', logsNote: 'Basic logs stay on this computer across restarts, bounded to 100 calls and 2 MiB. They include versions, models, timing, usage and structural summaries, without request/reply bodies, login credentials or configuration paths. Nothing is uploaded automatically.',
      logsStatus: '{entries} records · {failures} failures · {samples} detailed samples',
      viewLogs: 'View basic logs', hideLogs: 'Hide logs', exportLogs: 'Export basic logs',
      captureNotice: 'For format failures, optionally capture the next failed raw model reply, excluding requests, CLI stderr and login files. Replies can contain chats, code, file contents, tool arguments and repeated sensitive information. Samples are limited to 256 KiB; larger replies retain both ends with a truncation marker.',
      captureConsent: 'I understand detailed samples may contain private content and will review and remove sensitive information before sharing.',
      armCapture: 'Capture next failed reply', cancelCapture: 'Cancel detailed capture', captureArmed: 'Waiting for the next non-user-aborted failure, then capture turns off. Restart also turns it off. Successes and user-aborted tasks preserve capture. Earlier failures cannot be recovered.',
      previewDetailed: 'Preview detailed logs', exportDetailed: 'Export detailed logs (raw replies)',
      clearLogs: 'Clear logs', confirmClear: 'Confirm clearing all logs and samples', cancelClear: 'Cancel',
      logsExported: 'Log download prepared. Check that the file was saved and review it before sharing.', logsFailed: 'Log operation failed. Try again.',
      logsStorageError: 'Local log storage failed ({code}). Available in-memory records can still be exported but may be lost after restart.',
      logsHelp: 'Report issues with the JSON log, error screenshot and reproduction steps. If basic logs are insufficient, enable one-time detailed capture and reproduce. Clearing removes local records and disables capture; downloaded files must be deleted separately.',
      models: 'Available models and credit multipliers', refreshModels: 'Refresh models and rates', refreshing: 'Discovering models…',
      catalogReady: '{count} models · Updated {time}', catalogEmpty: 'No model catalog yet. Set up and sign in to the CLI, then refresh.',
      catalogStale: 'Refresh failed; showing the previous catalog. {message}',
      catalogNote: 'Refreshes every 15 minutes or on demand. Discovery sends no model prompt and does not use model-call credits.',
      imageInput: 'Image input', imagesSupported: 'Declared by catalog', imagesUnknown: 'Not declared',
      imageNote: 'Image input is enabled only for models explicitly marked supportsImages in the live official catalog. DSH attachment service reads the images and the plugin sends native image blocks through the official CLI stream-json input; an undeclared model fails explicitly instead of silently dropping images. Per request history: up to 5 images, 2 MiB per image, 8 MiB total Base64; the longest edge is capped at 1920 pixels when resized. Inline image data URIs over 32,768 total characters are rejected before a model request. Images already offloaded by DSH are not reread, and image content is excluded from diagnostics.',
      creditsNote: 'Rates come from the current official CLI catalog; ×0 means the catalog currently marks it free. Promotions and billing can change; official billing is authoritative.',
      searchModels: 'Search model name or ID', modelName: 'Model / ID', multiplier: 'Credit multiplier', efforts: 'Reasoning efforts', context: 'Context',
      unknown: 'Not provided', noEffort: 'Model default', noMatches: 'No matching models.',
      usage: 'Cumulative token usage this run', usageNote: 'Input includes uncached, cache-read and cache-write tokens, counted once. This is not the latest question length or billed credits. The adapter starts one CLI process per request, while structured processing inside the CLI may involve multiple rounds; official usage details are authoritative. Resets on restart.',
      usageTotals: '{calls} cumulative requests · {input} total input (including cache) · {output} total output tokens',
      outcomeTotals: 'Local event counts (reset on restart): {cancelled} cancellations · {offloads} DSH image-offload requests ({images} images requested) · {history} already-offloaded images in request history. A request does not confirm DSH completed it.',
      usageBreakdown: 'Input breakdown: {uncached} uncached · {read} cache read · {write} cache write tokens',
      requestSize: 'Last request envelope: {messages} messages · {tools} tools; prompt envelope {total} UTF-8 bytes (system {system} / history {history} / tools {schemas}). This is the locally assembled request size, not tokens or proof that it was sent.',
      sizeUnknown: 'Not recorded', budgetEnvelope: 'Text envelope', budgetInput: 'Encoded CLI input',
      budgetDetail: 'Local size check: {stage} · {actual} / {limit} bytes; the request was refused before starting the CLI model invocation and was not submitted to the model.',
      requestSizeExtra: 'Other sizes: response schema {schema} / fixed instructions and envelope structure {overhead} / computed CLI input {input} bytes. Image mode includes final stream-json encoding and native image blocks; a local refusal does not mean the input was sent.',
      requestTime: 'Last call took {seconds} seconds. Complete JSON responses do not expose model decoding speed.',
      noUsage: 'No DSH model request yet. The plugin does not send test prompts automatically.',
      lastCall: 'Last: {model} · {time} · {input} input (including cache) / {output} output tokens for this call',
      lastFailed: 'Last request failed: {code}', active: '{count} request(s) active',
      balance: 'Credits', balanceNote: 'Check remaining credits under “Profile → Plan and Usage” on the CodeBuddy website. Model rates and token counters are not remaining credits.',
      openHome: 'Open CodeBuddy usage page', toolNote: 'Models and image capabilities come from the current international CLI catalog; account permissions are enforced by the official service. Image requests use the CLI native image input. CLI business tools remain disabled and DSH executes tools.'
    }

    function useFormSnapshot(form) {
      return React.useSyncExternalStore(
        (listener) => typeof form?.subscribe === 'function' ? form.subscribe(listener) : () => {},
        () => typeof form?.getSnapshot === 'function' ? form.getSnapshot() : form?.state,
        () => typeof form?.getSnapshot === 'function' ? form.getSnapshot() : form?.state
      )
    }
    function translate(t, key, values = {}) {
      return t(key).replace(/\{(\w+)\}/gu, (_, name) => String(values[name] ?? ''))
    }
    function formatTime(value) {
      try { return new Date(value).toLocaleString() } catch { return String(value) }
    }
    function isStatus(value) {
      return !!value && typeof value === 'object' && typeof value.activeCalls === 'number'
        && !!value.usage && typeof value.usage.calls === 'number' && !!value.cliCheck && typeof value.cliCheck.state === 'string'
    }
    const sectionStyle = () => ({ border: '1px solid var(--dsw-alias-border-primary, rgba(127,127,127,.25))', borderRadius: 12, padding: 16, display: 'grid', gap: 12 })
    const inputStyle = () => ({ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--dsw-alias-border-primary, rgba(127,127,127,.35))', background: 'var(--dsw-alias-background-primary, transparent)', color: 'inherit' })
    const rowStyle = { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 }
    const buttonStyle = { padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(127,127,127,.4)', background: 'transparent', color: 'inherit', cursor: 'pointer' }
    function Notice({ children }) {
      return h('p', { style: { margin: 0, color: 'var(--dsw-alias-label-secondary, inherit)', lineHeight: 1.5 } }, children)
    }

    function CodeBuddySettingsPage(props) {
      const { t, statusUrl } = props
      const actionUrl = props.actionUrl ?? ACTION_PATH
      const form = props.form ?? props.legacyForm
      const snapshot = useFormSnapshot(form)
      const value = snapshot?.value ?? {}
      const [draft, setDraft] = React.useState(() => ({ ...value }))
      const [dirty, setDirty] = React.useState(false)
      const [busy, setBusy] = React.useState(false)
      const [notice, setNotice] = React.useState('')
      const [status, setStatus] = React.useState()
      const [checking, setChecking] = React.useState(false)
      const [action, setAction] = React.useState('')
      const [search, setSearch] = React.useState('')
      const [logBusy, setLogBusy] = React.useState(false)
      const [logReport, setLogReport] = React.useState(null)
      const [logConsent, setLogConsent] = React.useState(false)
      const [confirmClear, setConfirmClear] = React.useState(false)
      const [accountLabel, setAccountLabel] = React.useState('')
      const [confirmAccountRemoval, setConfirmAccountRemoval] = React.useState('')
      React.useEffect(() => {
        if (!dirty && snapshot?.status === 'ready') setDraft({ ...snapshot.value })
      }, [snapshot?.status, snapshot?.revision, dirty])
      React.useEffect(() => {
        const controller = new AbortController()
        const refresh = () => fetch(statusUrl, { signal: controller.signal, cache: 'no-store' })
          .then((response) => response.ok ? response.json() : Promise.reject(new Error('status unavailable')))
          .then((result) => { if (isStatus(result)) setStatus(result) }).catch(() => {})
        refresh()
        const timer = setInterval(refresh, action ? 1500 : 10000)
        return () => { clearInterval(timer); controller.abort() }
      }, [statusUrl, action])
      if (props.view === 'summary') return t('intro')

      const edit = (key, next) => {
        setDirty(true); setNotice(''); setDraft((old) => ({ ...old, [key]: next }))
      }
      const commit = async (patch) => {
        const current = typeof form?.getSnapshot === 'function' ? form.getSnapshot() : snapshot
        if (typeof form?.mutate === 'function') {
          await form.mutate(Object.entries(patch).map(([key, next]) => ({ op: 'set', path: [key], value: next })), current?.revision)
        } else {
          for (const [key, next] of Object.entries(patch)) if (!await form.set(key, next)) throw new Error('rejected')
        }
      }
      const save = async () => {
        if (busy || snapshot?.writable === false) return
        setBusy(true); setNotice('')
        try {
          const changed = Object.fromEntries(['cliPath', 'configDir', 'model', 'effort', 'timeoutMs']
            .filter((key) => draft[key] !== undefined && draft[key] !== value[key]).map((key) => [key, draft[key]]))
          if (Object.keys(changed).length) await commit(changed)
          setDirty(false); setNotice(t('saved'))
        } catch { setNotice(t('saveFailed')) } finally { setBusy(false) }
      }
      const postAction = async (name) => {
        const response = await fetch(actionUrl, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'X-DSH-CodeBuddy-Action': '1' },
          body: JSON.stringify({ action: name }), cache: 'no-store'
        })
        const result = await response.json()
        if (!response.ok || !isStatus(result)) throw new Error('action unavailable')
        setStatus(result)
        return result
      }
      const refreshModels = async () => {
        if (action || dirty) return
        setAction('refreshModels'); setNotice('')
        try {
          const result = await postAction('refreshModels')
          setNotice(result.catalog?.errorMessage || translate(t, 'catalogReady', { count: result.catalog?.models?.length ?? 0, time: formatTime(result.catalog?.fetchedAt) }))
        } catch { setNotice(t('actionFailed')) } finally { setAction('') }
      }
      const setup = async () => {
        if (action || dirty || snapshot?.writable !== true) return
        setAction('setup'); setNotice('')
        try {
          let result = await postAction('setup')
          let attempts = 0
          while (['detecting', 'installing'].includes(result.setup?.state) && attempts++ < 400) {
            await new Promise((resolve) => setTimeout(resolve, 1500))
            const response = await fetch(statusUrl, { cache: 'no-store' })
            result = await response.json()
            if (!response.ok || !isStatus(result)) throw new Error('status unavailable')
            setStatus(result)
          }
          if (result.setup?.state !== 'ready' || !result.setup.path) {
            setNotice(result.setup?.message || t('actionFailed')); return
          }
          try {
            await commit({ cliPath: result.setup.path })
            setDraft((old) => ({ ...old, cliPath: result.setup.path }))
          } catch { setNotice(t('saveFailed')); return }
          const refreshed = await postAction('refreshModels')
          setNotice(refreshed.catalog?.errorMessage || translate(t, 'setupReady', { version: result.setup.version }))
        } catch { setNotice(t('actionFailed')) } finally { setAction('') }
      }
      const checkCli = async () => {
        if (checking || action || dirty) return
        setChecking(true)
        try {
          const response = await fetch(`${statusUrl}?checkCli=1`, { cache: 'no-store' })
          const result = await response.json()
          if (!response.ok || !isStatus(result)) throw new Error('status unavailable')
          setStatus(result)
        } catch { setNotice(t('actionFailed')) } finally { setChecking(false) }
      }
      const copyLogin = async () => {
        try { await navigator.clipboard.writeText(status.loginCommand); setNotice(t('copied')) }
        catch { setNotice(t('loginHelp')) }
      }
      const accountAction = async (name, id) => {
        if (action || dirty || snapshot?.writable !== true) return
        setAction('accounts'); setNotice('')
        try {
          const response = await fetch(ACCOUNTS_PATH, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'X-DSH-CodeBuddy-Action': '1' },
            body: JSON.stringify({ action: name, ...(name === 'add' ? { label: accountLabel } : { id }) }), cache: 'no-store'
          })
          const result = await response.json()
          if (!response.ok || !isStatus(result)) { setNotice(typeof result.message === 'string' ? result.message : t('actionFailed')); return }
          setStatus(result); setConfirmAccountRemoval('')
          if (name === 'add') { setAccountLabel(''); setNotice(t('accountAdded')) }
          if (name === 'remove') setNotice(t('accountRemoved'))
          if (name === 'prepareLogin') setNotice(t('accountPrepared'))
        } catch { setNotice(t('actionFailed')) } finally { setAction('') }
      }
      const logRequest = async (name) => {
        const response = await fetch(props.diagnosticsUrl ?? DIAGNOSTICS_PATH, name ? {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'X-DSH-CodeBuddy-Action': '1' },
          body: JSON.stringify({ action: name }), cache: 'no-store'
        } : { cache: 'no-store' })
        const result = await response.json()
        if (!response.ok) throw new Error('logs unavailable')
        return result
      }
      const logAction = async (name) => {
        setLogBusy(true); setNotice('')
        try {
          if (name === 'view') setLogReport(await logRequest())
          else if (name === 'preview') setLogReport(await logRequest('exportDetailedLogs'))
          else if (name === 'exportLogs' || name === 'exportDetailedLogs') {
            const report = await logRequest(name)
            const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json;charset=utf-8' }))
            const anchor = document.createElement('a')
            anchor.href = url
            anchor.download = `dsh-codebuddy-${name === 'exportLogs' ? 'basic' : 'detailed'}-${Date.now()}.json`
            document.body.appendChild(anchor); anchor.click(); anchor.remove()
            setTimeout(() => URL.revokeObjectURL(url), 1000)
            setNotice(t('logsExported'))
          } else {
            const result = await logRequest(name)
            if (!isStatus(result)) throw new Error('invalid status')
            setStatus(result)
            if (name === 'clearLogs') { setLogReport(null); setConfirmClear(false); setLogConsent(false) }
          }
        } catch { setNotice(t('logsFailed')) } finally { setLogBusy(false) }
      }
      const label = (key, control) => h('label', { key, style: { display: 'grid', gap: 6 } }, h('span', null, t(key)), control)
      const textInput = (key, valueType = 'text', extra = {}) => label(key, h('input', {
        type: valueType, value: draft[key] ?? '',
        onChange: (event) => edit(key, valueType === 'number' ? Number(event.target.value) : event.target.value),
        min: valueType === 'number' ? 15000 : undefined, max: valueType === 'number' ? 600000 : undefined,
        step: valueType === 'number' ? 1000 : undefined, spellCheck: false, style: inputStyle(), ...extra
      }))
      const catalog = status?.catalog
      const models = Array.isArray(catalog?.models) ? catalog.models : []
      const selectedModel = models.find((item) => item.id === (draft.model || catalog?.currentModelId))
      const efforts = selectedModel?.efforts ?? []
      const shown = models.filter((item) => `${item.name} ${item.id} ${item.supportsImages === true ? 'image 图片' : ''}`.toLowerCase().includes(search.toLowerCase()))
      const lastCall = status?.usage?.lastCall
      const sizeValue = value => Number.isSafeInteger(value) && value >= 0 ? value : t('sizeUnknown')
      const requestBudgetNote = details => ['envelope', 'cli-input'].includes(details?.requestLimitStage)
        ? translate(t, 'budgetDetail', {
          stage: t(details.requestLimitStage === 'envelope' ? 'budgetEnvelope' : 'budgetInput'),
          actual: sizeValue(details.requestBytes), limit: sizeValue(details.requestLimitBytes)
        })
        : null
      const responseNote = (details) => {
        const reasons = { valid: 'parseValid', 'plain-text-fallback': 'parsePlainText', 'empty-result': 'parseEmpty', 'empty-content': 'parseEmpty', 'possibly-truncated-json': 'parseIncomplete', 'native-structured-output-missing': 'parseOutputMissing', 'native-final-results': 'parseFinalCount', 'invalid-json': 'parseSyntax', 'ambiguous-json': 'parseAmbiguous', 'invalid-envelope': 'parseEnvelope', 'native-envelope': 'parseEnvelope', 'native-tool-envelope': 'parseCalls', 'invalid-text-field': 'parseText', 'invalid-tool-calls-field': 'parseCalls', 'unknown-tool': 'parseUnknownTool', 'invalid-tool-arguments': 'parseArguments', 'invalid-tool-arguments-json': 'parseArguments', 'native-result': 'parseNativeResult', 'cli-notice': 'parseNotice', 'cli-output-invalid': 'parseOutputInvalid', deadline: 'parseDeadline', 'error-frame': 'parseStreamError', 'permission-frame': 'parsePermissionFrame', 'result-before-init': 'parseResultBeforeInit', 'post-result-sequence': 'parsePostResult' }
        const valueTypes = { missing: 'factMissing', null: 'factNull', object: 'factObject', array: 'factArray', string: 'factString', number: 'factNumber', boolean: 'factBoolean', undefined: 'factUndefined' }
        const subtypeTypes = { missing: 'subtypeMissing', success: 'subtypeSuccess', error: 'subtypeError', other: 'subtypeOther' }
        const noticeClasses = { none: 'noticeNone', unclassified: 'noticeUnknown', 'context-limit': 'noticeContext', 'insufficient-balance': 'noticeBalance', authentication: 'noticeAuth', 'access-denied': 'noticeAccess', 'rate-limit': 'noticeRate', 'local-permission': 'noticeLocalPermission', network: 'noticeNetwork' }
        const noticeSources = { none: 'noticeNone', stderr: 'noticeSourceStderr', stdout: 'noticeSourceStdout', 'assistant-text': 'noticeSourceAssistant', 'error-frame': 'noticeSourceError', 'result-frame': 'noticeSourceResult', mixed: 'noticeSourceMixed' }
        const facts = details.hasStructuredOutput === undefined ? '' : translate(t, 'structuredFacts', {
          present: t(details.hasStructuredOutput ? 'factReported' : 'factMissing'),
          type: t(valueTypes[details.structuredOutputType] ?? 'unknown'),
          resultType: t(details.resultTypeValid ? 'factYes' : 'factNo'),
          subtype: t(subtypeTypes[details.finalSubtypeClass] ?? 'unknown')
        })
        const notice = details.noticeClass && details.noticeClass !== 'none' ? translate(t, 'noticeDetail', {
          classification: t(noticeClasses[details.noticeClass] ?? 'noticeUnknown'),
          source: t(noticeSources[details.noticeSource] ?? 'unknown')
        }) : ''
        return translate(t, 'responseDetail', {
          mode: details.outputMode === 'native-json-schema' ? t('nativeOutput') : t('unknown'),
          reason: reasons[details.reason] ? t(reasons[details.reason]) : details.reason,
          finals: details.finalResultCount ?? t('unknown'),
          type: details.inputType, bytes: details.bytes ?? t('unknown'),
          normalized: details.normalizations?.length ? details.normalizations.join(', ') : t('noNormalization'), facts, notice
        })
      }
      const processNote = (details) => {
        if (!details?.streamReason) return null
        const reasons = { none: 'streamReasonNone', 'json-parse': 'streamReasonJson', 'frame-shape': 'streamReasonShape', 'duplicate-init': 'streamReasonDuplicateInit', 'post-result-sequence': 'streamReasonPostResult', 'result-before-init': 'streamReasonResultBeforeInit', 'multiple-results': 'streamReasonMultiple', 'error-frame': 'streamReasonError', 'permission-frame': 'streamReasonPermission', 'missing-init': 'streamReasonMissingInit', 'missing-result': 'streamReasonMissingResult', 'nonzero-exit': 'streamReasonExit', deadline: 'streamReasonDeadline', cancelled: 'streamReasonCancelled', 'output-too-large': 'streamReasonTooLarge', 'spawn-error': 'streamReasonSpawn' }
        const phases = { 'await-init': 'streamPhaseAwait', 'after-init': 'streamPhaseInit', 'after-result': 'streamPhaseResult', draining: 'streamPhaseDrain', closed: 'streamPhaseClosed' }
        const stages = { none: 'parseStageNone', line: 'parseStageLine', tail: 'parseStageTail' }
        const frames = { none: 'frameNone', 'system-init': 'frameInit', system: 'frameSystem', assistant: 'frameAssistant', result: 'frameResult', error: 'frameError', 'control-request': 'frameControl', other: 'frameOther', malformed: 'frameMalformed' }
        const terminators = { none: 'terminatorNone', 'adapter-error': 'terminatorAdapter', 'adapter-drain': 'terminatorDrain', deadline: 'terminatorDeadline', 'external-cancel': 'terminatorCancel', 'child-error': 'terminatorChildError', 'natural-close': 'terminatorClose', 'spawn-error': 'terminatorSpawn' }
        return translate(t, 'streamDetail', {
          reason: t(reasons[details.streamReason] ?? 'unknown'), phase: t(phases[details.streamPhase] ?? 'unknown'),
          stage: t(stages[details.parseStage] ?? 'unknown'), index: details.frameIndex ?? 0, count: details.frameCount ?? 0,
          bytes: details.frameBytes ?? 0, inits: details.initCount ?? 0, results: details.resultCount ?? 0,
          frame: t(frames[details.lastFrameClass] ?? 'unknown'), terminator: t(terminators[details.terminationInitiator] ?? 'unknown'),
          closed: t(details.closeObserved ? 'factYes' : 'factNo'), deadline: t(details.deadlineReached ? 'factYes' : 'factNo')
        })
      }
      const cliState = status?.cliCheck?.state === 'available'
        ? translate(t, 'cliAvailable', { version: status.cliCheck.version })
        : status?.cliCheck?.state === 'unavailable' ? translate(t, 'cliUnavailable', { code: status.cliCheck.code }) : t('notChecked')
      const readOnly = snapshot?.status !== 'ready' || snapshot?.writable !== true
      const setupState = status?.setup?.state
      const cellStyle = { padding: '10px 8px', borderBottom: '1px solid rgba(127,127,127,.2)', textAlign: 'left', verticalAlign: 'top' }

      return h('div', { style: { display: 'grid', gap: 16, padding: 18, color: 'var(--dsw-alias-label-primary, inherit)' } },
        h('header', { style: { display: 'grid', gap: 6 } }, h('h2', { style: { margin: 0 } }, t('title')), h(Notice, null, t('intro')),
          status?.pluginVersion ? h(Notice, null, translate(t, 'runtimeVersion', { version: status.pluginVersion, seconds: status.timeoutMs / 1000 })) : null),
        h('section', { style: sectionStyle(), 'aria-label': t('quickSetup') },
          h('h3', { style: { margin: 0 } }, t('quickSetup')),
          h('div', { style: rowStyle },
            h('button', { type: 'button', disabled: !!action || dirty || readOnly, onClick: setup, style: { ...buttonStyle, background: '#2563eb', color: '#fff' } }, action === 'setup' ? t('setupBusy') : t('setup')),
            h('button', { type: 'button', disabled: checking || !!action || dirty || snapshot?.status !== 'ready', onClick: checkCli, style: buttonStyle }, checking ? t('inspectBusy') : t('inspect')),
            h('span', { role: 'status' }, setupState === 'installing' ? t('installing') : setupState === 'detecting' ? t('detecting') : cliState)),
          h(Notice, null, t('setupNote')),
          h(Notice, null, t('cliCheckNote')),
          h('a', { href: 'https://www.codebuddy.ai/docs/cli/installation', target: '_blank', rel: 'noreferrer' }, t('installationGuide')),
          h('details', { open: catalog?.errorCode === 'CLI_LOGIN_REQUIRED' || lastCall?.errorCode === 'CLI_AUTH_REQUIRED' || undefined },
            h('summary', { style: { cursor: 'pointer' } }, t('loginTitle')),
            h('div', { style: { display: 'grid', gap: 10, marginTop: 12 } },
              h(Notice, null, status?.loginCommand ? t('loginHelp') : t('loginMissing')),
              status?.loginCommand ? h(React.Fragment, null,
                h('code', { style: { ...inputStyle(), display: 'block', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } }, status.loginCommand),
                h('button', { type: 'button', onClick: copyLogin, style: buttonStyle }, t('copyLogin'))) : null))),
        notice ? h('div', { role: 'status', 'aria-live': 'polite', style: { padding: '0 4px', lineHeight: 1.5, overflowWrap: 'anywhere' } }, notice) : null,
        status?.accounts ? h('section', { style: sectionStyle(), 'aria-label': t('accountsTitle') },
          h('h3', { style: { margin: 0 } }, t('accountsTitle')),
          h(Notice, null, t('accountNote')), h(Notice, null, t('accountValidation')),
          status.accounts.storageError ? h('p', { role: 'alert' }, t('accountStoreError')) : null,
          !status.accounts.supported ? h(Notice, null, t('accountUnsupported')) : h(React.Fragment, null,
            h('label', { style: { display: 'grid', gap: 6 } }, t('accountLabel'), h('input', { value: accountLabel, maxLength: 40, style: inputStyle(), onChange: event => setAccountLabel(event.target.value), 'aria-label': t('accountLabel') })),
            h('div', { style: rowStyle },
              h('button', { type: 'button', style: buttonStyle, disabled: !!action || dirty || readOnly || !accountLabel.trim() || !!status.accounts.storageError, onClick: () => accountAction('add') }, t('accountAdd')),
              h('button', { type: 'button', style: buttonStyle, disabled: !!action || dirty || readOnly || status.accounts.selectedId === null || !!status.accounts.storageError, onClick: () => accountAction('select', null) }, t('accountLegacy'))),
            ...(status.accounts.accounts || []).map(account => h('div', { key: account.id, style: sectionStyle() },
              h('strong', null, account.label, account.selected ? ` · ${t('accountSelected')}` : ''),
              h(Notice, null, t(account.pathError ? 'accountPathError' : account.credentialsPresent ? 'accountHasCredential' : 'accountNoCredential')),
              h(Notice, null, translate(t, 'accountUsage', {
                calls: account.usage?.calls || 0, input: account.usage?.inputTokens || 0, output: account.usage?.outputTokens || 0,
                cancelled: account.usage?.cancelledRequests || 0, offloads: account.usage?.imageOffloadRequests || 0,
                images: account.usage?.offloadImagesRequested || 0, history: account.usage?.historyOffloadedImages || 0
              })),
              h('div', { style: rowStyle },
                h('button', { type: 'button', style: buttonStyle, disabled: !!action || dirty || readOnly || account.selected || account.pathError, onClick: () => accountAction('select', account.id) }, t('accountUse')),
                h('button', { type: 'button', style: buttonStyle, disabled: !!action || dirty || readOnly || account.pathError, onClick: () => accountAction('prepareLogin', account.id) }, t('accountPrepare')),
                h('button', { type: 'button', style: buttonStyle, disabled: !!action || dirty || readOnly || account.selected || account.activeCalls > 0, onClick: () => setConfirmAccountRemoval(account.id) }, t('accountRemove'))),
              account.loginCommand ? h('div', { style: { display: 'grid', gap: 8 } },
                h('code', { style: { overflowWrap: 'anywhere' } }, account.loginCommand),
                h('button', { type: 'button', style: buttonStyle, onClick: async () => { try { await navigator.clipboard.writeText(account.loginCommand); setNotice(t('copied')) } catch { setNotice(t('accountPrepare')) } } }, t('copyLogin'))) : null,
              confirmAccountRemoval === account.id ? h('div', { style: rowStyle },
                h('button', { type: 'button', style: buttonStyle, disabled: !!action || readOnly, onClick: () => accountAction('remove', account.id) }, t('accountConfirmRemove')),
                h('button', { type: 'button', style: buttonStyle, onClick: () => setConfirmAccountRemoval('') }, t('accountCancel'))) : null))),
          h(Notice, null, t('accountPrivacy')), h(Notice, null, t('accountStoreScope')),
          h('details', null, h('summary', { style: { cursor: 'pointer' } }, t('accountGuide')),
            h(Notice, null, t('accountGuideSteps')), h(Notice, null, t('accountGuideErrors')),
            h('a', { href: t('accountGuideUrl'), target: '_blank', rel: 'noreferrer' }, t('accountGuideLink')))) : null,
        h('details', { style: { ...sectionStyle(), display: 'block' }, 'aria-label': t('settings') },
          h('summary', { style: { cursor: 'pointer', fontWeight: 600 } }, t('settings')),
          h('div', { style: { display: 'grid', gap: 12, marginTop: 14 } },
          textInput('cliPath'), textInput('configDir'),
          textInput('model', 'text', { list: 'dsh-codebuddy-models', placeholder: t('modelPlaceholder') }),
          h('datalist', { id: 'dsh-codebuddy-models' }, ...models.map((item) => h('option', { key: item.id, value: item.id }, `${item.name}${item.multiplier !== null ? ` · ×${item.multiplier}` : ''}`))),
          h(Notice, null, t('modelNote')),
          label('effort', h('select', { value: draft.effort ?? '', onChange: (event) => edit('effort', event.target.value), style: inputStyle() },
            h('option', { value: '' }, t('followDefault')),
            ...efforts.map((item) => h('option', { key: item.id, value: item.id }, item.name)),
            draft.effort && !efforts.some((item) => item.id === draft.effort) ? h('option', { value: draft.effort }, draft.effort) : null)),
          textInput('timeoutMs', 'number'),
          h(Notice, null, t('timeoutHelp')),
          h('div', { style: rowStyle }, h('button', { type: 'button', disabled: busy || !!action || !dirty || readOnly, onClick: save, style: buttonStyle }, busy ? t('saving') : t('save'))),
          dirty ? h(Notice, null, t('saveFirst')) : null)),
        h('section', { style: sectionStyle(), 'aria-label': t('models') },
          h('div', { style: { ...rowStyle, justifyContent: 'space-between' } },
            h('h3', { style: { margin: 0 } }, t('models')),
            h('button', { type: 'button', disabled: !!action || dirty || snapshot?.status !== 'ready', onClick: refreshModels, style: buttonStyle }, action === 'refreshModels' || catalog?.state === 'checking' ? t('refreshing') : t('refreshModels'))),
          h(Notice, null, models.length ? translate(t, 'catalogReady', { count: models.length, time: formatTime(catalog.fetchedAt) }) : catalog?.errorMessage || t('catalogEmpty')),
          catalog?.state === 'stale' ? h(Notice, null, translate(t, 'catalogStale', { message: catalog.errorMessage })) : null,
          h(Notice, null, t('catalogNote')),
          models.length ? h(React.Fragment, null,
            h('input', { type: 'search', value: search, onChange: (event) => setSearch(event.target.value), placeholder: t('searchModels'), 'aria-label': t('searchModels'), style: inputStyle() }),
            h('div', { style: { overflowX: 'auto' } }, h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 14 } },
              h('thead', null, h('tr', null, ...['modelName', 'multiplier', 'efforts', 'context', 'imageInput'].map((key) => h('th', { key, scope: 'col', style: { ...cellStyle, whiteSpace: 'nowrap' } }, t(key))))),
              h('tbody', null, ...shown.map((item) => h('tr', { key: item.id },
                h('td', { style: cellStyle }, h('div', { style: { fontWeight: 600 } }, item.name), h('code', { style: { opacity: .75, fontSize: 12, overflowWrap: 'anywhere' } }, item.id)),
                h('td', { style: { ...cellStyle, whiteSpace: 'nowrap' } }, item.multiplier !== null ? `×${item.multiplier}` : item.credits || t('unknown')),
                h('td', { style: cellStyle }, item.efforts?.map((option) => option.id).join(' / ') || t('noEffort')),
                h('td', { style: { ...cellStyle, whiteSpace: 'nowrap' } }, item.contextWindow ? item.contextWindow.toLocaleString() : t('unknown')),
                h('td', { style: cellStyle }, item.supportsImages === true ? t('imagesSupported') : t('imagesUnknown')))),
              !shown.length ? h('tr', null, h('td', { colSpan: 5, style: cellStyle }, t('noMatches'))) : null)))) : null,
          h(Notice, null, t('creditsNote')), h(Notice, null, t('imageNote'))),
        h('section', { style: sectionStyle(), 'aria-label': t('usage') },
          h('h3', { style: { margin: 0 } }, t('usage')),
          status?.usage ? h(React.Fragment, null,
            h('div', null, translate(t, 'usageTotals', { calls: status.usage.calls, input: status.usage.inputTokens, output: status.usage.outputTokens })),
            h(Notice, null, translate(t, 'outcomeTotals', {
              cancelled: status.usage.cancelledRequests || 0, offloads: status.usage.imageOffloadRequests || 0,
              images: status.usage.offloadImagesRequested || 0, history: status.usage.historyOffloadedImages || 0
            })),
            status.usage.uncachedInputTokens !== undefined ? h(Notice, null, translate(t, 'usageBreakdown', { uncached: status.usage.uncachedInputTokens, read: status.usage.cacheReadTokens, write: status.usage.cacheWriteTokens })) : null,
            lastCall ? h(Notice, null, lastCall.state === 'error' ? translate(t, 'lastFailed', { code: lastCall.errorCode ?? 'CLI_ERROR' })
              : translate(t, 'lastCall', { model: lastCall.model, time: formatTime(lastCall.at), input: lastCall.inputTokens ?? 0, output: lastCall.outputTokens ?? 0 })) : h(Notice, null, t('noUsage')),
            lastCall?.state === 'error' && lastCall.errorMessage ? h(Notice, null, lastCall.errorMessage) : null,
            lastCall?.id ? h(Notice, null, translate(t, 'diagnosticId', { id: lastCall.id })) : null,
            lastCall?.processDiagnostics ? h(Notice, null, translate(t, 'timeoutDetail', { seconds: (lastCall.processDiagnostics.elapsedMs / 1000).toFixed(2), stdout: lastCall.processDiagnostics.stdoutBytes, stderr: lastCall.processDiagnostics.stderrBytes })) : null,
            lastCall?.processDiagnostics ? processNote(lastCall.processDiagnostics) : null,
            lastCall?.responseDiagnostics ? h(Notice, null, responseNote(lastCall.responseDiagnostics)) : null,
            lastCall?.uncachedInputTokens !== undefined ? h(Notice, null, translate(t, 'usageBreakdown', { uncached: lastCall.uncachedInputTokens, read: lastCall.cacheReadTokens, write: lastCall.cacheWriteTokens })) : null,
            lastCall?.diagnostics?.promptBytes !== undefined ? h(Notice, null, translate(t, 'requestSize', {
              messages: sizeValue(lastCall.diagnostics.messageCount), tools: sizeValue(lastCall.diagnostics.toolCount),
              total: sizeValue(lastCall.diagnostics.promptBytes), system: sizeValue(lastCall.diagnostics.systemBytes),
              history: sizeValue(lastCall.diagnostics.messagesBytes), schemas: sizeValue(lastCall.diagnostics.toolsBytes)
            })) : null,
            lastCall?.diagnostics?.schemaBytes !== undefined ? h(Notice, null, translate(t, 'requestSizeExtra', {
              schema: sizeValue(lastCall.diagnostics.schemaBytes), overhead: sizeValue(lastCall.diagnostics.envelopeOverheadBytes),
              input: sizeValue(lastCall.diagnostics.cliInputBytes)
            })) : null,
            requestBudgetNote(lastCall?.diagnostics) ? h(Notice, null, requestBudgetNote(lastCall.diagnostics)) : null,
            Number.isFinite(lastCall?.durationMs) ? h(Notice, null, translate(t, 'requestTime', { seconds: (lastCall.durationMs / 1000).toFixed(2) })) : null,
            status.activeCalls > 0 ? h(Notice, null, translate(t, 'active', { count: status.activeCalls })) : null) : h(Notice, null, t('noUsage')),
          h(Notice, null, t('usageNote')),
          status?.usage?.recentFailures?.length ? h('details', null,
            h('summary', { style: { cursor: 'pointer' } }, t('recentFailures')),
            ...status.usage.recentFailures.map((failure, index) => h('div', { key: index, style: { display: 'grid', gap: 6, marginTop: 12 } },
              h(Notice, null, `${formatTime(failure.at)} · ${failure.model} · ${failure.errorCode}`),
              h(Notice, null, failure.errorMessage),
              failure.id ? h(Notice, null, translate(t, 'diagnosticId', { id: failure.id })) : null,
              requestBudgetNote(failure.diagnostics) ? h(Notice, null, requestBudgetNote(failure.diagnostics)) : null,
              failure.processDiagnostics ? h(Notice, null, processNote(failure.processDiagnostics)) : null,
              failure.responseDiagnostics ? h(Notice, null, responseNote(failure.responseDiagnostics)) : null))) : null),
        h('details', { style: { ...sectionStyle(), display: 'block' }, 'aria-label': t('guideTitle'), open: lastCall?.state === 'error' || undefined },
          h('summary', { style: { cursor: 'pointer', fontWeight: 600 } }, t('guideTitle')),
          h('div', { style: { display: 'grid', gap: 12, marginTop: 14 } },
            h(Notice, null, t('guideIntro')),
            ...['guideMultiple', 'guideIncomplete', 'guideProgress', 'guideLiteral', 'guideAccess', 'guideRequestSize', 'guideLimits', 'guideNetwork', 'guideLogs'].map(key => h('div', { key },
              h('h4', { style: { margin: '0 0 6px' } }, t(`${key}Title`)), h(Notice, null, t(key)))),
            h('a', { href: t('guideFullUrl'), target: '_blank', rel: 'noreferrer' }, t('guideFull')))),
        h('section', { style: sectionStyle(), 'aria-label': t('logsTitle') },
          h('h3', { style: { margin: 0 } }, t('logsTitle')), h(Notice, null, t('logsNote')),
          h(Notice, null, translate(t, 'logsStatus', { entries: status?.logs?.entries ?? 0, failures: status?.logs?.failures ?? 0, samples: status?.logs?.samples ?? 0 })),
          status?.logs?.storageError ? h('div', { role: 'alert' }, translate(t, 'logsStorageError', { code: status.logs.storageError })) : null,
          h('div', { style: rowStyle },
            h('button', { type: 'button', disabled: logBusy, style: buttonStyle, onClick: () => logReport ? setLogReport(null) : logAction('view') }, logReport ? t('hideLogs') : t('viewLogs')),
            h('button', { type: 'button', disabled: logBusy, style: buttonStyle, onClick: () => logAction('exportLogs') }, t('exportLogs')),
            h('button', { type: 'button', disabled: logBusy, style: buttonStyle, onClick: () => setConfirmClear(true) }, t('clearLogs'))),
          confirmClear ? h('div', { style: rowStyle },
            h('button', { type: 'button', disabled: logBusy, style: buttonStyle, onClick: () => logAction('clearLogs') }, t('confirmClear')),
            h('button', { type: 'button', style: buttonStyle, onClick: () => setConfirmClear(false) }, t('cancelClear'))) : null,
          h(Notice, null, t('captureNotice')),
          h('label', { style: { display: 'flex', gap: 8, alignItems: 'flex-start' } },
            h('input', { type: 'checkbox', checked: logConsent, onChange: event => { setLogConsent(event.target.checked); if (!event.target.checked) setLogReport(null) } }), t('captureConsent')),
          h('div', { style: rowStyle },
            status?.logs?.captureArmed
              ? h('button', { type: 'button', disabled: logBusy, style: buttonStyle, onClick: () => logAction('cancelCapture') }, t('cancelCapture'))
              : h('button', { type: 'button', disabled: logBusy || !logConsent || !status?.logs, style: buttonStyle, onClick: () => logAction('armCapture') }, t('armCapture')),
            h('button', { type: 'button', disabled: logBusy || !logConsent || !status?.logs?.samples, style: buttonStyle, onClick: () => logAction('preview') }, t('previewDetailed')),
            h('button', { type: 'button', disabled: logBusy || !logConsent || !status?.logs?.samples, style: buttonStyle, onClick: () => logAction('exportDetailedLogs') }, t('exportDetailed'))),
          status?.logs?.captureArmed ? h('div', { role: 'status' }, t('captureArmed')) : null,
          logReport ? h('pre', { 'aria-label': t('logsTitle'), style: { ...inputStyle(), maxHeight: 360, overflow: 'auto', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 12 } }, JSON.stringify(logReport, null, 2)) : null,
          h(Notice, null, t('logsHelp'))),
        h('section', { style: sectionStyle(), 'aria-label': t('balance') },
          h('h3', { style: { margin: 0 } }, t('balance')), h(Notice, null, t('balanceNote')),
          h('a', { href: status?.balance?.officialHome ?? 'https://www.codebuddy.ai', target: '_blank', rel: 'noreferrer' }, t('openHome'))),
        h(Notice, null, t('toolNote')))
    }

    const name = 'dsh-codebuddy-cli-intl-client'
    const BUNDLE_NAME = 'dsh-codebuddy-cli-intl'
    const inject = ['slots', 'locale', 'configForms']
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register('settings.codebuddy-cli-intl', { zh: localeZh, en: localeEn }), 'dsh-codebuddy-cli-intl: locales')
      const t = ctx.locale.bind('settings.codebuddy-cli-intl')
      const form = ctx.configForms.get(NS)
      ctx.effect(() => ctx.configForms.whileServed([NS], () => ctx.slots.inject('plugins.row.config', () => ctx.slots.register({
        name: 'plugins.row.config', key: `${BUNDLE_NAME}#${NS}`, locale: 'settings.codebuddy-cli-intl',
        inject: () => ({ legacyForm: form, statusUrl: STATUS_PATH, actionUrl: ACTION_PATH, t })
      }, CodeBuddySettingsPage))), 'dsh-codebuddy-cli-intl: settings page')
    }
    Object.assign(exports, { BUNDLE_NAME, apply, inject, name })
    return module.exports
  }
})
