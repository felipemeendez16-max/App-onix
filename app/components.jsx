/* ============ App Onix — Shared UI components ============ */
const { useState, useEffect, useRef, useMemo, useCallback } = React;
Object.assign(window, { useState, useEffect, useRef, useMemo, useCallback });

/* ---------- Modal ---------- */
function Modal({ title, onClose, children, wide, footer }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);
  return (
    <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={'modal' + (wide ? ' wide' : '')}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" style={{ width: 34, height: 34, boxShadow: 'none' }} onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- Confirm ---------- */
function ConfirmDialog({ title, message, confirmLabel = 'Confirmar', danger, onConfirm, onClose }) {
  return (
    <Modal title={title} onClose={onClose} footer={
      <>
        <button className="btn btn-soft" onClick={onClose}>Cancelar</button>
        <button className={'btn ' + (danger ? 'btn-danger' : 'btn-primary')} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button>
      </>
    }>
      <p style={{ color: 'var(--text-dim)', fontSize: 14.5, lineHeight: 1.5 }}>{message}</p>
    </Modal>
  );
}

/* ---------- Field wrapper ---------- */
function Field({ label, children, hint }) {
  return (
    <div className="field">
      {label && <label>{label}</label>}
      {children}
      {hint && <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{hint}</span>}
    </div>
  );
}

/* ---------- Money input (text, formats on blur) ---------- */
function MoneyInput({ value, onChange, placeholder = '0,00', autoFocus }) {
  const [text, setText] = useState(value ? formatNum(value) : '');
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setText(value ? formatNum(value) : ''); }, [value]);
  return (
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', fontWeight: 600, fontSize: 13, pointerEvents: 'none' }}>R$</span>
      <input
        className="input amount" style={{ paddingLeft: 38 }} placeholder={placeholder} autoFocus={autoFocus}
        inputMode="decimal" value={text}
        onFocus={() => { focused.current = true; }}
        onChange={e => { setText(e.target.value); onChange(parseBRL(e.target.value)); }}
        onBlur={() => { focused.current = false; const n = parseBRL(text); setText(n ? formatNum(n) : ''); onChange(n); }}
      />
    </div>
  );
}

/* ---------- Category chip / dot ---------- */
function CatChip({ cat, mode = 'chip' }) {
  if (!cat) return null;
  if (mode === 'dot') return <span className="cat-dot" style={{ background: cat.color }} />;
  return (
    <span className="cat-chip" style={{ background: cat.color + '22', color: cat.color }}>
      <span className="cat-dot" style={{ background: cat.color }} />{cat.name}
    </span>
  );
}

/* ---------- Progress bar ---------- */
function Progress({ pct, color, tall, track }) {
  const w = Math.max(0, Math.min(100, pct));
  return (
    <div className={'progress' + (tall ? ' tall' : '')} style={track ? { background: track } : undefined}>
      <span style={{ width: w + '%', background: color }} />
    </div>
  );
}

/* status color from usage pct vs limit */
function usageColor(pct) {
  if (pct > 100) return 'var(--neg)';
  if (pct >= 80) return 'var(--warn)';
  return 'var(--accent)';
}
function usageStatus(pct) {
  if (pct > 100) return { label: 'Cota ultrapassada', cls: 'neg' };
  if (pct >= 80) return { label: 'Perto da cota', cls: 'warn' };
  return { label: 'Dentro da cota', cls: 'pos' };
}

/* ---------- Stat card ---------- */
function Stat({ label, value, icon, foot, accent, delta }) {
  return (
    <div className="stat">
      {accent && <span className="accent-bar" style={{ background: accent }} />}
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        {icon && <span className="stat-ico" style={accent ? { background: accent + '1f', color: accent } : undefined}><Icon name={icon} size={17} /></span>}
      </div>
      <div className="stat-value">{value}</div>
      {(foot || delta) && (
        <div className="stat-foot">
          {delta && <Delta v={delta} />}
          {foot}
        </div>
      )}
    </div>
  );
}

/* ---------- Delta badge ---------- */
function Delta({ v, suffix = '' }) {
  if (!v) return null;
  const { pct, dir } = v;
  const label = pct == null ? 'novo' : formatPct(Math.abs(pct), 1);
  return (
    <span className={'delta ' + dir}>
      {dir === 'up' && <Icon name="arrowUp" size={12} stroke={2.5} />}
      {dir === 'down' && <Icon name="arrowDown" size={12} stroke={2.5} />}
      {label}{suffix}
    </span>
  );
}

/* ---------- Empty state ---------- */
function EmptyState({ icon = 'inbox', title, message, action }) {
  return (
    <div className="empty">
      <div className="empty-ico"><Icon name={icon} size={26} /></div>
      <h4>{title}</h4>
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}

/* ---------- Category select ---------- */
function CategorySelect({ categories, value, onChange, allowNone }) {
  return (
    <select className="select" value={value || ''} onChange={e => onChange(e.target.value || null)}>
      {allowNone && <option value="">Sem categoria</option>}
      {!allowNone && !value && <option value="" disabled>Selecione…</option>}
      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
  );
}

/* ---------- Transaction modal (cost or withdrawal) ---------- */
function TxnModal({ kind, partners, categories, initial, onSave, onClose }) {
  const [desc, setDesc] = useState(initial?.desc || '');
  const [value, setValue] = useState(initial?.value || 0);
  const [date, setDate] = useState(initial?.date || todayISO());
  const [categoryId, setCategoryId] = useState(initial?.categoryId || (categories[0]?.id || null));
  const [partnerId, setPartnerId] = useState(initial?.partnerId || (partners?.[0]?.id || null));
  const isEdit = !!initial?.id;
  const valid = desc.trim() && value > 0 && (kind !== 'withdrawal' || partnerId);

  function submit() {
    if (!valid) return;
    const rec = { id: initial?.id || uid(), desc: desc.trim(), value, date, categoryId };
    if (kind === 'withdrawal') rec.partnerId = partnerId;
    onSave(rec); onClose();
  }
  const titles = { cost: 'custo da empresa', withdrawal: 'lançamento de retirada', revenue: 'entrada de faturamento' };
  const placeholders = { cost: 'Ex: Anúncios Google', withdrawal: 'Ex: Retirada mensal', revenue: 'Ex: Venda / Serviço cliente X' };
  return (
    <Modal title={(isEdit ? 'Editar ' : 'Nova ') + titles[kind]} onClose={onClose}
      footer={<>
        <button className="btn btn-soft" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={!valid} onClick={submit}>{isEdit ? 'Salvar' : 'Adicionar'}</button>
      </>}>
      <Field label="Descrição">
        <input className="input" autoFocus placeholder={placeholders[kind]} value={desc} onChange={e => setDesc(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} />
      </Field>
      <div className="grid-2">
        <Field label="Valor"><MoneyInput value={value} onChange={setValue} /></Field>
        <Field label="Data"><input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
      </div>
      {kind === 'withdrawal' && (
        <Field label="Sócio">
          <select className="select" value={partnerId || ''} onChange={e => setPartnerId(e.target.value)}>
            {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
      )}
      <Field label="Categoria"><CategorySelect categories={categories} value={categoryId} onChange={setCategoryId} allowNone /></Field>
    </Modal>
  );
}

Object.assign(window, {
  Modal, ConfirmDialog, Field, MoneyInput, CatChip, Progress, usageColor, usageStatus,
  Stat, Delta, EmptyState, CategorySelect, TxnModal,
});
