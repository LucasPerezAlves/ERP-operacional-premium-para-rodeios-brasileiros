import Alerta from "../components/ui/Alerta";
import Avatar from "../components/ui/Avatar";
import FiltroArea from "../components/ui/FiltroArea";
import { Carregando } from "../components/ui/interacoes";
import { RelogioIcon, PlacaIcon } from "../components/icons";
import { useHistoricoTurnos } from "../hooks/useHistoricoTurnos";
import { formatarCentavos, reaisParaCentavos } from "../lib/moeda";
import { formatarDuracao } from "../lib/tempo";

function formatarHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatarDataCurta(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/**
 * Histórico de Turnos (Admin): cada caixa fechado com entrada, saída, horas
 * trabalhadas e valor devido — comprovante operacional linha-a-linha, base
 * para uma futura folha de pagamento (sem substituí-la agora).
 */
export default function HistoricoTurnos() {
  const { turnos, totalTurnos, areasDisponiveis, areaSelecionada, setAreaSelecionada, carregando, erro, limparErro } =
    useHistoricoTurnos();

  return (
    <>
      <h1 className="flex items-center gap-3 font-display text-2xl text-gold-300 md:text-3xl">
        <RelogioIcon className="h-6 w-6 text-gold-400" />
        Histórico de Turnos
      </h1>
      <p className="mt-1 text-[15px] text-leather-300">
        Entrada, saída, horas trabalhadas e valor devido de cada turno já fechado.
      </p>

      {erro && (
        <Alerta tipo="erro" className="mt-4" onDispensar={limparErro}>
          {erro}
        </Alerta>
      )}

      {!carregando && totalTurnos > 0 && (
        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
          <FiltroArea rotulo="Todos" ativo={areaSelecionada === null} onClick={() => setAreaSelecionada(null)} />
          {areasDisponiveis.map((area) => (
            <FiltroArea
              key={area}
              rotulo={area}
              ativo={areaSelecionada === area}
              onClick={() => setAreaSelecionada(area)}
            />
          ))}
        </div>
      )}

      {carregando ? (
        <Carregando rotulo="Carregando histórico..." />
      ) : turnos.length === 0 ? (
        <div className="mt-8 flex items-center gap-3 rounded-xl border border-leather-600/40 bg-wood-900 p-8 text-leather-300">
          <PlacaIcon className="h-5 w-5 shrink-0 text-steel-400" />
          Nenhum turno fechado ainda — o histórico aparece a partir do primeiro fechamento.
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-leather-600/40 bg-wood-900 shadow-arena">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-leather-600/40 text-xs uppercase tracking-wide text-steel-400">
                <th className="px-4 py-3 font-semibold">Operador</th>
                <th className="px-4 py-3 font-semibold">Data</th>
                <th className="px-4 py-3 font-semibold">Entrada</th>
                <th className="px-4 py-3 font-semibold">Saída</th>
                <th className="px-4 py-3 font-semibold">Horas</th>
                <th className="px-4 py-3 font-semibold">Valor/hora</th>
                <th className="px-4 py-3 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-leather-600/20">
              {turnos.map((turno) => (
                <tr key={turno.caixaId}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar nome={turno.operadorNome} fotoUrl={turno.operadorFotoUrl} tamanho="md" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-leather-200">{turno.operadorNome}</p>
                        <p className="truncate text-xs text-steel-400">{turno.areaTrabalho || "Área não informada"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="num-tabular px-4 py-3 text-leather-300">{formatarDataCurta(turno.dataFechamento)}</td>
                  <td className="num-tabular px-4 py-3 text-leather-300">{formatarHora(turno.dataAbertura)}</td>
                  <td className="num-tabular px-4 py-3 text-leather-300">{formatarHora(turno.dataFechamento)}</td>
                  <td className="num-tabular px-4 py-3 text-leather-300">
                    {turno.minutosTrabalhados !== null ? formatarDuracao(turno.minutosTrabalhados) : "—"}
                  </td>
                  <td className="num-tabular px-4 py-3 text-leather-300">
                    {turno.valorHoraAplicado !== null ? `${formatarCentavos(reaisParaCentavos(turno.valorHoraAplicado))}/h` : "—"}
                  </td>
                  <td className="num-tabular px-4 py-3 text-right font-bold text-gold-300">
                    {turno.valorTotalCalculado !== null ? formatarCentavos(reaisParaCentavos(turno.valorTotalCalculado)) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
