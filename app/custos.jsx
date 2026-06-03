/* ============ App Onix — Custos (company costs) ============ */

/* Reusable filter bar */
function FilterBar({ categories, partners, filter, setFilter, showPartner }) {
  const active = filter.cat || filter.partner || filter.from || filter.to;
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
      {showPartner && (
        <div className="field" style={{ minWidth: 150 }}>
          <label>Sócio</label>
          <select className="select" value={filter.partner || ''} onChange={e => setFilter({ ...filter, partner: e.target.value || null })}>
            <option value="">Todos</option>
            {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}
      <div className="field" style={{ minWidth: 150 }}>
        <label>Categoria</label>
        <select className="select" value={filter.cat || ''} onChange={e => setFilter({ ...filter, cat: e.target.value || null })}>
          <option value="">Todas</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          <option value="none">Sem categoria</option>
        </select>
      </div>
      <div className="field"><label>De</label><input className="input" type="date" value={filter.from || ''} onChange={e => setFilter({ ...filter, from: e.target.value || null })} /></div>
      <div className="field"><label>Até</label><input className="input" type="date" value={filter.to || ''} onChange={e => setFilter({ ...filter, to: e.target.value || null })} /></div>
      {active && <button className="btn btn-soft btn-sm" style={{ height: 40 }} onClick={() => setFilter({})}><Icon name="x" size={14} /> Limpar</button>}
    </div>
  );
}

function applyFilter(entries, filter) {
  return entries.filter(e => {
    if (filter.cat) { if (filter.cat === 'none' ? e.categoryId : e.categoryId !== filter.cat) return false; }
    if (filter.partner && e.partnerId !== filter.partner) return false;
    if (filter.from && e.date < filter.from) return false;
    if (filter.to && e.date > filter.to) return false;
    return true;
  }).sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.id > a.id ? 1 : -1));
}

