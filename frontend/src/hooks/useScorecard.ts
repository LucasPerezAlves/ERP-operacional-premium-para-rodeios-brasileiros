import { useCallback, useEffect, useState } from "react";
import { listarCaixasFechados, listarFuncionarios, ApiError } from "../lib/api";
import { reaisParaCentavos } from "../lib/moeda";

export interface FechamentoOperador {
  caixaId: string;
  dataFechamento: string;
  divergenciaCentavos: number;
  /** null quando não havia valor/hora configurado neste fechamento — não soma, não zera. */
  minutosTrabalhados: number | null;
  /** null quando não havia valor/hora configurado neste fechamento — não soma, não zera. */
  valorTotalCalculadoCentavos: number | null;
}

export interface OperadorScorecard {
  id: string;
  nome: string;
  fotoUrl: string | null;
  areaTrabalho: string | null;
  totalFechamentos: number;
  /** Soma de todas as divergências: positivo = sobra acumulada, negativo = falta acumulada. */
  somaDivergenciaCentavos: number;
  /** Valor absoluto que se repetiu 2+ vezes nas faltas/sobras — padrão a investigar (regra de negócio nº 3). */
  padraoRecorrenteCentavos: number | null;
  /** Soma apenas dos turnos com snapshot de jornada — turnos sem valor/hora configurado são ignorados, não zerados. */
  totalMinutosTrabalhados: number;
  /** Idem: soma apenas dos turnos com valorTotalCalculado != null. */
  totalValorDevidoCentavos: number;
}

/** Acha o valor absoluto de divergência mais recorrente (mín. 2 ocorrências), se houver. */
function detectarPadraoRecorrente(fechamentos: FechamentoOperador[]): number | null {
  const ocorrenciasPorValor = new Map<number, number>();
  for (const fechamento of fechamentos) {
    if (fechamento.divergenciaCentavos === 0) continue;
    const valorAbsoluto = Math.abs(fechamento.divergenciaCentavos);
    ocorrenciasPorValor.set(valorAbsoluto, (ocorrenciasPorValor.get(valorAbsoluto) ?? 0) + 1);
  }

  let recorrente: number | null = null;
  let maiorOcorrencia = 1;
  for (const [valor, ocorrencias] of ocorrenciasPorValor) {
    if (ocorrencias >= 2 && ocorrencias > maiorOcorrencia) {
      recorrente = valor;
      maiorOcorrencia = ocorrencias;
    }
  }
  return recorrente;
}

/**
 * Scorecard de Divergência de Operadores (Master Admin backlog, item 3):
 * histórico de sobra/falta de cada operador nos fechamentos já feitos —
 * um padrão recorrente (ex.: sempre falta R$ 20) sinaliza acompanhamento.
 */
export function useScorecard() {
  const [operadores, setOperadores] = useState<OperadorScorecard[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [funcionarios, caixasFechados] = await Promise.all([
        listarFuncionarios(),
        listarCaixasFechados(),
      ]);

      const fechamentosPorOperador = new Map<string, FechamentoOperador[]>();
      for (const caixa of caixasFechados) {
        if (caixa.divergencia === null || !caixa.dataFechamento) continue;
        const fechamentos = fechamentosPorOperador.get(caixa.operadorId) ?? [];
        fechamentos.push({
          caixaId: caixa.id,
          dataFechamento: caixa.dataFechamento,
          divergenciaCentavos: reaisParaCentavos(caixa.divergencia),
          minutosTrabalhados: caixa.minutosTrabalhados,
          valorTotalCalculadoCentavos:
            caixa.valorTotalCalculado === null ? null : reaisParaCentavos(caixa.valorTotalCalculado),
        });
        fechamentosPorOperador.set(caixa.operadorId, fechamentos);
      }

      setOperadores(
        funcionarios
          .filter((f) => f.perfilAcesso === "OPERADOR")
          .map((f): OperadorScorecard => {
            const fechamentos = fechamentosPorOperador.get(f.id) ?? [];
            return {
              id: f.id,
              nome: f.nomeCompleto || f.email,
              fotoUrl: f.fotoUrl,
              areaTrabalho: f.areaTrabalho,
              totalFechamentos: fechamentos.length,
              somaDivergenciaCentavos: fechamentos.reduce(
                (soma, fechamento) => soma + fechamento.divergenciaCentavos,
                0,
              ),
              padraoRecorrenteCentavos: detectarPadraoRecorrente(fechamentos),
              totalMinutosTrabalhados: fechamentos.reduce(
                (soma, fechamento) => soma + (fechamento.minutosTrabalhados ?? 0),
                0,
              ),
              totalValorDevidoCentavos: fechamentos.reduce(
                (soma, fechamento) => soma + (fechamento.valorTotalCalculadoCentavos ?? 0),
                0,
              ),
            };
          })
          .filter((operador) => operador.totalFechamentos > 0)
          // Quem mais deve dinheiro (falta acumulada) aparece primeiro.
          .sort((a, b) => a.somaDivergenciaCentavos - b.somaDivergenciaCentavos),
      );
    } catch (excecao) {
      setErro(excecao instanceof ApiError ? excecao.message : "Falha ao carregar o scorecard.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return { operadores, carregando, erro, limparErro: () => setErro(null) };
}
