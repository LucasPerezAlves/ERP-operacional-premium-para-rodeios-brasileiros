# Spec — Sidebar Operacional Colapsável do Admin ("Porteira da Arena")

**Data:** 2026-07-03
**Módulo:** Navegação administrativa (infraestrutura definitiva)
**Escopo desta sprint:** somente a navegação. O dashboard financeiro NÃO será
implementado; a AdminLandingPage mantém os cards atuais como conteúdo central.

## Objetivo

Substituir a navegação por cards + links "Voltar ao painel" por uma sidebar
operacional colapsável, permanente em todas as telas do MASTER_ADMIN, escalável
para os módulos futuros (Financeiro, Relatórios, Estoque, Cortesias,
Configurações). O fluxo do OPERADOR não é afetado.

## Decisões aprovadas

1. **Rotas aninhadas + `AdminLayout`** — um único
   `<ProtectedRoute perfis={["MASTER_ADMIN"]}>` envolve o novo `AdminLayout`
   (sidebar + `<Outlet>`); as 4 páginas admin viram rotas filhas e deixam de
   se auto-envolver no `DashboardLayout`.
2. **Módulos futuros aparecem como itens "No Curral" desabilitados** — tom
   `steel`, sem clique, tooltip "No curral — em breve", todos com `PlacaIcon`.
3. **Sem header — tudo na sidebar** — a sidebar absorve marca, navegação,
   usuário e Sair; o conteúdo ocupa a altura inteira da tela.
4. **SOS não migra para a sidebar** (decisão do usuário) — nenhum botão ou
   indicador SOS na navegação. O Admin continua recebendo os toasts SOS em
   tempo real: o `useSosAlertas` migra do `DashboardLayout` para o
   `AdminLayout`, com o stack de toasts fixo no topo, como hoje. O badge de
   contagem SOS que existia no header antigo deixa de existir.

## Arquitetura

### Rotas (`App.tsx`)

```tsx
<Route element={
  <ProtectedRoute perfis={["MASTER_ADMIN"]}>
    <AdminLayout />  {/* sidebar + toasts SOS + <Outlet/> */}
  </ProtectedRoute>
}>
  <Route path="/admin-dashboard" element={<AdminLandingPage />} />
  <Route path="/admin-dashboard/abrir-caixa" element={<AdminAbrirCaixa />} />
  <Route path="/admin-dashboard/equipe" element={<GerenciamentoEquipe />} />
  <Route path="/admin-dashboard/scorecard" element={<AdminScorecard />} />
</Route>
```

O `DashboardLayout` atual permanece servindo apenas o Operador (pode ser
simplificado: os ramos `ehAdmin` viram código morto e são removidos).

### Novos arquivos

| Arquivo | Responsabilidade |
|---|---|
| `frontend/src/components/AdminLayout.tsx` | Layout route do Admin: `SidebarProvider` + `Sidebar` + botão ☰ mobile + toasts SOS (`useSosAlertas(true)`) + `<main>` com `<Outlet/>` |
| `frontend/src/components/navigation/Sidebar.tsx` | Orquestrador: coluna fixa desktop/tablet, drawer mobile |
| `frontend/src/components/navigation/SidebarItem.tsx` | Item de navegação (`NavLink`) com estados ativo/hover/desabilitado |
| `frontend/src/components/navigation/SidebarSection.tsx` | Agrupamento com divisor `.costura` e rótulo de seção |
| `frontend/src/components/navigation/SidebarToggle.tsx` | Botão expandir/recolher (desktop/tablet) e ☰ mobile |
| `frontend/src/components/navigation/SidebarTooltip.tsx` | Tooltip do estado recolhido (hover + focus-visible, sem lib externa) |
| `frontend/src/hooks/useSidebar.ts` | Contexto + hook: `{ recolhida, alternar, drawerAberto, abrirDrawer, fecharDrawer }`, persistência em localStorage |

### Arquivos alterados

- `frontend/src/App.tsx` — rotas aninhadas acima.
- `frontend/src/pages/AdminLandingPage.tsx` — remove `<DashboardLayout>`;
  mantém os cards e a lista "No Curral" como conteúdo central (espaço
  preparado para a futura dashboard financeira).
- `frontend/src/pages/AdminAbrirCaixa.tsx`,
  `frontend/src/pages/GerenciamentoEquipe.tsx`,
  `frontend/src/pages/AdminScorecard.tsx` — removem `<DashboardLayout>` e o
  link "Voltar ao painel" (a sidebar assume a navegação); cada página passa a
  exibir o próprio título como heading visível.
- `frontend/src/components/DashboardLayout.tsx` — simplificado para
  Operador-only (remove ramos `ehAdmin`, brasão e badge SOS de admin).

## Anatomia da sidebar (conceito: porteira de curral)

Coluna full-height `wood-950` com `.textura-grao`; borda direita em `steel`
(dobradiça da porteira). Larguras: **expandida 280px, recolhida 72px**.

```text
EXPANDIDA (280px)                      RECOLHIDA (72px)
┌────────────────────────────┐         ┌──────┐
│ 🛡 CONTROLE DA ARENA   [◀] │ marca   │ 🛡   │
│    Painel da Gerência      │         │ [▶]  │
├─ ─ ─ costura ─ ─ ─ ─ ─ ─ ─ ┤         ├─ ─ ─ ┤
│ ▌🛡 Dashboard              │ ativo   │ ▌🛡  │
│  🧲 Abrir Caixa            │         │  🧲  │
│  🎖 Gerenciar Equipe       │         │  🎖  │
│  📖 Scorecard              │         │  📖  │
├─ ─ ─ costura ─ ─ ─ ─ ─ ─ ─ ┤         ├─ ─ ─ ┤
│  NO CURRAL                 │ steel,  │      │
│  🪧 Financeiro             │ sem     │  🪧  │
│  🪧 Relatórios             │ clique  │  🪧  │
│  🪧 Estoque                │         │  🪧  │
│  🪧 Cortesias              │         │  🪧  │
│  🪧 Configurações          │         │  🪧  │
├─ ─ ─ costura ─ ─ ─ ─ ─ ─ ─ ┤         ├─ ─ ─ ┤
│ (👤) Nome · Gerência       │ usuário │ (👤) │
│  ⏻ Sair                    │         │  ⏻   │
└────────────────────────────┘         └──────┘
```

