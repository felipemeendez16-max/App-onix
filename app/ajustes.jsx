/* ============ App Onix — Ajustes (settings) ============ */
function CategoryModal({ initial, onSave, onClose, existing }) {
  const [name, setName] = useState(initial?.name || '');
  const [color, setColor] = useState(initial?.color || CATEGORY_PALETTE[existing % CATEGORY_PALETTE.length] || '#10b981');
  const valid = name.trim();
  return (
    <Modal title={initial ? 'Editar categoria' : 'Nova categoria'} onClose={onClose}
      footer={<>
        <button className="btn btn-soft" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={!valid} onClick={() => { onSave({ id: initial?.id || uid(), name: name.trim(), color }); onClose(); }}>Salvar</button>
      </>}>
      <Field label="Nome"><input className="input" autoFocus value={name} placeholder="Ex: Software" onChange={e => setName(e.target.value)} /></Field>
      <Field label="Cor">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {CATEGORY_PALETTE.map(c => (
            <button key={c} onClick={() => setColor(c)} style={{ width: 30, height: 30, borderRadius: 9, background: c, border: color === c ? '3px solid var(--text)' : '3px solid transparent', boxShadow: 'var(--shadow-sm)', transition: '0.12s' }} />
          ))}
        </div>
      </Field>
    </Modal>
  );
}

