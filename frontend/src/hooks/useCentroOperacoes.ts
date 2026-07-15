import { useCallback, useEffect, useState } from "react";
import {
  listarCaixasAbertos,
  listarCaixasFechados,
  listarFuncionarios,
  listarSosAbertos,
  listarSangrias,
  ApiError,
} from "../lib/api";
import { reaisParaCentavos } from "../lib/moeda";
import { ehHoje } from "../lib/tempo";
import type { CategoriaSos } from "../lib/sos";
import type { NivelAlertaNumerario } from "../lib/numerario";

export interface CaixaAbertoResumo {
  caixaId: string;
  operadorNome: string;
  operadorFotoUrl: string | null;
  nivelAlerta: NivelAlertaNumerario;
}

export type TipoEventoAtividade = "ABERTURA" | "FECHAMENTO" | "SANGRIA" | "SOS";

export interface EventoAtividade {
  id: string;
  tipo: TipoEventoAtividade;
  horario: string;
  operadorNome: string;
  /** Só para SANGRIA — centavos, null quando não se aplica. */
  valorCentavos: number | null;
  /** Só para FECHAMENTO — null quando não houve contagem. */
  divergenciaCentavos: number | null;
  /** Só para SOS. */
  categoriaSos: CategoriaSos | null;
}

export interface CentroOperacoesData {
  caixasAbertosCount: number;
  especieAgoraCentavos: number;
  operadoresEmAlertaCount: number;
  valorDevidoHojeCentavos: number;
  divergenciaHojeCentavos: number;
  totalOperadoresAtivos: number;
  caixasAbertos: CaixaAbertoResumo[];
  eventos: EventoAtividade[];
}

/**
 * Centro de Operações do Evento (Admin): agrega 5 fontes reais em paralelo
 * (caixas abertos, caixas fechados, funcionários, SOS abertos, sangrias) e
 * computa KPIs/painéis/feed no cliente — mesmo padrão de useScorecard.ts e
 * useHistoricoTurnos.ts. Nenhum endpoint de resumo pré-computado.
 */
export function useCentroOperacoes() {
  const [dados, setDados] = useState<CentroOperacoesData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [caixasAbertos, caixasFechados, funcionarios, sosAbertos, sangrias] = await Promise.all([
        listarCaixasAbertos(),
        listarCaixasFechados(),
        listarFuncionarios(),
        listarSosAbertos(),
        listarSangrias(),
      ]);

      const funcionarioPorId = new Map(funcionarios.map((f) => [f.id, f]));
      const nomeOperador = (id: string) => {
        const f = funcionarioPorId.get(id);
        return f?.nomeCompleto || f?.email || "Operador removido";
      };

      const especieAgoraCentavos = caixasAbertos.reduce(
        (soma, caixa) => soma + reaisParaCentavos(caixa.saldoEmEspecie),
        0,
      );
      const operadoresEmAlertaCount = caixasAbertos.filter((c) => c.nivelAlerta !== "NORMAL").length;

      const fechamentosHoje = caixasFechados.filter((c) => c.dataFechamento !== null && ehHoje(c.dataFechamento));
      const divergenciaHojeCentavos = fechamentosHoje.reduce(
        (soma, c) => soma + (c.divergencia === null ? 0 : reaisParaCentavos(c.divergencia)),
        0,
      );
      const valorDevidoHojeCentavos = fechamentosHoje.reduce(
        (soma, c) => soma + (c.valorTotalCalculado === null ? 0 : reaisParaCentavos(c.valorTotalCalculado)),
        0,
      );

      const totalOperadoresAtivos = funcionarios.filter(
        (f) => f.perfilAcesso === "OPERADOR" && f.statusAprovacao === "APROVADO" && f.ativo,
      ).length;

      const caixasAbertosResumo: CaixaAbertoResumo[] = caixasAbertos.map((c) => ({
        caixaId: c.id,
        operadorNome: nomeOperador(c.operadorId),
        operadorFotoUrl: funcionarioPorId.get(c.operadorId)?.fotoUrl ?? null,
        nivelAlerta: c.nivelAlerta,
      }));

      const eventosAbertura: EventoAtividade[] = caixasAbertos.map((c) => ({
        id: `abertura-${c.id}`,
        tipo: "ABERTURA",
        horario: c.dataAbertura,
        operadorNome: nomeOperador(c.operadorId),
        valorCentavos: null,
        divergenciaCentavos: null,
        categoriaSos: null,
      }));

      const eventosFechamento: EventoAtividade[] = caixasFechados
        .filter((c) => c.dataFechamento !== null)
        .map((c) => ({
          id: `fechamento-${c.id}`,
          tipo: "FECHAMENTO",
          horario: c.dataFechamento as string,
          operadorNome: nomeOperador(c.operadorId),
          valorCentavos: null,
          divergenciaCentavos: c.divergencia === null ? null : reaisParaCentavos(c.divergencia),
          categoriaSos: null,
        }));

      const eventosSangria: EventoAtividade[] = sangrias.map((s) => ({
        id: `sangria-${s.id}`,
        tipo: "SANGRIA",
        horario: s.registradaEm,
        operadorNome: nomeOperador(s.operadorId),
        valorCentavos: reaisParaCentavos(s.valor),
        divergenciaCentavos: null,
        categoriaSos: null,
      }));

      const eventosSos: EventoAtividade[] = sosAbertos.map((sos) => ({
        id: `sos-${sos.id}`,
        tipo: "SOS",
        horario: sos.criadoEm,
        operadorNome: sos.operadorNome,
        valorCentavos: null,
        divergenciaCentavos: null,
        categoriaSos: sos.categoria,
      }));

      const eventos = [...eventosAbertura, ...eventosFechamento, ...eventosSangria, ...eventosSos].sort(
        (a, b) => b.horario.localeCompare(a.horario),
      );

      setDados({
        caixasAbertosCount: caixasAbertos.length,
        especieAgoraCentavos,
        operadoresEmAlertaCount,
        valorDevidoHojeCentavos,
        divergenciaHojeCentavos,
        totalOperadoresAtivos,
        caixasAbertos: caixasAbertosResumo,
        eventos,
      });
    } catch (excecao) {
      setErro(excecao instanceof ApiError ? excecao.message : "Falha ao carregar o Centro de Operações.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return { dados, carregando, erro, limparErro: () => setErro(null) };
}
