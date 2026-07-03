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
