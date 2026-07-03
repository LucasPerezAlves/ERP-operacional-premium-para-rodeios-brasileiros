import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { LassoSpinner } from "../icons";

/**
 * As 4 variantes oficiais de botão (DESIGN-SYSTEM.md § Botões):
 * latao (CTA primário), couro (apoio), lampiao (destrutivo/SOS),
 * fantasma (links de ação). Alturas fixas: sm 40 / md 48 / lg 56 / pdv 96.
 */

export type VarianteBotao = "latao" | "couro" | "lampiao" | "fantasma";
export type TamanhoBotao = "sm" | "md" | "lg" | "pdv";

const VARIANTES: Record<VarianteBotao, string> = {
  latao:
    "btn-skeuo brilho-hover rounded-lg bg-gradient-to-b from-gold-400 to-gold-600 font-bold uppercase tracking-wider text-wood-950 hover:from-gold-300 hover:to-gold-500",
  couro:
    "rounded-lg border-2 border-leather-500/60 bg-transparent font-semibold text-leather-200 transition-colors duration-200 ease-couro hover:border-gold-400 hover:text-gold-300 active:scale-[0.98]",
  lampiao:
    "rounded-lg border border-bordo-500/50 bg-gradient-to-b from-bordo-700 to-bordo-900 font-semibold text-bordo-200 transition-colors duration-200 ease-couro hover:from-bordo-500 hover:to-bordo-800 active:translate-y-[2px]",
  fantasma:
    "rounded-lg font-semibold text-gold-300 transition-colors duration-200 hover:text-gold-200",
};

const TAMANHOS: Record<TamanhoBotao, string> = {
  sm: "min-h-10 gap-2 px-4 text-sm",
  md: "min-h-12 gap-2 px-5 text-sm",
  lg: "min-h-14 gap-3 px-6 text-base",
  pdv: "min-h-24 gap-4 px-6 text-2xl",
};

const SPINNER_POR_TAMANHO: Record<TamanhoBotao, string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
  pdv: "h-8 w-8",
};

interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBotao;
  tamanho?: TamanhoBotao;
  carregando?: boolean;
  rotuloCarregando?: string;
  children: ReactNode;
}

export default function Botao({
  variante = "couro",
  tamanho = "md",
  carregando = false,
  rotuloCarregando = "Laçando...",
  children,
  className = "",
  disabled,
  type = "button",
  ...props
}: BotaoProps) {
  return (
    <button
      type={type}
      disabled={disabled || carregando}
      className={`inline-flex touch-manipulation select-none items-center justify-center focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold-400/30 disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTES[variante]} ${TAMANHOS[tamanho]} ${className}`}
      {...props}
    >
      {carregando ? (
        <>
          <LassoSpinner className={SPINNER_POR_TAMANHO[tamanho]} />
          <span>{rotuloCarregando}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
