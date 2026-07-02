import { useCallback, useEffect, useState } from "react";
import {
  abrirCaixaParaOperador,
  listarCaixasAbertos,
  listarFuncionarios,
  ApiError,
  type FuncionarioApi,
} from "../lib/api";
import { reaisParaCentavos } from "../lib/moeda";
import { tocarErro, tocarSucesso } from "../lib/sons";

export interface OperadorParaAbertura {
  id: string;
  nomeCompleto: string;
  email: string;
  areaTrabalho: string | null;
  fotoUrl: string | null;
  /** Espécie do caixa já aberto (centavos) — null quando não há turno ativo. */
  caixaAbertoCentavos: number | null;
}

/**
 * Fluxo "Abrir Caixa" do Admin: lista operadores aprovados (com foto, área
 * e o status do caixa — quem já tem turno aberto aparece sinalizado e não
 * é selecionável, em vez de descobrir no erro 409) e abre o caixa PARA o
 * escolhido (regra inegociável nº 7).
 */
export function useAdminAbrirCaixa() {
  const [operadores, setOperadores] = useState<OperadorParaAbertura[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregarOperadores = useCallback(async () => {
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
          .filter(
            (f: FuncionarioApi) =>
              f.perfilAcesso === "OPERADOR" && f.statusAprovacao === "APROVADO" && f.ativo,
          )
          .map((f) => {
            const caixa = caixaPorOperador.get(f.id);
            return {
              id: f.id,
              nomeCompleto: f.nomeCompleto,
              email: f.email,
              areaTrabalho: f.areaTrabalho,
              fotoUrl: f.fotoUrl,
              caixaAbertoCentavos: caixa ? reaisParaCentavos(caixa.saldoEmEspecie) : null,
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
    carregarOperadores();
  }, [carregarOperadores]);

  const abrirCaixa = useCallback(
    async (operadorId: string, saldoInicialCentavos: number): Promise<boolean> => {
      setEnviando(true);
      setErro(null);
      try {
        await abrirCaixaParaOperador(operadorId, saldoInicialCentavos);
        tocarSucesso();
        return true;
      } catch (excecao) {
        tocarErro();
        setErro(excecao instanceof ApiError ? excecao.message : "Falha ao abrir o caixa.");
        return false;
      } finally {
        setEnviando(false);
      }
    },
    [],
  );

  return {
    operadores,
    carregando,
    enviando,
    erro,
    limparErro: () => setErro(null),
    recarregar: carregarOperadores,
    abrirCaixa,
  };
}
