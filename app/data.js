/* ============ App Onix — Data model, helpers & store ============ */

const STORAGE_KEY = 'app-onix-finance-v1';

/* ---------- Formatting ---------- */
const brlFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const numFmt = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function formatBRL(v) { return brlFmt.format(isFinite(v) ? v : 0); }
function formatNum(v) { return numFmt.format(isFinite(v) ? v : 0); }
function formatPct(v, dec = 1) {
  if (!isFinite(v)) v = 0;
  return v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + '%';
}

/* Parse "1.234,56" or "1234.56" or "1234,56" → number */
function parseBRL(str) {
  if (typeof str === 'number') return str;
  if (!str) return 0;
  let s = String(str).trim().replace(/[R$\s]/g, '');
  if (s.indexOf(',') > -1) { s = s.replace(/\./g, '').replace(',', '.'); }
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MONTH_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function monthKey(y, m) { return `${y}-${String(m + 1).padStart(2, '0')}`; }
function parseMonthKey(key) { const [y, m] = key.split('-').map(Number); return { y, m: m - 1 }; }
function monthLabel(key) { const { y, m } = parseMonthKey(key); return `${MONTH_NAMES[m]} de ${y}`; }
function monthLabelShort(key) { const { y, m } = parseMonthKey(key); return `${MONTH_SHORT[m]}/${String(y).slice(2)}`; }
function shiftMonth(key, delta) {
  const { y, m } = parseMonthKey(key);
  const d = new Date(y, m + delta, 1);
  return monthKey(d.getFullYear(), d.getMonth());
}
function todayISO() { return new Date().toISOString().slice(0, 10); }
function formatDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }

/* ---------- Defaults ---------- */
const DEFAULT_CATEGORIES = [
  { id: 'cat-prolabore', name: 'Pró-labore', color: '#10b981' },
  { id: 'cat-marketing', name: 'Marketing', color: '#3b82f6' },
  { id: 'cat-fornecedores', name: 'Fornecedores', color: '#f59e0b' },
  { id: 'cat-impostos', name: 'Impostos', color: '#ef4444' },
  { id: 'cat-ferramentas', name: 'Ferramentas', color: '#8b5cf6' },
  { id: 'cat-pessoal', name: 'Pessoal', color: '#ec4899' },
  { id: 'cat-outros', name: 'Outros', color: '#64748b' },
];

const CATEGORY_PALETTE = ['#10b981','#06b6d4','#3b82f6','#6366f1','#8b5cf6','#a855f7','#ec4899','#f43f5e','#ef4444','#f59e0b','#eab308','#84cc16','#14b8a6','#64748b'];

const DEFAULT_PARTNERS = [
  { id: 'cintya', name: 'Cintya', group: 'g1' },
  { id: 'luiscarlos', name: 'Luis Carlos', group: 'g1' },
  { id: 'luisfelipe', name: 'Luis Felipe', group: 'g2' },
];

const DEFAULT_GROUPS = [
  { id: 'g1', name: 'Cintya e Luis Carlos', pct: 60, limit: null },
  { id: 'g2', name: 'Luis Felipe', pct: 40, limit: null },
];

function makeEmptyMonth() {
  return { revenue: 0, revenues: [], costs: [], withdrawals: [] };
}

/* Map a txn kind to its month list key */
const TXN_LIST = { revenue: 'revenues', cost: 'costs', withdrawal: 'withdrawals' };

/* Ensure a month object has every list (with migration of the old single revenue number) */
function normalizeMonth(m) {
  const out = { revenue: 0, revenues: [], costs: [], withdrawals: [], ...m };
  out.revenues = Array.isArray(out.revenues) ? out.revenues : [];
  out.costs = Array.isArray(out.costs) ? out.costs : [];
  out.withdrawals = Array.isArray(out.withdrawals) ? out.withdrawals : [];
  // migrate legacy single revenue number into a revenue entry
  if (out.revenues.length === 0 && (out.revenue || 0) > 0) {
    out.revenues = [{ id: uid(), desc: 'Faturamento', value: out.revenue, date: null, categoryId: null }];
  }
  out.revenue = 0;
  return out;
}

function initialState() {
  const now = new Date();
  const curKey = monthKey(now.getFullYear(), now.getMonth());
  return {
    version: 1,
    categories: DEFAULT_CATEGORIES.map(c => ({ ...c })),
    partners: DEFAULT_PARTNERS.map(p => ({ ...p })),
    groups: DEFAULT_GROUPS.map(g => ({ ...g })),
    months: {},                 // populated on demand
    currentMonth: curKey,
    settings: { theme: 'light' },
  };
}

/* ---------- Persistence ---------- */
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw);
    const base = initialState();
    const months = {};
    Object.entries(parsed.months || {}).forEach(([k, m]) => { months[k] = normalizeMonth(m); });
    // Profit split is fixed at 60/40 — force it regardless of stored state
    const groups = (parsed.groups || base.groups).map(g => {
      const def = DEFAULT_GROUPS.find(d => d.id === g.id);
      return { ...g, pct: def ? def.pct : g.pct };
    });
    return {
      ...base,
      ...parsed,
      categories: parsed.categories || base.categories,
      partners: parsed.partners || base.partners,
      groups,
      months,
      settings: { ...base.settings, ...(parsed.settings || {}) },
    };
  } catch (e) {
    console.warn('Falha ao carregar estado', e);
    return initialState();
  }
}
function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (e) { console.warn('Falha ao salvar', e); }
}

