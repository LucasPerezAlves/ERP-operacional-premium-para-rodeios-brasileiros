import { useEffect, useRef, type ReactNode } from "react";

/**
 * Diálogo padrão do sistema (DESIGN-SYSTEM.md § Diálogos):
 * superfície SÓLIDA de madeira (glassmorphism proibido), overlay opaco,
 * max-h com scroll interno, focus trap, Escape fecha e o foco volta ao
 * elemento que abriu o modal.
 */
export default function Modal({
  titulo,
  onFechar,
  children,
  larguraMax = "max-w-lg",
}: {
  titulo: string;
  onFechar: () => void;
  children: ReactNode;
  larguraMax?: string;
}) {
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-arena-950/85 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
      onClick={() => onFecharRef.current()}
    >
      <div
        ref={painelRef}
        tabIndex={-1}
        className={`w-full ${larguraMax} max-h-[90dvh] overflow-y-auto rounded-xl border border-leather-600/50 bg-wood-800 p-6 shadow-arena outline-none animate-fade-in-up`}
        onClick={(evento) => evento.stopPropagation()}
      >
        <h3 className="font-display text-2xl text-gold-300">{titulo}</h3>
        {children}
      </div>
    </div>
  );
}
