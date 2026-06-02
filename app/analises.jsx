/* ============ App Onix — Análises (charts & comparison) ============ */
function Analises({ state, comp, cm, actions }) {
  const keys = dataMonthKeys(state);
  // include current month even if empty-ish
  const allKeys = Array.from(new Set([...keys, cm])).sort();
  const comps = allKeys.map(k => computeMonth(state, k));
  const recent = comps.slice(-6);

  const monthGroups = recent.map(c => ({
    label: monthLabelShort(c.key),
    values: { revenue: c.revenue, costs: c.totalCosts, profit: c.profit },
  }));
  const series = [
    { key: 'revenue', label: 'Faturamento', color: 'var(--accent)' },
    { key: 'costs', label: 'Custos', color: 'var(--neg)' },
    { key: 'profit', label: 'Lucro', color: '#3b82f6' },
  ];
  const linePoints = recent.map(c => ({ label: monthLabelShort(c.key), value: c.profit }));

  const splitData = comp.groups.map((g, i) => ({ label: g.name, value: Math.max(0, g.quota), color: i === 0 ? 'var(--accent)' : '#3b82f6' }));
  const catData = spendByCategory(state, getMonth(state, cm).costs).map(d => ({ label: d.cat.name, value: d.value, color: d.cat.color }));

  // comparison vs previous
  const idx = allKeys.indexOf(cm);
  const prev = idx > 0 ? comps[idx - 1] : null;
  const rows = [
    { label: 'Faturamento', cur: comp.revenue, prev: prev?.revenue, good: 'up' },
    { label: 'Custos', cur: comp.totalCosts, prev: prev?.totalCosts, good: 'down' },
    { label: 'Lucro', cur: comp.profit, prev: prev?.profit, good: 'up' },
    { label: 'Retiradas', cur: comp.totalWithdrawn, prev: prev?.totalWithdrawn, good: 'down' },
  ];

  const hasHistory = recent.length >= 1;
  const anyMeta = comp.groups.some(g => g.limit != null && g.limit > 0);
  const colorsGM = ['var(--accent)', 'var(--accent-2)'];

  return (
    <div className="flex-col gap-20">
      {/* meta progress */}
      <div className="section-card">
        <div className="section-head">
          <div><h3>Proximidade das metas de retirada</h3><span className="sub">{monthLabel(cm)} · quanto a cota garantida já representa da meta</span></div>
          <span className="pill"><Icon name="target" size={13} /> Metas</span>
        </div>
        {comp.profit <= 0 && !anyMeta ? (
          <EmptyState icon="target" title="Sem lucro e sem metas" message="Informe entradas e custos para gerar a cota garantida, ou defina metas em Ajustes › Metas de retirada." />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${comp.groups.length}, 1fr)`, gap: 0 }}>
            {comp.groups.map((g, i) => {
              const hasMeta = g.limit != null && g.limit > 0;
              const cota = Math.max(0, g.quota);
              if (hasMeta) {
                // progress = how close the guaranteed quota is to the meta target
                const meta = g.limit;
                const pct = meta > 0 ? (cota / meta) * 100 : 0;
                const col = pct >= 100 ? 'var(--pos)' : 'var(--accent)';
                const toGo = meta - cota;
                const st = pct >= 100
                  ? { label: 'Meta atingida', cls: 'pos', icon: 'check' }
                  : pct >= 80 ? { label: 'Quase na meta', cls: 'warn', icon: 'target' }
                  : { label: 'Em progresso', cls: 'pos', icon: 'target' };
                return (
                  <div key={g.id} style={{ padding: '20px 18px', borderRight: i < comp.groups.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div className="flex items-center gap-8" style={{ alignSelf: 'stretch', justifyContent: 'center' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: colorsGM[i % 2] }} />
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{g.name}</span>
                      <span className="pill" style={{ fontSize: 10 }}>Meta</span>
                    </div>
                    <RadialGauge pct={Math.min(pct, 100)} color={col} big={formatPct(pct, 0)} sub="da meta" />
                    <div className={'pill tag-' + st.cls} style={{ background: 'var(--surface-2)' }}>
                      <Icon name={st.icon} size={12} /> {st.label}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignSelf: 'stretch', fontSize: 12.5, fontWeight: 600 }}>
                      <div className="flex items-center justify-between"><span style={{ color: 'var(--text-dim)' }}>Cota garantida</span><span className="mono-num">{formatBRL(cota)}</span></div>
                      <div className="flex items-center justify-between"><span style={{ color: 'var(--text-dim)' }}>Meta</span><span className="mono-num">{formatBRL(meta)}</span></div>
                      <div className="flex items-center justify-between"><span style={{ color: 'var(--text-faint)' }}>Já retirado</span><span className="mono-num" style={{ color: 'var(--text-faint)' }}>{formatBRL(g.withdrawn)}</span></div>
                      <div className="divider" />
                      <div className="flex items-center justify-between"><span style={{ color: 'var(--text-dim)' }}>{toGo > 0 ? 'Falta para a meta' : 'Meta superada em'}</span><span className={'mono-num tag-' + (toGo > 0 ? 'warn' : 'pos')}>{formatBRL(Math.abs(toGo))}</span></div>
                    </div>
                  </div>
                );
              }
              // no meta → show withdrawals against the guaranteed quota
              const pct = cota > 0 ? (g.withdrawn / cota) * 100 : (g.withdrawn > 0 ? 999 : 0);
              const col = usageColor(pct);
              const st = pct > 100 ? { label: 'Cota ultrapassada', cls: 'neg' } : pct >= 80 ? { label: 'Perto da cota', cls: 'warn' } : { label: 'Dentro da cota', cls: 'pos' };
              const toGo = cota - g.withdrawn;
              return (
                <div key={g.id} style={{ padding: '20px 18px', borderRight: i < comp.groups.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div className="flex items-center gap-8" style={{ alignSelf: 'stretch', justifyContent: 'center' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: colorsGM[i % 2] }} />
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{g.name}</span>
                    <span className="pill" style={{ fontSize: 10 }}>Cota</span>
                  </div>
                  <RadialGauge pct={Math.min(pct, 100)} color={col} big={formatPct(Math.min(pct, 999), 0)} sub="da cota" />
                  <div className={'pill tag-' + st.cls} style={{ background: 'var(--surface-2)' }}>
                    <Icon name={st.cls === 'pos' ? 'check' : 'alert'} size={12} /> {st.label}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignSelf: 'stretch', fontSize: 12.5, fontWeight: 600 }}>
                    <div className="flex items-center justify-between"><span style={{ color: 'var(--text-dim)' }}>Retirado</span><span className="mono-num">{formatBRL(g.withdrawn)}</span></div>
                    <div className="flex items-center justify-between"><span style={{ color: 'var(--text-dim)' }}>Cota garantida</span><span className="mono-num">{formatBRL(cota)}</span></div>
                    <div className="divider" />
                    <div className="flex items-center justify-between"><span style={{ color: 'var(--text-dim)' }}>{toGo >= 0 ? 'Disponível na cota' : 'Acima da cota'}</span><span className={'mono-num tag-' + st.cls}>{formatBRL(Math.abs(toGo))}</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* comparison vs previous */}
      <div className="section-card">
        <div className="section-head">
          <div><h3>Comparação com o mês anterior</h3><span className="sub">{prev ? `${monthLabel(prev.key)} → ${monthLabel(cm)}` : 'Sem mês anterior com dados'}</span></div>
        </div>
        <div style={{ padding: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 0 }}>
            {rows.map((r, i) => {
              const v = prev ? variation(r.cur, r.prev) : null;
              // color delta by whether change is "good"
              let cls = 'flat';
              if (v && v.dir !== 'flat') cls = (v.dir === r.good) ? 'up' : 'down';
              return (
                <div key={i} style={{ padding: '14px 16px', borderRight: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12.5, color: 'var(--text-dim)', fontWeight: 600 }}>{r.label}</div>
                  <div className="mono-num" style={{ fontWeight: 700, fontSize: 20, margin: '3px 0 6px' }}>{formatBRL(r.cur)}</div>
                  {v ? (
                    <span className={'delta ' + cls}>
                      {v.dir === 'up' && <Icon name="arrowUp" size={12} stroke={2.5} />}
                      {v.dir === 'down' && <Icon name="arrowDown" size={12} stroke={2.5} />}
                      {v.pct == null ? 'novo' : formatPct(Math.abs(v.pct), 1)}
                      <span style={{ fontWeight: 500, opacity: 0.8 }}>vs anterior</span>
                    </span>
                  ) : <span className="delta flat">—</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="section-card">
          <div className="section-head"><div><h3>Divisão do lucro</h3><span className="sub">{monthLabel(cm)}</span></div></div>
          <div style={{ padding: 22 }}>
            {comp.profit > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                <DonutChart data={splitData} size={190} centerValue={formatBRL(comp.profit).replace('R$', '').trim().split(',')[0]} centerLabel="lucro" />
                <ChartLegend data={splitData} />
              </div>
            ) : <EmptyState icon="pieChart" title="Sem lucro para dividir" message="Informe faturamento e custos do mês." />}
          </div>
        </div>
        <div className="section-card">
          <div className="section-head"><div><h3>Gastos por categoria</h3><span className="sub">Custos da empresa</span></div></div>
          <div style={{ padding: 22 }}>
            {catData.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                <DonutChart data={catData} size={190} centerValue={String(catData.length)} centerLabel="categorias" />
                <ChartLegend data={catData} />
              </div>
            ) : <EmptyState icon="receipt" title="Nenhum custo" message="Adicione custos para ver a distribuição." />}
          </div>
        </div>
      </div>

      <div className="section-card">
        <div className="section-head"><div><h3>Faturamento, custos e lucro por mês</h3><span className="sub">Últimos {recent.length} {recent.length === 1 ? 'mês' : 'meses'}</span></div></div>
        <div style={{ padding: '22px 22px 14px' }}>
          {hasHistory ? <GroupedBars groups={monthGroups} series={series} /> : <EmptyState icon="chart" title="Sem histórico" message="Os dados aparecem conforme você preenche os meses." />}
        </div>
      </div>

      <div className="section-card">
        <div className="section-head"><div><h3>Evolução do lucro</h3><span className="sub">Tendência ao longo dos meses</span></div></div>
        <div style={{ padding: '22px 22px 14px' }}>
          {hasHistory ? <LineChart points={linePoints} /> : <EmptyState icon="trending" title="Sem histórico" message="A linha de tendência surge com mais de um mês de dados." />}
        </div>
      </div>
    </div>
  );
}

window.Analises = Analises;
