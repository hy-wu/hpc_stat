# LLM Benchmark & Pricing Reference Sources

This document contains official links to LLM benchmark suites, leaderboards, and vendor pricing pages for data verification and enrichment.

> **时效约定**：各来源标注的适用时间范围是本项目最近一次成功核验的窗口。超出窗口或标注为「待验证」的链接，使用前请重新核验。

## 📊 Leaderboards & Aggregators

| Source | Description | URL | 适用时间范围 |
| :--- | :--- | :--- | :--- |
| **Arena (原 LMArena / Chatbot Arena)** | Elo-based crowdsourced human evaluation | [https://arena.ai/leaderboard](https://arena.ai/leaderboard) | 2026-08-05 已核验（lmarena.ai 已迁移至 arena.ai）；Next.js CSR 页面，需浏览器抓取 |
| **ToolCenter LLM 排行榜** | Arena Elo 月度同步快照 | [https://www.toolcenter.ai/zh/llm-leaderboard](https://www.toolcenter.ai/zh/llm-leaderboard) | 2026-07-01 快照；可作为 Arena 数据的人工核验来源 |
| **Hugging Face Open LLM Leaderboard** | Tracking open-source LLMs across various benchmarks（已归档，仅历史参考） | [https://huggingface.co/spaces/open-llm-leaderboard/open-llm-leaderboard](https://huggingface.co/spaces/open-llm-leaderboard/open-llm-leaderboard) | 已停更，仅用于历史数据 |
| **LiveCodeBench** | Holistic evaluation of LLMs for code | [https://livecodebench.github.io/](https://livecodebench.github.io/) | 长期有效 |
| **OpenRouter** | Unified API provider with up-to-date pricing for many models（本项目模型价格的主要实时来源） | [https://openrouter.ai/models](https://openrouter.ai/models) | 2026-08-05 已核验（API 返回 200） |
| **Artificial Analysis** | Performance, price, and quality analysis | [https://artificialanalysis.ai/](https://artificialanalysis.ai/) | 长期有效 |
| **LLM-Stats.com** | Visualized LLM comparison stats | [https://llm-stats.com/](https://llm-stats.com/) | 长期有效 |

## 🧪 Benchmark Suites (Official Repositories/Homepages)

| Benchmark | Focus | Official Link |
| :--- | :--- | :--- |
| **MMLU** | General knowledge across 57 subjects | [https://github.com/hendrycks/test](https://github.com/hendrycks/test) |
| **MMLU-Pro** | Enhanced version of MMLU with harder questions | [https://github.com/TIGER-AI-Lab/MMLU-Pro](https://github.com/TIGER-AI-Lab/MMLU-Pro) |
| **GPQA** | Graduate-level science and reasoning | [https://github.com/idavidrein/gpqa](https://github.com/idavidrein/gpqa) |
| **HumanEval** | Python coding tasks | [https://github.com/openai/human-eval](https://github.com/openai/human-eval) |
| **GSM8K** | Grade school math word problems | [https://github.com/openai/grade-school-math](https://github.com/openai/grade-school-math) |
| **MATH** | Competition-level math problems | [https://github.com/hendrycks/math](https://github.com/hendrycks/math) |
| **SWE-bench** | Real-world software engineering issues | [https://www.swebench.com/](https://www.swebench.com/) |
| **MBPP** | Mostly Basic Python Problems | [https://github.com/google-research/google-research/tree/master/mbpp](https://github.com/google-research/google-research/tree/master/mbpp) |
| **CAISI (NIST)** | Evaluation of AI Safety and Integrity | [https://www.nist.gov/itl/ai-safety-institute](https://www.nist.gov/itl/ai-safety-institute) |

## 💰 Global Vendor & Platform Pricing

| Vendor/Platform | Pricing Page | 适用时间范围 |
| :--- | :--- | :--- |
| **OpenAI** | [https://openai.com/api/pricing](https://openai.com/api/pricing) | 长期有效 |
| **Anthropic** | [https://platform.claude.com/docs/en/about-claude/pricing](https://platform.claude.com/docs/en/about-claude/pricing) | 2026-05-21 已核验 |
| **Google Gemini** | [https://ai.google.dev/pricing](https://ai.google.dev/pricing) | 长期有效 |
| **Meta Llama** | [https://llama.meta.com/](https://llama.meta.com/) | 长期有效（开源模型，无官方 API 定价） |
| **Mistral AI** | [https://mistral.ai/pricing](https://mistral.ai/pricing) | 2026-08-05 已核验（HTTP 200）；API 定价需从 [docs.mistral.ai](https://docs.mistral.ai/getting-started/pricing/) 获取 |
| **xAI (Grok)** | [https://docs.x.ai/developers/pricing](https://docs.x.ai/developers/pricing) | 2026-07 官方页；本环境无法直接核验，待验证 |
| **Moonshot (Kimi)** | [https://platform.moonshot.cn/docs/pricing/chat](https://platform.moonshot.cn/docs/pricing/chat) | 2026-08-05 已核验（HTTP 200） |
| **MiniMax** | [https://platform.minimaxi.com/document/pricing](https://platform.minimaxi.com/document/pricing) | 2026-08-05 已核验（HTTP 200） |
| **Together AI** | [https://www.together.ai/pricing](https://www.together.ai/pricing) | 2026-08-05 已核验（HTTP 200） |
| **Fireworks AI** | [https://fireworks.ai/pricing](https://fireworks.ai/pricing) | 2026-08-05 已核验（HTTP 200） |
| **DeepInfra** | [https://deepinfra.com/pricing](https://deepinfra.com/pricing) | 2026-08-05 已核验（HTTP 200） |
| **GitHub Copilot** | [https://github.com/features/copilot#pricing](https://github.com/features/copilot#pricing) | 长期有效 |
| **Cursor** | [https://www.cursor.com/pricing](https://www.cursor.com/pricing) | 长期有效 |
| **Groq** | [https://groq.com/pricing/](https://groq.com/pricing/) | 长期有效 |

## 🧰 Agent Coding Tools

| Tool | Type | URL |
| :--- | :--- | :--- |
| **GitHub Copilot** | AI IDE / coding agent | [https://github.com/features/copilot](https://github.com/features/copilot) |
| **Cursor** | AI IDE | [https://cursor.com/](https://cursor.com/) |
| **Windsurf** | AI IDE | [https://windsurf.com/](https://windsurf.com/) |
| **Claude Code** | Vibe coding CLI | [https://docs.anthropic.com/en/docs/claude-code/overview](https://docs.anthropic.com/en/docs/claude-code/overview) |
| **OpenAI Codex CLI** | Vibe coding CLI | [https://github.com/openai/codex](https://github.com/openai/codex) |
| **Gemini CLI** | Vibe coding CLI | [https://github.com/google-gemini/gemini-cli](https://github.com/google-gemini/gemini-cli) |
| **Cline** | VS Code agent extension | [https://cline.bot/](https://cline.bot/) |
| **Roo Code** | VS Code agent extension | [https://roocode.com/](https://roocode.com/) |
| **Continue** | AI IDE extension | [https://www.continue.dev/](https://www.continue.dev/) |
| **Aider** | Vibe coding CLI | [https://aider.chat/](https://aider.chat/) |
| **Sourcegraph Cody** | AI IDE extension / code search assistant | [https://sourcegraph.com/cody](https://sourcegraph.com/cody) |
| **JetBrains AI Assistant** | JetBrains IDE assistant | [https://www.jetbrains.com/ai/](https://www.jetbrains.com/ai/) |
| **Devin** | Cloud coding agent | [https://devin.ai/](https://devin.ai/) |
| **通义灵码** | AI IDE / coding agent | [https://tongyi.aliyun.com/lingma](https://tongyi.aliyun.com/lingma) |
| **TRAE / SOLO** | AI IDE / web assistant | [https://www.trae.ai/](https://www.trae.ai/) |
| **Qoder** | Agentic coding platform | [https://qoder.com/](https://qoder.com/) |
| **CodeGeeX** | AI coding assistant | [https://codegeex.cn/](https://codegeex.cn/) |
| **Kilo Code** | Open-source coding agent | [https://kilocode.ai/](https://kilocode.ai/) |
| **OpenCode** | Open-source coding agent | [https://opencode.ai/](https://opencode.ai/) |
| **Crush** | Terminal coding agent | [https://github.com/charmbracelet/crush](https://github.com/charmbracelet/crush) |
| **AstrBot** | Agent chatbot platform | [https://github.com/AstrBotDevs/AstrBot](https://github.com/AstrBotDevs/AstrBot) |
| **DeepSeek TUI** | Open-source terminal coding agent | [https://github.com/Hmbown/DeepSeek-TUI](https://github.com/Hmbown/DeepSeek-TUI) |
| **Reasonix** | DeepSeek-native terminal coding agent | [https://github.com/esengine/DeepSeek-Reasonix](https://github.com/esengine/DeepSeek-Reasonix) |
| **OpenHands** | Open-source AI-driven development platform | [https://github.com/OpenHands/OpenHands](https://github.com/OpenHands/OpenHands) |
| **OpenClaw** | Open-source personal AI assistant / agent gateway | [https://github.com/openclaw/openclaw](https://github.com/openclaw/openclaw) |
| **Hermes Agent** | Open-source self-improving agent framework | [https://github.com/NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) |

> **GitHub Stars** (`githubStars` field): star counts fetched from GitHub API on 2026-05-19. Open-source entries only; proprietary tools (Cursor, Windsurf, etc.) are set to `null`. Counts for: openai/codex 83,740 · google-gemini/gemini-cli 104,292 · openclaw/openclaw 373,124 · All-Hands-AI/OpenHands 74,092 · cline/cline 62,014 · Aider-AI/aider 45,004 · continuedev/continue 33,265 · charmbracelet/crush 24,409 · RooCodeInc/Roo-Code 24,102 · AstrBotDevs/AstrBot 32,570 · Hmbown/DeepSeek-TUI 32,242 · opencode-ai/opencode 12,622 · esengine/DeepSeek-Reasonix 4,516 · zai-org/CodeGeeX4 2,505 · sourcegraph/cody-public-snapshot 3,796.

## 🇨🇳 Chinese Vendor Pricing (Mainland China)

| Vendor | Platform | Pricing Page | 适用时间范围 |
| :--- | :--- | :--- | :--- |
| **Alibaba (阿里云)** | Model Studio (通义千问) | [https://help.aliyun.com/zh/model-studio/model-pricing](https://help.aliyun.com/zh/model-studio/model-pricing) | 长期有效 |
| **Baidu (百度云)** | Qianfan (文心一言) | [https://cloud.baidu.com/doc/qianfan/s/wmh4sv6ya](https://cloud.baidu.com/doc/qianfan/s/wmh4sv6ya) | 长期有效 |
| **Tencent (腾讯云)** | Hunyuan (腾讯混元) | [https://cloud.tencent.com.cn/document/product/1823/130055](https://cloud.tencent.com.cn/document/product/1823/130055) | 长期有效 |
| **Zhipu AI (智谱AI)** | BigModel (ChatGLM) | [https://open.bigmodel.cn/pricing](https://open.bigmodel.cn/pricing) | 长期有效 |
| **ByteDance (火山引擎)** | Doubao (豆包) | [https://www.volcengine.com/docs/82379/1544106](https://www.volcengine.com/docs/82379/1544106) | 长期有效 |
| **DeepSeek (深度求索)** | DeepSeek Platform | [https://api-docs.deepseek.com/quick_start/pricing](https://api-docs.deepseek.com/quick_start/pricing) | 长期有效 |
| **SiliconFlow (硅基流动)** | SiliconCloud 推理平台 | [https://siliconflow.cn/zh-cn/pricing](https://siliconflow.cn/zh-cn/pricing) | 2026-08-05 已核验（HTTP 200） |

## 🗓 数据快照时间线

| 数据集 | 快照日期 | 说明 |
| :--- | :--- | :--- |
| `data/models.json` 模型价格/参数 | 2026-08-05（135/150）；其余 15 条为 2026-05-21 | 由 `scripts/enrich_model_data.py --write --online` 生成，价格来自 OpenRouter API 与官方页核验 |
| `data/models.json` Arena Elo | 2026-07-01（7 条从 ToolCenter 快照更新）；其余 58 条为 2026-05-21 待重新核验 | arena.ai（原 lmarena.ai）CSR 页面，脚本无法直接抓取；更新通过 ToolCenter 月度快照 |
| `data/agent-tools.json` 工具数据 | 2026-05-19 | 套餐价格随计划变化，使用前请抽查官方页 |
| `data/gpus.json` / `data/prices.json` GPU 价格 | 2026-08-05 新增 5 条（RTX 5060/RX 9060 XT/M4 Ultra/B300/MI325X）；其余为 2026-04~2026-05 人工报价快照 | 新增 GPU 价格为 MSRP，二手/市场价需另行更新 |
| GitHub Stars | 2026-05-19 | 见上方 Agent Coding Tools 备注 |

---
*Last Updated: 2026-08-05*