/* ---------- Lookups & calculations ---------- */
function getMonth(state, key) { return state.months[key] ? normalizeMonth(state.months[key]) : makeEmptyMonth(); }
function catById(state, id) { return state.categories.find(c => c.id === id) || { id: null, name: 'Sem categoria', color: '#94a3b8' }; }
function partnerById(state, id) { return state.partners.find(p => p.id === id) || { id: null, name: '—', group: null }; }
function groupById(state, id) { return state.groups.find(g => g.id === id) || { id: null, name: '—', pct: 0, limit: null }; }
function partnersOfGroup(state, gid) { return state.partners.filter(p => p.group === gid); }

function computeMonth(state, key) {
  const m = getMonth(state, key);
  const revenue = m.revenues.reduce((s, r) => s + (r.value || 0), 0);
  const totalCosts = m.costs.reduce((s, c) => s + (c.value || 0), 0);
  const profit = revenue - totalCosts;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  const groups = state.groups.map(g => {
    const quota = profit * (g.pct / 100);
    const members = partnersOfGroup(state, g.id);
    const withdrawals = m.withdrawals.filter(w => {
      const p = partnerById(state, w.partnerId);
      return p.group === g.id;
    });
    const withdrawn = withdrawals.reduce((s, w) => s + (w.value || 0), 0);
    const remaining = quota - withdrawn;
    const usePct = quota > 0 ? (withdrawn / quota) * 100 : (withdrawn > 0 ? 999 : 0);
    return { ...g, quota, members, withdrawn, remaining, usePct };
  });

  const totalWithdrawn = m.withdrawals.reduce((s, w) => s + (w.value || 0), 0);
  const totalDistributed = groups.reduce((s, g) => s + g.quota, 0);
  const available = profit - totalWithdrawn;
  const pctSum = state.groups.reduce((s, g) => s + (g.pct || 0), 0);

  return { key, revenue, totalCosts, profit, margin, groups, totalWithdrawn, totalDistributed, available, pctSum,
    revenueCount: m.revenues.length, costCount: m.costs.length, withdrawalCount: m.withdrawals.length };
}

function withdrawalsOfPartner(state, key, pid) {
  return getMonth(state, key).withdrawals.filter(w => w.partnerId === pid);
}
function partnerWithdrawnTotal(state, key, pid) {
  return withdrawalsOfPartner(state, key, pid).reduce((s, w) => s + (w.value || 0), 0);
}

/* Spending by category for a list of entries */
function spendByCategory(state, entries) {
  const map = {};
  entries.forEach(e => {
    const id = e.categoryId || 'none';
    map[id] = (map[id] || 0) + (e.value || 0);
  });
  return Object.entries(map)
    .map(([id, value]) => ({ cat: id === 'none' ? { id: 'none', name: 'Sem categoria', color: '#94a3b8' } : catById(state, id), value }))
    .sort((a, b) => b.value - a.value);
}

/* All month keys that have data, sorted */
function dataMonthKeys(state) { return Object.keys(state.months).sort(); }

/* Variation helper */
function variation(cur, prev) {
  if (prev === 0 || !isFinite(prev)) return cur === 0 ? { pct: 0, dir: 'flat' } : { pct: null, dir: cur > 0 ? 'up' : 'down' };
  const pct = ((cur - prev) / Math.abs(prev)) * 100;
  return { pct, dir: pct > 0.05 ? 'up' : pct < -0.05 ? 'down' : 'flat' };
}

/* ---------- CSV export ---------- */
function csvEscape(v) {
  const s = String(v == null ? '' : v);
  return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function downloadFile(name, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}
function exportMonthCSV(state, key) {
  const m = getMonth(state, key);
  const rows = [['Tipo','Sócio','Descrição','Categoria','Data','Valor (R$)']];
  m.revenues.forEach(r => rows.push(['Entrada','', r.desc, r.categoryId ? catById(state, r.categoryId).name : '', formatDate(r.date), formatNum(r.value)]));
  m.costs.forEach(c => rows.push(['Custo da empresa','', c.desc, catById(state, c.categoryId).name, formatDate(c.date), formatNum(c.value)]));
  m.withdrawals.forEach(w => rows.push(['Retirada', partnerById(state, w.partnerId).name, w.desc, catById(state, w.categoryId).name, formatDate(w.date), formatNum(w.value)]));
  const csv = '\uFEFF' + rows.map(r => r.map(csvEscape).join(';')).join('\n');
  downloadFile(`onix-${key}.csv`, csv, 'text/csv;charset=utf-8');
}

Object.assign(window, {
  STORAGE_KEY, formatBRL, formatNum, formatPct, parseBRL,
  MONTH_NAMES, MONTH_SHORT, monthKey, parseMonthKey, monthLabel, monthLabelShort, shiftMonth,
  todayISO, formatDate, uid, TXN_LIST, normalizeMonth,
  DEFAULT_CATEGORIES, CATEGORY_PALETTE, DEFAULT_PARTNERS, DEFAULT_GROUPS,
  makeEmptyMonth, initialState, loadState, saveState,
  getMonth, catById, partnerById, groupById, partnersOfGroup, computeMonth,
  withdrawalsOfPartner, partnerWithdrawnTotal, spendByCategory, dataMonthKeys, variation,
  exportMonthCSV, downloadFile,
});
