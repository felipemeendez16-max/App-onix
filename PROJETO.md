# App Onix — Organização Financeira · Contexto do Projeto

> Documento de referência para retomar o trabalho em qualquer conversa futura.
> Última atualização: junho/2026.

## O que é
App web de controle financeiro de uma empresa, em português (BR). Controla faturamento,
custos e lucro mês a mês, e divide o lucro entre dois grupos de sócios. Visual moderno,
tema claro/escuro com brilho neon. Originalmente criado no Claude Design e implementado
de verdade no Claude Code.

## Onde está / Como funciona o deploy
- **Pasta local:** `C:\Users\felip\Desktop\onix-app`
- **GitHub:** https://github.com/felipemeendez16-max/App-onix (branch `main`)
- **No ar (Vercel):** https://app-onix.vercel.app
- **Fluxo de atualização:** editar arquivos → `git add -A && git commit && git push` →
  o Vercel faz deploy automático em ~30s. (Trabalhamos direto na `main`, sem PR — é só o dono.)
- **Identidade git já configurada:** felipemeendez16@gmail.com

## Stack / Arquitetura
- HTML + React 18 (via CDN) + Babel standalone (compila os `.jsx` no navegador). Sem build step.
- `index.html` é o ponto de entrada; carrega os scripts na ordem certa.
- Pasta `app/`: `data.js` (modelo de dados + persistência), `firebase.js` (sync),
  `auth.jsx` (login), `app.jsx` (shell/estado), e as abas `painel/custos/socios/analises/ajustes.jsx`,
  mais `components.jsx`, `charts.jsx`, `icons.jsx`, `report.js` (PDF/CSV).

## Regras de negócio
- Dados organizados por mês, com histórico. Lucro = faturamento − custos (automático).
- **Divisão do lucro:** Grupo 1 "Cintya e Luis Carlos" = 60% · Grupo 2 "Luis Felipe" = 40%.
- Retiradas por sócio abatem da cota do grupo. Barras de progresso (verde/laranja/vermelho), metas/limites.
- Categorias editáveis com cor. Gráficos (pizza, barras, linha), comparação entre meses, export PDF/CSV.

## Login (senha única compartilhada)
- Arquivo: `app/auth.jsx`. Tela de senha aparece antes do app.
- **Senha atual: `equipe360`** (guardada como hash SHA-256, não em texto puro).
- Para trocar a senha: gerar novo hash SHA-256 da senha e substituir `_PWD_HASH` em `auth.jsx`.
- Sem login do Google — a senha compartilhada basta. Botão "Sair" no menu lateral.

## Sincronização em nuvem (Firebase Firestore)
- Projeto Firebase: `app-onix-b0600`. Config em `app/firebase.js`.
- **Dados compartilhados entre todos** (não há contas separadas) — doc único `data/appState`.
- Regras do Firestore (production mode) liberam só esse doc: `match /data/appState { allow read, write: if true; }`.
- **Lógica de sync (importante):** o Firestore é a fonte da verdade. O app só escreve depois de
  ter lido a nuvem primeiro (`_hydrated`), pra evitar que abrir a página sobrescreva o que o outro salvou.
  Mudanças vindas da nuvem não são regravadas (flag `_fromRemote`). Tempo real entre dispositivos.
- Os dados ficam só no Firebase + localStorage local. Limpar dados do navegador apaga o cache local,
  mas a nuvem mantém.

## Migrações de dados
- Há uma função `migrateState()` em `data.js`, aplicada tanto no `loadState` quanto no snapshot do
  Firestore. Atualmente une "Cintya" + "Luis Carlos" num só sócio "Cintya e Luis Carlos" e remapeia
  retiradas antigas (nada se perde). É idempotente.
- **Padrão ao mexer em dados existentes:** avisar o usuário antes e oferecer backup (export CSV/PDF).
  Mudanças só de visual/funcionalidade não têm risco de perda de dados.

## Compatibilidade mobile (correções já feitas)
- Convertidas TODAS as cores de `oklch()` → `rgb()/rgba()` (oklch quebrava em Safari iOS antigo:
  texto sumia, sem caixas, sem modo escuro). `color-mix` também foi substituído por cores sólidas.
- Texto fino no iOS: removido `-webkit-font-smoothing: antialiased`, e principalmente trocada a fonte
  Inter para carregar **sem o eixo óptico `opsz`** (que afinava texto pequeno), com `font-optical-sizing: none`.
- O `<link>` do CSS usa `?v=N` (cache-busting). **Ao mudar muito o CSS, incrementar esse número** em
  `index.html` para forçar o Safari a baixar a versão nova.

## Convenções
- Idioma: português (BR). Valores em R$ 1.234,56.
- Comunicação com o usuário: ele não é programador — explicar de forma simples, sem jargão.
- Sobre APIs externas (ex: Spotify em outros apps): conectar só no Claude Code, nunca no Claude Design.
