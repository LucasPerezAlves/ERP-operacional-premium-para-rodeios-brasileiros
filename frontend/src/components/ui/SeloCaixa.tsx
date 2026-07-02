import { HorseshoeIcon } from "../icons";
import { formatarCentavos } from "../../lib/moeda";

/**
 * Status de caixa da tabela de feedback visual: ferradura ACESA (dourada,
 * com acendimento animado na transição) para caixa aberto; ferradura
 * APAGADA (aço) para sem caixa. Substitui a bolinha verde genérica.
 */
export default function SeloCaixa({
  aberto,
  saldoCentavos,
  acender = false,
}: {
  aberto: boolean;
  saldoCentavos?: number;
  acender?: boolean;
}) {
  if (aberto) {
    return (
      <span className="num-tabular inline-flex items-center gap-2 rounded-md border border-gold-500/50 bg-gold-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-gold-300">
        <HorseshoeIcon
          className={`h-4 w-4 text-gold-400 ${acender ? "animate-ferradura-acende" : ""}`}
        />
        {saldoCentavos !== undefined
          ? `Caixa Aberto — ${formatarCentavos(saldoCentavos)}`
          : "Caixa Aberto"}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-steel-700 bg-steel-900/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-steel-400">
      <HorseshoeIcon className="h-4 w-4 text-steel-300" />
      Sem Caixa Ativo
    </span>
  );
}
