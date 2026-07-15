import { useMemo, useState } from "react";
import Alerta from "../components/ui/Alerta";
import Avatar from "../components/ui/Avatar";
import FiltroArea from "../components/ui/FiltroArea";
import { Carregando } from "../components/ui/interacoes";
import { useScorecard, type OperadorScorecard } from "../hooks/useScorecard";
import { extrairAreasDisponiveis } from "../hooks/useGerenciamentoEquipe";
import { formatarCentavos } from "../lib/moeda";
import { formatarDuracao } from "../lib/tempo";
import { LivroCaixaIcon, PlacaIcon } from "../components/icons";

/** Card do operador: histórico de fechamentos + divergência acumulada + padrão a investigar. */
function ScorecardCard({ operador }: { operador: OperadorScorecard }) {
  const divergencia = operador.somaDivergenciaCentavos;
  const corDivergencia = divergencia === 0
    ? "text-gold-300"
    : divergencia > 0
      ? "text-campo-300"
      : "text-rust-300";

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-leather-600/40 bg-wood-900 p-5 shadow-arena">
      <div className="flex items-center gap-4">
        <Avatar nome={operador.nome} fotoUrl={operador.fotoUrl} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold text-leather-200">{operador.nome}</p>
          <p className="truncate text-sm text-steel-400">
            {operador.areaTrabalho || "Área não informada"}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 rounded-lg bg-arena-800 px-4 py-3">
        <div>
          <dt className="text-xs text-steel-400">Fechamentos</dt>
          <dd className="num-tabular text-lg font-semibold text-leather-200">
            {operador.totalFechamentos}
          </dd>
        </div>
        <div className="text-right">
          <dt className="text-xs text-steel-400">Divergência acumulada</dt>
          <dd className={`num-tabular text-lg font-semibold ${corDivergencia}`}>
            {divergencia === 0
              ? "Conferido"
              : `${divergencia > 0 ? "+" : "−"}${formatarCentavos(Math.abs(divergencia))}`}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-steel-400">Horas trabalhadas</dt>
          <dd className="num-tabular text-lg font-semibold text-leather-200">
            {formatarDuracao(operador.totalMinutosTrabalhados)}
          </dd>
        </div>
        <div className="text-right">
          <dt className="text-xs text-steel-400">Valor devido</dt>
          <dd className="num-tabular text-lg font-semibold text-gold-300">
            {formatarCentavos(operador.totalValorDevidoCentavos)}
          </dd>
        </div>
      </dl>

      {operador.padraoRecorrenteCentavos !== null && (
        <Alerta tipo="aviso">
          Padrão recorrente: {formatarCentavos(operador.padraoRecorrenteCentavos)} se repete nos
          fechamentos — vale acompanhar de perto.
        </Alerta>
      )}
    </div>
  );
}

/**
 * Scorecard de Divergência de Operadores (Master Admin backlog, item 3):
 * histórico de sobra/falta consolidado por operador, com destaque para
 * padrões recorrentes (regra de negócio nº 3).
 */
export default function AdminScorecard() {
  const { operadores, carregando, erro, limparErro } = useScorecard();
  const [areaSelecionada, setAreaSelecionada] = useState<string | null>(null);

  const areasDisponiveis = useMemo(
    () => extrairAreasDisponiveis(operadores),
    [operadores]
  );

  const operadoresFiltrados = useMemo(
    () =>
      areaSelecionada
        ? operadores.filter((operador) => operador.areaTrabalho === areaSelecionada)
        : operadores,
    [operadores, areaSelecionada],
  );

  return (
    <>
      <h1 className="flex items-center gap-3 font-display text-2xl text-gold-300 md:text-3xl">
        <LivroCaixaIcon className="h-6 w-6 text-gold-400" />
        Histórico de divergência
      </h1>
      <p className="mt-1 text-[15px] text-leather-300">
        Sobra e falta de cada operador nos fechamentos já feitos, com alerta de padrão recorrente.
      </p>

      {erro && (
        <Alerta tipo="erro" className="mt-4" onDispensar={limparErro}>
          {erro}
        </Alerta>
      )}

      {!carregando && operadores.length > 0 && (
        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
          <FiltroArea
            rotulo="Todos"
            ativo={areaSelecionada === null}
            onClick={() => setAreaSelecionada(null)}
          />
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
      ) : operadores.length === 0 ? (
        <div className="mt-8 flex items-center gap-3 rounded-xl border border-leather-600/40 bg-wood-900 p-8 text-leather-300">
          <PlacaIcon className="h-5 w-5 shrink-0 text-steel-400" />
          Nenhum caixa fechado ainda — o scorecard aparece a partir do primeiro fechamento.
        </div>
      ) : operadoresFiltrados.length === 0 ? (
        <div className="mt-8 flex items-center gap-3 rounded-xl border border-leather-600/40 bg-wood-900 p-8 text-leather-300">
          <PlacaIcon className="h-5 w-5 shrink-0 text-steel-400" />
          Nenhum operador com fechamentos nessa área.
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {operadoresFiltrados.map((operador) => (
            <ScorecardCard key={operador.id} operador={operador} />
          ))}
        </div>
      )}
    </>
  );
}
