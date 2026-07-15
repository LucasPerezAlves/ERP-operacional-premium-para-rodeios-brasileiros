import { useCallback, useEffect, useMemo, useState } from "react";
import { listarCaixasFechados, listarFuncionarios, ApiError } from "../lib/api";
import { extrairAreasDisponiveis } from "./useGerenciamentoEquipe";

export interface TurnoOperador {
  caixaId: string;
  operadorNome: string;
  operadorFotoUrl: string | null;
  areaTrabalho: string | null;
  dataAbertura: string;
  dataFechamento: string;
  minutosTrabalhados: number | null;
  valorHoraAplicado: number | null;
  valorTotalCalculado: number | null;
}

/**
 * Histórico de Turnos: lista linha-a-linha de cada caixa fechado, com o
 * resumo de jornada (horas x valor/hora) calculado no back-end no momento
 * do fechamento. Mesmo padrão de agregação de useScorecard.ts (busca
 * funcionários + caixas fechados em paralelo, junta por operadorId).
 */
export function useHistoricoTurnos() {
  const [turnos, setTurnos] = useState<TurnoOperador[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [areaSelecionada, setAreaSelecionada] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [funcionarios, caixasFechados] = await Promise.all([
        listarFuncionarios(),
        listarCaixasFechados(),
      ]);

      const funcionarioPorId = new Map(funcionarios.map((f) => [f.id, f]));

      setTurnos(
        caixasFechados
          .filter((caixa) => caixa.dataFechamento !== null)
          .map((caixa): TurnoOperador => {
            const operador = funcionarioPorId.get(caixa.operadorId);
            return {
              caixaId: caixa.id,
              operadorNome: operador?.nomeCompleto || operador?.email || "Operador removido",
              operadorFotoUrl: operador?.fotoUrl ?? null,
              areaTrabalho: operador?.areaTrabalho ?? null,
              dataAbertura: caixa.dataAbertura,
              dataFechamento: caixa.dataFechamento as string,
              minutosTrabalhados: caixa.minutosTrabalhados,
              valorHoraAplicado: caixa.valorHoraAplicado,
              valorTotalCalculado: caixa.valorTotalCalculado,
            };
          })
          .sort((a, b) => b.dataFechamento.localeCompare(a.dataFechamento)),
      );
    } catch (excecao) {
      setErro(excecao instanceof ApiError ? excecao.message : "Falha ao carregar o histórico de turnos.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const areasDisponiveis = useMemo(() => extrairAreasDisponiveis(turnos.map((t) => ({ areaTrabalho: t.areaTrabalho }))), [turnos]);

  const turnosFiltrados = useMemo(
    () => (areaSelecionada ? turnos.filter((t) => t.areaTrabalho === areaSelecionada) : turnos),
    [turnos, areaSelecionada],
  );

  return {
    turnos: turnosFiltrados,
    totalTurnos: turnos.length,
    areasDisponiveis,
    areaSelecionada,
    setAreaSelecionada,
    carregando,
    erro,
    limparErro: () => setErro(null),
  };
}