function TxnList({ entries, state, kind, onEdit, onDelete, showPartner }) {
  if (entries.length === 0) return <EmptyState icon="inbox" title="Nenhum lançamento" message="Ajuste os filtros ou adicione um novo lançamento." />;
  return (
    <div>
      {entries.map(e => {
        const cat = e.categoryId ? catById(state, e.categoryId) : { name: kind === 'revenue' ? 'Entrada' : 'Sem categoria', color: kind === 'revenue' ? 'var(--accent)' : '#94a3b8' };
        const p = showPartner ? partnerById(state, e.partnerId) : null;
        return (
          <div className="txn-row" key={e.id}>
            <div className="txn-main">
              <span className="cat-dot" style={{ width: 11, height: 11, background: cat.color }} />
              <div style={{ minWidth: 0 }}>
                <div className="txn-desc">{e.desc}</div>
                <div className="txn-meta">
                  {p && <><b style={{ color: 'var(--text-dim)' }}>{p.name}</b><span>·</span></>}
                  <span>{cat.name}</span><span>·</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Icon name="calendar" size={11} />{formatDate(e.date)}</span>
                </div>
              </div>
            </div>
            <div className="txn-right">
              <span className="txn-val" style={kind === 'revenue' ? { color: 'var(--pos)' } : undefined}>{kind === 'revenue' ? '+ ' : ''}{formatBRL(e.value)}</span>
              <button className="row-action" onClick={() => onEdit(e)} title="Editar"><Icon name="edit" size={15} /></button>
              <button className="row-action" onClick={() => onDelete(e)} title="Excluir"><Icon name="trash" size={15} /></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Custos({ state, comp, cm, actions }) {
  const [filterC, setFilterC] = useState({});
  const [filterR, setFilterR] = useState({});
  const [modalCost, setModalCost] = useState(null);
  const [modalRev, setModalRev] = useState(null);
  const [confirm, setConfirm] = useState(null); // {kind, rec}
  const month = getMonth(state, cm);
  const filteredC = useMemo(() => applyFilter(month.costs, filterC), [month.costs, filterC]);
  const filteredR = useMemo(() => applyFilter(month.revenues, filterR), [month.revenues, filterR]);
  const totalC = filteredC.reduce((s, e) => s + e.value, 0);
  const totalR = filteredR.reduce((s, e) => s + e.value, 0);

  return (
    <div className="flex-col gap-20">
      <div className="stat-grid">
        <Stat label="Faturamento (entradas)" value={formatBRL(comp.revenue)} icon="trending" accent="var(--accent)" foot={`${comp.revenueCount} entrada${comp.revenueCount === 1 ? '' : 's'}`} />
        <Stat label="Total de custos" value={formatBRL(comp.totalCosts)} icon="receipt" accent="var(--neg)" foot={`${comp.costCount} lançamento${comp.costCount === 1 ? '' : 's'}`} />
        <Stat label="Lucro do mês" value={formatBRL(comp.profit)} icon="coins" accent={comp.profit >= 0 ? 'var(--pos)' : 'var(--neg)'} foot={`Margem ${formatPct(comp.margin)}`} />
        <Stat label="Caixa no banco" value={formatBRL(comp.available)} icon="wallet" accent={comp.available >= 0 ? 'var(--pos)' : 'var(--neg)'} foot={`Lucro − ${formatBRL(comp.totalWithdrawn)} retirados`} />
      </div>

      <div className="grid-2">
        {/* Entradas */}
        <div className="section-card" style={{ alignSelf: 'flex-start' }}>
          <div className="section-head">
            <div className="flex items-center gap-12">
              <span className="stat-ico" style={{ width: 30, height: 30, background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}><Icon name="trending" size={16} /></span>
              <div><h3>Entradas</h3><span className="sub">{filteredR.length} de {month.revenues.length} · {formatBRL(totalR)}</span></div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setModalRev({})}><Icon name="plus" size={14} /> Entrada</button>
          </div>
          <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border)' }}>
            <FilterBar categories={state.categories} filter={filterR} setFilter={setFilterR} />
          </div>
          {filteredR.length === 0
            ? <EmptyState icon="trending" title="Nenhuma entrada" message="Lance suas vendas, serviços e recebimentos para compor o faturamento do mês." action={<button className="btn btn-primary btn-sm" onClick={() => setModalRev({})}><Icon name="plus" size={14} /> Adicionar entrada</button>} />
            : <TxnList entries={filteredR} state={state} kind="revenue" onEdit={e => setModalRev(e)} onDelete={e => setConfirm({ kind: 'revenue', rec: e })} />}
        </div>

        {/* Custos */}
        <div className="section-card" style={{ alignSelf: 'flex-start' }}>
          <div className="section-head">
            <div className="flex items-center gap-12">
              <span className="stat-ico" style={{ width: 30, height: 30, background: 'var(--neg-soft)', color: 'var(--neg)' }}><Icon name="receipt" size={16} /></span>
              <div><h3>Custos da empresa</h3><span className="sub">{filteredC.length} de {month.costs.length} · {formatBRL(totalC)}</span></div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setModalCost({})}><Icon name="plus" size={14} /> Custo</button>
          </div>
          <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border)' }}>
            <FilterBar categories={state.categories} filter={filterC} setFilter={setFilterC} />
          </div>
          {filteredC.length === 0
            ? <EmptyState icon="receipt" title="Nenhum custo" message="Adicione os custos da empresa para calcular o lucro do mês." action={<button className="btn btn-primary btn-sm" onClick={() => setModalCost({})}><Icon name="plus" size={14} /> Adicionar custo</button>} />
            : <TxnList entries={filteredC} state={state} kind="cost" onEdit={e => setModalCost(e)} onDelete={e => setConfirm({ kind: 'cost', rec: e })} />}
        </div>
      </div>

      {/* Category breakdown — entradas + custos */}
      {(() => {
        const revAgg = spendByCategory(state, month.revenues).map(d => ({
          label: d.cat.id === 'none' ? 'Sem categoria' : d.cat.name,
          value: d.value,
          color: d.cat.id === 'none' ? 'var(--accent)' : d.cat.color,
        }));
        const costAgg = spendByCategory(state, month.costs).map(d => ({ label: d.cat.name, value: d.value, color: d.cat.color }));
        if (revAgg.length === 0 && costAgg.length === 0) return null;
        const Donut = ({ title, sub, data, total }) => (
          <div className="section-card">
            <div className="section-head"><div><h3>{title}</h3><span className="sub">{sub}</span></div></div>
            <div style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
              <DonutChart data={data} size={150} centerValue={formatBRL(total).replace('R$', '').trim().split(',')[0]} centerLabel="no total" />
              <div style={{ flex: 1, minWidth: 200 }}><ChartLegend data={data} /></div>
            </div>
          </div>
        );
        return (
          <div className="grid-2">
            {revAgg.length > 0 && <Donut title="Entradas por categoria" sub="De onde veio o faturamento" data={revAgg} total={comp.revenue} />}
            {costAgg.length > 0 && <Donut title="Custos por categoria" sub="Onde o dinheiro foi" data={costAgg} total={comp.totalCosts} />}
          </div>
        );
      })()}

      {modalRev && <TxnModal kind="revenue" categories={state.categories} initial={modalRev.id ? modalRev : null}
        onSave={rec => actions.saveTxn('revenue', rec)} onClose={() => setModalRev(null)} />}
      {modalCost && <TxnModal kind="cost" categories={state.categories} initial={modalCost.id ? modalCost : null}
        onSave={rec => actions.saveTxn('cost', rec)} onClose={() => setModalCost(null)} />}
      {confirm && <ConfirmDialog title={confirm.kind === 'revenue' ? 'Excluir entrada' : 'Excluir custo'} danger confirmLabel="Excluir"
        message={`Remover "${confirm.rec.desc}" (${formatBRL(confirm.rec.value)})? Esta ação não pode ser desfeita.`}
        onConfirm={() => actions.removeTxn(confirm.kind, confirm.rec.id)} onClose={() => setConfirm(null)} />}
    </div>
  );
}

Object.assign(window, { FilterBar, applyFilter, TxnList, Custos });
