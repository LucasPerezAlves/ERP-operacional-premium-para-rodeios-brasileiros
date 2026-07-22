import { useCallback, useEffect, useState } from "react";
import {
  arquivarEvento,
  atualizarEvento,
  cancelarEvento,
  criarEvento,
  despublicarEvento,
  encerrarEvento,
  iniciarEvento,
  listarEventos,
  publicarEvento,
  ApiError,
  type DadosEvento,
  type EventoApi,
} from "../lib/api";
import { tocarErro, tocarSucesso } from "../lib/sons";

export type Evento = EventoApi;

/**
 * CRUD administrativo do Evento (Sprint 1) — entidade central da
 * plataforma, isolada nesta entrega: nenhum outro módulo (Caixa,
 * Funcionário, Catálogo) referencia Evento ainda. Sem consumo público
 * (Landing) — spec futura.
 */
export function useEventos() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setEventos(await listarEventos());
    } catch (excecao) {
      setErro(excecao instanceof ApiError ? excecao.message : "Falha ao carregar os eventos.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const handleCadastrar = useCallback(
    async (dados: DadosEvento): Promise<boolean> => {
      setSalvandoId("novo");
      setErro(null);
      try {
        await criarEvento(dados);
        tocarSucesso();
        await carregar();
        return true;
      } catch (excecao) {
        tocarErro();
        setErro(excecao instanceof ApiError ? excecao.message : "Falha ao cadastrar o evento.");
        return false;
      } finally {
        setSalvandoId(null);
      }
    },
    [carregar],
  );

  const handleAtualizar = useCallback(
    async (id: string, dados: DadosEvento): Promise<boolean> => {
      setSalvandoId(id);
      setErro(null);
      try {
        await atualizarEvento(id, dados);
        tocarSucesso();
        await carregar();
        return true;
      } catch (excecao) {
        tocarErro();
        setErro(excecao instanceof ApiError ? excecao.message : "Falha ao atualizar o evento.");
        return false;
      } finally {
        setSalvandoId(null);
      }
    },
    [carregar],
  );

  const executarTransicao = useCallback(
    async (id: string, acao: (id: string) => Promise<EventoApi>, mensagemErro: string): Promise<boolean> => {
      setSalvandoId(id);
      setErro(null);
      try {
        await acao(id);
        tocarSucesso();
        await carregar();
        return true;
      } catch (excecao) {
        tocarErro();
        setErro(excecao instanceof ApiError ? excecao.message : mensagemErro);
        return false;
      } finally {
        setSalvandoId(null);
      }
    },
    [carregar],
  );

  return {
    eventos,
    carregando,
    erro,
    limparErro: () => setErro(null),
    salvandoId,
    handleCadastrar,
    handleAtualizar,
    handlePublicar: (id: string) => executarTransicao(id, publicarEvento, "Falha ao publicar o evento."),
    handleDespublicar: (id: string) => executarTransicao(id, despublicarEvento, "Falha ao despublicar o evento."),
    handleIniciar: (id: string) => executarTransicao(id, iniciarEvento, "Falha ao iniciar o evento."),
    handleEncerrar: (id: string) => executarTransicao(id, encerrarEvento, "Falha ao encerrar o evento."),
    handleCancelar: (id: string) => executarTransicao(id, cancelarEvento, "Falha ao cancelar o evento."),
    handleArquivar: (id: string) => executarTransicao(id, arquivarEvento, "Falha ao arquivar o evento."),
  };
}
