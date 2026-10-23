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
    const localeZh = {
      title: 'CodeBuddy CLI（国际版）',
      intro: '使用官方 CodeBuddy CLI，把账号额度用于 DSH 中选择的模型。模型目录和积分倍率自动同步，工具由 DSH 执行。',
      quickSetup: 'CLI 自动配置', setup: '一键配置 CLI', setupBusy: '配置中…',
      setupNote: '先查找本机安装；未安装时下载并运行官方安装器。支持 Windows x64、macOS 和 Linux，无需手填用户名或安装路径。',
      detecting: '正在查找并检查 CLI…', installing: '正在安装官方 CLI，请稍候…',
      setupReady: 'CLI 已配置，版本 {version}。', actionFailed: '操作未完成，请检查网络后重试。',
      installationGuide: '官方安装指南', loginTitle: '首次登录或切换账号', copyLogin: '复制登录命令', copied: '已复制登录命令',
      loginHelp: '在 PowerShell（macOS/Linux 使用终端）中粘贴运行，输入 /login，选择 International Site 并完成登录，然后点击“刷新模型与倍率”。若提示 401，请重新执行官方登录流程。',
      loginMissing: '先完成 CLI 自动配置，再获取登录命令。',
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
      responseDetail: '结果诊断：{reason} · 返回类型 {type} · {bytes} 字节 · 兼容处理 {normalized}。基础诊断不含正文。',
      parseValid: '结构有效', parsePlainText: '纯文本答复（未执行工具）', parseEmpty: '模型结果为空', parseIncomplete: 'JSON 未闭合，可能截断', parseSyntax: 'JSON 语法不合法', parseAmbiguous: '多个结果，无法确定', parseEnvelope: '根结构不符合协议', parseText: 'text 字段缺失或类型错误', parseCalls: 'toolCalls 不是数组', parseUnknownTool: '工具未声明', parseArguments: '工具参数不合法', noNormalization: '无需处理',
      recentFailures: '最近失败记录（最多 5 条，重启后清空）',
      diagnosticId: '诊断 ID：{id}（可在导出日志中查找）',
      guideTitle: '故障处理与使用指南', guideIntro: '格式错误不一定能自动恢复。先确认已执行的操作，再按对应情况处理；不要盲目重复写入或运行命令。',
      guideMultipleTitle: '多个不同的回复或工具方案', guideMultiple: '出现 ambiguous-json 时，不同方案无法自动选择或合并。先查 DSH 工具记录和当前文件状态，再用简短新对话说明已完成内容，只请求下一项明确操作。相同文字和相同有序工具参数的重复结果会去重交付一次；不同方案继续拦截。',
      guideIncompleteTitle: 'JSON 未闭合或文字语法错误', guideIncomplete: '可能存在截断、漏引号或转义错误。完整且明确没有工具的文字转义错误可有限恢复；缺失内容不会被猜测补齐。把任务分成较小步骤、缩短单次回复，保留完整错误和诊断 ID。',
      guideProgressTitle: '工具做完了，最后仍提示失败', guideProgress: '最终回复失败不代表之前的工具没有执行。先核对工具记录、文件内容和退出码，再决定是否重试；只让模型汇总已有结果时，明确说明不要重复已完成操作。',
      guideLiteralTitle: '路径、代码或反斜杠显示不符', guideLiteral: '正常结束也可能存在模型文字保真问题。要求只重写有差异的一小段代码块，并核对原始字符。插件不会对合法回复统一二次反转义，以免改坏正常代码或工具参数。',
      guideAccessTitle: 'CLI、登录、超时或文件权限', guideAccess: '版本检查只说明程序能启动。401 请走官方登录；模型权限或额度由官方判断。超时可拆分任务并按需增加时限。文件或 ACL 错误先确认 DSH 工作区与路径，不要为修复格式错误更改权限。',
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
      creditsNote: '倍率来自本次 CLI 返回的官方目录；×0 表示当前目录标记为免费。活动和计费可能调整，实际扣费以官方为准。',
      searchModels: '搜索模型名称或 ID', modelName: '模型 / ID', multiplier: '积分倍率', efforts: '推理强度', context: '上下文',
      unknown: '官方未提供', noEffort: '模型默认', noMatches: '没有匹配的模型。',
      usage: '本次运行的累计 Token 用量', usageNote: '累计输入包含未缓存、缓存命中和缓存写入，每项只计一次；不是单条提问的字数，也不代表积分扣费。重启后清零。',
      usageTotals: '累计请求 {calls} 次 · 累计输入（含缓存）{input} · 累计输出 {output} Token',
      usageBreakdown: '输入明细：未缓存 {uncached} · 缓存命中 {read} · 缓存写入 {write} Token',
      requestSize: '最近请求：{messages} 条历史消息 · {tools} 个工具；发送文本 {total} 字节（系统 {system} / 历史 {history} / 工具 {schemas}）。字节数不是 Token 数，不含 CLI 内部开销。',
      requestTime: '最近调用总耗时 {seconds} 秒。当前为完整 JSON 返回，不提供模型生成速度。',
      noUsage: '尚未通过 DSH 发起模型请求。插件不会自动发送测试问题。',
      lastCall: '最近一次：{model} · {time} · 单次输入（含缓存）{input} / 输出 {output} Token',
      lastFailed: '最近一次请求失败：{code}', active: '当前正在处理 {count} 个请求',
      balance: '积分余额', balanceNote: '剩余积分请在 CodeBuddy 官网“个人主页 → 套餐与用量”查看。模型倍率和本页 Token 统计不代表剩余额度。',
      openHome: '打开 CodeBuddy 官网查看用量',
      toolNote: '模型目录以当前国际 CLI 返回结果为准，账号权限由官方判断。当前插件传递文本对话，DSH 负责执行工具。'
    }
    const localeEn = {
      title: 'CodeBuddy CLI (International)',
      intro: 'Use your official CLI credits for models selected in DSH. Models and credit multipliers refresh automatically; DSH executes tools.',
      quickSetup: 'Automatic CLI setup', setup: 'Set up CLI', setupBusy: 'Setting up…',
      setupNote: 'Find an existing installation, or download and run the official installer. Supports Windows x64, macOS and Linux without entering a user-specific path.',
      detecting: 'Finding and checking CLI…', installing: 'Installing the official CLI…',
      setupReady: 'CLI configured, version {version}.', actionFailed: 'The action failed. Check your network and retry.',
      installationGuide: 'Official installation guide', loginTitle: 'Sign in or switch account', copyLogin: 'Copy sign-in command', copied: 'Sign-in command copied',
      loginHelp: 'Paste into PowerShell (Terminal on macOS/Linux), run /login, choose International Site and complete sign-in, then refresh models. Repeat official sign-in for a 401 error.',
      loginMissing: 'Set up the CLI first to obtain its sign-in command.',
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
      responseDetail: 'Result: {reason} · type {type} · {bytes} bytes · normalization {normalized}. Basic diagnostics contain no reply content.',
      parseValid: 'Valid protocol', parsePlainText: 'Plain-text reply (no tools executed)', parseEmpty: 'Empty result', parseIncomplete: 'Unclosed JSON, possibly truncated', parseSyntax: 'Invalid JSON syntax', parseAmbiguous: 'Multiple ambiguous results', parseEnvelope: 'Invalid root structure', parseText: 'Missing or invalid text', parseCalls: 'toolCalls is not an array', parseUnknownTool: 'Undeclared tool', parseArguments: 'Invalid tool arguments', noNormalization: 'None',
      recentFailures: 'Recent failures (up to 5, cleared on restart)',
      diagnosticId: 'Diagnostic ID: {id} (search for this in exported logs)',
      guideTitle: 'Troubleshooting and usage guide', guideIntro: 'Some format failures cannot be recovered automatically. Check completed operations before retrying a write or command.',
      guideMultipleTitle: 'Different replies or tool plans', guideMultiple: 'For ambiguous-json, conflicting plans cannot be selected or merged automatically. Check DSH tool records and current files, then start a short conversation describing completed work and one clear next action. Identical text and ordered tool payloads are delivered once; differing plans remain blocked.',
      guideIncompleteTitle: 'Incomplete JSON or string syntax', guideIncomplete: 'Output may be truncated or contain missing quotes or bad escapes. Limited escape recovery requires complete explicitly text-only replies; missing content is never invented. Split large tasks, shorten each response, and retain the full error and diagnostic ID.',
      guideProgressTitle: 'Tools completed but the final reply failed', guideProgress: 'A failed final reply does not undo earlier tools. Check tool records, file contents and exit codes before retrying. When requesting only a summary of completed work, explicitly ask not to repeat completed operations.',
      guideLiteralTitle: 'Paths, code or backslashes differ', guideLiteral: 'A successful turn may still contain model fidelity errors. Ask for only the affected short code block and compare literal characters. The adapter never unescapes all valid replies twice, which could corrupt code or arguments.',
      guideAccessTitle: 'CLI, sign-in, deadlines or file permissions', guideAccess: 'A version check only proves the executable starts. Use official sign-in for 401 errors; model access and credits are controlled by the service. Split slow tasks or adjust the deadline. For file or ACL failures, confirm the DSH workspace and path rather than changing permissions to fix response formatting.',
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
      creditsNote: 'Rates come from the current official CLI catalog; ×0 means the catalog currently marks it free. Promotions and billing can change; official billing is authoritative.',
      searchModels: 'Search model name or ID', modelName: 'Model / ID', multiplier: 'Credit multiplier', efforts: 'Reasoning efforts', context: 'Context',
      unknown: 'Not provided', noEffort: 'Model default', noMatches: 'No matching models.',
      usage: 'Cumulative token usage this run', usageNote: 'Input includes uncached, cache-read and cache-write tokens, counted once. This is not the latest question length or billed credits. Resets on restart.',
      usageTotals: '{calls} cumulative requests · {input} total input (including cache) · {output} total output tokens',
      usageBreakdown: 'Input breakdown: {uncached} uncached · {read} cache read · {write} cache write tokens',
      requestSize: 'Last request: {messages} messages · {tools} tools; {total} bytes sent (system {system} / history {history} / schemas {schemas}). Bytes are not tokens; CLI internal overhead is excluded.',
      requestTime: 'Last call took {seconds} seconds. Complete JSON responses do not expose model decoding speed.',
      noUsage: 'No DSH model request yet. The plugin does not send test prompts automatically.',
      lastCall: 'Last: {model} · {time} · {input} input (including cache) / {output} output tokens for this call',
      lastFailed: 'Last request failed: {code}', active: '{count} request(s) active',
      balance: 'Credits', balanceNote: 'Check remaining credits under “Profile → Plan and Usage” on the CodeBuddy website. Model rates and token counters are not remaining credits.',
      openHome: 'Open CodeBuddy usage page', toolNote: 'Models come from the current international CLI; account permissions are enforced by the official service. This plugin sends text conversations and DSH executes tools.'
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
      const shown = models.filter((item) => `${item.name} ${item.id}`.toLowerCase().includes(search.toLowerCase()))
      const lastCall = status?.usage?.lastCall
      const responseNote = (details) => {
        const reasons = { valid: 'parseValid', 'plain-text-fallback': 'parsePlainText', 'empty-result': 'parseEmpty', 'empty-content': 'parseEmpty', 'possibly-truncated-json': 'parseIncomplete', 'invalid-json': 'parseSyntax', 'ambiguous-json': 'parseAmbiguous', 'invalid-envelope': 'parseEnvelope', 'invalid-text-field': 'parseText', 'invalid-tool-calls-field': 'parseCalls', 'unknown-tool': 'parseUnknownTool', 'invalid-tool-arguments': 'parseArguments', 'invalid-tool-arguments-json': 'parseArguments' }
        return translate(t, 'responseDetail', {
          reason: reasons[details.reason] ? t(reasons[details.reason]) : details.reason,
          type: details.inputType, bytes: details.bytes ?? t('unknown'),
          normalized: details.normalizations?.length ? details.normalizations.join(', ') : t('noNormalization')
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
              h('thead', null, h('tr', null, ...['modelName', 'multiplier', 'efforts', 'context'].map((key) => h('th', { key, scope: 'col', style: { ...cellStyle, whiteSpace: 'nowrap' } }, t(key))))),
              h('tbody', null, ...shown.map((item) => h('tr', { key: item.id },
                h('td', { style: cellStyle }, h('div', { style: { fontWeight: 600 } }, item.name), h('code', { style: { opacity: .75, fontSize: 12, overflowWrap: 'anywhere' } }, item.id)),
                h('td', { style: { ...cellStyle, whiteSpace: 'nowrap' } }, item.multiplier !== null ? `×${item.multiplier}` : item.credits || t('unknown')),
                h('td', { style: cellStyle }, item.efforts?.map((option) => option.id).join(' / ') || t('noEffort')),
                h('td', { style: { ...cellStyle, whiteSpace: 'nowrap' } }, item.contextWindow ? item.contextWindow.toLocaleString() : t('unknown')))),
              !shown.length ? h('tr', null, h('td', { colSpan: 4, style: cellStyle }, t('noMatches'))) : null)))) : null,
          h(Notice, null, t('creditsNote'))),
        h('section', { style: sectionStyle(), 'aria-label': t('usage') },
          h('h3', { style: { margin: 0 } }, t('usage')),
          status?.usage ? h(React.Fragment, null,
            h('div', null, translate(t, 'usageTotals', { calls: status.usage.calls, input: status.usage.inputTokens, output: status.usage.outputTokens })),
            status.usage.uncachedInputTokens !== undefined ? h(Notice, null, translate(t, 'usageBreakdown', { uncached: status.usage.uncachedInputTokens, read: status.usage.cacheReadTokens, write: status.usage.cacheWriteTokens })) : null,
            lastCall ? h(Notice, null, lastCall.state === 'error' ? translate(t, 'lastFailed', { code: lastCall.errorCode ?? 'CLI_ERROR' })
              : translate(t, 'lastCall', { model: lastCall.model, time: formatTime(lastCall.at), input: lastCall.inputTokens ?? 0, output: lastCall.outputTokens ?? 0 })) : h(Notice, null, t('noUsage')),
            lastCall?.state === 'error' && lastCall.errorMessage ? h(Notice, null, lastCall.errorMessage) : null,
            lastCall?.id ? h(Notice, null, translate(t, 'diagnosticId', { id: lastCall.id })) : null,
            lastCall?.processDiagnostics ? h(Notice, null, translate(t, 'timeoutDetail', { seconds: (lastCall.processDiagnostics.elapsedMs / 1000).toFixed(2), stdout: lastCall.processDiagnostics.stdoutBytes, stderr: lastCall.processDiagnostics.stderrBytes })) : null,
            lastCall?.responseDiagnostics ? h(Notice, null, responseNote(lastCall.responseDiagnostics)) : null,
            lastCall?.uncachedInputTokens !== undefined ? h(Notice, null, translate(t, 'usageBreakdown', { uncached: lastCall.uncachedInputTokens, read: lastCall.cacheReadTokens, write: lastCall.cacheWriteTokens })) : null,
            lastCall?.diagnostics ? h(Notice, null, translate(t, 'requestSize', { messages: lastCall.diagnostics.messageCount, tools: lastCall.diagnostics.toolCount, total: lastCall.diagnostics.promptBytes, system: lastCall.diagnostics.systemBytes, history: lastCall.diagnostics.messagesBytes, schemas: lastCall.diagnostics.toolsBytes })) : null,
            Number.isFinite(lastCall?.durationMs) ? h(Notice, null, translate(t, 'requestTime', { seconds: (lastCall.durationMs / 1000).toFixed(2) })) : null,
            status.activeCalls > 0 ? h(Notice, null, translate(t, 'active', { count: status.activeCalls })) : null) : h(Notice, null, t('noUsage')),
          h(Notice, null, t('usageNote')),
          status?.usage?.recentFailures?.length ? h('details', null,
            h('summary', { style: { cursor: 'pointer' } }, t('recentFailures')),
            ...status.usage.recentFailures.map((failure, index) => h('div', { key: index, style: { display: 'grid', gap: 6, marginTop: 12 } },
              h(Notice, null, `${formatTime(failure.at)} · ${failure.model} · ${failure.errorCode}`),
              h(Notice, null, failure.errorMessage),
              failure.id ? h(Notice, null, translate(t, 'diagnosticId', { id: failure.id })) : null,
              failure.responseDiagnostics ? h(Notice, null, responseNote(failure.responseDiagnostics)) : null))) : null),
        h('details', { style: { ...sectionStyle(), display: 'block' }, 'aria-label': t('guideTitle'), open: lastCall?.state === 'error' || undefined },
          h('summary', { style: { cursor: 'pointer', fontWeight: 600 } }, t('guideTitle')),
          h('div', { style: { display: 'grid', gap: 12, marginTop: 14 } },
            h(Notice, null, t('guideIntro')),
            ...['guideMultiple', 'guideIncomplete', 'guideProgress', 'guideLiteral', 'guideAccess', 'guideLogs'].map(key => h('div', { key },
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
