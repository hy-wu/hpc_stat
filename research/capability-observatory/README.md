# GPT Capability Observatory / 跨代能力观察

页面：`/capability-observatory.html`（GitHub Pages: `/hpc_stat/capability-observatory.html`）。

## 范围
本项目是面向 **GPT 5.6—6.2 同代/跨代能力变化**的研究性数据工作台；不是任何厂商、用户群或模型的客观智能总排名。

- 静态数据：`data/capability-observatory.json`，含模型、指标、来源、跨版本差值、社区报告。
- 视图：能力矩阵（同列归一化着色，不把不同基准拼成一个分数）；跨代差值条形图；质量—API 成本散点图；反馈事件；证据审计；等能力线假说。
- 可以切换榜单、过滤模型、选择版本对、调整输入/输出/缓存成本参数、导出当前矩阵 CSV。
- UI 与 hpc_stat 原有 Base.astro / NavTabs.astro / global.css 主题变量一致。

## 数据状态
2026-11-19 研究快照：10 模型、46 指标/价格条目、8 差值、5 反馈事件、12 来源。**这些不是完全核验的总体性样本**。特别是旧 LiveBench 榜单快照的评测档位与筛选条件仍待逐行复核，不能据此认定同名模型智力必然下降。

## 本地复验
```sh
npm ci
npm run check
npm run build
npm run dev
```
查看 `http://localhost:4321/hpc_stat/capability-observatory.html`（具体 dev base 按 Astro 配置）。
核实亮/暗主题、矩阵搜索和切换、差值比较、数字输入边界、CSV 导出、外部来源链接及移动端横向滚动。

研究限制、核验标准和后续盲测详见 [methodology.md](methodology.md)。