function Ajustes({ state, comp, cm, actions }) {
  const [catModal, setCatModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [limits, setLimits] = useState(() => Object.fromEntries(state.groups.map(g => [g.id, g.limit])));
  useEffect(() => { setLimits(Object.fromEntries(state.groups.map(g => [g.id, g.limit]))); }, [state.groups]);

  const catUsage = id => {
    let n = 0;
    Object.values(state.months).forEach(m => { n += m.costs.filter(c => c.categoryId === id).length + m.withdrawals.filter(w => w.categoryId === id).length; });
    return n;
  };

  return (
    <div className="flex-col gap-20" style={{ maxWidth: 920 }}>
      {/* Profit split (fixed) */}
      <div className="section-card">
        <div className="section-head"><div><h3>Divisão do lucro</h3><span className="sub">Cota garantida de cada grupo — fixa</span></div>
          <span className="pill" style={{ color: 'var(--text-dim)' }}><Icon name="percent" size={13} /> Fixa</span>
        </div>
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {state.groups.map((g, i) => {
            const color = i === 0 ? 'var(--accent)' : 'var(--accent-2)';
            return (
              <div key={g.id} className="flex items-center gap-16" style={{ flexWrap: 'wrap', background: 'var(--surface-2)', borderRadius: 'var(--r-md)', padding: '12px 14px' }}>
                <span style={{ width: 11, height: 11, borderRadius: 4, background: color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontWeight: 700 }}>{g.name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-faint)', fontWeight: 600 }}>{partnersOfGroup(state, g.id).map(p => p.name).join(', ')}</div>
                </div>
                <span className="mono-num" style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-0.03em', color }}>{g.pct}%</span>
              </div>
            );
          })}
          <div style={{ fontSize: 12, color: 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="check" size={13} /> A divisão é fixa em 60% e 40% e não pode ser alterada.</div>
        </div>
      </div>

      {/* Metas */}
      <div className="section-card">
        <div className="section-head"><div><h3>Metas de retirada</h3><span className="sub">Meta mensal por grupo (alerta ao se aproximar e ao atingir)</span></div></div>
        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {state.groups.map(g => (
            <div key={g.id} className="flex items-center gap-16" style={{ flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 160, fontWeight: 700 }}>{g.name}</div>
              <div style={{ width: 200 }}>
                <MoneyInput value={limits[g.id] || 0} onChange={v => setLimits({ ...limits, [g.id]: v })} placeholder="Sem meta" />
              </div>
              <button className="btn btn-soft btn-sm" onClick={() => actions.setGroupLimit(g.id, (Number(limits[g.id]) || 0) > 0 ? Number(limits[g.id]) : null)}>Salvar</button>
              {g.limit != null && <button className="btn btn-soft btn-sm" onClick={() => { setLimits({ ...limits, [g.id]: 0 }); actions.setGroupLimit(g.id, null); }} title="Remover meta"><Icon name="x" size={14} /></button>}
            </div>
          ))}
          <div style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>Deixe em branco para acompanhar apenas a cota garantida do grupo.</div>
        </div>
      </div>

      {/* Categories */}
      <div className="section-card">
        <div className="section-head">
          <div><h3>Categorias</h3><span className="sub">{state.categories.length} categorias</span></div>
          <button className="btn btn-primary btn-sm" onClick={() => setCatModal({ new: true })}><Icon name="plus" size={15} /> Nova</button>
        </div>
        <div>
          {state.categories.map(c => {
            const used = catUsage(c.id);
            return (
              <div className="txn-row" key={c.id}>
                <div className="txn-main">
                  <span style={{ width: 14, height: 14, borderRadius: 5, background: c.color }} />
                  <div><div className="txn-desc">{c.name}</div><div className="txn-meta">{used} uso{used === 1 ? '' : 's'}</div></div>
                </div>
                <div className="txn-right">
                  <button className="row-action" onClick={() => setCatModal(c)}><Icon name="edit" size={15} /></button>
                  <button className="row-action" onClick={() => setConfirm(c)}><Icon name="trash" size={15} /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Export */}
      <div className="section-card">
        <div className="section-head"><div><h3>Exportar dados</h3><span className="sub">Relatório de {monthLabel(cm)}</span></div></div>
        <div style={{ padding: 22, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={() => actions.exportPDF()}><Icon name="fileText" size={16} /> Relatório em PDF</button>
          <button className="btn btn-ghost" onClick={() => exportMonthCSV(state, cm)}><Icon name="download" size={16} /> Planilha (CSV)</button>
        </div>
      </div>

      {/* Cloud sync */}
      <div className="section-card">
        <div className="section-head"><div><h3>Sincronização</h3><span className="sub">Dados salvos na nuvem (Firebase)</span></div></div>
        <div style={{ padding: 22 }}>
          <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 12 }}>
            <div><div style={{ fontWeight: 700 }}>Enviar dados para a nuvem</div><div style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>Force o envio dos seus dados locais para sincronizar com outros dispositivos</div></div>
            <button className="btn btn-primary" onClick={() => { if (window.syncToFirestore) { window.syncToFirestore(state); alert('Dados enviados! Peça para a outra pessoa atualizar a página.'); } }}>
              <Icon name="refresh" size={15} /> Sincronizar agora
            </button>
          </div>
        </div>
      </div>

      {/* Theme + data */}
      <div className="section-card">
        <div className="section-head"><div><h3>Aparência e dados</h3></div></div>
        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 12 }}>
            <div><div style={{ fontWeight: 700 }}>Tema</div><div style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>Claro ou escuro com brilho neon</div></div>
            <div className="seg">
              <button className={state.settings.theme === 'light' ? 'on' : ''} onClick={() => actions.setTheme('light')}><Icon name="sun" size={14} /> Claro</button>
              <button className={state.settings.theme === 'dark' ? 'on' : ''} onClick={() => actions.setTheme('dark')}><Icon name="moon" size={14} /> Escuro</button>
            </div>
          </div>
          <div className="divider" />
          <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 12 }}>
            <div><div style={{ fontWeight: 700 }}>Iniciar novo mês do zero</div><div style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>Cria {monthLabel(cm)} vazio (não afeta outros meses)</div></div>
            <button className="btn btn-soft" onClick={() => setConfirm({ kind: 'newmonth' })}><Icon name="refresh" size={15} /> Zerar este mês</button>
          </div>
          <div className="divider" />
          <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 12 }}>
            <div><div style={{ fontWeight: 700, color: 'var(--neg)' }}>Apagar todos os dados</div><div style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>Remove todos os meses, retiradas e configurações</div></div>
            <button className="btn btn-danger" onClick={() => setConfirm({ kind: 'reset' })}><Icon name="trash" size={15} /> Apagar tudo</button>
          </div>
        </div>
      </div>

      {catModal && <CategoryModal initial={catModal.new ? null : catModal} existing={state.categories.length}
        onSave={c => actions.saveCategory(c)} onClose={() => setCatModal(null)} />}
      {confirm && confirm.id && <ConfirmDialog title="Excluir categoria" danger confirmLabel="Excluir"
        message={`Remover a categoria "${confirm.name}"? Os lançamentos ficarão sem categoria.`}
        onConfirm={() => actions.removeCategory(confirm.id)} onClose={() => setConfirm(null)} />}
      {confirm && confirm.kind === 'newmonth' && <ConfirmDialog title="Zerar este mês" danger confirmLabel="Zerar mês"
        message={`Apagar faturamento, custos e retiradas de ${monthLabel(cm)}? Os demais meses não são afetados.`}
        onConfirm={() => actions.resetMonth(cm)} onClose={() => setConfirm(null)} />}
      {confirm && confirm.kind === 'reset' && <ConfirmDialog title="Apagar todos os dados" danger confirmLabel="Apagar tudo"
        message="Isso remove TODOS os meses e lançamentos permanentemente. Tem certeza?"
        onConfirm={() => actions.resetAll()} onClose={() => setConfirm(null)} />}
    </div>
  );
}

Object.assign(window, { CategoryModal, Ajustes });
