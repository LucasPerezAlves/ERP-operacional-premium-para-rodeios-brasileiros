import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import Botao from "../ui/Botao";
import Alerta from "../ui/Alerta";
import { Carregando } from "../ui/interacoes";
import { BackspaceIcon, CifraoIcon } from "../icons";
import { formatarCentavos, reaisParaCentavos } from "../../lib/moeda";
import { useCentavosMultiCampo } from "../../hooks/useCentavosMultiCampo";
import { useTecladoNumerico } from "../../hooks/useTecladoNumerico";
import { useValoresHora } from "../../hooks/useValoresHora";
import { AREAS_TRABALHO } from "../../constants/areasTrabalho";

const CAMPO_GLOBAL = "GLOBAL";
const DIGITOS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function AbaBotao({
  rotulo,
  ativo,
  onClick,
}: {
  rotulo: string;
  ativo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      className={`rounded-md border px-4 py-2 text-sm font-semibold transition-colors duration-150 ease-couro ${
        ativo
          ? "border-gold-500 bg-gold-500/15 text-gold-300"
          : "border-leather-600/50 text-leather-300 hover:border-gold-500 hover:text-gold-300"
      }`}
    >
      {rotulo}
    </button>
  );
}

/**
 * Configuração de Valores/Hora (Master Admin): valor padrão (global) sempre
 * ativo + overrides opcionais por área, com teclado numérico compartilhado
 * e aba de Histórico com as vigências anteriores. Auto-contido — busca seus
 * próprios dados ao montar.
 */
