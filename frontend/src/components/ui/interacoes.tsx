import { type ReactNode } from "react";
import { HorseshoeIcon, LassoSpinner, MaloteIcon } from "../icons";
import { formatarCentavos } from "../../lib/moeda";

/**
 * Sistema de Interação Operacional (DESIGN-SYSTEM.md § Interações):
 * os estados de feedback do sistema como componentes prontos, mapeados à
 * tabela de Linguagem de Feedback Visual do CLAUDE.md. Tudo sutil, rápido,
 * acessível (role/aria-live) e coberto por prefers-reduced-motion.
 *
 * LOADING  → <Carregando/>          (laço girando + poeira na tela cheia)
 * SUCESSO  → <SucessoOperacional/>  (ferradura acende + varredura metálica 1x)
 * SANGRIA  → <MaloteSangria/>       (malote de couro assenta ao registrar)
 * AVISO    → <Alerta tipo="aviso"/>  (placa iluminada + pulso de latão)
 * ERRO     → <Alerta tipo="erro"/>   (metal oxidado + lâmpada estática)
 * SOS      → <Alerta tipo="sos"/> + SosGerencia (lampião tremulando)
 * CAIXA    → <SeloCaixa/>            (ferradura acesa/apagada)
 * PERFIL   → Brasao/Distintivo no DashboardLayout
 * RELATÓRIO→ .material-rotulo + LivroCaixaIcon (Comprovante de Fechamento)
 */

/** Poeira mínima de espera: [left %, tamanho px, atraso s] — só na tela cheia. */
const POEIRA_ESPERA: Array<[number, number, number]> = [
  [15, 2, 0],
  [35, 3, 3],
  [55, 2, 6],
  [72, 3, 1.5],
  [90, 2, 4.5],
];

/**
 * LOADING — corda de laço girando com rótulo. Único indicador de espera do
 * sistema (spinner circular genérico é proibido). `telaCheia` adiciona o
 * fundo de arena com poeira subindo para transições de página inteira.
 */
export function Carregando({
  rotulo = "Laçando...",
  telaCheia = false,
}: {
  rotulo?: string;
  telaCheia?: boolean;
}) {
  const nucleo = (
    <div
      className="relative flex flex-col items-center justify-center gap-4 py-16 text-center"
      role="status"
      aria-live="polite"
    >
      <span className="text-gold-400">
        <LassoSpinner className="h-10 w-10" />
      </span>
      <p className="text-sm font-semibold text-leather-300">{rotulo}</p>
    </div>
  );

  if (!telaCheia) {
    return nucleo;
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-arena-950 font-sans">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {POEIRA_ESPERA.map(([left, size, delay], index) => (
          <span
            key={index}
            className="absolute bottom-0 rounded-full bg-gold-200/40 animate-dust-rise"
            style={{
              left: `${left}%`,
              width: size,
              height: size,
              animationDelay: `${delay}s`,
            }}
          />
        ))}
      </div>
      {nucleo}
    </div>
  );
}

/**
 * SUCESSO — ferradura dourada acendendo + uma única varredura de reflexo
 * metálico sobre o título (nunca em loop). Sucesso operacional é sempre
 * dourado; verde fica reservado a valores financeiros positivos.
 */
export function SucessoOperacional({
  titulo,
  children,
}: {
  titulo: string;
  children?: ReactNode;
}) {
  return (
    <div className="text-center animate-fade-in-up" role="status" aria-live="polite">
      <HorseshoeIcon className="mx-auto h-14 w-14 animate-ferradura-acende text-gold-400" />
      <span className="relative mt-3 inline-block overflow-hidden rounded-lg px-3 py-1">
        <span className="font-display text-3xl text-gold-300">{titulo}</span>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-2/5 animate-brilho-metalico bg-gradient-to-r from-transparent via-gold-200/30 to-transparent"
        />
      </span>
      {children}
    </div>
  );
}

/**
 * SANGRIA — malote de couro. Em `registrada`, o malote "assenta" com o
 * dinheiro (animação curta de guarda, 450ms, ease-couro). Primitiva pronta
 * para a UI de sangria do módulo do Admin.
 */
export function MaloteSangria({
  valorCentavos,
  registrada = false,
}: {
  valorCentavos: number;
  registrada?: boolean;
}) {
  return (
    <div
      role={registrada ? "status" : undefined}
      aria-live={registrada ? "polite" : undefined}
      className={`inline-flex items-center gap-3 rounded-lg border border-leather-500/60 bg-wood-800 px-4 py-3 ${
        registrada ? "animate-malote-guarda" : ""
      }`}
    >
      <MaloteIcon className="h-7 w-7 shrink-0 text-leather-300" />
      <span className="text-left">
        <span className="block text-xs text-leather-400">
          {registrada ? "Sangria recolhida" : "Sangria a recolher"}
        </span>
        <span className="num-tabular block text-lg font-bold text-leather-200">
          {formatarCentavos(valorCentavos)}
        </span>
      </span>
    </div>
  );
}
