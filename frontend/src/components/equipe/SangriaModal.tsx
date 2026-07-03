import Modal from "../ui/Modal";
import Avatar from "../ui/Avatar";
import Botao from "../ui/Botao";
import { BackspaceIcon } from "../icons";
import { formatarCentavos } from "../../lib/moeda";
import { useValorCentavosDigitado } from "../../hooks/useValorCentavosDigitado";
import { useTecladoNumerico } from "../../hooks/useTecladoNumerico";
import type { Operador } from "../../hooks/useGerenciamentoEquipe";

/**
 * Recolhimento de espécie (regra de negócio nº 2 / Alertas Automatizados de
 * Sangria): mesmo teclado numérico do fechamento de caixa, mas sem motivo —
 * a sangria é um recolhimento de rotina, não uma justificativa de divergência.
 */
export default function SangriaModal({
  operador,
  saldoAtualCentavos,
  enviando,
  onConfirmar,
  onCancelar,
}: {
  operador: Operador;
  saldoAtualCentavos: number;
  enviando: boolean;
  onConfirmar: (valorCentavos: number) => void;
  onCancelar: () => void;
}) {
  const { centavos: valorCentavos, digitar, apagar, zerar } = useValorCentavosDigitado();
  useTecladoNumerico(digitar, apagar);

  const excedeSaldo = valorCentavos > saldoAtualCentavos;
  const podeConfirmar = valorCentavos > 0 && !excedeSaldo && !enviando;

  function confirmar() {
    if (!podeConfirmar) return;
    onConfirmar(valorCentavos);
  }

  return (
    <Modal titulo="Registrar sangria" onFechar={onCancelar}>
      <div className="mt-4 flex items-center gap-4 rounded-lg border border-leather-600/40 bg-arena-800 p-4">
        <Avatar nome={operador.nome} fotoUrl={operador.fotoUrl} />
        <div>
          <p className="text-lg font-bold text-leather-200">{operador.nome}</p>
          <p className="text-sm text-steel-400">
            {formatarCentavos(saldoAtualCentavos)} em espécie agora
          </p>
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-1.5 text-[13px] font-medium text-leather-200">
          Valor recolhido do caixa
        </p>
        <div className="rounded-lg bg-arena-800 p-4 text-center">
          <p className="num-tabular text-4xl font-bold tracking-tight text-leather-200">
            {formatarCentavos(valorCentavos)}
          </p>
        </div>
        {excedeSaldo && (
          <p role="alert" className="mt-2 text-sm text-rust-300">
            Maior que o dinheiro disponível no caixa.
          </p>
        )}
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

      <div className="mt-6 grid grid-cols-2 gap-4">
        <Botao variante="couro" tamanho="lg" onClick={onCancelar}>
          Cancelar
        </Botao>
        <Botao
          variante="lampiao"
          tamanho="lg"
          disabled={!podeConfirmar}
          carregando={enviando}
          rotuloCarregando="Recolhendo..."
          onClick={confirmar}
        >
          Confirmar Recolhimento
        </Botao>
      </div>
    </Modal>
  );
}
