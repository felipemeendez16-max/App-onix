/* ============ App Onix — Painel (Dashboard) ============ */
function Painel({ state, comp, cm, actions, prevComp }) {
  const hasData = comp.revenue !== 0 || comp.costCount > 0 || comp.withdrawalCount > 0;

  const splitData = comp.groups.map((g, i) => ({
    label: g.name, value: Math.max(0, g.quota), color: i === 0 ? 'var(--accent)' : '#3b82f6',
  }));
  const catData = spendByCategory(state, getMonth(state, cm).costs).slice(0, 6)
    .map(d => ({ label: d.cat.name, value: d.value, color: d.cat.color }));

  return (
    <div className="flex-col gap-20">
      {/* Revenue + key stats */}
      <div className="stat-grid">
        <div className="stat feature" style={{ cursor: 'pointer' }} onClick={() => actions.goTo('custos')}>
          <span className="accent-bar" style={{ background: 'var(--accent)' }} />
          <div className="stat-top">
            <span className="stat-label">Faturamento</span>
            <span className="stat-ico" style={{ background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}><Icon name="trending" size={17} /></span>
          </div>
          <div className="stat-value big">{formatBRL(comp.revenue)}</div>
          <div className="stat-foot">
            {prevComp && <Delta v={variation(comp.revenue, prevComp.revenue)} />}
            <span style={{ color: 'var(--accent-strong)', fontWeight: 600, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 }}>{comp.revenueCount} entrada{comp.revenueCount === 1 ? '' : 's'} · gerenciar</span>
          </div>
        </div>
        <Stat label="Custos da empresa" value={formatBRL(comp.totalCosts)} icon="receipt" accent="var(--neg)"
          foot={`${comp.costCount} lançamento${comp.costCount === 1 ? '' : 's'}`}
          delta={prevComp ? variation(comp.totalCosts, prevComp.totalCosts) : null} />
        <Stat label="Lucro do mês" value={formatBRL(comp.profit)} icon="coins" accent={comp.profit >= 0 ? 'var(--pos)' : 'var(--neg)'}
          foot="Faturamento − custos"
          delta={prevComp ? variation(comp.profit, prevComp.profit) : null} />
        <Stat label="Margem de lucro" value={formatPct(comp.margin)} icon="percent" accent="#3b82f6"
          foot="Lucro sobre faturamento" />
      </div>

      {/* Distribution status */}
      <div className="grid-2-1">
        <div className="section-card">
          <div className="section-head">
            <div><h3>Divisão do lucro</h3><span className="sub">Cota garantida de cada grupo</span></div>
            <span className="pill">60 / 40</span>
          </div>
          <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {comp.groups.map((g, i) => {
              const color = usageColor(g.usePct);
              const st = usageStatus(g.usePct);
              return (
                <div key={g.id}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                    <div className="flex items-center gap-8">
                      <span className="cat-dot" style={{ width: 11, height: 11, background: i === 0 ? 'var(--accent)' : '#3b82f6' }} />
                      <span style={{ fontWeight: 700, fontSize: 14.5 }}>{g.name}</span>
                      <span className="pill">{g.pct}%</span>
                    </div>
                    <span className="mono-num" style={{ fontWeight: 700, fontSize: 15 }}>{formatBRL(g.quota)}</span>
                  </div>
                  <Progress pct={g.usePct} color={color} tall />
                  <div className="flex items-center justify-between" style={{ marginTop: 7, fontSize: 12.5, color: 'var(--text-dim)', fontWeight: 500 }}>
                    <span>Retirado <b className="mono-num" style={{ color: 'var(--text)' }}>{formatBRL(g.withdrawn)}</b></span>
                    <span className={'tag-' + st.cls} style={{ fontWeight: 700 }}>
                      {g.remaining >= 0 ? 'Sobra ' : 'Excedeu '}<span className="mono-num">{formatBRL(Math.abs(g.remaining))}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-col gap-16">
          <Stat label="Distribuído aos sócios" value={formatBRL(comp.totalDistributed)} icon="users" accent="#3b82f6" foot={`100% do lucro = cotas`} />
          <Stat label="Total retirado no mês" value={formatBRL(comp.totalWithdrawn)} icon="wallet" accent="var(--warn)" foot={`${comp.withdrawalCount} retirada${comp.withdrawalCount === 1 ? '' : 's'}`} />
          <Stat label="Saldo ainda disponível" value={formatBRL(comp.available)} icon="scale" accent={comp.available >= 0 ? 'var(--pos)' : 'var(--neg)'} foot="Lucro − retiradas" />
        </div>
      </div>

      {/* Mini charts */}
      <div className="grid-2">
        <div className="section-card">
          <div className="section-head"><div><h3>Divisão do lucro</h3><span className="sub">Cota por grupo</span></div></div>
          <div style={{ padding: 22, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
            {comp.profit > 0 ? (
              <>
                <DonutChart data={splitData} centerValue={formatPct(comp.margin, 0)} centerLabel="margem" />
                <div style={{ flex: 1, minWidth: 160 }}><ChartLegend data={splitData} /></div>
              </>
            ) : <EmptyState icon="pieChart" title="Sem lucro para dividir" message="Informe o faturamento e os custos para visualizar a divisão." />}
          </div>
        </div>
        <div className="section-card">
          <div className="section-head"><div><h3>Custos por categoria</h3><span className="sub">Onde o dinheiro foi</span></div></div>
          <div style={{ padding: 22, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
            {catData.length > 0 ? (
              <>
                <DonutChart data={catData} centerValue={formatBRL(comp.totalCosts).replace('R$', '').trim().split(',')[0]} centerLabel="em custos" />
                <div style={{ flex: 1, minWidth: 160 }}><ChartLegend data={catData} /></div>
              </>
            ) : <EmptyState icon="receipt" title="Nenhum custo lançado" message="Adicione custos da empresa para ver a distribuição por categoria." />}
          </div>
        </div>
      </div>

      {!hasData && (
        <div className="alert" style={{ background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}>
          <Icon name="sparkle" size={16} /> Comece lançando as <b>entradas</b> e os <b>custos</b> do mês na aba Entradas e custos.
        </div>
      )}
    </div>
  );
}

function RevenueModal({ value, onSave, onClose }) {
  const [v, setV] = useState(value);
  return (
    <Modal title="Faturamento do mês" onClose={onClose}
      footer={<>
        <button className="btn btn-soft" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => { onSave(v); onClose(); }}>Salvar</button>
      </>}>
      <Field label="Faturamento total" hint="Receita bruta da empresa neste mês."><MoneyInput value={v} onChange={setV} autoFocus /></Field>
    </Modal>
  );
}

window.Painel = Painel;
window.RevenueModal = RevenueModal;
