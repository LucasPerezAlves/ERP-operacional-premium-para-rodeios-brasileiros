import { useState } from "react";
import Modal from "../ui/Modal";
import Avatar from "../ui/Avatar";
import Botao from "../ui/Botao";
import { BackspaceIcon } from "../icons";
import { formatarCentavos } from "../../lib/moeda";
import { useValorCentavosDigitado } from "../../hooks/useValorCentavosDigitado";
import { useTecladoNumerico } from "../../hooks/useTecladoNumerico";
import type { DadosLimites, Operador } from "../../hooks/useGerenciamentoEquipe";

type CampoAtivo = "atencao" | "critico";

const DIGITOS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

/**
 * Edição dos limiares de numerário (regra de negócio nº 2, revisada): o
 * mesmo teclado digitado do fechamento/sangria alimenta um dos dois campos,
 * conforme qual estiver selecionado. Nunca bloqueia venda — só ajusta a
 * partir de quando a gerência é alertada.
 */
export default function EditarLimitesModal({
  operador,
  salvando,
  onConfirmar,
  onCancelar,
}: {
  operador: Operador;
  salvando: boolean;
  onConfirmar: (dados: DadosLimites) => void;
  onCancelar: () => void;
}) {
  const atencao = useValorCentavosDigitado();
  const critico = useValorCentavosDigitado();
  const [campoAtivo, setCampoAtivo] = useState<CampoAtivo>("atencao");

  const campoDigitado = campoAtivo === "atencao" ? atencao : critico;
  useTecladoNumerico(campoDigitado.digitar, campoDigitado.apagar);

  const limitesPreenchidos = atencao.centavos > 0 && critico.centavos > 0;
  const ordemValida = !limitesPreenchidos || critico.centavos > atencao.centavos;
  const podeConfirmar = limitesPreenchidos && ordemValida && !salvando;

  function confirmar() {
    if (!podeConfirmar) return;
    onConfirmar({
      limiteAtencaoCentavos: atencao.centavos,
      limiteCriticoCentavos: critico.centavos,
    });
  }

  return (
    <Modal titulo="Editar limites de numerário" onFechar={onCancelar}>
      <div className="mt-4 flex items-center gap-4 rounded-lg border border-leather-600/40 bg-arena-800 p-4">
        <Avatar nome={operador.nome} fotoUrl={operador.fotoUrl} />
        <div>
          <p className="text-lg font-bold text-leather-200">{operador.nome}</p>
          <p className="text-sm text-steel-400">
            {operador.areaTrabalho || "Área não informada"}
          </p>
        </div>
      </div>

      <p className="mt-4 text-sm text-leather-300">
        Escolha o campo e digite o novo valor. A venda nunca é bloqueada — os
        limites só definem quando o nível de alerta escala.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setCampoAtivo("atencao")}
          className={`rounded-lg border-2 p-3 text-left transition-colors duration-150 ease-couro ${
            campoAtivo === "atencao"
              ? "border-gold-500 bg-arena-800"
              : "border-leather-600/40 bg-arena-900 hover:border-gold-500/60"
          }`}
        >
          <p className="text-xs text-steel-400">
            Atual: {formatarCentavos(operador.limiteAtencaoCentavos)}
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-gold-300">
            Limite de Atenção
          </p>
          <p className="num-tabular mt-1 text-2xl font-bold text-leather-200">
            {formatarCentavos(atencao.centavos)}
          </p>
        </button>

        <button
          type="button"
          onClick={() => setCampoAtivo("critico")}
          className={`rounded-lg border-2 p-3 text-left transition-colors duration-150 ease-couro ${
            campoAtivo === "critico"
              ? "border-gold-500 bg-arena-800"
              : "border-leather-600/40 bg-arena-900 hover:border-gold-500/60"
          }`}
        >
          <p className="text-xs text-steel-400">
            Atual: {formatarCentavos(operador.limiteCriticoCentavos)}
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-rust-300">
            Limite Crítico
          </p>
          <p className="num-tabular mt-1 text-2xl font-bold text-leather-200">
            {formatarCentavos(critico.centavos)}
          </p>
        </button>
      </div>

      {limitesPreenchidos && !ordemValida && (
        <p role="alert" className="mt-2 text-sm text-rust-300">
          O limite crítico precisa ser maior que o de atenção.
        </p>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2">
        {DIGITOS.map((digito) => (
          <button
            key={digito}
            type="button"
            onClick={() => campoDigitado.digitar(digito)}
            className="num-tabular min-h-12 touch-manipulation rounded-lg border border-leather-600/50 bg-wood-900 text-xl font-bold text-leather-200 transition-colors duration-150 ease-couro hover:border-gold-500 active:scale-95"
          >
            {digito}
          </button>
        ))}
        <button
          type="button"
          onClick={campoDigitado.apagar}
          aria-label="Apagar último dígito"
          className="flex min-h-12 touch-manipulation items-center justify-center rounded-lg border border-leather-600/50 bg-wood-900 text-leather-400 transition-colors duration-150 ease-couro hover:border-gold-500 hover:text-leather-200 active:scale-95"
        >
          <BackspaceIcon className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={campoDigitado.zerar}
          className="min-h-12 touch-manipulation rounded-lg border border-rust-500/40 bg-wood-900 text-sm font-bold text-rust-300 transition-colors duration-150 ease-couro hover:border-rust-400 active:scale-95"
        >
          Zerar
        </button>
      </div>
      <p className="mt-2 text-xs text-leather-400/70">
        Também aceita o teclado do computador (dígitos ou numpad, Backspace apaga) —
        digita no campo selecionado acima.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <Botao variante="couro" tamanho="lg" onClick={onCancelar}>
          Cancelar
        </Botao>
        <Botao
          variante="latao"
          tamanho="lg"
          disabled={!podeConfirmar}
          carregando={salvando}
          rotuloCarregando="Salvando..."
          onClick={confirmar}
        >
          Salvar
        </Botao>
      </div>
    </Modal>
  );
}
