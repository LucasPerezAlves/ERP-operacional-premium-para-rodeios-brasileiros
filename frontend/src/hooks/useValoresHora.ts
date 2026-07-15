import { useCallback, useEffect, useState } from "react";
import {
  buscarHistoricoValoresHora,
  buscarValoresHora,
  salvarValoresHora,
  ApiError,
  type HistoricoValorHoraApi,
  type ValorHoraAtualApi,
} from "../lib/api";
import { tocarErro, tocarSucesso } from "../lib/sons";

export interface DadosSalvarValoresHora {
  valorHoraGlobalCentavos: number;
  overrides: Array<{ area: string; valorHoraCentavos: number }>;
}

/**
 * Dados da Configuração de Valores/Hora (modal auto-contido em
 * ValoresHoraModal): busca o estado atual + histórico ao montar, e expõe
 * salvar() para o payload completo (valor global + overrides por área).
 */
export function useValoresHora() {
  const [atual, setAtual] = useState<ValorHoraAtualApi | null>(null);
  const [historico, setHistorico] = useState<HistoricoValorHoraApi[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [atualCarregado, historicoCarregado] = await Promise.all([
        buscarValoresHora(),
        buscarHistoricoValoresHora(),
      ]);
      setAtual(atualCarregado);
      setHistorico(historicoCarregado);
    } catch (excecao) {
      setErro(excecao instanceof ApiError ? excecao.message : "Falha ao carregar os valores/hora.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const salvar = useCallback(
    async (dados: DadosSalvarValoresHora): Promise<boolean> => {
      setSalvando(true);
      setErro(null);
      try {
        await salvarValoresHora(dados);
        await carregar();
        tocarSucesso();
        return true;
      } catch (excecao) {
        tocarErro();
        setErro(excecao instanceof ApiError ? excecao.message : "Falha ao salvar os valores/hora.");
        return false;
      } finally {
        setSalvando(false);
      }
    },
    [carregar],
  );

  return {
    atual,
    historico,
    carregando,
    salvando,
    erro,
    limparErro: () => setErro(null),
    salvar,
  };
}
