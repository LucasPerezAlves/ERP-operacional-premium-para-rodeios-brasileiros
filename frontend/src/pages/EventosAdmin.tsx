import { useState } from "react";
import Alerta from "../components/ui/Alerta";
import { Carregando } from "../components/ui/interacoes";
import Botao from "../components/ui/Botao";
import Modal from "../components/ui/Modal";
import EventoModal from "../components/eventos/EventoModal";
import { useEventos, type Evento } from "../hooks/useEventos";
import type { DadosEvento, StatusEvento } from "../lib/api";
import { BandeirolaIcon, PlacaIcon } from "../components/icons";

const ROTULO_STATUS: Record<StatusEvento, string> = {
  RASCUNHO: "Rascunho",
  PUBLICADO: "Publicado",
  EM_ANDAMENTO: "Em andamento",
  ENCERRADO: "Encerrado",
  CANCELADO: "Cancelado",
  ARQUIVADO: "Arquivado",
};

/*
 * `campo` (verde) é exclusivo de valores financeiros positivos e `rust` é
 * exclusivo de erro de sistema (DESIGN-SYSTEM.md) — nenhum dos dois serve
 * pra status de negócio. EM_ANDAMENTO usa um dourado mais denso ("ao vivo"
 * — mesma família de PUBLICADO, mais forte); CANCELADO usa `bordo`
 * (destrutivo/SOS), que é a reserva correta para desfecho negativo.
 */
const CLASSE_STATUS: Record<StatusEvento, string> = {
  RASCUNHO: "border-steel-700 bg-steel-900/60 text-steel-300",
  PUBLICADO: "border-gold-500/50 bg-gold-500/10 text-gold-300",
  EM_ANDAMENTO: "border-gold-400 bg-gold-500/30 text-gold-200",
  ENCERRADO: "border-leather-600/50 bg-wood-800 text-leather-300",
  CANCELADO: "border-bordo-500/50 bg-bordo-500/10 text-bordo-300",
  ARQUIVADO: "border-steel-800 bg-steel-950/60 text-steel-500",
};

type Confirmacao = { evento: Evento; acao: "cancelar" | "arquivar" };

/**
 * CRUD administrativo do Evento (Sprint 1) — valida a arquitetura do
 * domínio isolado, sem consumo público ainda (Landing é spec futura).
 * Sem UX refinada nesta entrega: tabela + modal simples, mesmo padrão de
 * EstoqueAdmin.
 */
