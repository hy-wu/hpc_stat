import snapshot from "../../data/capability-observatory.json";

type Result = (typeof snapshot.results)[number];
const root = (id: string) => document.getElementById(id) as HTMLElement;
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));
const src = (id: string) => snapshot.sources.find(s => s.id === id);
const link = (id: string) => { const s = src(id); return s ? '<a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' + esc(id) + ' ↗</a>' : esc(id); };
const row = (model: string, suite: string, metric: string): Result | undefined => snapshot.results.find(r => r.model === model && r.suite === suite && r.metric === metric);
const q = (selector: string) => (root(selector) as HTMLInputElement).value;
const metrics: Record<string, string[]> = {
  "LiveBench 2.0": ["overall", "reasoning", "design", "browser"],
  "Artificial Analysis v5": ["intelligence_index"],
  "Artificial Analysis": ["AA-3D", "AA-Robotics v0.1", "AA-Omniscience hallucination rate"]
};
const friendly: Record<string, string> = {overall:"综合",reasoning:"推理",design:"设计",browser:"浏览器",intelligence_index:"智能指数",input:"输入",cached_input:"缓存",output:"输出"};
function table(head: string[], cells: string[][]): string {
  return '<table><thead><tr>' + head.map(v => '<th>' + esc(v) + '</th>').join('') + '</tr></thead><tbody>' +
  cells.map(r => '<tr>' + r.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
}
function updateMatrix() {
  const suite = q("obsSuite"), search = q("obsSearch").toLowerCase();
  const columns = metrics[suite] || [];
  const models = snapshot.models.filter(m => m.toLowerCase().includes(search) || columns.some(c => c.toLowerCase().includes(search)));
  const values = Object.fromEntries(columns.map(k => [k, snapshot.results.filter(r => r.suite === suite && r.metric === k).map(r => r.value)]));
  const rows = models.map(model => [esc(model), ...columns.map(metric => {
    const r = row(model, suite, metric);
    if (!r) return '<span class="obs-missing">—</span>';
    const nums = values[metric], min = Math.min(...nums), max = Math.max(...nums);
    let rank = (r.value - min) / (max - min || 1);
    if (metric.includes("hallucination")) rank = 1 - rank;
    const alpha = (0.06 + rank * 0.26).toFixed(3);
    return '<div class="obs-num" title="' + esc(r.source + " · " + r.status + " · " + r.effort) + '" style="background:rgba(40,160,136,' + alpha + ')">' + esc(r.value) + '<small>' + link(r.source) + '</small></div>';
  })]);
  root("obsMatrix").innerHTML = table(["模型", ...columns.map(m => friendly[m] || m)], rows);
}
function updateDelta() {
  const [before, after] = q("obsPair").split("|");
  const cols = metrics["LiveBench 2.0"];
  const html = cols.map(metric => {
    const a = row(before, "LiveBench 2.0", metric), b = row(after, "LiveBench 2.0", metric);
    if (!a || !b) return '<div class="obs-delta-row"><span>' + esc(friendly[metric]) + '</span><span>无同体系数据</span><b>—</b></div>';
    const d = Math.round((b.value - a.value) * 10) / 10;
    const w = Math.min(48, Math.abs(d) * 6);
    return '<div class="obs-delta-row"><span>' + esc(friendly[metric]) + '</span><div class="obs-track"><span class="obs-bar ' + (d < 0 ? "negative" : "") + '" style="left:' + (d < 0 ? 50 - w : 50) + '%;width:' + w + '%"></span></div><b class="' + (d < 0 ? "obs-negative" : "obs-positive") + '">' + (d > 0 ? "+" : "") + d.toFixed(1) + '</b></div>';
  }).join('');
  root("obsDeltaBars").innerHTML = html;
  const rel = snapshot.relative.filter(r => r.old_model === before && r.new_model === after);
  root("obsRelative").innerHTML = rel.length ? rel.map(r => '<span class="obs-chip">' + esc(r.metric) + ': <b class="' + (r.delta < 0 ? "obs-negative" : "obs-positive") + '">' + (r.delta > 0 ? "+" : "") + esc(r.delta) + ' ' + esc(r.unit) + '</b> ' + link(r.source) + '</span>').join('') : '<small>暂无其他同模型对的可比证据。</small>';
}
function updateCost() {
  const i = Math.max(0, Number(q("obsInput")) || 0);
  const o = Math.max(0, Number(q("obsOutput")) || 0);
  const cache = Math.max(0, Math.min(1, Number(q("obsCache")) || 0));
  const models = Array.from(new Set(snapshot.results.filter(r => r.suite === "API pricing").map(r => r.model)));
  const entries = models.map(model => {
    const a = row(model, "API pricing", "input")?.value;
    const b = row(model, "API pricing", "cached_input")?.value;
    const c = row(model, "API pricing", "output")?.value;
    if ([a,b,c].some(v => v === undefined)) return null;
    const cost = i * ((1 - cache) * Number(a) + cache * Number(b)) + o * Number(c);
    const score = row(model, "LiveBench 2.0", "overall")?.value;
    return {model, input:a, cached:b, output:c, cost, score};
  }).filter((v): v is NonNullable<typeof v> => v !== null).sort((a,b) => a.cost - b.cost);
  root("obsCostTable").innerHTML = table(["模型","输入/1M","缓存/1M","输出/1M","场景成本 $","LiveBench"], entries.map(e => [esc(e.model),esc(e.input),esc(e.cached),esc(e.output),'<b>'+e.cost.toFixed(3)+'</b>',esc(e.score ?? "—")]));
  const pts = entries.filter(e => e.score !== undefined);
  if (!pts.length) {root("obsCostPlot").textContent = "缺少可比质量数据";return;}
  const w = 600,h = 220,pad=40,max=Math.max(0.01,...pts.map(p=>p.cost));
  const px=(x:number)=>pad+(x/max)*(w-pad-25);
  const py=(y:number)=>h-30-((y-50)/50)*(h-55);
  const grid = [60,80,100].map(y=>'<line x1="'+pad+'" x2="'+(w-12)+'" y1="'+py(y)+'" y2="'+py(y)+'" stroke="var(--line)" /><text x="3" y="'+(py(y)+4)+'" fill="var(--muted)" font-size="11">'+y+'</text>').join('');
  const dots = pts.map(e=>'<circle cx="'+px(e.cost)+'" cy="'+py(Number(e.score))+'" r="5" fill="var(--accent)"><title>'+esc(e.model)+' cost=$'+e.cost.toFixed(3)+' score='+e.score+'</title></circle><text x="'+(px(e.cost)+7)+'" y="'+(py(Number(e.score))-7)+'" fill="var(--ink)" font-size="10">'+esc(e.model.replace("GPT-",""))+'</text>').join('');
  root("obsCostPlot").innerHTML = '<svg role="img" aria-label="横轴场景成本、纵轴 LiveBench 分数" viewBox="0 0 '+w+' '+h+'"><line x1="'+pad+'" x2="'+pad+'" y1="10" y2="'+(h-30)+'" stroke="var(--muted)"/><line x1="'+pad+'" x2="'+(w-12)+'" y1="'+(h-30)+'" y2="'+(h-30)+'" stroke="var(--muted)"/>'+grid+dots+'<text x="'+(w-110)+'" y="'+(h-4)+'" fill="var(--muted)" font-size="11">场景成本 USD →</text></svg>';
}
function updateFeedback() {
  root("obsFeedbackList").innerHTML = snapshot.feedback.map(f => '<div class="obs-feedback-item"><b>'+esc(f.model)+'</b><div><strong>'+esc(f.category)+'</strong><p>'+esc(f.summary)+'</p>'+link(f.source)+'</div><span class="obs-pill">'+esc(f.sentiment)+'</span></div>').join('');
}
function updateSources() {
  root("obsSources").innerHTML = table(["ID","等级","类型","原始来源","局限性"],snapshot.sources.map(s=>[esc(s.id),esc(s.grade),esc(s.type),link(s.id)+' '+esc(s.title),esc(s.limitations)]));
}
function exportCSV() {
  const suite = q("obsSuite"), columns = metrics[suite];
  const rows = [["model",...columns],...snapshot.models.map(m=>[m,...columns.map(k=>String(row(m,suite,k)?.value ?? ""))])];
  const csv = rows.map(r=>r.map(x=>'"'+x.replace(/"/g,'""')+'"').join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF",csv],{type:"text/csv;charset=utf-8"}));
  const a=document.createElement("a");a.href=url;a.download="capability-"+suite.replace(/[^A-Za-z0-9]/g,"-")+".csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
root("obsStats").innerHTML = [["模型",snapshot.models.length],["指标记录",snapshot.results.length],["跨代差值",snapshot.relative.length],["用户反馈",snapshot.feedback.length],["来源",snapshot.sources.length]].map(([k,v])=>'<div class="obs-stat"><strong>'+v+'</strong><span>'+k+'</span></div>').join("");
root("obsSuite").addEventListener("change", updateMatrix);
root("obsSearch").addEventListener("input", updateMatrix);
root("obsPair").addEventListener("change", updateDelta);
["obsInput","obsOutput","obsCache"].forEach(id=>root(id).addEventListener("input",updateCost));
root("obsReset").addEventListener("click",()=>{(root("obsSearch") as HTMLInputElement).value="";(root("obsSuite") as HTMLSelectElement).value="LiveBench 2.0";(root("obsPair") as HTMLSelectElement).selectedIndex=0;updateMatrix();updateDelta();});
root("obsExport").addEventListener("click",exportCSV);
updateMatrix();updateDelta();updateCost();updateFeedback();updateSources();
