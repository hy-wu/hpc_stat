# Meet2AI 模型 — 分组 — 价格速查表

> 数据来源：https://meet2ai.com `/api/pricing`（Bearer）与各分组 `/v1/models`，抓取于 2026-08-19。
> 平台 pricing_version：`a42d372ccf0b5dd13ecf71203521f9d2`（实时接口值，会随平台调整而变）。

## 计费口径

平台说明原文：**「美元计价已包含分组倍率，实际价格还要除以4，因充10元得40美元，买VIP月卡后还能再打5至6折，月卡再送30美元」**。

- 官方价（`$in / $out`，每百万 token，美元）见「官方价」表，官方未公布的模型标 `—`；
- 有效美元价 = 官方价 × 分组倍率（group_ratio）；
- 人民币 ≈ 有效美元价 ÷ 4（1 元 ≈ 4 美元额度）；开 VIP 月卡在 ¥ 基础上再打 5~6 折。
- 命中缓存价 = 官方输入价 × `hit`（命中倍率；未公布则按 0.1×输入价估算）。

## 一、分组倍率（group_ratio 实时值）

| 分组 | 倍率 |
|---|---|
| Anthropic 官方API【长期】 | 31.2 |
| Anthropic 官方API转发 | 26 |
| 官方CC转发【最稳】 | 36.4 |
| Claude Code Openclaw专属号池 | 7.9 |
| 【稳定版】Claude code Max | 7.9 |
| 【代理外接版】Claude code Max | 8.5 |
| ClaudeCode-Kiro-ultra | 5.2 |
| Krio Fable-5 power企业号 | 2.6 |
| ClaudeCode限时满血特价 | 2.6 |
| GPT Pro 大客户专用 | 2.8 |
| banana Pro 官转 | 2.3 |
| GPT Codex 全家桶 | 1.45 |
| JH-独立GPT | 1.45 |
| svip活动分组 | 1.2 |
| 常用ClaudeCode Kiro-1 | 0.82 |
| 常用GPT | 0.8 |
| JH-福利分组 | 0.78 |
| 爆炸低价-GPT限时活动 | 0.45 |
| 国产Token计划 | 4 |
| 国产福利渠道【OpenAI格式】 | 1.66 |

我使用的 7 个分组（对应 DSH providers）：

| DSH provider | 分组 | 倍率 | 协议 |
|---|---|---|---|
| qwen-token-plan-cn | 国产Token计划 | 4 | openai-completions |
| meet2ai-gpt | GPT Codex 全家桶 | 1.45 | openai-responses |
| meet2ai-claude | JH-福利分组 | 0.78 | openai-completions |
| meet2ai-blow | 爆炸低价-GPT限时活动 | 0.45 | openai-completions |
| cc-kiro-1 | 常用ClaudeCode Kiro-1 | 0.82 | anthropic-messages |
| krio | ClaudeCode-Kiro-ultra | 5.2 | anthropic-messages |
| meet2ai-cc-bytime | ClaudeCode限时满血特价 | 2.6 | anthropic-messages |

## 二、分组 → 模型清单（/v1/models 实测）

### qwen-token-plan-cn → 国产Token计划（4x，协议 openai-completions）

`deepseek-v4-flash` · `deepseek-v4-pro` · `kimi-k3`

### meet2ai-gpt → GPT Codex 全家桶（1.45x，协议 openai-responses）

`codex-auto-review` · `gpt-5.4` · `gpt-5.4-mini` · `gpt-5.4-openai-compact` · `gpt-5.5` · `gpt-5.5-openai-compact` · `gpt-5.6-sol` · `gpt-5.6-terra`

### meet2ai-claude → JH-福利分组（0.78x，协议 openai-completions）

`claude-fable-5` · `claude-opus-4-6` · `claude-opus-4-7` · `claude-opus-4-8` · `claude-sonnet-4-6` · `codex-auto-review` · `gpt-5.4` · `gpt-5.4-mini` · `gpt-5.5` · `gpt-5.5-openai-compact` · `gpt-5.6-luna` · `gpt-5.6-sol` · `gpt-5.6-terra`

### meet2ai-blow → 爆炸低价-GPT限时活动（0.45x，协议 openai-completions）

`codex-auto-review` · `gpt-5.4` · `gpt-5.4-mini` · `gpt-5.4-openai-compact` · `gpt-5.5` · `gpt-5.5-openai-compact` · `gpt-5.6-sol` · `gpt-5.6-terra`

### cc-kiro-1 → 常用ClaudeCode Kiro-1（0.82x，协议 anthropic-messages）

`claude-haiku-4-5-20251001` · `claude-opus-4-6` · `claude-opus-4-7` · `claude-opus-4-8` · `claude-opus-5` · `claude-sonnet-4-6`

### krio → ClaudeCode-Kiro-ultra（5.2x，协议 anthropic-messages）

`claude-fable-5` · `claude-haiku-4-5-20251001` · `claude-opus-4-6` · `claude-opus-4-7` · `claude-opus-4-8` · `claude-sonnet-4-6`

### meet2ai-cc-bytime → ClaudeCode限时满血特价（2.6x，协议 anthropic-messages）

`claude-fable-5` · `claude-haiku-4-5-20251001` · `claude-opus-4-6` · `claude-opus-4-7` · `claude-opus-4-8` · `claude-opus-5` · `claude-sonnet-4-6`

## 三、官方价（每百万 token，美元）

