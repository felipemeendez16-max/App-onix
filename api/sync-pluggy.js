/* ============ App Onix — sincronização com o banco (Pluggy) ============
   Roda 1x por dia pelo agendamento do Vercel. Só LÊ a conta — nunca paga,
   nunca transfere. Nada que já existe no app é apagado ou alterado:
   esta rotina só acrescenta lançamentos novos.                           */

const admin = require('firebase-admin');

/* A partir de quando importar. Tudo que é anterior a esta data foi lançado
   à mão e já conferido contra o extrato — não pode ser tocado. */
const DESDE = '2026-10-06';

/* Saída para uma destas contas = retirada de sócio. Qualquer outro destino
   é custo da empresa. Comparação sem acento e em maiúsculas. */
const CONTAS_DOS_SOCIOS = [
  { partnerId: 'cintya',     apelidos: ['ISABELLE VERA MENDEZ', 'ISABELLE'] },
  { partnerId: 'luisfelipe', apelidos: ['LUIS FELIPE', 'LUIZ FELIPE'] },
];

const CATEGORIA_PADRAO = 'cat-outros';
const DOC = 'data/appState';

/* ---------- utilidades ---------- */

/* Variável de ambiente sem espaço/quebra de linha/aspas nas pontas —
   é fácil colar isso junto sem perceber no painel do Vercel. */
function env(nome) {
  return String(process.env[nome] || '').trim().replace(/^["']+|["']+$/g, '').trim();
}

/* "José Antônio" -> "JOSE ANTONIO" */
function semAcento(txt) {
  return String(txt || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
}

/* Mês (YYYY-MM) e dia (YYYY-MM-DD) de uma data ISO da Pluggy */
function soODia(iso) { return String(iso).slice(0, 10); }

function mesEmptyMonth() {
  return { revenue: 0, revenues: [], costs: [], withdrawals: [] };
}

/* Se a saída foi para a conta de um sócio, devolve o id dele; senão, null.
   Olha o nome do destinatário e, quando existir, também o do próprio texto. */
function socioDestinatario(t) {
  const alvo = semAcento(
    [t.paymentData && t.paymentData.receiver && t.paymentData.receiver.name,
     t.description, t.descriptionRaw].filter(Boolean).join(' | ')
  );
  const achado = CONTAS_DOS_SOCIOS.find(s => s.apelidos.some(a => alvo.includes(a)));
  return achado ? achado.partnerId : null;
}

/* ---------- Pluggy ---------- */

/* A "API Key" da Pluggy vale 2h e é gerada a cada execução a partir do
   clientId/clientSecret. Por isso ela nunca é guardada em lugar nenhum. */
async function pegarChave() {
  const r = await fetch('https://api.pluggy.ai/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: env('PLUGGY_CLIENT_ID'),
      clientSecret: env('PLUGGY_CLIENT_SECRET'),
    }),
  });
  if (!r.ok) throw new Error('Pluggy /auth respondeu ' + r.status);
  return (await r.json()).apiKey;
}

async function pegarJson(url, chave) {
  const r = await fetch(url, { headers: { 'X-API-KEY': chave } });
  if (!r.ok) {
    const corpo = (await r.text()).slice(0, 300);
    throw new Error(url.split('?')[0] + ' respondeu ' + r.status + ': ' + corpo);
  }
  return r.json();
}

async function listarContas(chave, itemId) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(itemId)) {
    // não mostra o valor inteiro; só o bastante para reconhecer o que foi colado
    throw new Error('PLUGGY_ITEM_ID fora do formato esperado (tem ' + itemId.length +
      ' caracteres, comeca com "' + itemId.slice(0, 4) + '"). Deveria ter 36, no formato 8-4-4-4-12.');
  }
  // diagnóstico: o Item ID não é segredo; registra exatamente o que chegou
  console.log('[sync-pluggy] item id recebido', JSON.stringify(itemId), 'tamanho', itemId.length);
  const d = await pegarJson('https://api.pluggy.ai/accounts?itemId=' + itemId, chave);
  return (d.results || []).filter(c => c.type === 'BANK');
}

/* Páginas de 500 em 500 até acabar (paginação por cursor do /v2) */
async function listarTransacoes(chave, accountId) {
  const base = 'https://api.pluggy.ai/v2/transactions';
  let url = base + '?accountId=' + accountId + '&dateFrom=' + DESDE;
  const todas = [];
  for (let volta = 0; volta < 50 && url; volta++) {
    const d = await pegarJson(url, chave);
    todas.push(...(d.results || []));
    // "next" já vem como query string completa
    url = d.next ? base + d.next : null;
  }
  return todas;
}

/* ---------- conversão para o formato do app ---------- */

