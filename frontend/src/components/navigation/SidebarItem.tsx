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