export default function ValoresHoraModal({ onFechar }: { onFechar: () => void }) {
  const { atual, historico, carregando, salvando, erro, limparErro, salvar } = useValoresHora();
  const [aba, setAba] = useState<"configuracao" | "historico">("configuracao");
  const [areasComOverride, setAreasComOverride] = useState<Set<string>>(new Set());
  const campos = useCentavosMultiCampo([CAMPO_GLOBAL, ...AREAS_TRABALHO]);
  useTecladoNumerico(campos.digitar, campos.apagar, aba === "configuracao" && !carregando);

  useEffect(() => {
    if (!atual) return;
    campos.definirValor(CAMPO_GLOBAL, atual.global ? reaisParaCentavos(atual.global.valorHora) : 0);
    const overrideAreas = new Set(atual.overridesPorArea.map((override) => override.areaTrabalho as string));
    setAreasComOverride(overrideAreas);
    for (const override of atual.overridesPorArea) {
      campos.definirValor(override.areaTrabalho as string, reaisParaCentavos(override.valorHora));
    }
    // Só reidrata quando o snapshot vindo do back-end muda (após carregar/salvar).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atual]);

  function alternarOverride(area: string) {
    setAreasComOverride((atualSet) => {
      const proximo = new Set(atualSet);
      if (proximo.has(area)) {
        proximo.delete(area);
      } else {
        proximo.add(area);
        campos.setCampoAtivo(area);
      }
      return proximo;
    });
  }

  async function confirmar() {
    const sucesso = await salvar({
      valorHoraGlobalCentavos: campos.valores[CAMPO_GLOBAL],
      overrides: AREAS_TRABALHO.filter((area) => areasComOverride.has(area)).map((area) => ({
        area,
        valorHoraCentavos: campos.valores[area],
      })),
    });
    if (sucesso) onFechar();
  }

  if (carregando) {
    return (
      <Modal titulo="Configuração de valores" onFechar={onFechar}>
        <Carregando rotulo="Carregando valores..." />
      </Modal>
    );
  }

  const podeConfirmar = campos.valores[CAMPO_GLOBAL] > 0 && !salvando;

  return (
    <Modal titulo="Configuração de valores" onFechar={onFechar} larguraMax="max-w-2xl">
      {erro && (
        <Alerta tipo="erro" className="mt-4" onDispensar={limparErro}>
          {erro}
        </Alerta>
      )}

      <div className="mt-4 flex gap-2">
        <AbaBotao rotulo="Configuração" ativo={aba === "configuracao"} onClick={() => setAba("configuracao")} />
        <AbaBotao rotulo="Histórico" ativo={aba === "historico"} onClick={() => setAba("historico")} />
      </div>

      {aba === "configuracao" ? (
        <>
          <button
            type="button"
            onClick={() => campos.setCampoAtivo(CAMPO_GLOBAL)}
            className={`mt-4 w-full rounded-lg border-2 p-3 text-left transition-colors duration-150 ease-couro ${
              campos.campoAtivo === CAMPO_GLOBAL
                ? "border-gold-500 bg-arena-800"
                : "border-leather-600/40 bg-arena-900 hover:border-gold-500/60"
            }`}
          >
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gold-300">
              <CifraoIcon className="h-4 w-4" /> Valor Padrão (Global)
            </p>
            <p className="num-tabular mt-1 text-2xl font-bold text-leather-200">
              {formatarCentavos(campos.valores[CAMPO_GLOBAL])}/h
            </p>
          </button>

          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-steel-400">
              Valores por área (opcional)
            </p>
            {AREAS_TRABALHO.map((area) => {
              const ativo = areasComOverride.has(area);
              return (
                <div
                  key={area}
                  className={`flex items-center gap-3 rounded-lg border-2 p-3 transition-colors duration-150 ease-couro ${
                    ativo && campos.campoAtivo === area
                      ? "border-gold-500 bg-arena-800"
                      : "border-leather-600/40 bg-arena-900"
                  }`}
                >
                  <input
                    type="checkbox"
                    id={`override-${area}`}
                    checked={ativo}
                    onChange={() => alternarOverride(area)}
                    className="h-5 w-5 shrink-0 accent-gold-500"
                  />
                  <label htmlFor={`override-${area}`} className="flex-1 text-sm text-leather-200">
                    {area}
                  </label>
                  {ativo ? (
                    <button
                      type="button"
                      onClick={() => campos.setCampoAtivo(area)}
                      className="num-tabular text-lg font-bold text-leather-200"
                    >
                      {formatarCentavos(campos.valores[area])}/h
                    </button>
                  ) : (
                    <span className="text-sm text-steel-500">
                      usa padrão: {formatarCentavos(campos.valores[CAMPO_GLOBAL])}/h
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {DIGITOS.map((digito) => (
              <button
                key={digito}
                type="button"
                onClick={() => campos.digitar(digito)}
                className="num-tabular min-h-12 touch-manipulation rounded-lg border border-leather-600/50 bg-wood-900 text-xl font-bold text-leather-200 transition-colors duration-150 ease-couro hover:border-gold-500 active:scale-95"
              >
                {digito}
              </button>
            ))}
            <button
              type="button"
              onClick={campos.apagar}
              aria-label="Apagar último dígito"
              className="flex min-h-12 touch-manipulation items-center justify-center rounded-lg border border-leather-600/50 bg-wood-900 text-leather-400 transition-colors duration-150 ease-couro hover:border-gold-500 hover:text-leather-200 active:scale-95"
            >
              <BackspaceIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => campos.zerar()}
              className="min-h-12 touch-manipulation rounded-lg border border-rust-500/40 bg-wood-900 text-sm font-bold text-rust-300 transition-colors duration-150 ease-couro hover:border-rust-400 active:scale-95"
            >
              Zerar
            </button>
          </div>
          <p className="mt-2 text-xs text-leather-400/70">
            Toque num valor acima (ou marque uma área) para digitar nele. Também aceita o teclado do computador.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <Botao variante="couro" tamanho="lg" onClick={onFechar}>
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
        </>
      ) : (
        <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
          {historico.length === 0 ? (
            <p className="text-sm text-leather-300">Nenhuma alteração registrada ainda.</p>
          ) : (
            historico.map((item) => (
              <div key={item.id} className="rounded-lg border border-leather-600/40 bg-arena-900 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gold-300">
                    {item.areaTrabalho ?? "Valor Padrão (Global)"}
                  </span>
                  {item.ativo && (
                    <span className="rounded-full bg-campo-500/20 px-2 py-0.5 text-[11px] font-semibold text-campo-300">
                      Vigente
                    </span>
                  )}
                </div>
                <p className="num-tabular mt-1 text-lg font-bold text-leather-200">
                  {formatarCentavos(reaisParaCentavos(item.valorHora))}/h
                </p>
                <p className="mt-1 text-xs text-steel-400">
                  {item.alteradoPorNome} em {formatarData(item.vigenciaInicio)}
                  {item.vigenciaFim && ` — encerrado em ${formatarData(item.vigenciaFim)}`}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </Modal>
  );
}
