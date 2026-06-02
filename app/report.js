/* ============ App Onix — PDF report builder (print window) ============ */
function donutSVG(data, size) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const th = size * 0.16, r = (size - th) / 2, c = size / 2, circ = 2 * Math.PI * r;
  let off = 0;
  let segs = '';
  if (total > 0) data.filter(d => d.value > 0).forEach(d => {
    const frac = d.value / total, dash = frac * circ;
    segs += `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${d.color}" stroke-width="${th}" stroke-dasharray="${dash} ${circ}" stroke-dashoffset="${-off}" stroke-linecap="butt"/>`;
    off += dash;
  });
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg)"><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#e8edf2" stroke-width="${th}"/>${segs}</svg>`;
}

function buildReportPDF(state, cm) {
  const comp = computeMonth(state, cm);
  const month = getMonth(state, cm);
  const splitData = comp.groups.map((g, i) => ({ label: g.name, value: Math.max(0, g.quota), color: i === 0 ? '#10b981' : '#3b82f6' }));
  const catData = spendByCategory(state, month.costs).map(d => ({ label: d.cat.name, value: d.value, color: d.cat.color }));
  const accent = '#0e9f6e';

  const card = (label, value, sub) => `<div class="rcard"><div class="rlabel">${label}</div><div class="rvalue">${value}</div>${sub ? `<div class="rsub">${sub}</div>` : ''}</div>`;
  const legend = (data) => {
    const sum = data.reduce((s, d) => s + d.value, 0);
    return data.filter(d => d.value > 0).map(d => `<div class="leg"><span class="dot" style="background:${d.color}"></span><span class="leg-l">${d.label}</span><span class="leg-p">${sum > 0 ? formatPct(d.value / sum * 100, 0) : '0%'}</span><span class="leg-v">${formatBRL(d.value)}</span></div>`).join('');
  };

  const groupRows = comp.groups.map((g, i) => {
    const col = i === 0 ? '#10b981' : '#3b82f6';
    const useRef = g.limit != null ? g.limit : g.quota;
    const pct = useRef > 0 ? (g.withdrawn / useRef * 100) : 0;
    const barCol = pct > 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#10b981';
    return `<div class="grow">
      <div class="grow-head"><span class="dot" style="background:${col}"></span><b>${g.name}</b><span class="badge">${g.pct}%</span><span class="grow-q">${formatBRL(g.quota)}</span></div>
      <div class="bar"><span style="width:${Math.min(100, pct)}%;background:${barCol}"></span></div>
      <div class="grow-foot"><span>Retirado: <b>${formatBRL(g.withdrawn)}</b></span><span>${g.remaining >= 0 ? 'Sobra' : 'Excedeu'}: <b>${formatBRL(Math.abs(g.remaining))}</b></span></div>
    </div>`;
  }).join('');

  const costRows = applyFilter(month.costs, {}).map(e => `<tr><td>${e.desc}</td><td>${catById(state, e.categoryId).name}</td><td>${formatDate(e.date)}</td><td class="num">${formatBRL(e.value)}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">Nenhum custo lançado</td></tr>';
  const revRows = applyFilter(month.revenues, {}).map(e => `<tr><td>${e.desc}</td><td>${e.categoryId ? catById(state, e.categoryId).name : '—'}</td><td>${formatDate(e.date)}</td><td class="num">${formatBRL(e.value)}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">Nenhuma entrada lançada</td></tr>';
  const wRows = applyFilter(month.withdrawals, {}).map(e => `<tr><td>${partnerById(state, e.partnerId).name}</td><td>${e.desc}</td><td>${catById(state, e.categoryId).name}</td><td>${formatDate(e.date)}</td><td class="num">${formatBRL(e.value)}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">Nenhuma retirada lançada</td></tr>';

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório ${monthLabel(cm)} — App Onix</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Manrope:wght@400;500;600;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Manrope',sans-serif; color:#1e293b; padding:36px 40px; background:#fff; }
    h1,h2,h3,.num,.rvalue,.grow-q,.leg-v { font-family:'Space Grotesk',sans-serif; }
    .head { display:flex; justify-content:space-between; align-items:flex-end; border-bottom:2px solid ${accent}; padding-bottom:14px; margin-bottom:24px; }
    .brand { display:flex; align-items:center; gap:10px; }
    .mark { width:34px; height:34px; border-radius:9px; background:${accent}; color:#fff; display:grid; place-items:center; font-weight:700; font-family:'Space Grotesk'; }
    .head h1 { font-size:20px; } .head .sub { color:#64748b; font-size:13px; font-weight:600; }
    .period { text-align:right; } .period .m { font-size:18px; font-weight:700; font-family:'Space Grotesk'; } .period .d { font-size:12px; color:#94a3b8; }
    h2 { font-size:13px; text-transform:uppercase; letter-spacing:0.05em; color:#64748b; margin:26px 0 12px; }
    .cards { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
    .rcard { border:1px solid #e2e8f0; border-radius:12px; padding:14px 16px; }
    .rlabel { font-size:11.5px; color:#64748b; font-weight:600; } .rvalue { font-size:20px; font-weight:700; margin-top:3px; } .rsub { font-size:11px; color:#94a3b8; margin-top:3px; }
    .split { display:flex; gap:28px; align-items:center; border:1px solid #e2e8f0; border-radius:14px; padding:18px 22px; }
    .grows { flex:1; display:flex; flex-direction:column; gap:14px; }
    .grow-head { display:flex; align-items:center; gap:8px; font-size:14px; } .grow-head b { flex:0; white-space:nowrap; }
    .badge { background:#eef2f7; border-radius:99px; padding:2px 8px; font-size:11px; font-weight:700; color:#475569; }
    .grow-q { margin-left:auto; font-weight:700; font-size:15px; }
    .bar { height:9px; background:#eef2f7; border-radius:99px; overflow:hidden; margin:7px 0; } .bar span { display:block; height:100%; border-radius:99px; }
    .grow-foot { display:flex; justify-content:space-between; font-size:12px; color:#64748b; }
    .dot { width:10px; height:10px; border-radius:99px; display:inline-block; flex-shrink:0; }
    .legends { display:flex; flex-direction:column; gap:7px; min-width:200px; }
    .leg { display:flex; align-items:center; gap:8px; font-size:13px; } .leg-l { flex:1; font-weight:600; } .leg-p { color:#94a3b8; font-size:12px; } .leg-v { font-weight:700; min-width:80px; text-align:right; }
    table { width:100%; border-collapse:collapse; font-size:12.5px; } th { text-align:left; color:#94a3b8; font-size:11px; text-transform:uppercase; padding:8px 10px; border-bottom:1px solid #e2e8f0; font-weight:700; }
    td { padding:8px 10px; border-bottom:1px solid #f1f5f9; } .num { text-align:right; font-weight:700; } th.num { text-align:right; }
    .empty { text-align:center; color:#94a3b8; padding:18px; }
    .two { display:grid; grid-template-columns:1fr 1fr; gap:24px; }
    .foot { margin-top:30px; padding-top:14px; border-top:1px solid #e2e8f0; font-size:11px; color:#94a3b8; display:flex; justify-content:space-between; }
    @media print { body { padding:0; } .split, .rcard, table { break-inside:avoid; } @page { margin:18mm; } }
  </style></head><body>
  <div class="head">
    <div class="brand"><div class="mark">◆</div><div><h1>App Onix</h1><div class="sub">Relatório financeiro</div></div></div>
    <div class="period"><div class="m">${monthLabel(cm)}</div><div class="d">Gerado em ${formatDate(todayISO())}</div></div>
  </div>

  <h2>Resumo do mês</h2>
  <div class="cards">
    ${card('Faturamento', formatBRL(comp.revenue))}
    ${card('Custos', formatBRL(comp.totalCosts), comp.costCount + ' lançamentos')}
    ${card('Lucro', formatBRL(comp.profit), 'Margem ' + formatPct(comp.margin))}
    ${card('Total retirado', formatBRL(comp.totalWithdrawn), 'Saldo: ' + formatBRL(comp.available))}
  </div>

  <h2>Divisão do lucro entre sócios</h2>
  <div class="split">
    <div>${donutSVG(splitData.length ? splitData : [{value:1,color:'#e8edf2'}], 150)}</div>
    <div class="grows">${groupRows}</div>
  </div>

  <div class="two">
    <div>
      <h2>Custos por categoria</h2>
      <div class="legends">${catData.length ? legend(catData) : '<div class="empty">Sem custos</div>'}</div>
    </div>
    <div>
      <h2>Indicadores</h2>
      <div class="legends">
        <div class="leg"><span class="leg-l">Margem de lucro</span><span class="leg-v">${formatPct(comp.margin)}</span></div>
        <div class="leg"><span class="leg-l">Distribuído aos sócios</span><span class="leg-v">${formatBRL(comp.totalDistributed)}</span></div>
        <div class="leg"><span class="leg-l">Total retirado</span><span class="leg-v">${formatBRL(comp.totalWithdrawn)}</span></div>
        <div class="leg"><span class="leg-l">Saldo disponível</span><span class="leg-v">${formatBRL(comp.available)}</span></div>
      </div>
    </div>
  </div>

  <h2>Entradas do mês</h2>
  <table><thead><tr><th>Descrição</th><th>Categoria</th><th>Data</th><th class="num">Valor</th></tr></thead><tbody>${revRows}</tbody></table>

  <h2>Custos da empresa</h2>
  <table><thead><tr><th>Descrição</th><th>Categoria</th><th>Data</th><th class="num">Valor</th></tr></thead><tbody>${costRows}</tbody></table>

  <h2>Retiradas dos sócios</h2>
  <table><thead><tr><th>Sócio</th><th>Descrição</th><th>Categoria</th><th>Data</th><th class="num">Valor</th></tr></thead><tbody>${wRows}</tbody></table>

  <div class="foot"><span>App Onix · Organização financeira</span><span>${monthLabel(cm)}</span></div>
  </body></html>`;

  const w = window.open('', '_blank');
  if (!w) { alert('Permita pop-ups para gerar o relatório em PDF.'); return; }
  w.document.write(html);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 600);
}

window.buildReportPDF = buildReportPDF;
window.donutSVG = donutSVG;
