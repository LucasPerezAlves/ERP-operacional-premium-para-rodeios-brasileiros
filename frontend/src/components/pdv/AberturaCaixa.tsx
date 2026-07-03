import { useState } from "react";
import { formatarCentavos } from "../../lib/moeda";
import Botao from "../ui/Botao";
import ValorEditavel from "../ui/ValorEditavel";

const FUNDOS_RAPIDOS = [5000, 10000, 20000, 30000] as const;
const AJUSTES = [1000, 5000] as const;

/**
 * Definição do fundo de troco na abertura de caixa. Quem usa esta tela é o
 * ADMIN entregando o caixa a um operador (regra inegociável nº 7) — a voz
 * do texto reflete isso. Botões grandes: nada de teclado em pé de arena.
 */
export default function AberturaCaixa({
  enviando,
  onAbrir,
}: {
  enviando: boolean;
  onAbrir: (saldoInicialCentavos: number) => void;
}) {
  const [saldoCentavos, setSaldoCentavos] = useState(10000);

  return (
    <div className="mx-auto max-w-2xl select-none">
      <h2 className="text-center font-display text-3xl text-gold-300">Abrir o Caixa</h2>
      <p className="mt-2 text-center text-lg text-leather-300">
        Quanto de troco este caixa vai levar para a arena?
      </p>

      {/* Valor escolhido — dígitos tabulares: legível e sem tremor.
          Toque no valor para digitar um valor exato (valores quebrados). */}
      <div className="mt-6 rounded-lg bg-arena-800 px-6 py-5">
        <ValorEditavel
          centavos={saldoCentavos}
          onAlterar={setSaldoCentavos}
          className="w-full text-6xl font-bold tracking-tight text-leather-200 md:text-7xl"
        />
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {FUNDOS_RAPIDOS.map((valor) => (
          <button
            key={valor}
            type="button"
            onClick={() => setSaldoCentavos(valor)}
            className={`num-tabular min-h-20 touch-manipulation rounded-lg border-2 text-2xl font-bold transition-colors duration-150 ease-couro active:scale-95 ${
              saldoCentavos === valor
                ? "border-gold-400 bg-gold-400/15 text-gold-300"
                : "border-leather-600/50 bg-wood-900 text-leather-200 hover:border-gold-500"
            }`}
          >
            {formatarCentavos(valor)}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        {AJUSTES.map((ajuste) => (
          <button
            key={ajuste}
            type="button"
            onClick={() => setSaldoCentavos((atual) => atual + ajuste)}
            className="num-tabular min-h-16 touch-manipulation rounded-lg border-2 border-leather-600/50 bg-wood-900 text-xl font-bold text-leather-200 transition-colors duration-150 ease-couro hover:border-gold-500 active:scale-95"
          >
            + {formatarCentavos(ajuste)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSaldoCentavos(0)}
          className="min-h-16 touch-manipulation rounded-lg border-2 border-rust-500/50 bg-wood-900 text-xl font-bold text-rust-300 transition-colors duration-150 ease-couro hover:border-rust-400 active:scale-95"
        >
          Zerar
        </button>
      </div>

      <Botao
        variante="latao"
        tamanho="pdv"
        className="mt-8 w-full font-display tracking-widest"
        carregando={enviando}
        onClick={() => onAbrir(saldoCentavos)}
      >
        Abrir Caixa
      </Botao>
    </div>
  );
}
