import { MaloteIcon } from "../icons";
import type { NivelAlertaNumerario } from "../../lib/numerario";

/**
 * Selo de numerário em espécie (regra de negócio nº 2, revisada): substitui
 * o antigo bloqueio de venda por um indicador escalonado — verde (normal),
 * dourado pulsante (atenção) e ferrugem (crítico). Nunca impede a operação.
 */
const ESTILOS: Record<NivelAlertaNumerario, { caixa: string; rotulo: string }> = {
  NORMAL: {
    caixa: "border-campo-500/40 bg-campo-950/60 text-campo-300",
    rotulo: "Numerário normal",
  },
  ATENCAO: {
    caixa: "animate-pulso-latao border-gold-400/60 bg-gold-500/10 text-gold-200",
    rotulo: "Numerário elevado",
  },
  CRITICO: {
    caixa: "border-rust-500/60 bg-rust-950 text-rust-200",
    rotulo: "Gerência notificada para recolhimento",
  },
};

export default function SeloNumerario({
  nivel,
  className = "",
}: {
  nivel: NivelAlertaNumerario;
  className?: string;
}) {
  const estilo = ESTILOS[nivel];

  return (
    <span
      role={nivel === "CRITICO" ? "status" : undefined}
      className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] ${estilo.caixa} ${className}`}
    >
      <MaloteIcon className="h-4 w-4 shrink-0" />
      {estilo.rotulo}
    </span>
  );
}
