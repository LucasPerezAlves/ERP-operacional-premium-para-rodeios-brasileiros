import { useEffect } from "react";

/**
 * Espelha o teclado numérico on-screen no teclado físico (linha de dígitos
 * ou numpad — `event.key` já unifica os dois quando NumLock está ligado) e
 * Backspace apaga o último dígito. Ignora teclas quando o foco está em
 * input/textarea/select, para não atropelar campos de texto livre (ex.:
 * motivo do fechamento) que convivem no mesmo modal.
 */
export function useTecladoNumerico(
  onDigitar: (tecla: string) => void,
  onApagar: () => void,
  ativo = true,
) {
  useEffect(() => {
    if (!ativo) return;

    function aoTeclar(evento: KeyboardEvent) {
      const alvo = evento.target as HTMLElement | null;
      const tag = alvo?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (/^[0-9]$/.test(evento.key)) {
        evento.preventDefault();
        onDigitar(evento.key);
      } else if (evento.key === "Backspace") {
        evento.preventDefault();
        onApagar();
      }
    }

    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [onDigitar, onApagar, ativo]);
}
