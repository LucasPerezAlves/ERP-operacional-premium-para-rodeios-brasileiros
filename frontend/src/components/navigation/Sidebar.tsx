import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../lib/auth";
import { useSidebar } from "../../hooks/useSidebar";
import {
  BandeirolaIcon,
  BrasaoIcon,
  CaixoteIcon,
  DistintivoIcon,
  HorseshoeIcon,
  LivroCaixaIcon,
  PlacaIcon,
  RelogioIcon,
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
  { rotulo: "Eventos", icone: BandeirolaIcon, rota: "/admin-dashboard/eventos" },
  { rotulo: "Abrir Caixa", icone: HorseshoeIcon, rota: "/admin-dashboard/abrir-caixa" },
  { rotulo: "Gerenciar Equipe", icone: DistintivoIcon, rota: "/admin-dashboard/equipe" },
  { rotulo: "Scorecard", icone: LivroCaixaIcon, rota: "/admin-dashboard/scorecard" },
  { rotulo: "Histórico de Turnos", icone: RelogioIcon, rota: "/admin-dashboard/historico-turnos" },
  { rotulo: "Estoque", icone: CaixoteIcon, rota: "/admin-dashboard/estoque" },
];

/** Módulos do roadmap ainda sem rota — placa de arena, apagados, sem clique. */
const ITENS_NO_CURRAL: ItemNavegacao[] = [
  { rotulo: "Financeiro", icone: PlacaIcon },
  { rotulo: "Relatórios", icone: PlacaIcon },
  { rotulo: "Cortesias", icone: PlacaIcon },
  { rotulo: "Configurações", icone: PlacaIcon },
];

/**
 * Porteira da Arena: navegação definitiva do módulo administrativo.
 * Coluna fixa colapsável (280↔72px) em tablet/desktop; drawer lateral no
 * mobile (aberto pelo botão ☰ do AdminLayout). Madeira maciça com grão,
 * dobradiça de aço na borda e costura de sela entre as seções.
 */
/** Atraso antes de recolher de volta ao tirar o mouse — evita flicker ao cruzar a borda rápido. */
const ATRASO_FECHAR_PAIRO_MS = 150;

export default function Sidebar() {
  const { recolhida, drawerAberto, fecharDrawer } = useSidebar();
  const [pairoAtivo, setPairoAtivo] = useState(false);
  const timeoutFecharRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutFecharRef.current) clearTimeout(timeoutFecharRef.current);
    };
  }, []);

  function aoEntrarNaSidebar() {
    if (timeoutFecharRef.current) {
      clearTimeout(timeoutFecharRef.current);
      timeoutFecharRef.current = null;
    }
    setPairoAtivo(true);
  }

  function aoSairDaSidebar() {
    timeoutFecharRef.current = setTimeout(() => setPairoAtivo(false), ATRASO_FECHAR_PAIRO_MS);
  }

  // Recolhida (72px) "paira" para 280px por cima do conteúdo ao passar o
  // mouse — o padding do AdminLayout só reage à preferência fixada por
  // clique (recolhida), nunca a este estado local, então não há "pulo".
  const visualRecolhida = recolhida && !pairoAtivo;

  return (
    <>
      {/* Coluna fixa (tablet/desktop) */}
      <aside
        onMouseEnter={aoEntrarNaSidebar}
        onMouseLeave={aoSairDaSidebar}
        className={`fixed inset-y-0 left-0 z-40 hidden border-r border-steel-800 bg-wood-950 shadow-arena transition-[width] duration-300 ease-couro sm:block ${
          visualRecolhida ? "w-[72px]" : "w-[280px]"
        }`}
      >
        <ConteudoSidebar recolhida={visualRecolhida} mostrarToggle />
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
        {/* fotoUrl fixo em null: PerfilUsuario (lib/auth.tsx) ainda não expõe
            foto_url — ligar isso exige estender buscarPerfil, fora do escopo
            desta feature. Até lá, o rodapé sempre mostra a silhueta. */}
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
