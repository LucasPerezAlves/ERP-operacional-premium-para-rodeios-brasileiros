import { useCallback, useEffect, useRef, useState } from "react";
import {
  buscarMeuCaixa,
  registrarSos,
  registrarVenda,
  ApiError,
  type CaixaApi,
  type FormaPagamento,
  type VendaApi,
} from "../lib/api";
import { reaisParaCentavos } from "../lib/moeda";
import { getSupabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { tocarErro, tocarSucesso } from "../lib/sons";
import type { CategoriaSos } from "../lib/sos";
import type { NivelAlertaNumerario } from "../lib/numerario";

// ---------------------------------------------------------------------------
// Tipos expostos ao componente (tudo em centavos)
//
// Regra inegociável nº 7: o Operador NÃO abre nem fecha o próprio caixa —
// esse hook é só leitura de status + venda + SOS. A abertura é feita pelo
// Admin em outra tela (useAdminAbrirCaixa), então o caixa aparece aqui via
// fetch + Realtime, nunca por uma ação local deste componente.
// ---------------------------------------------------------------------------

export interface CaixaAtivo {
  id: string;
  saldoInicialCentavos: number;
  saldoEmEspecieCentavos: number;
  dataAbertura: string;
  nivelAlerta: NivelAlertaNumerario;
}

export interface VendaConcluida {
  valorCentavos: number;
  formaPagamento: FormaPagamento;
  trocoCentavos: number | null;
}

export type SosStatus = "idle" | "enviando" | "acionada";

function paraCaixaAtivo(resposta: CaixaApi): CaixaAtivo {
  return {
    id: resposta.id,
    saldoInicialCentavos: reaisParaCentavos(resposta.saldoInicial),
    saldoEmEspecieCentavos: reaisParaCentavos(resposta.saldoEmEspecie),
    dataAbertura: resposta.dataAbertura,
    nivelAlerta: resposta.nivelAlerta,
  };
}

// ---------------------------------------------------------------------------
// Hook: status do próprio caixa (via API + Realtime), venda e SOS.
// ---------------------------------------------------------------------------

export function useCaixa() {
  const { perfil } = useAuth();
  const userId = perfil?.id ?? "";

  const [caixa, setCaixa] = useState<CaixaAtivo | null>(null);
  const [carregandoStatus, setCarregandoStatus] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sosStatus, setSosStatus] = useState<SosStatus>("idle");
  const sosTimeoutRef = useRef<number | null>(null);

  const buscarStatus = useCallback(async () => {
    try {
      const resposta = await buscarMeuCaixa();
      setCaixa(resposta ? paraCaixaAtivo(resposta) : null);
    } catch {
      // Falha ao consultar não deve travar a tela de status — tenta de novo
      // no próximo evento Realtime ou na próxima montagem.
    } finally {
      setCarregandoStatus(false);
    }
  }, []);

  // Carga inicial + assinatura Realtime: como é o ADMIN quem abre o caixa
  // (em outro dispositivo/sessão), o operador só fica sabendo por push —
  // a policy "operador ve o proprio caixa" (005.sql) libera a leitura.
  useEffect(() => {
    if (!userId) {
      setCarregandoStatus(false);
      return;
    }

    setCarregandoStatus(true);
    buscarStatus();

    const canal = getSupabase()
      .channel(`caixas-operador-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "caixas",
          filter: `operador_id=eq.${userId}`,
        },
        () => {
          // Não confiamos no payload bruto (saldo_em_especie é calculado,
          // não é uma coluna) — sempre revalida via API após o evento.
          buscarStatus();
        },
      )
      .subscribe();

    return () => {
      void getSupabase().removeChannel(canal);
    };
  }, [userId, buscarStatus]);

  const atualizarSaldo = useCallback((venda: VendaApi) => {
    setCaixa((atual) =>
      atual
        ? {
            ...atual,
            saldoEmEspecieCentavos: reaisParaCentavos(venda.saldoEmEspecie),
            nivelAlerta: venda.nivelAlerta,
          }
        : atual,
    );
  }, []);

  const vender = useCallback(
    async (
      valorCentavos: number,
      formaPagamento: FormaPagamento,
      valorRecebidoCentavos?: number,
    ): Promise<VendaConcluida | null> => {
      if (!caixa) return null;
      setEnviando(true);
      setErro(null);
      try {
        const venda = await registrarVenda(caixa.id, valorCentavos, formaPagamento);
        atualizarSaldo(venda);
        tocarSucesso();
        return {
          valorCentavos,
          formaPagamento,
          trocoCentavos:
            formaPagamento === "DINHEIRO" && valorRecebidoCentavos !== undefined
              ? valorRecebidoCentavos - valorCentavos
              : null,
        };
      } catch (excecao) {
        tocarErro();
        if (excecao instanceof ApiError && (excecao.status === 404 || excecao.status === 409)) {
          // Turno inexistente/fechado por fora (o Admin fechou): revalida o status
          buscarStatus();
        }
        setErro(excecao instanceof ApiError ? excecao.message : "Falha ao registrar a venda.");
        return null;
      } finally {
        setEnviando(false);
      }
    },
    [caixa, atualizarSaldo, buscarStatus],
  );

  /**
   * SOS "Chamar Gerência": persiste primeiro via API (garante um id real
   * para o Admin "atender" depois) e então transporta por Supabase Realtime
   * Broadcast — o painel do Admin assina o canal "arena-sos" e recebe o
   * alerta na hora. Se o back-end estiver fora do ar, ainda tentamos o
   * broadcast sozinho: SOS não pode depender só da API estar de pé.
   */
  const chamarGerencia = useCallback(
    async (categoria: CategoriaSos) => {
      if (!caixa || sosStatus !== "idle") return;
      setSosStatus("enviando");

      const operadorNome = perfil?.nomeCompleto || perfil?.email || "Operador";
      let sosId: string | null = null;
      let horario = new Date().toISOString();

      try {
        const registrado = await registrarSos(
          caixa.id,
          operadorNome,
          categoria,
          caixa.saldoEmEspecieCentavos,
        );
        sosId = registrado.id;
        horario = registrado.criadoEm;
      } catch {
        // segue para o broadcast mesmo sem persistência
      }

      try {
        const supabase = getSupabase();
        const canal = supabase.channel("arena-sos");

        await new Promise<void>((resolve, reject) => {
          canal.subscribe((status) => {
            if (status === "SUBSCRIBED") {
              canal
                .send({
                  type: "broadcast",
                  event: "sos",
                  payload: {
                    id: sosId,
                    caixaId: caixa.id,
                    operadorId: userId,
                    operadorNome,
                    categoria,
                    saldoEmEspecie: caixa.saldoEmEspecieCentavos / 100,
                    horario,
                  },
                })
                .then(() => resolve())
                .catch(reject);
            } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              reject(new Error("Falha no canal de tempo real."));
            }
          });
        });

        void supabase.removeChannel(canal);
        setSosStatus("acionada");
        tocarSucesso();

        // Libera novo acionamento depois de 60s (evita spam acidental)
        sosTimeoutRef.current = window.setTimeout(() => setSosStatus("idle"), 60_000);
      } catch {
        tocarErro();
        setSosStatus("idle");
        setErro("Não foi possível acionar a gerência. Tente de novo ou chame pessoalmente.");
      }
    },
    [caixa, sosStatus, userId, perfil],
  );

  useEffect(
    () => () => {
      if (sosTimeoutRef.current !== null) {
        window.clearTimeout(sosTimeoutRef.current);
      }
    },
    [],
  );

  return {
    caixa,
    carregandoStatus,
    enviando,
    erro,
    limparErro: () => setErro(null),
    sosStatus,
    vender,
    chamarGerencia,
  };
}
