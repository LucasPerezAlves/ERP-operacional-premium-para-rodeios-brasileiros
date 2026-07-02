import { useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import OperadorCard from "../components/equipe/OperadorCard";
import FecharCaixaModal from "../components/equipe/FecharCaixaModal";
import {
  useGerenciamentoEquipe,
  type DadosFechamento,
  type Operador,
} from "../hooks/useGerenciamentoEquipe";
import { LassoSpinner, LivroCaixaIcon, SearchIcon, SetaEsquerdaIcon } from "../components/icons";
import Alerta from "../components/ui/Alerta";
import Botao from "../components/ui/Botao";
import Modal from "../components/ui/Modal";
import { formatarCentavos, reaisParaCentavos } from "../lib/moeda";
import type { CaixaApi } from "../lib/api";

/** Botão de filtro por área — selo de fivela, mesma linguagem dos badges. */
function FiltroArea({
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
      onClick={onClick}
      className={`whitespace-nowrap rounded-md border px-4 py-2 text-sm font-semibold transition-colors duration-150 ease-couro ${
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
 * Comprovante de Fechamento — primeira peça da linguagem de relatório:
 * moldura de rótulo de whisky, livro-caixa e a DIVERGÊNCIA (sobra/falta)
 * que a contagem física revelou contra o saldo derivado dos lançamentos.
 */
function ComprovanteFechamento({
  operador,
  caixa,
  onConcluir,
}: {
  operador: Operador;
  caixa: CaixaApi;
  onConcluir: () => void;
}) {
  const esperadoCentavos = reaisParaCentavos(caixa.saldoEmEspecie);
  const contadoCentavos = reaisParaCentavos(caixa.valorFinalConfirmado ?? 0);
  const divergenciaCentavos = reaisParaCentavos(caixa.divergencia ?? 0);

  return (
    <Modal titulo="Comprovante de fechamento" onFechar={onConcluir}>
      <div className="material-rotulo mt-4 rounded-xl bg-arena-900 p-6">
        <div className="flex items-center gap-3 border-b border-leather-600/30 pb-4">
          <LivroCaixaIcon className="h-6 w-6 text-gold-400" />
          <div>
            <p className="font-bold text-leather-200">{operador.nome}</p>
            <p className="text-xs text-steel-400">
              {operador.areaTrabalho || "Área não informada"}
            </p>
          </div>
        </div>

        <dl className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-sm text-leather-300">Esperado em espécie</dt>
            <dd className="num-tabular text-lg font-semibold text-leather-200">
              {formatarCentavos(esperadoCentavos)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-sm text-leather-300">Contado pela gerência</dt>
            <dd className="num-tabular text-lg font-semibold text-leather-200">
              {formatarCentavos(contadoCentavos)}
            </dd>
          </div>

          <div className="flex items-center justify-between gap-4 border-t-2 border-gold-500/40 pt-3">
            <dt className="text-sm font-semibold text-leather-200">Divergência</dt>
            {divergenciaCentavos === 0 ? (
              <dd className="text-lg font-bold text-gold-300">Conferido</dd>
            ) : divergenciaCentavos > 0 ? (
              <dd className="num-tabular text-lg font-bold text-campo-300">
                +{formatarCentavos(divergenciaCentavos)} de sobra
              </dd>
            ) : (
              <dd className="num-tabular text-lg font-bold text-rust-300">
                −{formatarCentavos(Math.abs(divergenciaCentavos))} de falta
              </dd>
            )}
          </div>

          {caixa.motivoFechamento && (
            <div className="border-t border-leather-600/30 pt-3">
              <dt className="text-xs text-steel-400">Motivo</dt>
              <dd className="mt-1 text-sm text-leather-300">{caixa.motivoFechamento}</dd>
            </div>
          )}
        </dl>
      </div>

      <Botao variante="latao" tamanho="lg" className="mt-6 w-full" onClick={onConcluir}>
        Concluir
      </Botao>
    </Modal>
  );
}

/**
 * Gerenciamento de Equipe (Admin): busca + filtro por área, grid de
 * operadores com ferradura de status, fechamento com conferência e
 * comprovante de divergência (regra inegociável nº 7).
 */
export default function GerenciamentoEquipe() {
  const {
    operadores,
    totalOperadores,
    areasDisponiveis,
    carregando,
    erro,
    limparErro,
    busca,
    setBusca,
    areaSelecionada,
    setAreaSelecionada,
    fechandoId,
    handleFecharCaixa,
  } = useGerenciamentoEquipe();

  const [operadorParaFechar, setOperadorParaFechar] = useState<Operador | null>(null);
  const [comprovante, setComprovante] = useState<{ operador: Operador; caixa: CaixaApi } | null>(
    null,
  );

  async function confirmarFechamento(dados: DadosFechamento) {
    if (!operadorParaFechar) return;
    const caixaFechado = await handleFecharCaixa(operadorParaFechar.id, dados);
    if (caixaFechado) {
      setComprovante({ operador: operadorParaFechar, caixa: caixaFechado });
      setOperadorParaFechar(null);
    }
  }

  return (
    <DashboardLayout titulo="Gerenciamento de Equipe">
      <Link
        to="/admin-dashboard"
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-gold-300 transition-colors duration-200 hover:text-gold-200"
      >
        <SetaEsquerdaIcon className="h-4 w-4" />
        Voltar ao painel
      </Link>

      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-2xl text-gold-300">Equipe do evento</h2>
        {!carregando && (
          <p className="num-tabular text-sm text-steel-400">
            {operadores.length} de {totalOperadores} operador(es)
          </p>
        )}
      </div>

      {erro && (
        <Alerta tipo="erro" className="mt-4" onDispensar={limparErro}>
          {erro}
        </Alerta>
      )}

      {/* Barra de ferramentas: busca + filtro de área */}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-3 rounded-lg border border-leather-500/50 bg-wood-900 px-4 py-3 transition-colors duration-200 focus-within:border-gold-400 focus-within:ring-4 focus-within:ring-gold-400/20">
          <span className="text-steel-500">
            <SearchIcon />
          </span>
          <input
            type="text"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Buscar operador pelo nome..."
            className="w-full bg-transparent text-[15px] text-leather-200 outline-none placeholder:text-leather-400/60"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
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
      </div>

      {/* Grid de operadores */}
      {carregando ? (
        <div className="flex flex-col items-center gap-4 py-16">
          <span className="text-gold-400">
            <LassoSpinner className="h-8 w-8" />
          </span>
          <p className="text-sm font-semibold text-leather-300">Carregando equipe...</p>
        </div>
      ) : operadores.length === 0 ? (
        <div className="mt-8 rounded-xl border border-leather-600/40 bg-wood-900 p-8 text-center text-leather-300">
          Nenhum operador encontrado com esses filtros.
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {operadores.map((operador) => (
            <OperadorCard
              key={operador.id}
              operador={operador}
              fechando={fechandoId === operador.id}
              onFecharCaixa={setOperadorParaFechar}
            />
          ))}
        </div>
      )}

      {operadorParaFechar && (
        <FecharCaixaModal
          operador={operadorParaFechar}
          enviando={fechandoId === operadorParaFechar.id}
          onConfirmar={confirmarFechamento}
          onCancelar={() => setOperadorParaFechar(null)}
        />
      )}

      {comprovante && (
        <ComprovanteFechamento
          operador={comprovante.operador}
          caixa={comprovante.caixa}
          onConcluir={() => setComprovante(null)}
        />
      )}
    </DashboardLayout>
  );
}
