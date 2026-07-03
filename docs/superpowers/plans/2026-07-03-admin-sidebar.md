# Sidebar Operacional do Admin ("Porteira da Arena") — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir a navegação por cards + links "Voltar" do módulo admin por uma sidebar colapsável permanente (280↔72px, drawer no mobile), via rotas aninhadas com `AdminLayout` + `<Outlet>`.

**Architecture:** Nova layout route no React Router v7: um único `<ProtectedRoute>` MASTER_ADMIN envolve `AdminLayout` (SidebarProvider + Sidebar + toasts SOS + `<Outlet>`); as 4 páginas admin viram rotas filhas e deixam de se auto-envolver no `DashboardLayout`. O `DashboardLayout` fica **intocado** (o Admin ainda o usa em `/operador-dashboard`).

**Tech Stack:** React 18 + TypeScript + Vite, react-router-dom ^7.18.1, Tailwind 3 com tokens do DESIGN-SYSTEM.md. Sem libs novas.

**Spec:** `docs/superpowers/specs/2026-07-03-admin-sidebar-design.md`

## Global Constraints

- Textos de UI em **pt-BR**.
- **Zero ícones novos** — só componentes de `frontend/src/components/icons.tsx`; o ☰ mobile é composto por 3 `<span>` (barras CSS).
- **Só tokens do design system**: cores `wood/leather/rust/gold/steel/arena/campo/bordo`, easing `ease-couro`, `shadow-arena`, `.textura-grao`, `.btn-skeuo`. Proibido: cor crua do Tailwind (`gray-*`, `white`, etc.), `rounded-2xl`, glassmorphism/`backdrop-blur`.
- Toda animação decorativa respeita `prefers-reduced-motion` (novo keyframe entra na lista do `index.css`).
- Foco: `focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold-400/30` (padrão do projeto).
- Não há framework de testes no front: o ciclo de verificação de cada task é `npm run build` (roda `tsc -b`, com `noUnusedLocals` ligado — import sobrando quebra o build) a partir de `frontend/`.
- Commits frequentes, mensagens em pt-BR estilo do repo, terminando com `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- **Nada do fluxo do Operador é alterado** (`DashboardLayout.tsx`, `OperadorLandingPage.tsx`, `OperadorVenda.tsx` intocados).

---

### Task 1: Hook `useSidebar` (contexto + persistência)

**Files:**
- Create: `frontend/src/hooks/useSidebar.tsx`

**Interfaces:**
- Consumes: nada (folha).
- Produces: `SidebarProvider` (componente de contexto) e `useSidebar(): { recolhida: boolean; alternar: () => void; drawerAberto: boolean; abrirDrawer: () => void; fecharDrawer: () => void }`. Persistência em `localStorage` na chave `controle-arena:sidebar` com valores `"expandida" | "recolhida"`. Extensão `.tsx` porque exporta JSX (o provider).

- [ ] **Step 1: Criar o arquivo**

```tsx
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

const CHAVE_STORAGE = "controle-arena:sidebar";

type PreferenciaSidebar = "expandida" | "recolhida";

function lerPreferencia(): PreferenciaSidebar | null {
  try {
    const valor = window.localStorage.getItem(CHAVE_STORAGE);
    return valor === "expandida" || valor === "recolhida" ? valor : null;
  } catch {
    return null; // ambiente sem storage — preferência vive só na sessão
  }
}

function gravarPreferencia(valor: PreferenciaSidebar) {
  try {
    window.localStorage.setItem(CHAVE_STORAGE, valor);
  } catch {
    // best-effort: sem storage, o estado atual continua valendo na sessão
  }
}

/** Sem preferência salva: expandida no desktop (≥1024px), recolhida no tablet. */
function estadoInicialRecolhida(): boolean {
  const salvo = lerPreferencia();
  if (salvo) return salvo === "recolhida";
  return window.matchMedia("(max-width: 1023px)").matches;
}

interface SidebarContextValue {
  /** true = coluna de 72px só com ícones (tablet/desktop). */
  recolhida: boolean;
  alternar: () => void;
  /** Drawer lateral do mobile — nunca persistido. */
  drawerAberto: boolean;
  abrirDrawer: () => void;
  fecharDrawer: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [recolhida, setRecolhida] = useState(estadoInicialRecolhida);
  const [drawerAberto, setDrawerAberto] = useState(false);

  const alternar = useCallback(() => {
    setRecolhida((atual) => {
      const proxima = !atual;
      gravarPreferencia(proxima ? "recolhida" : "expandida");
      return proxima;
    });
  }, []);

