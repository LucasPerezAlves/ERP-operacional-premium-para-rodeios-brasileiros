import { type ReactNode } from "react";
import { LampadaIcon, LampiaoIcon, PlacaIcon } from "../icons";
import Botao from "./Botao";

/**
 * Componente único de alerta (DESIGN-SYSTEM.md § Alertas), mapeado à tabela
 * de Linguagem de Feedback Visual do CLAUDE.md:
 * info = placa de aço · aviso = placa iluminada com pulso de latão ·
 * erro = metal oxidado com lâmpada vermelha ESTÁTICA (erro não pisca —
 * quem pisca é o SOS) · sos = lampião (única superfície com animate-lampiao).
 */

export type TipoAlerta = "info" | "aviso" | "erro" | "sos";

const ESTILOS: Record<TipoAlerta, { caixa: string; icone: ReactNode }> = {
  info: {
    caixa: "border-steel-700 bg-steel-900 text-steel-300",
    icone: <PlacaIcon className="h-5 w-5 shrink-0 text-steel-400" />,
  },
  aviso: {
    caixa: "animate-pulso-latao border-gold-400/60 bg-gold-500/10 text-gold-200",
    icone: <PlacaIcon className="h-5 w-5 shrink-0 text-gold-400" />,
  },
  erro: {
    caixa: "border-rust-500/60 bg-rust-950 text-rust-200",
    icone: <LampadaIcon className="h-5 w-5 shrink-0 text-rust-400" />,
  },
  sos: {
    caixa: "border-bordo-500/60 bg-bordo-950 text-bordo-300",
    icone: <LampiaoIcon className="h-5 w-5 shrink-0 animate-lampiao text-bordo-400" />,
  },
};

export default function Alerta({
  tipo,
  children,
  onDispensar,
  className = "",
}: {
  tipo: TipoAlerta;
  children: ReactNode;
  onDispensar?: () => void;
  className?: string;
}) {
  const estilo = ESTILOS[tipo];

  return (
    <div
      role="alert"
      className={`flex items-center gap-3 rounded-xl border px-5 py-4 animate-fade-in-up ${estilo.caixa} ${className}`}
    >
      {estilo.icone}
      <div className="flex-1 text-[15px] font-medium leading-relaxed">{children}</div>
      {onDispensar && (
        <Botao variante="couro" tamanho="sm" onClick={onDispensar}>
          OK
        </Botao>
      )}
    </div>
  );
}
