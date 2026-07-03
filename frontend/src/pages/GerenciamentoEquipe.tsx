import { useState } from "react";
import OperadorCard from "../components/equipe/OperadorCard";
import FecharCaixaModal from "../components/equipe/FecharCaixaModal";
import SangriaModal from "../components/equipe/SangriaModal";
import EditarLimitesModal from "../components/equipe/EditarLimitesModal";
import ValoresHoraModal from "../components/equipe/ValoresHoraModal";
import {
  useGerenciamentoEquipe,
  type DadosFechamento,
  type DadosLimites,
  type Operador,
} from "../hooks/useGerenciamentoEquipe";
import { CifraoIcon, LivroCaixaIcon, SearchIcon } from "../components/icons";
import Alerta from "../components/ui/Alerta";
import Avatar from "../components/ui/Avatar";
import Botao from "../components/ui/Botao";
import Modal from "../components/ui/Modal";
import { Carregando, MaloteSangria } from "../components/ui/interacoes";
import FiltroArea from "../components/ui/FiltroArea";
import SeloNumerario from "../components/ui/SeloNumerario";
import { formatarCentavos, reaisParaCentavos } from "../lib/moeda";
import type { CaixaApi, SangriaApi } from "../lib/api";

/**
 * Recolhimento Recomendado (Master Admin backlog, item 1 revisado): caixas
 * em ATENCAO/CRITICO ficam sempre visíveis no topo, independente de busca
 * ou filtro — a gerência nunca bloqueia venda, mas decide quando recolher.
 */