### Mapeamento de ícones (todos existentes em `icons.tsx` — zero ícones novos)

| Item | Ícone |
|---|---|
| Marca (topo) | `BrasaoIcon` + "CONTROLE DA ARENA" (Alfa Slab One); recolhida, só o Brasão |
| Dashboard | `BrasaoIcon` |
| Abrir Caixa | `HorseshoeIcon` |
| Gerenciar Equipe | `DistintivoIcon` |
| Scorecard | `LivroCaixaIcon` |
| Módulos futuros (todos) | `PlacaIcon` (placa de arena = "em construção"); cada módulo ganha ícone próprio na sprint em que nascer |
| Sair | `SetaEsquerdaIcon` |
| Toggle | `SetaEsquerdaIcon`/`SetaDireitaIcon` (desktop) e ☰ composto por CSS/SVG existente no mobile |
| Usuário | componente `Avatar` existente (foto ou fallback `UserIcon`) |

## Estados visuais

- **Ativo:** trilho esquerdo `▌` em `gold-400` + texto/ícone `gold-300` +
  fundo `wood-900`; micro-animação de acender no espírito de
  `ferradura-acende` ao ativar.
- **Hover:** fundo `wood-900`, transição `250ms` com `ease-couro`.
- **Desabilitado ("No Curral"):** texto/ícone `steel-500`, `cursor-default`,
  `aria-disabled="true"`, tooltip "No curral — em breve".
- **Foco:** `focus-visible:ring-gold-400/30` (padrão do projeto).
- **Tooltips (recolhida):** etiqueta sólida `wood-800`, borda `leather-700`,
  delay ≈300ms, disparada por hover E `focus-visible`.

Proibido: glassmorphism, gradientes neon, cinza cru do Tailwind, sombras de
SaaS genérico. Checklist pre-flight do DESIGN-SYSTEM.md deve passar zerado.

## Responsividade

| Faixa | Comportamento |
|---|---|
| Desktop `lg:` (≥1024px) | Sidebar fixa, colapsável 280↔72px; preferência persistida |
| Tablet (640–1024px) | Mesma sidebar; padrão **recolhida** na primeira visita |
| Mobile (<640px) | Sidebar oculta; botão ☰ flutuante fixo (canto superior esquerdo, `btn-skeuo`, alvo ≥48px) abre **drawer** pela esquerda: sidebar expandida deslizando com overlay `arena-950/85`, focus-trap + Escape (padrão do `Modal.tsx`), fecha ao navegar |

## Estado e persistência — `useSidebar.ts`

- `SidebarProvider` (React context) montado no `AdminLayout`.
- API: `{ recolhida, alternar, drawerAberto, abrirDrawer, fecharDrawer }`.
- Persistência: `localStorage`, chave **`controle-arena:sidebar`**, valor
  `"expandida" | "recolhida"` — primeira utilização de localStorage do
  projeto; leitura/escrita com try/catch para ambientes sem storage.
- Estado do drawer mobile nunca é persistido.
- Sem valor salvo: expandida no desktop, recolhida no tablet.

## Animações

- Transição de largura `260ms ease-couro`; rótulos com fade sincronizado.
- Drawer mobile: slide-in pela esquerda, mesma duração/easing.
- Tooltip: fade curto.
- Tudo desativado sob `prefers-reduced-motion: reduce` (padrão já global).
- Nada de bounce, neon ou efeitos caricatos.

## Acessibilidade

- `<nav aria-label="Navegação da gerência">`.
- Itens são `NavLink` com `aria-current="page"` no ativo.
- Toggle com `aria-expanded` e rótulo pt-BR ("Recolher navegação" /
  "Expandir navegação").
- Drawer mobile com `role="dialog"`, focus-trap e Escape.
- Ícones decorativos mantêm `aria-hidden`.

## Fora do escopo (explícito)

- Dashboard financeiro (a landing mantém os cards atuais).
- Páginas/rotas para os módulos "No Curral".
- Qualquer mudança no fluxo do Operador.
- Ícones novos.

## Estratégia para a futura dashboard financeira

Quando o módulo Financeiro nascer: substituir apenas o conteúdo da
`AdminLandingPage` (a navegação já está pronta) e trocar o item "Financeiro"
de `PlacaIcon`+desabilitado para ícone próprio+rota. Nenhuma refatoração de
navegação será necessária de novo.

## Critérios de aceite

- Sidebar expande/recolhe com persistência em localStorage.
- Tooltips funcionam no estado recolhido (hover e teclado).
- Item ativo destacado conforme a rota atual.
- Drawer mobile abre/fecha com focus-trap e Escape.
- Toasts SOS continuam chegando em qualquer tela do Admin.
- Nenhum fluxo administrativo quebrado (abrir caixa, equipe, scorecard,
  sangria, fechamento).
- Fluxo do Operador intocado.
- Zero ícones novos; zero violações do checklist do DESIGN-SYSTEM.md.
- `npm run build` (tsc + vite) passa sem erros.

## Verificação

Sem infraestrutura de testes de front no projeto: verificação por
`npm run build` + navegação manual (desktop, viewport tablet e mobile via
devtools) cobrindo os critérios de aceite acima.
