/* ============ App Onix — Main app shell ============ */
const TABS = [
  { id: 'painel', label: 'Painel', short: 'Painel', icon: 'dashboard' },
  { id: 'custos', label: 'Entradas e custos', short: 'Entradas', icon: 'receipt' },
  { id: 'socios', label: 'Sócios', short: 'Sócios', icon: 'users' },
  { id: 'analises', label: 'Análises', short: 'Análises', icon: 'chart' },
  { id: 'ajustes', label: 'Ajustes', short: 'Ajustes', icon: 'settings' },
];

function MonthPicker({ value, onChange, onPick, dataKeys }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  const { y } = parseMonthKey(value);
  const years = Array.from(new Set([...dataKeys.map(k => parseMonthKey(k).y), y])).sort();
  return (
    <div className="month-picker" ref={ref} style={{ position: 'relative' }}>
      <button className="step" onClick={() => onChange(shiftMonth(value, -1))}><Icon name="chevronLeft" size={17} /></button>
      <button className="month-current" onClick={() => setOpen(o => !o)}>
        <Icon name="calendar" size={14} /> {monthLabel(value)}
      </button>
      <button className="step" onClick={() => onChange(shiftMonth(value, 1))}><Icon name="chevronRight" size={17} /></button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-lg)', padding: 14, zIndex: 60, width: 270 }}>
          {years.map(yr => (
            <div key={yr} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-faint)', marginBottom: 6, paddingLeft: 4 }}>{yr}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
                {MONTH_SHORT.map((mn, mi) => {
                  const k = monthKey(yr, mi);
                  const hasData = dataKeys.includes(k);
                  const isCur = k === value;
                  return (
                    <button key={mi} onClick={() => { onChange(k); setOpen(false); }}
                      style={{ padding: '7px 0', borderRadius: 8, fontSize: 12.5, fontWeight: 600, position: 'relative',
                        background: isCur ? 'var(--accent)' : 'transparent', color: isCur ? 'var(--on-accent)' : 'var(--text-dim)' }}>
                      {mn}{hasData && !isCur && <span style={{ position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: 99, background: 'var(--accent)' }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Root() {
  const [authed, setAuthed] = useState(isAuthenticated);
  if (!authed) return <LoginScreen onAuth={() => setAuthed(true)} />;
  return <App />;
}

function App() {
  const [state, setState] = useState(loadState);
  const [tab, setTab] = useState('painel');
  // _hydrated: só passa a escrever no Firestore DEPOIS de receber a primeira
  // resposta da nuvem. Isso evita que abrir/atualizar a página empurre dados
  // antigos por cima do que o outro acabou de salvar.
  const _hydrated = useRef(false);
  const _fromRemote = useRef(false);

  // Firestore é a fonte da verdade: todo snapshot atualiza o app
  useEffect(() => {
    if (!window.subscribeFirestore) { _hydrated.current = true; return; }
    const unsub = window.subscribeFirestore(remoteState => {
      if (remoteState) {
        const before = JSON.stringify(remoteState.partners);
        const migrated = migrateState(remoteState);
        const changed = JSON.stringify(migrated.partners) !== before;
        // Se a nuvem estava desatualizada, aplica E deixa salvar a versão corrigida.
        // Caso contrário, marca como vinda da nuvem (não regrava).
        if (!changed) _fromRemote.current = true;
        setState(migrated);
      }
      _hydrated.current = true; // hidratado mesmo se o banco estiver vazio
    });
    return unsub;
  }, []);

  // Salva: ignora até hidratar; ignora mudanças que vieram da própria nuvem
  useEffect(() => {
    if (!_hydrated.current) return;
    if (_fromRemote.current) {
      _fromRemote.current = false;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
      return;
    }
    saveState(state);
  }, [state]);
  useEffect(() => { document.documentElement.setAttribute('data-theme', state.settings.theme); }, [state.settings.theme]);

  const cm = state.currentMonth;
  const comp = useMemo(() => computeMonth(state, cm), [state, cm]);
  const dataKeys = useMemo(() => dataMonthKeys(state), [state.months]);
  const prevKeys = dataKeys.filter(k => k < cm);
  const prevComp = prevKeys.length ? computeMonth(state, prevKeys[prevKeys.length - 1]) : null;

  // ---- mutations ----
  const mutateMonth = useCallback((key, fn) => {
    setState(s => {
      const base = s.months[key] ? normalizeMonth(s.months[key]) : makeEmptyMonth();
      const m = { ...base, revenues: [...base.revenues], costs: [...base.costs], withdrawals: [...base.withdrawals] };
      fn(m);
      return { ...s, months: { ...s.months, [key]: m } };
    });
  }, []);

  const actions = useMemo(() => ({
    setCurrentMonth: k => setState(s => ({ ...s, currentMonth: k })),
    goTo: t => setTab(t),
    setTheme: t => setState(s => ({ ...s, settings: { ...s.settings, theme: t } })),
    setRevenue: v => mutateMonth(cm, m => { m.revenue = v; }),
    saveTxn: (kind, rec) => mutateMonth(cm, m => {
      const list = TXN_LIST[kind];
      const i = m[list].findIndex(x => x.id === rec.id);
      if (i >= 0) m[list][i] = rec; else m[list].push(rec);
    }),
    removeTxn: (kind, id) => mutateMonth(cm, m => {
      const list = TXN_LIST[kind];
      m[list] = m[list].filter(x => x.id !== id);
    }),
    setGroupPct: (gid, pct) => setState(s => ({ ...s, groups: s.groups.map(g => g.id === gid ? { ...g, pct } : g) })),
    setGroupLimit: (gid, limit) => setState(s => ({ ...s, groups: s.groups.map(g => g.id === gid ? { ...g, limit } : g) })),
    saveCategory: c => setState(s => {
      const i = s.categories.findIndex(x => x.id === c.id);
      const categories = i >= 0 ? s.categories.map(x => x.id === c.id ? c : x) : [...s.categories, c];
      return { ...s, categories };
    }),
    removeCategory: id => setState(s => ({ ...s, categories: s.categories.filter(c => c.id !== id) })),
    resetMonth: key => setState(s => ({ ...s, months: { ...s.months, [key]: makeEmptyMonth() } })),
    resetAll: () => { const fresh = initialState(); fresh.settings.theme = state.settings.theme; setState(fresh); setTab('painel'); },
    exportPDF: () => buildReportPDF(state, cm),
  }), [cm, mutateMonth, state]);

  const ViewByTab = { painel: Painel, custos: Custos, socios: Socios, analises: Analises, ajustes: Ajustes };
  const View = ViewByTab[tab];
  const titleByTab = { painel: 'Painel financeiro', custos: 'Entradas e custos', socios: 'Divisão entre sócios', analises: 'Análises e gráficos', ajustes: 'Ajustes' };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Icon name="sparkle" size={20} stroke={2} /></div>
          <div><div className="brand-name">App Onix</div><div className="brand-sub">Financeiro</div></div>
        </div>
        <nav className="nav-list">
          {TABS.map(t => (
            <button key={t.id} className={'nav-item' + (tab === t.id ? ' active' : '')} onClick={() => setTab(t.id)}>
              <Icon name={t.icon} size={19} /> {t.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <button className="nav-item" onClick={() => actions.setTheme(state.settings.theme === 'dark' ? 'light' : 'dark')}>
            <Icon name={state.settings.theme === 'dark' ? 'sun' : 'moon'} size={19} /> Tema {state.settings.theme === 'dark' ? 'claro' : 'escuro'}
          </button>
          <button className="nav-item" onClick={logout} style={{ color: 'var(--neg)' }}>
            <Icon name="logout" size={19} /> Sair
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <span className="page-title desktop-only">{titleByTab[tab]}</span>
          <div className="brand mobile-only" style={{ padding: 0, gap: 8 }}>
            <div className="brand-mark" style={{ width: 32, height: 32 }}><Icon name="sparkle" size={17} /></div>
            <span className="brand-name" style={{ fontSize: 15 }}>App Onix</span>
          </div>
          <div className="topbar-spacer" />
          <MonthPicker value={cm} onChange={actions.setCurrentMonth} dataKeys={dataKeys} />
          <button className="icon-btn desktop-only" title="Exportar CSV" onClick={() => exportMonthCSV(state, cm)}><Icon name="download" size={18} /></button>
          <button className="icon-btn desktop-only" title="Relatório PDF" onClick={() => actions.exportPDF()}><Icon name="fileText" size={18} /></button>
        </header>

        <main className="content">
          <View state={state} comp={comp} cm={cm} actions={actions} prevComp={prevComp} />
        </main>
      </div>

      <nav className="mobile-nav">
        {TABS.map(t => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} size={20} /> {t.short}
          </button>
        ))}
      </nav>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />);
