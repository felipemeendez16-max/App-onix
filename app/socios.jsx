/* ============ App Onix — Sócios (profit split & withdrawals) ============ */
function GroupCard({ group, state, cm, color }) {
  const meta = group.limit;
  const refCeil = meta != null ? meta : group.quota;
  const usePctVsRef = refCeil > 0 ? (group.withdrawn / refCeil) * 100 : (group.withdrawn > 0 ? 999 : 0);
  const col = usageColor(usePctVsRef);
  // contextual status: against the meta when one is set, otherwise against the cota
  const st = meta != null
    ? (usePctVsRef > 100 ? { label: 'Meta ultrapassada', cls: 'neg' } : usePctVsRef >= 80 ? { label: 'Perto da meta', cls: 'warn' } : { label: 'Dentro da meta', cls: 'pos' })
    : usageStatus(usePctVsRef);
  return (
    <div className="card card-pad" style={{ position: 'relative', overflow: 'hidden' }}>
      <span className="accent-bar" style={{ background: color, width: 4 }} />
      <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
        <div className="flex items-center gap-12">
          <span style={{ width: 12, height: 12, borderRadius: 4, background: color }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{group.name}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-faint)', fontWeight: 600 }}>{group.members.map(m => m.name).join(' + ')}</div>
          </div>
        </div>
        <span className="pill" style={{ background: color + '1f', color }}>{group.pct}% do lucro</span>
      </div>

      <div className="grid-2" style={{ gap: 12, marginBottom: 14 }}>
        <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-md)', padding: '12px 14px' }}>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600 }}>Cota garantida</div>
          <div className="mono-num" style={{ fontWeight: 700, fontSize: 20, marginTop: 2 }}>{formatBRL(group.quota)}</div>
        </div>
        <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-md)', padding: '12px 14px' }}>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600 }}>{group.remaining >= 0 ? 'Quanto sobrou' : 'Excedeu em'}</div>
          <div className={'mono-num tag-' + st.cls} style={{ fontWeight: 700, fontSize: 20, marginTop: 2 }}>{formatBRL(Math.abs(group.remaining))}</div>
        </div>
      </div>

      <div className="flex items-center justify-between" style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 7 }}>
        <span style={{ color: 'var(--text-dim)' }}>Retirado <b className="mono-num" style={{ color: 'var(--text)' }}>{formatBRL(group.withdrawn)}</b></span>
        <span className={'tag-' + st.cls}>{formatPct(usePctVsRef, 0)}{meta != null ? ' da meta' : ' da cota'}</span>
      </div>
      <Progress pct={usePctVsRef} color={col} tall />

      {/* member breakdown */}
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 7 }}>
        {group.members.map(m => {
          const wt = partnerWithdrawnTotal(state, cm, m.id);
          return (
            <div key={m.id} className="flex items-center justify-between" style={{ fontSize: 13, fontWeight: 600 }}>
              <span style={{ color: 'var(--text-dim)' }}>{m.name}</span>
              <span className="mono-num">{formatBRL(wt)}</span>
            </div>
          );
        })}
      </div>

      {meta != null && (
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-faint)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="target" size={13} /> Meta de retirada: <b className="mono-num" style={{ color: 'var(--text-dim)' }}>{formatBRL(meta)}</b>
        </div>
      )}

      {st.cls !== 'pos' && (
        <div className={'alert ' + st.cls} style={{ marginTop: 12 }}>
          <Icon name="alert" size={15} /> {st.label}{group.remaining < 0 ? ` — retiradas acima da cota em ${formatBRL(-group.remaining)}` : ''}
        </div>
      )}
    </div>
  );
}

function Socios({ state, comp, cm, actions }) {
  const [filter, setFilter] = useState({});
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const month = getMonth(state, cm);
  const filtered = useMemo(() => applyFilter(month.withdrawals, filter), [month.withdrawals, filter]);
  const colors = ['var(--accent)', '#3b82f6'];

  const newWithdrawal = (partnerId) => setModal({ partnerId: partnerId || state.partners[0]?.id });

  return (
    <div className="flex-col gap-20">
      <div className="grid-2">
        {comp.groups.map((g, i) => <GroupCard key={g.id} group={g} state={state} cm={cm} color={colors[i % colors.length]} />)}
      </div>

      <div className="section-card">
        <div className="section-head">
          <div><h3>Retiradas dos sócios</h3><span className="sub">{filtered.length} de {month.withdrawals.length} · {formatBRL(filtered.reduce((s, e) => s + e.value, 0))}</span></div>
          <button className="btn btn-primary btn-sm" onClick={() => newWithdrawal()}><Icon name="plus" size={15} /> Nova retirada</button>
        </div>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)' }}>
          <FilterBar categories={state.categories} partners={state.partners} filter={filter} setFilter={setFilter} showPartner />
        </div>
        <TxnList entries={filtered} state={state} kind="withdrawal" showPartner onEdit={e => setModal(e)} onDelete={e => setConfirm(e)} />
      </div>

      {modal && <TxnModal kind="withdrawal" partners={state.partners} categories={state.categories} initial={modal.id ? modal : modal}
        onSave={rec => actions.saveTxn('withdrawal', rec)} onClose={() => setModal(null)} />}
      {confirm && <ConfirmDialog title="Excluir retirada" danger confirmLabel="Excluir"
        message={`Remover "${confirm.desc}" (${formatBRL(confirm.value)})?`}
        onConfirm={() => actions.removeTxn('withdrawal', confirm.id)} onClose={() => setConfirm(null)} />}
    </div>
  );
}

Object.assign(window, { GroupCard, Socios });