| 模型 | 输入 | 输出 | 命中缓存 | 上下文 |
|---|---|---|---:|---:|
| claude-fable-5 | $10 | $50 | $1 | 1M |
| claude-opus-4-6 | $5 | $25 | $0.5 | 1M |
| claude-opus-4-7 | $5 | $25 | $0.5 | 1M |
| claude-opus-4-8 | $5 | $25 | $0.5 | 1M |
| claude-opus-5 | $5 | $25 | $0.5 | 1M |
| claude-sonnet-4-6 | $3 | $15 | $0.3 | 200K |
| claude-haiku-4-5-20251001 | $1 | $5 | $0.1 | 200K |
| gpt-5.6-sol | $5 | $30 | $0.5 | 1M |
| gpt-5.6-terra | $2 | $12 | — | — |
| gpt-5.6-luna | $0.2 | $1.2 | — | — |
| gpt-5.5 | $5 | $30 | $0.5 | 1.1M |
| gpt-5.4 | $2.5 | $15 | $0.25 | 1M |
| gpt-5.4-mini | $0.75 | $4.5 | $0.075 | 400K |
| deepseek-v4-flash | $0.1 | $0.2 | — | 1M |
| deepseek-v4-pro | $1.6 | $3.2 | — | 1M |

未纳入官方价表（无可靠官方美元价）：`codex-auto-review`、`gpt-5.4-openai-compact`、`gpt-5.5-openai-compact`、`kimi-k3`。

## 四、重点模型 × 分组 有效人民币价（每百万 token，含倍率，÷4，未计 VIP 折）

### claude-fable-5 

| 分组 | 倍率 | 输入/百万 | 输出/百万 |
|---|---|---|---|
| JH-福利分组 | 0.78× | ¥1.95 | ¥9.75 |
| ClaudeCode-Kiro-ultra | 5.2× | ¥13.00 | ¥65.00 |
| ClaudeCode限时满血特价 | 2.6× | ¥6.50 | ¥32.50 |

### claude-sonnet-4-6 

| 分组 | 倍率 | 输入/百万 | 输出/百万 |
|---|---|---|---|
| JH-福利分组 | 0.78× | ¥0.58 | ¥2.93 |
| 常用ClaudeCode Kiro-1 | 0.82× | ¥0.61 | ¥3.07 |
| ClaudeCode-Kiro-ultra | 5.2× | ¥3.90 | ¥19.50 |
| ClaudeCode限时满血特价 | 2.6× | ¥1.95 | ¥9.75 |

### claude-opus-4-6 （4-7 / 4-8 / 5 同价）

| 分组 | 倍率 | 输入/百万 | 输出/百万 |
|---|---|---|---|
| JH-福利分组 | 0.78× | ¥0.98 | ¥4.88 |
| 常用ClaudeCode Kiro-1 | 0.82× | ¥1.02 | ¥5.13 |
| ClaudeCode-Kiro-ultra | 5.2× | ¥6.50 | ¥32.50 |
| ClaudeCode限时满血特价 | 2.6× | ¥3.25 | ¥16.25 |

### claude-haiku-4-5-20251001 

| 分组 | 倍率 | 输入/百万 | 输出/百万 |
|---|---|---|---|
| 常用ClaudeCode Kiro-1 | 0.82× | ¥0.20 | ¥1.02 |
| ClaudeCode-Kiro-ultra | 5.2× | ¥1.30 | ¥6.50 |
| ClaudeCode限时满血特价 | 2.6× | ¥0.65 | ¥3.25 |

### gpt-5.6-sol 

| 分组 | 倍率 | 输入/百万 | 输出/百万 |
|---|---|---|---|
| GPT Codex 全家桶 | 1.45× | ¥1.81 | ¥10.88 |
| JH-福利分组 | 0.78× | ¥0.98 | ¥5.85 |
| 爆炸低价-GPT限时活动 | 0.45× | ¥0.56 | ¥3.38 |

### gpt-5.6-terra 

| 分组 | 倍率 | 输入/百万 | 输出/百万 |
|---|---|---|---|
| GPT Codex 全家桶 | 1.45× | ¥0.72 | ¥4.35 |
| JH-福利分组 | 0.78× | ¥0.39 | ¥2.34 |
| 爆炸低价-GPT限时活动 | 0.45× | ¥0.23 | ¥1.35 |

### gpt-5.6-luna 

| 分组 | 倍率 | 输入/百万 | 输出/百万 |
|---|---|---|---|
| JH-福利分组 | 0.78× | ¥0.04 | ¥0.23 |

### gpt-5.4 

| 分组 | 倍率 | 输入/百万 | 输出/百万 |
|---|---|---|---|
| GPT Codex 全家桶 | 1.45× | ¥0.91 | ¥5.44 |
| JH-福利分组 | 0.78× | ¥0.49 | ¥2.93 |
| 爆炸低价-GPT限时活动 | 0.45× | ¥0.28 | ¥1.69 |

### gpt-5.4-mini 

| 分组 | 倍率 | 输入/百万 | 输出/百万 |
|---|---|---|---|
| GPT Codex 全家桶 | 1.45× | ¥0.27 | ¥1.63 |
| JH-福利分组 | 0.78× | ¥0.15 | ¥0.88 |
| 爆炸低价-GPT限时活动 | 0.45× | ¥0.08 | ¥0.51 |

### gpt-5.5 

| 分组 | 倍率 | 输入/百万 | 输出/百万 |
|---|---|---|---|
| GPT Codex 全家桶 | 1.45× | ¥1.81 | ¥10.88 |
| JH-福利分组 | 0.78× | ¥0.98 | ¥5.85 |
| 爆炸低价-GPT限时活动 | 0.45× | ¥0.56 | ¥3.38 |