function PainelRecolhimento({
  operadores,
  registrandoSangriaId,
  onRegistrarSangria,
}: {
  operadores: Operador[];
  registrandoSangriaId: string | null;
  onRegistrarSangria: (operador: Operador) => void;
}) {
  if (operadores.length === 0) return null;

  return (
    <section className="mt-6 rounded-xl border border-gold-500/30 bg-wood-900 p-5 shadow-arena">
      <h3 className="font-display text-xl text-gold-300">Recolhimento recomendado</h3>
      <p className="mt-1 text-sm text-leather-300">
        Numerário elevado ou crítico nestes caixas — a venda continua liberada normalmente.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {operadores.map((operador) => (
          <div
            key={operador.id}
            className="flex flex-col gap-3 rounded-lg border border-leather-600/40 bg-arena-800 p-4"
          >
            <div className="flex items-center gap-3">
              <Avatar nome={operador.nome} fotoUrl={operador.fotoUrl} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-leather-200">{operador.nome}</p>
                <p className="truncate text-xs text-steel-400">
                  {operador.areaTrabalho || "Área não informada"}
                </p>
              </div>
              <p className="num-tabular shrink-0 text-lg font-bold text-gold-200">
                {formatarCentavos(operador.saldoAtualCentavos)}
              </p>
            </div>
            <SeloNumerario nivel={operador.nivelAlerta} />
            <Botao
              variante="couro"
              tamanho="sm"
              className="w-full"
              carregando={registrandoSangriaId === operador.id}
              rotuloCarregando="Recolhendo..."
              onClick={() => onRegistrarSangria(operador)}
            >
              Registrar Sangria
            </Botao>
          </div>
        ))}
      </div>
    </section>
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

/** Recibo de sangria: malote assentando + valor recolhido + saldo restante. */
function ComprovanteSangria({
  operador,
  sangria,
  onConcluir,
}: {
  operador: Operador;
  sangria: SangriaApi;
  onConcluir: () => void;
}) {
  return (
    <Modal titulo="Sangria registrada" onFechar={onConcluir}>
      <div className="mt-4 flex flex-col items-center gap-4 text-center">
        <p className="text-leather-300">
          Recolhido do caixa de <span className="font-bold text-leather-200">{operador.nome}</span>
        </p>
        <MaloteSangria valorCentavos={reaisParaCentavos(sangria.valor)} registrada />
        <p className="text-sm text-steel-400">
          Saldo restante em espécie: {formatarCentavos(reaisParaCentavos(sangria.saldoEmEspecie))}
        </p>
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
    operadoresParaRecolhimento,
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
    registrandoSangriaId,
    handleRegistrarSangria,
    salvandoLimitesId,
    handleAtualizarLimites,
  } = useGerenciamentoEquipe();

  const [operadorParaFechar, setOperadorParaFechar] = useState<Operador | null>(null);
  const [comprovante, setComprovante] = useState<{ operador: Operador; caixa: CaixaApi } | null>(
    null,
  );
  const [operadorParaSangria, setOperadorParaSangria] = useState<Operador | null>(null);
  const [comprovanteSangria, setComprovanteSangria] = useState<{
    operador: Operador;
    sangria: SangriaApi;
  } | null>(null);
  const [operadorParaLimites, setOperadorParaLimites] = useState<Operador | null>(null);
  const [mostrarValoresHora, setMostrarValoresHora] = useState(false);

  async function confirmarFechamento(dados: DadosFechamento) {
    if (!operadorParaFechar) return;
    const caixaFechado = await handleFecharCaixa(operadorParaFechar.id, dados);
    if (caixaFechado) {
      setComprovante({ operador: operadorParaFechar, caixa: caixaFechado });
      setOperadorParaFechar(null);
    }
  }

  async function confirmarSangria(valorCentavos: number) {
    if (!operadorParaSangria) return;
    const sangria = await handleRegistrarSangria(operadorParaSangria.id, valorCentavos);
    if (sangria) {
      setComprovanteSangria({ operador: operadorParaSangria, sangria });
      setOperadorParaSangria(null);
    }
  }

  async function confirmarLimites(dados: DadosLimites) {
    if (!operadorParaLimites) return;
    const sucesso = await handleAtualizarLimites(operadorParaLimites.id, dados);
    if (sucesso) {
      setOperadorParaLimites(null);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl text-gold-300 md:text-3xl">Equipe do evento</h1>
        <div className="flex items-center gap-3">
          {!carregando && (
            <p className="num-tabular text-sm text-steel-400">
              {operadores.length} de {totalOperadores} operador(es)
            </p>
          )}
          <Botao variante="couro" tamanho="sm" onClick={() => setMostrarValoresHora(true)}>
            <CifraoIcon className="h-4 w-4" />
            Valores
          </Botao>
        </div>
      </div>

      {erro && (
        <Alerta tipo="erro" className="mt-4" onDispensar={limparErro}>
          {erro}
        </Alerta>
      )}

      <PainelRecolhimento
        operadores={operadoresParaRecolhimento}
        registrandoSangriaId={registrandoSangriaId}
        onRegistrarSangria={setOperadorParaSangria}
      />

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
        <Carregando rotulo="Carregando equipe..." />
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
              registrandoSangria={registrandoSangriaId === operador.id}
              onFecharCaixa={setOperadorParaFechar}
              onRegistrarSangria={setOperadorParaSangria}
              onEditarLimites={setOperadorParaLimites}
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

      {operadorParaSangria && (
        <SangriaModal
          operador={operadorParaSangria}
          saldoAtualCentavos={operadorParaSangria.saldoAtualCentavos}
          enviando={registrandoSangriaId === operadorParaSangria.id}
          onConfirmar={confirmarSangria}
          onCancelar={() => setOperadorParaSangria(null)}
        />
      )}

      {comprovanteSangria && (
        <ComprovanteSangria
          operador={comprovanteSangria.operador}
          sangria={comprovanteSangria.sangria}
          onConcluir={() => setComprovanteSangria(null)}
        />
      )}

      {operadorParaLimites && (
        <EditarLimitesModal
          operador={operadorParaLimites}
          salvando={salvandoLimitesId === operadorParaLimites.id}
          onConfirmar={confirmarLimites}
          onCancelar={() => setOperadorParaLimites(null)}
        />
      )}

      {mostrarValoresHora && (
        <ValoresHoraModal onFechar={() => setMostrarValoresHora(false)} />
      )}
    </>
  );
}