  const abrirDrawer = useCallback(() => setDrawerAberto(true), []);
  const fecharDrawer = useCallback(() => setDrawerAberto(false), []);

  return (
    <SidebarContext.Provider
      value={{ recolhida, alternar, drawerAberto, abrirDrawer, fecharDrawer }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar(): SidebarContextValue {
  const contexto = useContext(SidebarContext);
  if (!contexto) {
    throw new Error("useSidebar deve ser usado dentro de <SidebarProvider>");
  }
  return contexto;
}
```

- [ ] **Step 2: Verificar que compila**

Run: `cd frontend && npm run build`
Expected: build passa sem erros (o arquivo ainda não é importado por ninguém — `noUnusedLocals` só reclama de locals dentro do arquivo, não de módulos não referenciados).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useSidebar.tsx
git commit -m "feat(front): hook useSidebar com contexto e persistencia em localStorage"
```

---

### Task 2: `SidebarTooltip`, `SidebarSection` e `SidebarItem`

**Files:**
- Create: `frontend/src/components/navigation/SidebarTooltip.tsx`
- Create: `frontend/src/components/navigation/SidebarSection.tsx`
- Create: `frontend/src/components/navigation/SidebarItem.tsx`

**Interfaces:**
- Consumes: `NavLink` do react-router-dom; ícones existentes chegam por prop.
- Produces:
  - `SidebarTooltip({ rotulo: string; visivel: boolean })` — retorna `null` se `!visivel`; requer classe `group` e `relative` no pai.
  - `SidebarSection({ rotulo?: string; recolhida: boolean; className?: string; children: ReactNode })`.
  - `SidebarItem({ item: ItemNavegacao; recolhida: boolean; aoNavegar?: () => void })` e o tipo exportado `ItemNavegacao = { rotulo: string; icone: ComponentType<{ className?: string }>; rota?: string; fimDaRota?: boolean }` (sem `rota` = item "no curral" desabilitado).

- [ ] **Step 1: Criar `SidebarTooltip.tsx`**

```tsx
/**
 * Etiqueta do estado recolhido: aparece ao lado do item por hover ou foco de
 * teclado, com atraso curto. CSS puro (group-hover / group-focus-within) —
 * sem lib externa. O pai precisa ter as classes `group relative`.
 */
export default function SidebarTooltip({
  rotulo,
  visivel,
}: {
  rotulo: string;
  visivel: boolean;
}) {
  if (!visivel) return null;

  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md border border-leather-600/60 bg-wood-800 px-3 py-1.5 text-xs font-semibold text-leather-200 opacity-0 shadow-arena transition-opacity duration-200 group-hover:opacity-100 group-hover:delay-300 group-focus-within:opacity-100 group-focus-within:delay-300"
    >
      {rotulo}
    </span>
  );
}
```

- [ ] **Step 2: Criar `SidebarSection.tsx`**

```tsx
import { type ReactNode } from "react";

/**
 * Agrupamento da porteira: divisor de pesponto (costura de sela) no topo e
 * rótulo de seção em aço — o rótulo some no estado recolhido.
 */
export default function SidebarSection({
  rotulo,
  recolhida,
  className = "",
  children,
}: {
  rotulo?: string;
  recolhida: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`border-t border-dashed border-leather-600/40 pt-3 ${className}`}>
      {rotulo && !recolhida && (
        <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-steel-500">
          {rotulo}
        </p>
      )}
      <ul className="flex flex-col gap-1">{children}</ul>
    </div>
  );
}
```

- [ ] **Step 3: Criar `SidebarItem.tsx`**

```tsx
import { type ComponentType } from "react";
import { NavLink } from "react-router-dom";
import SidebarTooltip from "./SidebarTooltip";

export interface ItemNavegacao {
  rotulo: string;
  icone: ComponentType<{ className?: string }>;
  /** Ausente = módulo "no curral": visível na porteira, mas ainda sem rota. */
  rota?: string;
  /** true = ativo só na rota exata (evita o Dashboard aceso nas filhas). */
  fimDaRota?: boolean;
}

/**
 * Item da porteira: NavLink com trilho de brasa ▌ dourado no estado ativo,
 * tooltip no estado recolhido e variante apagada (aço, sem clique) para os
 * módulos "no curral". Alvo de toque mínimo de 48px (min-h-12).
 */
export default function SidebarItem({
  item,
  recolhida,
  aoNavegar,
}: {
  item: ItemNavegacao;
  recolhida: boolean;
  aoNavegar?: () => void;
}) {
  const Icone = item.icone;
  const rotulo = recolhida ? (
    <span className="sr-only">{item.rotulo}</span>
  ) : (
    <span className="truncate text-sm font-semibold">{item.rotulo}</span>
  );

  if (!item.rota) {
    return (
      <li>
        <span
          aria-disabled="true"
          className={`group relative flex min-h-12 cursor-default items-center gap-3 rounded-lg px-3 text-steel-500 ${
            recolhida ? "justify-center" : ""
          }`}
        >
          <Icone className="h-5 w-5 shrink-0" />
          {rotulo}
          <SidebarTooltip
            rotulo={`${item.rotulo} — no curral, em breve`}
            visivel={recolhida}
          />
        </span>
      </li>
    );
  }

  return (
    <li>
      <NavLink
        to={item.rota}
        end={item.fimDaRota}
        onClick={aoNavegar}
        className={({ isActive }) =>
          `group relative flex min-h-12 touch-manipulation items-center gap-3 rounded-lg px-3 transition-colors duration-200 ease-couro focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold-400/30 ${
            recolhida ? "justify-center" : ""
          } ${
            isActive
              ? "bg-wood-900 text-gold-300"
              : "text-leather-300 hover:bg-wood-900 hover:text-leather-200"
          }`
        }
      >
        {({ isActive }) => (
          <>
            {/* Trilho de brasa ▌ — marca física da página atual */}
            <span
              aria-hidden
              className={`absolute inset-y-2 left-0 w-1 rounded-r-full bg-gold-400 ${
                isActive ? "opacity-100 animate-ferradura-acende" : "opacity-0"
              }`}
            />
            <Icone
              className={`h-5 w-5 shrink-0 ${isActive ? "text-gold-400" : ""}`}
            />
            {rotulo}
            <SidebarTooltip rotulo={item.rotulo} visivel={recolhida} />
          </>
        )}
      </NavLink>
    </li>
  );
}
```

- [ ] **Step 4: Verificar que compila**

Run: `cd frontend && npm run build`
Expected: build passa sem erros.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/navigation/
git commit -m "feat(front): itens, secoes e tooltip da sidebar de navegacao do Admin"
```

---

### Task 3: Keyframe `porteira-abre`, `SidebarToggle` e `Sidebar` (coluna + drawer)

**Files:**
- Modify: `frontend/tailwind.config.js` (keyframes + animation)
- Modify: `frontend/src/index.css` (lista do prefers-reduced-motion)
- Create: `frontend/src/components/navigation/SidebarToggle.tsx`
- Create: `frontend/src/components/navigation/Sidebar.tsx`

**Interfaces:**
- Consumes: `useSidebar()` da Task 1; `SidebarItem`/`SidebarSection`/`SidebarTooltip` e `ItemNavegacao` da Task 2; `useAuth()` de `../../lib/auth`; `Avatar` de `../ui/Avatar`; ícones `BrasaoIcon, DistintivoIcon, HorseshoeIcon, LivroCaixaIcon, PlacaIcon, SetaDireitaIcon, SetaEsquerdaIcon` de `../icons`.
- Produces: `Sidebar()` (sem props) — renderiza a coluna fixa (`hidden sm:block`, `w-[280px]`/`w-[72px]`) e o drawer mobile controlado por `drawerAberto`. `SidebarToggle({ className?: string })`.

- [ ] **Step 1: Adicionar o keyframe no `tailwind.config.js`**

Em `theme.extend.keyframes`, logo após o bloco `"malote-guarda"`:

```js
        // Porteira deslizando: entrada do drawer de navegação no mobile
        "porteira-abre": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
```

Em `theme.extend.animation`, logo após a linha `"malote-guarda"`:

```js
        "porteira-abre": "porteira-abre 0.3s cubic-bezier(0.32, 0.72, 0, 1) both",
```

- [ ] **Step 2: Registrar no `prefers-reduced-motion` do `index.css`**

Na lista do bloco `@media (prefers-reduced-motion: reduce)`, trocar:

```css
  .animate-pulso-latao,
  .animate-malote-guarda {
```

por:

```css
  .animate-pulso-latao,
  .animate-malote-guarda,
  .animate-porteira-abre {
```

- [ ] **Step 3: Criar `SidebarToggle.tsx`**

```tsx
import { SetaDireitaIcon, SetaEsquerdaIcon } from "../icons";
import { useSidebar } from "../../hooks/useSidebar";

/** Botão expandir/recolher da porteira (só na coluna fixa de tablet/desktop). */
export default function SidebarToggle({ className = "" }: { className?: string }) {
  const { recolhida, alternar } = useSidebar();
  const rotulo = recolhida ? "Expandir navegação" : "Recolher navegação";

  return (
    <button
      type="button"
      onClick={alternar}
      aria-expanded={!recolhida}
      aria-label={rotulo}
      title={rotulo}
      className={`flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-lg border border-leather-600/40 bg-wood-900 text-leather-300 transition-colors duration-200 ease-couro hover:border-gold-400 hover:text-gold-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold-400/30 ${className}`}
    >
      {recolhida ? (
        <SetaDireitaIcon className="h-5 w-5" />
      ) : (
        <SetaEsquerdaIcon className="h-5 w-5" />
      )}
    </button>
  );
}
```

- [ ] **Step 4: Criar `Sidebar.tsx`**

```tsx
import { useEffect, useRef } from "react";
import { useAuth } from "../../lib/auth";
import { useSidebar } from "../../hooks/useSidebar";
import {
  BrasaoIcon,
  DistintivoIcon,
  HorseshoeIcon,
  LivroCaixaIcon,
  PlacaIcon,
  SetaEsquerdaIcon,
} from "../icons";
import Avatar from "../ui/Avatar";
import SidebarItem, { type ItemNavegacao } from "./SidebarItem";
import SidebarSection from "./SidebarSection";
import SidebarToggle from "./SidebarToggle";
import SidebarTooltip from "./SidebarTooltip";

/** Rotas reais do módulo admin — cada módulo novo entra aqui com a rota. */
const ITENS_OPERACAO: ItemNavegacao[] = [
  { rotulo: "Dashboard", icone: BrasaoIcon, rota: "/admin-dashboard", fimDaRota: true },
  { rotulo: "Abrir Caixa", icone: HorseshoeIcon, rota: "/admin-dashboard/abrir-caixa" },
  { rotulo: "Gerenciar Equipe", icone: DistintivoIcon, rota: "/admin-dashboard/equipe" },
  { rotulo: "Scorecard", icone: LivroCaixaIcon, rota: "/admin-dashboard/scorecard" },
];

/** Módulos do roadmap ainda sem rota — placa de arena, apagados, sem clique. */
const ITENS_NO_CURRAL: ItemNavegacao[] = [
  { rotulo: "Financeiro", icone: PlacaIcon },
  { rotulo: "Relatórios", icone: PlacaIcon },
  { rotulo: "Estoque", icone: PlacaIcon },
  { rotulo: "Cortesias", icone: PlacaIcon },
  { rotulo: "Configurações", icone: PlacaIcon },
];

/**
 * Porteira da Arena: navegação definitiva do módulo administrativo.
 * Coluna fixa colapsável (280↔72px) em tablet/desktop; drawer lateral no
 * mobile (aberto pelo botão ☰ do AdminLayout). Madeira maciça com grão,
 * dobradiça de aço na borda e costura de sela entre as seções.
 */
export default function Sidebar() {
  const { recolhida, drawerAberto, fecharDrawer } = useSidebar();

  return (
    <>
      {/* Coluna fixa (tablet/desktop) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden border-r border-steel-800 bg-wood-950 shadow-arena transition-[width] duration-300 ease-couro sm:block ${
          recolhida ? "w-[72px]" : "w-[280px]"
        }`}
      >
        <ConteudoSidebar recolhida={recolhida} mostrarToggle />
      </aside>

      {/* Drawer lateral (mobile) */}
      {drawerAberto && <DrawerMobile onFechar={fecharDrawer} />}
    </>
  );
}

function ConteudoSidebar({
  recolhida,
  mostrarToggle = false,
  aoNavegar,
}: {
  recolhida: boolean;
  mostrarToggle?: boolean;
  aoNavegar?: () => void;
}) {
  return (
    <div className="relative flex h-full flex-col">
      <div className="textura-grao" aria-hidden />

      {/* Marca — a sidebar absorve o cabeçalho do painel */}
      <div
        className={`relative flex items-center gap-3 pb-4 pt-5 ${
          recolhida ? "flex-col px-2" : "px-4"
        }`}
      >
        <span className="text-gold-400" aria-hidden>
          <BrasaoIcon className="h-9 w-9 shrink-0" />
        </span>
        {!recolhida && (
          <span className="min-w-0 flex-1">
            <span className="block truncate font-display text-base tracking-wide text-gold-400">
              CONTROLE DA ARENA
            </span>
            <span className="block text-xs text-leather-400">Painel da Gerência</span>
          </span>
        )}
        {mostrarToggle && <SidebarToggle />}
      </div>

      {/* Navegação. Recolhida fica overflow-visible para os tooltips não
          serem cortados; expandida ganha scroll próprio em telas baixas. */}
      <nav
        aria-label="Navegação da gerência"
        className={`relative flex-1 px-3 pb-4 ${
          recolhida ? "overflow-visible" : "overflow-y-auto"
        }`}
      >
        <SidebarSection recolhida={recolhida}>
          {ITENS_OPERACAO.map((item) => (
            <SidebarItem
              key={item.rotulo}
              item={item}
              recolhida={recolhida}
              aoNavegar={aoNavegar}
            />
          ))}
        </SidebarSection>

        <SidebarSection rotulo="No curral" recolhida={recolhida} className="mt-4">
          {ITENS_NO_CURRAL.map((item) => (
            <SidebarItem key={item.rotulo} item={item} recolhida={recolhida} />
          ))}
        </SidebarSection>
      </nav>

      <RodapeUsuario recolhida={recolhida} />
    </div>
  );
}

/** Identidade + saída: o que era o lado direito do header antigo. */
function RodapeUsuario({ recolhida }: { recolhida: boolean }) {
  const { perfil, sair } = useAuth();
  const nome = perfil?.nomeCompleto || perfil?.email || "Gerência";

  return (
    <div
      className={`relative border-t border-dashed border-leather-600/40 ${
        recolhida ? "p-2" : "p-3"
      }`}
    >
      <div className={`flex items-center gap-3 ${recolhida ? "justify-center" : ""}`}>
        <Avatar nome={nome} fotoUrl={null} />
        {!recolhida && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-leather-200">{nome}</p>
            <p className="flex items-center gap-1.5 text-xs font-semibold text-gold-300">
              <DistintivoIcon className="h-3.5 w-3.5" />
              Master Admin
            </p>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={sair}
        className={`group relative mt-3 flex min-h-11 w-full touch-manipulation items-center gap-3 rounded-lg border-2 border-leather-500/60 text-sm font-semibold text-leather-200 transition-colors duration-200 ease-couro hover:border-gold-400 hover:text-gold-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold-400/30 ${
          recolhida ? "justify-center px-0" : "px-3"
        }`}
      >
        <SetaEsquerdaIcon className="h-4 w-4 shrink-0" />
        {recolhida ? <span className="sr-only">Sair</span> : "Sair"}
        <SidebarTooltip rotulo="Sair" visivel={recolhida} />
      </button>
    </div>
  );
}

/**
 * Drawer do mobile: mesma porteira, sempre expandida, deslizando da esquerda.
 * Focus trap + Escape seguem o padrão do Modal.tsx; navegar fecha o drawer.
 */
function DrawerMobile({ onFechar }: { onFechar: () => void }) {
  const painelRef = useRef<HTMLDivElement>(null);
  const onFecharRef = useRef(onFechar);
  onFecharRef.current = onFechar;

  useEffect(() => {
    const gatilho = document.activeElement as HTMLElement | null;
    const painel = painelRef.current;

    const focaveis = () =>
      painel
        ? Array.from(
            painel.querySelectorAll<HTMLElement>(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
            ),
          ).filter((el) => !el.hasAttribute("disabled"))
        : [];

    (focaveis()[0] ?? painel)?.focus();

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.stopPropagation();
        onFecharRef.current();
        return;
      }
      if (evento.key !== "Tab") return;

      const elementos = focaveis();
      if (elementos.length === 0) return;
      const primeiro = elementos[0];
      const ultimo = elementos[elementos.length - 1];

      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    }

    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      gatilho?.focus();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 bg-arena-950/85 sm:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Navegação da gerência"
      onClick={() => onFecharRef.current()}
    >
      <div
        ref={painelRef}
        tabIndex={-1}
        className="h-full w-[280px] border-r border-steel-800 bg-wood-950 shadow-arena outline-none animate-porteira-abre"
        onClick={(evento) => evento.stopPropagation()}
      >
        <ConteudoSidebar recolhida={false} aoNavegar={onFechar} />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verificar que compila**

Run: `cd frontend && npm run build`
Expected: build passa sem erros.

- [ ] **Step 6: Commit**

```bash
git add frontend/tailwind.config.js frontend/src/index.css frontend/src/components/navigation/
git commit -m "feat(front): sidebar Porteira da Arena com coluna colapsavel e drawer mobile"
```

---

### Task 4: `AdminLayout` (layout route com Outlet, toasts SOS e botão ☰)

**Files:**
- Create: `frontend/src/components/AdminLayout.tsx`

**Interfaces:**
- Consumes: `SidebarProvider`/`useSidebar` (Task 1), `Sidebar` (Task 3), `useSosAlertas` de `../hooks/useSosAlertas`, `rotuloCategoriaSos` de `../lib/sos`, `formatarCentavos` de `../lib/moeda`, `Alerta` de `./ui/Alerta`, `Outlet` do react-router-dom.
- Produces: `AdminLayout()` (sem props) — casco do módulo admin renderizando `<Outlet />`; usado pelo App.tsx na Task 5.

- [ ] **Step 1: Criar o arquivo**

```tsx
import { Outlet } from "react-router-dom";
import { SidebarProvider, useSidebar } from "../hooks/useSidebar";
import { useSosAlertas } from "../hooks/useSosAlertas";
import { rotuloCategoriaSos } from "../lib/sos";
import { formatarCentavos } from "../lib/moeda";
import Sidebar from "./navigation/Sidebar";
import Alerta from "./ui/Alerta";

/**
 * Casco do módulo administrativo (layout route): a Porteira da Arena assume
 * marca, navegação, identidade e saída — não há mais header. Os alertas SOS
 * em tempo real (Master Admin backlog, item 1) continuam chegando aqui, em
 * qualquer tela da gerência, exatamente como no layout antigo.
 */
export default function AdminLayout() {
  return (
    <SidebarProvider>
      <CascoAdmin />
    </SidebarProvider>
  );
}

function CascoAdmin() {
  const { alertas: alertasSos, dispensar: dispensarSos } = useSosAlertas(true);
  const { recolhida, abrirDrawer } = useSidebar();

  return (
    <div className="min-h-dvh bg-arena-950 font-sans text-leather-200">
      {/* Grão de arena em toda página interna (DESIGN-SYSTEM § Materiais) */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-50">
        <div className="textura-grao" />
      </div>

      {alertasSos.length > 0 && (
        <div className="fixed inset-x-0 top-0 z-[60] flex flex-col gap-2 p-4 sm:left-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2">
          {alertasSos.map((alerta) => (
            <Alerta key={alerta.id} tipo="sos" onDispensar={() => dispensarSos(alerta)}>
              <span className="font-bold">{alerta.operadorNome}</span>{" "}
              {rotuloCategoriaSos(alerta.categoria)}
              {" — "}
              <span className="num-tabular">
                {formatarCentavos(alerta.saldoEmEspecieCentavos)}
              </span>{" "}
              em espécie
            </Alerta>
          ))}
        </div>
      )}

      <Sidebar />

      {/* ☰ do mobile: composto por barras (regra: zero ícones novos) */}
      <button
        type="button"
        onClick={abrirDrawer}
        aria-label="Abrir navegação"
        className="btn-skeuo fixed left-4 top-4 z-40 flex h-12 w-12 touch-manipulation flex-col items-center justify-center gap-1.5 rounded-lg border border-leather-600/50 bg-wood-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold-400/30 sm:hidden"
      >
        <span aria-hidden className="h-0.5 w-5 rounded-full bg-leather-200" />
        <span aria-hidden className="h-0.5 w-5 rounded-full bg-leather-200" />
        <span aria-hidden className="h-0.5 w-5 rounded-full bg-leather-200" />
      </button>

      <main
        className={`min-h-dvh px-4 pb-8 pt-20 transition-[padding-left] duration-300 ease-couro sm:pr-8 sm:pt-8 ${
          recolhida ? "sm:pl-[104px]" : "sm:pl-[312px]"
        }`}
      >
        <div className="mx-auto w-full max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
```

Nota: `sm:pl-[104px]` = 72px de porteira + 32px de respiro; `sm:pl-[312px]` = 280 + 32. No mobile, `pt-20` abre espaço para o botão ☰ flutuante.

- [ ] **Step 2: Verificar que compila**

Run: `cd frontend && npm run build`
Expected: build passa sem erros.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/AdminLayout.tsx
git commit -m "feat(front): AdminLayout como layout route com sidebar, toasts SOS e botao mobile"
```

---

### Task 5: Rotas aninhadas + migração das 4 páginas admin

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/pages/AdminLandingPage.tsx`
- Modify: `frontend/src/pages/AdminAbrirCaixa.tsx`
- Modify: `frontend/src/pages/GerenciamentoEquipe.tsx`
- Modify: `frontend/src/pages/AdminScorecard.tsx`

**Interfaces:**
- Consumes: `AdminLayout` (Task 4).
- Produces: nada novo — remove o auto-embrulho em `DashboardLayout` e os links "Voltar ao painel" das páginas admin. `noUnusedLocals` está ligado: todo import que ficar órfão DEVE ser removido, senão o build quebra.

- [ ] **Step 1: Reescrever as rotas admin do `App.tsx`**

Adicionar o import (junto aos outros imports de componentes):

```tsx
import AdminLayout from "./components/AdminLayout";
```

Substituir os quatro `<Route path="/admin-dashboard...">` (o bloco inteiro, das linhas ~28 a ~59) por uma layout route:

```tsx
          {/* Módulo administrativo: um único guardião + AdminLayout (sidebar
              permanente); cada módulo novo é só mais um <Route> filho aqui. */}
          <Route
            element={
              <ProtectedRoute perfisPermitidos={["MASTER_ADMIN"]}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/admin-dashboard" element={<AdminLandingPage />} />
            <Route path="/admin-dashboard/abrir-caixa" element={<AdminAbrirCaixa />} />
            <Route path="/admin-dashboard/equipe" element={<GerenciamentoEquipe />} />
            <Route path="/admin-dashboard/scorecard" element={<AdminScorecard />} />
          </Route>
```

As rotas do operador e o fallback `*` ficam como estão.

- [ ] **Step 2: Migrar `AdminLandingPage.tsx`**

Remover o import `import DashboardLayout from "../components/DashboardLayout";`.

Trocar o embrulho (BEFORE):

```tsx
  return (
    <DashboardLayout titulo="Painel da Gerência">
      <h2 className="font-display text-2xl text-gold-300 md:text-3xl">
        Visão geral da arena
      </h2>
```

por (AFTER — fragmento + h2 promovido a h1, agora que o layout não injeta mais um h1 sr-only):

```tsx
  return (
    <>
      <h1 className="font-display text-2xl text-gold-300 md:text-3xl">
        Visão geral da arena
      </h1>
```

E no final do arquivo, trocar `</DashboardLayout>` por `</>`. Os cards e a seção "No curral" ficam intactos (a landing segue como hub até a dashboard financeira nascer).

- [ ] **Step 3: Migrar `AdminAbrirCaixa.tsx`**

Remover o import `import DashboardLayout from "../components/DashboardLayout";` (linha 3). Os imports de `Link` e `SetaEsquerdaIcon` FICAM — ainda são usados no botão "Trocar operador" e no CTA final.

Trocar o embrulho + link Voltar (BEFORE):

```tsx
  return (
    <DashboardLayout titulo="Abrir Caixa">
      <Link
        to="/admin-dashboard"
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-gold-300 transition-colors duration-200 hover:text-gold-200"
      >
        <SetaEsquerdaIcon className="h-4 w-4" />
        Voltar ao painel
      </Link>
```

por (AFTER — título visível da página no lugar do link, que virou papel da sidebar):

```tsx
  return (
    <>
      <h1 className="mb-6 font-display text-2xl text-gold-300 md:text-3xl">
        Abrir Caixa
      </h1>
```

E no final, trocar `</DashboardLayout>` por `</>`. O CTA "Voltar ao painel" da etapa `concluido` fica (é ação de fluxo, não navegação estrutural).

- [ ] **Step 4: Migrar `GerenciamentoEquipe.tsx`**

Imports: remover a linha 2 (`import { Link } from "react-router-dom";` — só era usado no Voltar), a linha 3 (`DashboardLayout`) e tirar `SetaEsquerdaIcon` da linha 14, que vira:

```tsx
import { LivroCaixaIcon, SearchIcon } from "../components/icons";
```

Trocar o embrulho + link Voltar + heading (BEFORE, linhas ~252-263):

```tsx
  return (
    <DashboardLayout titulo="Gerenciamento de Equipe">
      <Link
        to="/admin-dashboard"
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-gold-300 transition-colors duration-200 hover:text-gold-200"
      >
        <SetaEsquerdaIcon className="h-4 w-4" />
        Voltar ao painel
      </Link>

      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-2xl text-gold-300">Equipe do evento</h2>
```

por (AFTER):

```tsx
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl text-gold-300 md:text-3xl">Equipe do evento</h1>
```

E no final, trocar `</DashboardLayout>` por `</>`.

- [ ] **Step 5: Migrar `AdminScorecard.tsx`**

Imports: remover a linha 2 (`import { Link } from "react-router-dom";`), a linha 3 (`DashboardLayout`) e tirar `SetaEsquerdaIcon` da linha 11, que vira:

```tsx
import { LivroCaixaIcon, PlacaIcon } from "../components/icons";
```

Trocar o embrulho + link Voltar + heading (BEFORE, linhas ~83-96):

```tsx
  return (
    <DashboardLayout titulo="Scorecard de Operadores">
      <Link
        to="/admin-dashboard"
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-gold-300 transition-colors duration-200 hover:text-gold-200"
      >
        <SetaEsquerdaIcon className="h-4 w-4" />
        Voltar ao painel
      </Link>

      <h2 className="flex items-center gap-3 font-display text-2xl text-gold-300">
        <LivroCaixaIcon className="h-6 w-6 text-gold-400" />
        Histórico de divergência
      </h2>
```

por (AFTER):

```tsx
  return (
    <>
      <h1 className="flex items-center gap-3 font-display text-2xl text-gold-300 md:text-3xl">
        <LivroCaixaIcon className="h-6 w-6 text-gold-400" />
        Histórico de divergência
      </h1>
```

E no final, trocar `</DashboardLayout>` por `</>`.

- [ ] **Step 6: Verificar que compila (pega import órfão via noUnusedLocals)**

Run: `cd frontend && npm run build`
Expected: build passa sem erros. Se acusar import não usado em alguma página, remova o import apontado.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/App.tsx frontend/src/pages/AdminLandingPage.tsx frontend/src/pages/AdminAbrirCaixa.tsx frontend/src/pages/GerenciamentoEquipe.tsx frontend/src/pages/AdminScorecard.tsx
git commit -m "feat(front): rotas admin aninhadas no AdminLayout; paginas sem DashboardLayout e sem links Voltar"
```

---

### Task 6: Verificação final (build, pre-flight de design e smoke manual)

**Files:**
- Nenhum arquivo novo; ajustes pontuais só se a verificação apontar problema.

**Interfaces:**
- Consumes: tudo das Tasks 1–5.
- Produces: confirmação dos critérios de aceite da spec.

- [ ] **Step 1: Build limpo**

Run: `cd frontend && npm run build`
Expected: `tsc -b` e `vite build` sem erros nem warnings novos.

- [ ] **Step 2: Pre-flight do DESIGN-SYSTEM por grep (deve retornar vazio nos arquivos novos/alterados)**

```bash
cd frontend
grep -rnE "rounded-2xl|backdrop-blur|bg-(gray|zinc|slate|neutral|stone)|text-white|bg-black" src/components/navigation/ src/components/AdminLayout.tsx src/hooks/useSidebar.tsx
```

Expected: nenhuma linha (exit code 1 do grep = ok).

- [ ] **Step 3: Confirmar que o fluxo do Operador está intocado**

```bash
git diff main --name-only -- frontend/src/components/DashboardLayout.tsx frontend/src/pages/OperadorLandingPage.tsx frontend/src/pages/OperadorVenda.tsx
```

Expected: nesta feature nenhum desses arquivos aparece nos commits das Tasks 1–5 (mudanças pré-existentes do branch não contam — confira com `git log --oneline -- <arquivo>` se houver dúvida).

- [ ] **Step 4: Smoke manual com `npm run dev`**

Run: `cd frontend && npm run dev` e verificar logado como MASTER_ADMIN:

1. Desktop (≥1024px): sidebar expandida; toggle recolhe para 72px; recarregar a página mantém o estado (localStorage `controle-arena:sidebar`).
2. Recolhida: hover e Tab nos itens mostram tooltip; itens "No curral" apagados e sem navegação.
3. Item ativo com trilho dourado ▌ acompanha a rota (Dashboard só ativo em `/admin-dashboard` exato).
4. Navegar por Abrir Caixa → Equipe → Scorecard pela sidebar: nenhum link "Voltar ao painel" restante, conteúdo com título visível.
5. Viewport mobile (<640px, devtools): botão ☰ abre o drawer; Escape e clique no overlay fecham; navegar fecha; foco fica preso no drawer.
6. Simular SOS (fluxo do PDV do operador) e conferir o toast no painel admin em qualquer tela.
7. Logado como OPERADOR: `/operador-dashboard` idêntico ao anterior (header antigo, sem sidebar).

Expected: todos os 7 pontos ok — são os critérios de aceite da spec.

- [ ] **Step 5: Commit final (só se a verificação exigiu ajustes)**

```bash
git add -A frontend/src
git commit -m "fix(front): ajustes da verificacao final da sidebar do Admin"
```
