import { useCallback, useEffect, useState } from "react";
import { atenderSos, listarSosAbertos } from "../lib/api";
import { getSupabase } from "../lib/supabase";
import { reaisParaCentavos } from "../lib/moeda";
import { tocarSos } from "../lib/sons";
import type { CategoriaSos } from "../lib/sos";

export interface AlertaSos {
  /** Id real do back-end quando persistido; senão, chave sintética local. */
  id: string;
  persistido: boolean;
  caixaId: string;
  operadorId: string;
  operadorNome: string;
  categoria: CategoriaSos;
  saldoEmEspecieCentavos: number;
  horario: string;
}

interface PayloadSos {
  id: string | null;
  caixaId: string;
  operadorId: string;
  operadorNome: string;
  categoria: CategoriaSos;
  saldoEmEspecie: number;
  horario: string;
}

/**
 * Painel da Gerência (Master Admin backlog, item 1): assina o mesmo canal
 * Broadcast "arena-sos" que o Operador aciona em useCaixa.ts e hidrata com
 * o histórico ainda aberto no back-end (SOS disparado enquanto o painel
 * estava fechado não pode se perder).
 */
export function useSosAlertas(ativo: boolean) {
  const [alertas, setAlertas] = useState<AlertaSos[]>([]);

  useEffect(() => {
    if (!ativo) return;
    let cancelado = false;

    listarSosAbertos()
      .then((abertos) => {
        if (cancelado) return;
        setAlertas((atual) => {
          const idsConhecidos = new Set(atual.map((alerta) => alerta.id));
          const novos = abertos
            .filter((alerta) => !idsConhecidos.has(alerta.id))
            .map(
              (alerta): AlertaSos => ({
                id: alerta.id,
                persistido: true,
                caixaId: alerta.caixaId,
                operadorId: alerta.operadorId,
                operadorNome: alerta.operadorNome,
                categoria: alerta.categoria,
                saldoEmEspecieCentavos: reaisParaCentavos(alerta.saldoEmEspecie),
                horario: alerta.criadoEm,
              }),
            );
          return [...novos, ...atual];
        });
      })
      .catch(() => {
        // sem histórico disponível — segue só com o tempo real
      });

    const canal = getSupabase()
      .channel("arena-sos")
      .on("broadcast", { event: "sos" }, ({ payload }: { payload: PayloadSos }) => {
        setAlertas((atual) => {
          const id = payload.id ?? `local-${payload.caixaId}-${payload.horario}`;
          if (atual.some((alerta) => alerta.id === id)) return atual;
          return [
            {
              id,
              persistido: payload.id !== null,
              caixaId: payload.caixaId,
              operadorId: payload.operadorId,
              operadorNome: payload.operadorNome,
              categoria: payload.categoria,
              saldoEmEspecieCentavos: Math.round(payload.saldoEmEspecie * 100),
              horario: payload.horario,
            },
            ...atual,
          ];
        });
        tocarSos();
      })
      .subscribe();

    return () => {
      cancelado = true;
      void getSupabase().removeChannel(canal);
    };
  }, [ativo]);

  const dispensar = useCallback((alerta: AlertaSos) => {
    setAlertas((atual) => atual.filter((item) => item.id !== alerta.id));
    if (alerta.persistido) {
      void atenderSos(alerta.id).catch(() => {
        // best-effort: se falhar, o alerta some da UI mesmo assim
      });
    }
  }, []);

  return { alertas, dispensar };
}
