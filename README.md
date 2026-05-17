# Unified GPU Table

一个零依赖的 GPU 参数工作台，用于维护自己的统一 GPU 参数表。

## 功能

- 任意字段排序：点击表头或使用排序字段下拉框。
- 全局搜索：型号、架构、显存、备注等字段都会参与搜索。
- 字段筛选：可添加多个条件，支持文本包含和数值比较。
- 列设置：显示或隐藏任意字段。
- 价格更新：支持粘贴 JSON，或读取 `data/prices.json`。
- 数据导入/导出：用 JSON 合并 GPU 数据，按 `id` 覆盖。
- 本地持久化：导入和价格更新会保存到浏览器 `localStorage`。

## 本地使用

直接打开 `index.html` 即可使用。若要测试 `data/prices.json` 的读取，请用任意静态服务器启动：

```powershell
python -m http.server 4173
```

然后访问：

```text
http://localhost:4173
```

## LLM 数据核验

`models.html` 只把 `data/models.json` 中 `verification.verifiedFields` 标记过的字段加粗；没有来源或未核验的字段会以灰色显示。来源可以是官方页面、公开评测页，也可以是人工提供的截图/采购单等明确证据，但要在 `verification.sources` 中写清楚。

评测数据不要混用口径：旧的 `MMLU`、`HumanEval`、`GSM8K`、`MATH` 字段只填同名 benchmark；`MMLU-Pro`、`GPQA-Diamond`、`SWE-Bench Verified`、`Terminal-Bench` 等现代评测写入 `evals.*` 字段。

更新模型数据统一跑 Python 富化脚本。`data/model-overrides.json` 保存人工维护的精选模型、官方价格、评测和备注；脚本会用这些 curated overrides 作为基底，再从 OpenRouter 生成浏览器读取的 `data/models.json`。能结构化解析的来源绝不交给 LLM。

生成宽表数据时运行：

```powershell
python scripts\enrich_model_data.py --generate-openrouter --target-count 150 --min-model-count 150 --write --online --output .cache\model-enrich-report.json
```

只做离线一致性校验、不写回时运行：

```powershell
python scripts\enrich_model_data.py --verify-only --min-model-count 150 --output .cache\model-verify-report.json
```

需要在线核验官方页面字符串时再加 `--online`。如果页面文本不够结构化，可显式增加 `--deepseek`；脚本只从 `.env` 读取 `DEEPSEEK_API_KEY`，不会把 key 写入源码或输出。旧的 Node 校验脚本已弃用。

`data/model-fields.json` 定义 LLM 表格字段、默认显示列和厂商链接，`src/models.js` 只负责加载配置和渲染。

## 价格更新格式

```json
[
  {
    "id": "nvidia-rtx-4090",
    "priceUSD": 1799,
    "merchant": "manual quote",
    "source": "local",
    "available": true
  }
]
```

也可以用 `model` 匹配：

```json
[
  {
    "model": "NVIDIA GeForce RTX 4090",
    "priceUSD": 1799
  }
]
```

## 部署

这是静态站点，可直接部署到 GitHub Pages、Cloudflare Pages、Netlify、Vercel 或公司内网静态服务器。将整个目录发布即可。

## 后续可接的价格源

建议不要直接爬电商页面作为长期方案。更稳的是把价格更新做成一个独立后端任务：

- 定时调用供应商或采购系统 API。
- 输出统一格式的 `prices.json`。
- 前端点击“更新价格”读取这个 JSON。
