import { useState } from "react";
import Modal from "../ui/Modal";
import Avatar from "../ui/Avatar";
import Botao from "../ui/Botao";
import { BackspaceIcon } from "../icons";
import { formatarCentavos } from "../../lib/moeda";
import { useValorCentavosDigitado } from "../../hooks/useValorCentavosDigitado";
import { useTecladoNumerico } from "../../hooks/useTecladoNumerico";
import type { DadosFechamento, Operador } from "../../hooks/useGerenciamentoEquipe";

const MOTIVOS_SUGERIDOS = [
  "Fim de turno",
  "Troca de operador por escala",
  "Quebra de caixa",
] as const;

/**
 * Fechamento com conferência física (regra inegociável nº 7): superfície
 * sólida de madeira (sem glassmorphism — dívida quitada), teclado numérico
 * tabular e motivo obrigatório.
 */
export default function FecharCaixaModal({
  operador,
  enviando,
  onConfirmar,
  onCancelar,
}: {
  operador: Operador;
  enviando: boolean;
  onConfirmar: (dados: DadosFechamento) => void;
  onCancelar: () => void;
}) {
  const { centavos: valorFinalCentavos, digitar, apagar, zerar } = useValorCentavosDigitado();
  const [motivo, setMotivo] = useState("");
  useTecladoNumerico(digitar, apagar);

  const motivoValido = motivo.trim().length > 0;
  const podeConfirmar = valorFinalCentavos > 0 && motivoValido && !enviando;

  function confirmar() {
    if (!podeConfirmar) return;
    onConfirmar({ valorFinalConfirmadoCentavos: valorFinalCentavos, motivo: motivo.trim() });
  }

  return (
    <Modal titulo="Encerrar caixa" onFechar={onCancelar}>
      {/* Resumo do operador */}
      <div className="mt-4 flex items-center gap-4 rounded-lg border border-leather-600/40 bg-arena-800 p-4">
        <Avatar nome={operador.nome} fotoUrl={operador.fotoUrl} />
        <div>
          <p className="text-lg font-bold text-leather-200">{operador.nome}</p>
          <p className="text-sm text-steel-400">
            {operador.areaTrabalho || "Área não informada"}
          </p>
        </div>
      </div>

      {/* Valor contado fisicamente */}
      <div className="mt-5">
        <p className="mb-1.5 text-[13px] font-medium text-leather-200">
          Valor final em dinheiro confirmado
        </p>
        <div className="rounded-lg bg-arena-800 p-4 text-center">
          <p className="num-tabular text-4xl font-bold tracking-tight text-leather-200">
            {formatarCentavos(valorFinalCentavos)}
          </p>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((digito) => (
            <button
              key={digito}
              type="button"
              onClick={() => digitar(digito)}
              className="num-tabular min-h-12 touch-manipulation rounded-lg border border-leather-600/50 bg-wood-900 text-xl font-bold text-leather-200 transition-colors duration-150 ease-couro hover:border-gold-500 active:scale-95"
            >
              {digito}
            </button>
          ))}
          <button
            type="button"
            onClick={apagar}
            aria-label="Apagar último dígito"
            className="flex min-h-12 touch-manipulation items-center justify-center rounded-lg border border-leather-600/50 bg-wood-900 text-leather-400 transition-colors duration-150 ease-couro hover:border-gold-500 hover:text-leather-200 active:scale-95"
          >
            <BackspaceIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={zerar}
            className="min-h-12 touch-manipulation rounded-lg border border-rust-500/40 bg-wood-900 text-sm font-bold text-rust-300 transition-colors duration-150 ease-couro hover:border-rust-400 active:scale-95"
          >
            Zerar
          </button>
        </div>
        <p className="mt-2 text-xs text-leather-400/70">
          Também aceita o teclado do computador — dígitos ou numpad, Backspace apaga.
        </p>
      </div>

      {/* Motivo / justificativa */}
      <div className="mt-5">
        <label
          htmlFor="motivo-fechamento"
          className="mb-1.5 block text-[13px] font-medium text-leather-200"
        >
          Motivo do fechamento
        </label>
        <textarea
          id="motivo-fechamento"
          rows={3}
          value={motivo}
          onChange={(evento) => setMotivo(evento.target.value)}
          placeholder="Ex.: Fim de turno, troca de operador, quebra de caixa..."
          className="w-full resize-none rounded-lg border border-leather-500/50 bg-wood-900 p-3 text-[15px] text-leather-200 outline-none transition-colors duration-200 placeholder:text-leather-400/60 focus:border-gold-400 focus:ring-4 focus:ring-gold-400/20"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {MOTIVOS_SUGERIDOS.map((sugestao) => (
            <button
              key={sugestao}
              type="button"
              onClick={() => setMotivo(sugestao)}
              className="rounded-md border border-leather-600/50 px-3 py-1 text-xs font-medium text-leather-300 transition-colors duration-150 hover:border-gold-500 hover:text-gold-300"
            >
              {sugestao}
            </button>
          ))}
        </div>
      </div>

      {/* Ações */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <Botao variante="couro" tamanho="lg" onClick={onCancelar}>
          Cancelar
        </Botao>
        <Botao
          variante="lampiao"
          tamanho="lg"
          disabled={!podeConfirmar}
          carregando={enviando}
          rotuloCarregando="Encerrando..."
          onClick={confirmar}
        >
          Confirmar Encerramento
        </Botao>
      </div>
    </Modal>
  );
}
