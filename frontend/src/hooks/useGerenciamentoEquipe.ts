import { useCallback, useEffect, useMemo, useState } from "react";
import {
  atualizarFuncionario,
  fecharCaixa,
  listarCaixasAbertos,
  listarFuncionarios,
  registrarSangria,
  ApiError,
  type CaixaApi,
  type SangriaApi,
} from "../lib/api";
import { reaisParaCentavos } from "../lib/moeda";
import { getSupabase } from "../lib/supabase";
import { tocarErro, tocarSucesso } from "../lib/sons";
import type { NivelAlertaNumerario } from "../lib/numerario";

// ---------------------------------------------------------------------------
// Tipos (arquitetura de código pedida): estado 100% tipado.
// ---------------------------------------------------------------------------

export type StatusCaixaOperador = "ABERTO" | "FECHADO";

export interface Operador {
  id: string;
  nome: string;
  cargo: string;
  fotoUrl: string | null;
  areaTrabalho: string | null;
  statusCaixa: StatusCaixaOperador;
  /** Só relevante quando statusCaixa === "ABERTO". */
  saldoAtualCentavos: number;
  /** Id do caixa aberto — necessário para chamar fechar(); null se não há turno. */
  caixaId: string | null;
  /** Regra de negócio nº 2 (revisada) — NORMAL quando não há caixa aberto. */
  nivelAlerta: NivelAlertaNumerario;
  limiteAtencaoCentavos: number;
  limiteCriticoCentavos: number;
}

export interface DadosFechamento {
  valorFinalConfirmadoCentavos: number;
  motivo: string;
}

export interface DadosLimites {
  limiteAtencaoCentavos: number;
  limiteCriticoCentavos: number;
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

/** Aceita qualquer lista com areaTrabalho (reaproveitado pelo Scorecard). */
export function extrairAreasDisponiveis(operadores: Array<{ areaTrabalho: string | null }>): string[] {
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
  const [registrandoSangriaId, setRegistrandoSangriaId] = useState<string | null>(null);
  const [salvandoLimitesId, setSalvandoLimitesId] = useState<string | null>(null);

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
              cargo: f.cargo,
              fotoUrl: f.fotoUrl,
              areaTrabalho: f.areaTrabalho,
              statusCaixa: caixa ? "ABERTO" : "FECHADO",
              saldoAtualCentavos: caixa ? reaisParaCentavos(caixa.saldoEmEspecie) : 0,
              caixaId: caixa?.id ?? null,
              nivelAlerta: caixa?.nivelAlerta ?? "NORMAL",
              limiteAtencaoCentavos: reaisParaCentavos(f.limiteAtencao),
              limiteCriticoCentavos: reaisParaCentavos(f.limiteCritico),
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

  // Realtime em "vendas" (008.sql): qualquer venda em qualquer caixa pode
  // mudar o nível de alerta de numerário — revalida via API (nunca confia
  // no payload bruto, mesmo padrão de useCaixa.ts).
  useEffect(() => {
    const canal = getSupabase()
      .channel("gerenciamento-equipe-vendas")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "vendas" },
        () => carregar(),
      )
      .subscribe();

    return () => {
      void getSupabase().removeChannel(canal);
    };
  }, [carregar]);

  const operadoresFiltrados = useMemo(
    () => filtrarPorArea(filtrarPorBusca(operadores, busca), areaSelecionada),
    [operadores, busca, areaSelecionada],
  );

  const areasDisponiveis = useMemo(() => extrairAreasDisponiveis(operadores), [operadores]);

  /**
   * Recolhimento Recomendado (Master Admin backlog, item 1 revisado):
   * caixas abertos em ATENCAO/CRITICO, sempre visível independente da busca
   * ou filtro de área — críticos primeiro.
   */
  const operadoresParaRecolhimento = useMemo(
    () =>
      operadores
        .filter(
          (operador) =>
            operador.statusCaixa === "ABERTO" && operador.nivelAlerta !== "NORMAL",
        )
        .sort((a, b) => (a.nivelAlerta === b.nivelAlerta ? 0 : a.nivelAlerta === "CRITICO" ? -1 : 1)),
    [operadores],
  );

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

  /**
   * Recolhimento de espécie (regra de negócio nº 2), exclusivo do Admin.
   * Retorna a resposta da sangria — o saldo restante alimenta o comprovante
   * (MaloteSangria "registrada") exibido pela tela.
   */
  const handleRegistrarSangria = useCallback(
    async (operadorId: string, valorCentavos: number): Promise<SangriaApi | null> => {
      const operador = operadores.find((o) => o.id === operadorId);
      if (!operador?.caixaId) return null;

      setRegistrandoSangriaId(operadorId);
      setErro(null);
      try {
        const sangria = await registrarSangria(operador.caixaId, valorCentavos);
        tocarSucesso();
        await carregar();
        return sangria;
      } catch (excecao) {
        tocarErro();
        setErro(excecao instanceof ApiError ? excecao.message : "Falha ao registrar a sangria.");
        return null;
      } finally {
        setRegistrandoSangriaId(null);
      }
    },
    [operadores, carregar],
  );

  /**
   * Editar Limites (regra de negócio nº 2, revisada): admin ajusta os
   * limiares de numerário por operador. O PUT substitui o registro inteiro,
   * então nome/cargo/área viajam junto sem mudar — só os limites mudam.
   */
  const handleAtualizarLimites = useCallback(
    async (operadorId: string, dados: DadosLimites): Promise<boolean> => {
      const operador = operadores.find((o) => o.id === operadorId);
      if (!operador) return false;

      setSalvandoLimitesId(operadorId);
      setErro(null);
      try {
        await atualizarFuncionario(operadorId, {
          nomeCompleto: operador.nome,
          cargo: operador.cargo,
          areaTrabalho: operador.areaTrabalho,
          limiteAtencaoCentavos: dados.limiteAtencaoCentavos,
          limiteCriticoCentavos: dados.limiteCriticoCentavos,
        });
        tocarSucesso();
        await carregar();
        return true;
      } catch (excecao) {
        tocarErro();
        setErro(excecao instanceof ApiError ? excecao.message : "Falha ao atualizar os limites.");
        return false;
      } finally {
        setSalvandoLimitesId(null);
      }
    },
    [operadores, carregar],
  );

  return {
    operadores: operadoresFiltrados,
    totalOperadores: operadores.length,
    operadoresParaRecolhimento,
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
    registrandoSangriaId,
    handleRegistrarSangria,
    salvandoLimitesId,
    handleAtualizarLimites,
  };
}