/* Devolve { lista, registro } — em qual lista do mês entra e o que gravar.
   lista: 'revenues' (entrada) | 'costs' (custo) | 'withdrawals' (retirada) */
function converter(t) {
  const entrada = t.type === 'CREDIT';
  const registro = {
    id: 'pluggy-' + t.id,
    desc: t.description || t.descriptionRaw || 'Lançamento do banco',
    value: Math.abs(Number(t.amount) || 0),
    date: soODia(t.date),
    categoryId: entrada ? null : CATEGORIA_PADRAO,
    pluggyId: t.id,
    fonte: 'banco',
  };
  if (entrada) return { lista: 'revenues', registro };

  const partnerId = socioDestinatario(t);
  if (partnerId) {
    return { lista: 'withdrawals', registro: { ...registro, partnerId, categoryId: null } };
  }
  return { lista: 'costs', registro };
}

/* ---------- junção com o estado do app ----------
   Acrescenta ao estado os lançamentos que ainda não existem.
   Não remove nem altera nada do que já está lá. Idempotente:
   rodar duas vezes com as mesmas transações dá o mesmo resultado. */
function aplicar(estado, transacoes) {
  estado.months = estado.months || {};

  const jaImportados = new Set();
  Object.values(estado.months).forEach(m => {
    ['revenues', 'costs', 'withdrawals'].forEach(l => {
      (m[l] || []).forEach(e => { if (e.pluggyId) jaImportados.add(e.pluggyId); });
    });
  });

  let novos = 0, jaTinha = 0, antesDoCorte = 0;
  transacoes.forEach(t => {
    if (jaImportados.has(t.id)) { jaTinha++; return; }
    const dia = soODia(t.date);
    if (dia < DESDE) { antesDoCorte++; return; }      // nunca mexe no passado
    const { lista, registro } = converter(t);
    const mes = dia.slice(0, 7);
    estado.months[mes] = estado.months[mes] || mesEmptyMonth();
    const alvo = estado.months[mes];
    alvo[lista] = alvo[lista] || [];
    alvo[lista].push(registro);
    jaImportados.add(t.id);
    novos++;
  });

  return { novos, jaTinha, antesDoCorte };
}

/* ---------- Firestore ---------- */

function abrirBanco() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
    });
  }
  return admin.firestore();
}

/* ---------- rota ---------- */

module.exports = async (req, res) => {
  // Só o agendamento do Vercel (que manda o CRON_SECRET) pode disparar.
  const esperado = 'Bearer ' + process.env.CRON_SECRET;
  if (!process.env.CRON_SECRET || req.headers.authorization !== esperado) {
    return res.status(401).json({ erro: 'nao autorizado' });
  }

  try {
    const chave = await pegarChave();
    const contas = await listarContas(chave, env('PLUGGY_ITEM_ID'));

    const transacoes = [];
    for (const c of contas) transacoes.push(...await listarTransacoes(chave, c.id));

    const db = abrirBanco();
    const ref = db.doc(DOC);
    let r = { novos: 0, jaTinha: 0, antesDoCorte: 0 };

    // Transação do Firestore: ninguém escreve por cima do que o app
    // estiver salvando no mesmo instante.
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error('documento appState nao existe');
      const estado = JSON.parse(snap.data().state);
      r = aplicar(estado, transacoes);
      if (r.novos > 0) tx.set(ref, { state: JSON.stringify(estado) });
    });

    const datas = transacoes.map(t => soODia(t.date)).sort();
    const resumo = {
      ok: true, contas: contas.length, vistos: transacoes.length, ...r,
      // até onde a Pluggy já tem dados da conta
      maisAntiga: datas[0] || null, maisRecente: datas[datas.length - 1] || null,
    };
    console.log('[sync-pluggy] resumo', JSON.stringify(resumo));
    await anotarResultado(resumo);
    return res.status(200).json(resumo);
  } catch (e) {
    console.error('[sync-pluggy]', e);
    await anotarResultado({ ok: false, erro: String(e.message || e).slice(0, 500) });
    return res.status(500).json({ erro: String(e.message || e) });
  }
};

/* Guarda o resultado da última execução no campo "sync" do documento (não mexe
   nos lançamentos), para dar para saber o que aconteceu sem abrir o Vercel. */
async function anotarResultado(dados) {
  try {
    // merge: grava só o campo "sync"; o campo "state" (os lançamentos) fica intacto
    await abrirBanco().doc(DOC).set({ sync: { ...dados, quando: new Date().toISOString() } }, { merge: true });
  } catch (e) {
    console.error('[sync-pluggy] nao consegui anotar o resultado', e);
  }
}

/* expostos para a conferência automatizada */
Object.assign(module.exports, { aplicar, converter, socioDestinatario });
