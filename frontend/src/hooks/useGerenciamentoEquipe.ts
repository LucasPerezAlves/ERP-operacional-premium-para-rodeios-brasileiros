import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fecharCaixa,
  listarCaixasAbertos,
  listarFuncionarios,
  ApiError,
  type CaixaApi,
} from "../lib/api";
import { reaisParaCentavos } from "../lib/moeda";
import { tocarErro, tocarSucesso } from "../lib/sons";

// ---------------------------------------------------------------------------
// Tipos (arquitetura de código pedida): estado 100% tipado.
// ---------------------------------------------------------------------------

export type StatusCaixaOperador = "ABERTO" | "FECHADO";

export interface Operador {
  id: string;
  nome: string;
  fotoUrl: string | null;
  areaTrabalho: string | null;
  statusCaixa: StatusCaixaOperador;
  /** Só relevante quando statusCaixa === "ABERTO". */
  saldoAtualCentavos: number;
  /** Id do caixa aberto — necessário para chamar fechar(); null se não há turno. */
  caixaId: string | null;
}

export interface DadosFechamento {
  valorFinalConfirmadoCentavos: number;
  motivo: string;
}

/**
 * Funções de filtro puras (sem estado, sem efeitos) — testáveis isoladamente
 * e sem risco de recomputar a lista inteira à toa a cada render.
 */
export function filtrarPorBusca(operadores: Operador[], busca: string): Operador[] {
  const termo = busca.trim().toLowerCase();
  if (!termo) return operadores;
  return operadores.filter((operador) => operador.nome.toLowerCase().includes(termo));
}

export function filtrarPorArea(operadores: Operador[], area: string | null): Operador[] {
  if (!area) return operadores;
  return operadores.filter((operador) => operador.areaTrabalho === area);
}

export function extrairAreasDisponiveis(operadores: Operador[]): string[] {
  const areas = new Set<string>();
  for (const operador of operadores) {
    if (operador.areaTrabalho) areas.add(operador.areaTrabalho);
  }
  return Array.from(areas).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

// ---------------------------------------------------------------------------
// Hook: carrega funcionários + caixas abertos e expõe busca/filtro/fechamento.
// ---------------------------------------------------------------------------

export function useGerenciamentoEquipe() {
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [areaSelecionada, setAreaSelecionada] = useState<string | null>(null);
  const [fechandoId, setFechandoId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [funcionarios, caixasAbertos] = await Promise.all([
        listarFuncionarios(),
        listarCaixasAbertos(),
      ]);

      const caixaPorOperador = new Map(
        caixasAbertos.map((caixa) => [caixa.operadorId, caixa]),
      );

      setOperadores(
        funcionarios
          .filter((f) => f.perfilAcesso === "OPERADOR" && f.statusAprovacao === "APROVADO" && f.ativo)
          .map((f): Operador => {
            const caixa = caixaPorOperador.get(f.id);
            return {
              id: f.id,
              nome: f.nomeCompleto || f.email,
              fotoUrl: f.fotoUrl,
              areaTrabalho: f.areaTrabalho,
              statusCaixa: caixa ? "ABERTO" : "FECHADO",
              saldoAtualCentavos: caixa ? reaisParaCentavos(caixa.saldoEmEspecie) : 0,
              caixaId: caixa?.id ?? null,
            };
          }),
      );
    } catch (excecao) {
      setErro(excecao instanceof ApiError ? excecao.message : "Falha ao carregar a equipe.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const operadoresFiltrados = useMemo(
    () => filtrarPorArea(filtrarPorBusca(operadores, busca), areaSelecionada),
    [operadores, busca, areaSelecionada],
  );

  const areasDisponiveis = useMemo(() => extrairAreasDisponiveis(operadores), [operadores]);

  /**
   * Dispara o fechamento no back-end (regra inegociável nº 7: exclusivo do
   * Admin). Retorna o caixa fechado — a resposta carrega valorFinalConfirmado,
   * saldoEmEspecie e divergencia, exibidos no Comprovante de Fechamento.
   */
  const handleFecharCaixa = useCallback(
    async (operadorId: string, dados: DadosFechamento): Promise<CaixaApi | null> => {
      const operador = operadores.find((o) => o.id === operadorId);
      if (!operador?.caixaId) return null;

      setFechandoId(operadorId);
      setErro(null);
      try {
        const fechado = await fecharCaixa(
          operador.caixaId,
          dados.valorFinalConfirmadoCentavos,
          dados.motivo,
        );
        tocarSucesso();
        await carregar();
        return fechado;
      } catch (excecao) {
        tocarErro();
        setErro(excecao instanceof ApiError ? excecao.message : "Falha ao fechar o caixa.");
        return null;
      } finally {
        setFechandoId(null);
      }
    },
    [operadores, carregar],
  );

  return {
    operadores: operadoresFiltrados,
    totalOperadores: operadores.length,
    areasDisponiveis,
    carregando,
    erro,
    limparErro: () => setErro(null),
    busca,
    setBusca,
    areaSelecionada,
    setAreaSelecionada,
    fechandoId,
    handleFecharCaixa,
  };
}
