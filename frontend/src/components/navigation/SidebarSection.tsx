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
