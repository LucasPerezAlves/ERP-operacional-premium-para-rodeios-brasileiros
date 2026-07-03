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
