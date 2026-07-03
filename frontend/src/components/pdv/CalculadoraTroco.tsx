import { useState } from "react";
import { formatarCentavos } from "../../lib/moeda";
import { SetaEsquerdaIcon } from "../icons";
import Botao from "../ui/Botao";
import ValorEditavel from "../ui/ValorEditavel";

/** Cédulas físicas que o operador recebe na mão (backlog do Operador, item 1). */
const CEDULAS = [1000, 2000, 5000, 10000] as const;

/**
 * Calculadora de Troco Inteligente: o operador toca nas cédulas recebidas
 * e o TROCO aparece gigante — zero conta de cabeça à noite. Troco suficiente
 * é valor financeiro positivo (verde-campo); insuficiente é ferrugem.
 */
export default function CalculadoraTroco({
  totalCentavos,
  enviando,
  onConfirmar,
  onVoltar,
}: {
  totalCentavos: number;
  enviando: boolean;
  onConfirmar: (valorRecebidoCentavos: number) => void;
  onVoltar: () => void;
}) {
  const [recebidoCentavos, setRecebidoCentavos] = useState(0);

  const trocoCentavos = recebidoCentavos - totalCentavos;
  const suficiente = trocoCentavos >= 0 && recebidoCentavos > 0;

  return (
    <div className="select-none">
      <div className="flex items-center justify-between">
        <Botao variante="couro" tamanho="lg" onClick={onVoltar}>
          <SetaEsquerdaIcon className="h-5 w-5" />
          Voltar
        </Botao>
        <p className="text-right">
          <span className="block text-sm text-leather-400">Total da venda</span>
          <span className="num-tabular text-4xl font-bold text-leather-200">
            {formatarCentavos(totalCentavos)}
          </span>
        </p>
      </div>

      {/* Cédulas recebidas */}
      <p className="mt-6 text-lg font-semibold text-leather-200">
        Toque nas cédulas recebidas
      </p>
      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {CEDULAS.map((cedula) => (
          <button
            key={cedula}
            type="button"
            onClick={() => setRecebidoCentavos((atual) => atual + cedula)}
            className="num-tabular min-h-24 touch-manipulation rounded-lg border-2 border-gold-500/40 bg-gradient-to-b from-wood-800 to-wood-900 text-3xl font-bold text-gold-300 transition-transform duration-100 ease-couro hover:border-gold-400 active:scale-95"
          >
            R$ {cedula / 100}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <Botao
          variante="couro"
          tamanho="lg"
          onClick={() => setRecebidoCentavos(totalCentavos)}
        >
          Valor exato
        </Botao>
        <button
          type="button"
          onClick={() => setRecebidoCentavos(0)}
          className="min-h-14 touch-manipulation rounded-lg border-2 border-rust-500/50 bg-wood-900 text-base font-bold text-rust-300 transition-colors duration-150 ease-couro hover:border-rust-400 active:scale-95"
        >
          Limpar
        </button>
      </div>

      {/* Recebido + TROCO gigante */}
      <div className="mt-6 rounded-xl border border-leather-600/40 bg-arena-800 p-6 text-center">
        <p className="flex flex-wrap items-baseline justify-center gap-1 text-lg text-leather-300">
          Recebido:
          <ValorEditavel
            centavos={recebidoCentavos}
            onAlterar={setRecebidoCentavos}
            className="font-bold text-leather-200"
          />
        </p>
        <p className="mt-2 text-xl font-semibold text-leather-300">Troco a devolver</p>
        <p
          className={`num-tabular font-display text-8xl leading-none tracking-tight ${
            suficiente ? "text-campo-300" : "text-rust-300"
          }`}
        >
          {formatarCentavos(Math.max(trocoCentavos, 0))}
        </p>
        {!suficiente && recebidoCentavos > 0 && (
          <p className="num-tabular mt-2 text-lg font-bold text-rust-300">
            Faltam {formatarCentavos(Math.abs(trocoCentavos))}
          </p>
        )}
      </div>

      <Botao
        variante="latao"
        tamanho="pdv"
        className="mt-6 w-full font-display tracking-widest"
        disabled={!suficiente}
        carregando={enviando}
        onClick={() => onConfirmar(recebidoCentavos)}
      >
        Confirmar Venda
      </Botao>
    </div>
  );
}