export default function EventosAdmin() {
  const {
    eventos,
    carregando,
    erro,
    limparErro,
    salvandoId,
    handleCadastrar,
    handleAtualizar,
    handlePublicar,
    handleDespublicar,
    handleIniciar,
    handleEncerrar,
    handleCancelar,
    handleArquivar,
  } = useEventos();
  const [modalAberto, setModalAberto] = useState(false);
  const [eventoEditando, setEventoEditando] = useState<Evento | null>(null);
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);

  function abrirNovo() {
    setEventoEditando(null);
    setModalAberto(true);
  }

  function abrirEdicao(evento: Evento) {
    setEventoEditando(evento);
    setModalAberto(true);
  }

  async function confirmar(dados: DadosEvento) {
    const sucesso = eventoEditando
      ? await handleAtualizar(eventoEditando.id, dados)
      : await handleCadastrar(dados);
    if (sucesso) setModalAberto(false);
  }

  async function confirmarAcaoTerminal() {
    if (!confirmacao) return;
    const sucesso =
      confirmacao.acao === "cancelar"
        ? await handleCancelar(confirmacao.evento.id)
        : await handleArquivar(confirmacao.evento.id);
    if (sucesso) setConfirmacao(null);
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="flex items-center gap-3 font-display text-2xl text-gold-300 md:text-3xl">
          <BandeirolaIcon className="h-6 w-6 text-gold-400" />
          Eventos
        </h1>
        <Botao variante="couro" tamanho="sm" onClick={abrirNovo}>
          Novo Evento
        </Botao>
      </div>
      <p className="mt-1 text-[15px] text-leather-300">
        Cadastro do evento — fonte única para Landing, operação e relatórios.
      </p>

      {erro && (
        <Alerta tipo="erro" className="mt-4" onDispensar={limparErro}>
          {erro}
        </Alerta>
      )}

      {carregando ? (
        <Carregando rotulo="Carregando eventos..." />
      ) : eventos.length === 0 ? (
        <div className="mt-8 flex items-center gap-3 rounded-xl border border-leather-600/40 bg-wood-900 p-8 text-leather-300">
          <PlacaIcon className="h-5 w-5 shrink-0 text-steel-400" />
          Nenhum evento cadastrado ainda.
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-leather-600/40 bg-wood-900 shadow-arena">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-leather-600/40 text-xs uppercase tracking-wide text-steel-400">
                <th className="px-4 py-3 font-semibold">Evento</th>
                <th className="px-4 py-3 font-semibold">Local</th>
                <th className="px-4 py-3 font-semibold">Datas</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-leather-600/20">
              {eventos.map((evento) => (
                <tr key={evento.id}>
                  <td className="px-4 py-3 font-semibold text-leather-200">{evento.nome}</td>
                  <td className="px-4 py-3 text-leather-300">
                    {[evento.local, evento.cidade && evento.estado ? `${evento.cidade}/${evento.estado}` : evento.cidade]
                      .filter(Boolean)
                      .join(" — ") || "—"}
                  </td>
                  <td className="num-tabular px-4 py-3 text-leather-300">
                    {evento.dataInicio} a {evento.dataFim}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-md border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] ${CLASSE_STATUS[evento.status]}`}
                    >
                      {ROTULO_STATUS[evento.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Botao variante="couro" tamanho="sm" onClick={() => abrirEdicao(evento)}>
                        Editar
                      </Botao>
                      {evento.status === "RASCUNHO" && (
                        <Botao
                          variante="latao"
                          tamanho="sm"
                          carregando={salvandoId === evento.id}
                          onClick={() => handlePublicar(evento.id)}
                        >
                          Publicar
                        </Botao>
                      )}
                      {evento.status === "PUBLICADO" && (
                        <>
                          <Botao
                            variante="couro"
                            tamanho="sm"
                            carregando={salvandoId === evento.id}
                            onClick={() => handleDespublicar(evento.id)}
                          >
                            Despublicar
                          </Botao>
                          <Botao
                            variante="latao"
                            tamanho="sm"
                            carregando={salvandoId === evento.id}
                            onClick={() => handleIniciar(evento.id)}
                          >
                            Iniciar
                          </Botao>
                        </>
                      )}
                      {evento.status === "EM_ANDAMENTO" && (
                        <Botao
                          variante="latao"
                          tamanho="sm"
                          carregando={salvandoId === evento.id}
                          onClick={() => handleEncerrar(evento.id)}
                        >
                          Encerrar
                        </Botao>
                      )}
                      {(evento.status === "RASCUNHO" ||
                        evento.status === "PUBLICADO" ||
                        evento.status === "EM_ANDAMENTO") && (
                        <Botao
                          variante="lampiao"
                          tamanho="sm"
                          onClick={() => setConfirmacao({ evento, acao: "cancelar" })}
                        >
                          Cancelar
                        </Botao>
                      )}
                      {(evento.status === "ENCERRADO" || evento.status === "CANCELADO") && (
                        <Botao
                          variante="lampiao"
                          tamanho="sm"
                          onClick={() => setConfirmacao({ evento, acao: "arquivar" })}
                        >
                          Arquivar
                        </Botao>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalAberto && (
        <EventoModal
          evento={eventoEditando}
          salvando={salvandoId === (eventoEditando?.id ?? "novo")}
          onConfirmar={confirmar}
          onCancelar={() => setModalAberto(false)}
        />
      )}

      {confirmacao && (
        <Modal
          titulo={confirmacao.acao === "cancelar" ? "Cancelar evento" : "Arquivar evento"}
          onFechar={() => setConfirmacao(null)}
        >
          <p className="mt-4 text-[15px] text-leather-300">
            {confirmacao.acao === "cancelar"
              ? "Cancelar"
              : "Arquivar"}{" "}
            <span className="font-semibold text-leather-200">{confirmacao.evento.nome}</span>?{" "}
            {confirmacao.acao === "arquivar"
              ? "Arquivado é um estado final — não há ação de reverter na tela."
              : "O evento sai do fluxo normal; ainda pode ser arquivado depois."}
          </p>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <Botao variante="couro" tamanho="lg" onClick={() => setConfirmacao(null)}>
              Voltar
            </Botao>
            <Botao
              variante="lampiao"
              tamanho="lg"
              carregando={salvandoId === confirmacao.evento.id}
              rotuloCarregando="Confirmando..."
              onClick={confirmarAcaoTerminal}
            >
              Confirmar
            </Botao>
          </div>
        </Modal>
      )}
    </>
  );
}
