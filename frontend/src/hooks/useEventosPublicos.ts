import { useEffect, useState } from "react";
import { listarEventosPublicos, buscarEventoPublicoPorSlug, ApiError, type EventoPublicoApi } from "../lib/api";

export type EventoPublico = EventoPublicoApi;

/** Lista de eventos publicados — consumida pela Landing Page. */
export function useEventosPublicos() {
  const [eventos, setEventos] = useState<EventoPublico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      setCarregando(true);
      setErro(null);
      try {
        const lista = await listarEventosPublicos();
        if (!cancelado) setEventos(lista);
      } catch (excecao) {
        if (!cancelado) {
          setErro(excecao instanceof ApiError ? excecao.message : "Falha ao carregar os eventos.");
        }
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }
    carregar();
    return () => {
      cancelado = true;
    };
  }, []);

  return { eventos, carregando, erro };
}

/** Detalhe de um evento publicado por slug — usado na página /eventos/:slug. */
export function useEventoPublico(slug: string | undefined) {
  const [evento, setEvento] = useState<EventoPublico | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    const slugAtual = slug;
    let cancelado = false;
    async function carregar() {
      setCarregando(true);
      setErro(null);
      setNaoEncontrado(false);
      try {
        const resultado = await buscarEventoPublicoPorSlug(slugAtual);
        if (!cancelado) setEvento(resultado);
      } catch (excecao) {
        if (cancelado) return;
        if (excecao instanceof ApiError && excecao.status === 404) {
          setNaoEncontrado(true);
        } else {
          setErro(excecao instanceof ApiError ? excecao.message : "Falha ao carregar o evento.");
        }
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }
    carregar();
    return () => {
      cancelado = true;
    };
  }, [slug]);

  return { evento, carregando, naoEncontrado, erro };
}
