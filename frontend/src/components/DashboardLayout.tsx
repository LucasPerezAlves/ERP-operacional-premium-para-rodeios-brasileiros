import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { rotaDoPerfil, useAuth } from "../lib/auth";
import { useSosAlertas } from "../hooks/useSosAlertas";
import { rotuloCategoriaSos } from "../lib/sos";
import { formatarCentavos } from "../lib/moeda";
import { BrasaoIcon, DistintivoIcon } from "./icons";
import Alerta from "./ui/Alerta";
import Botao from "./ui/Botao";

/**
 * Casco comum dos painéis: faixa de madeira envelhecida com grão, marca
 * como link para a landing do perfil, e a identidade da tabela de feedback
 * visual — brasão western para o Admin, distintivo de peão para o Operador.
 */
export default function DashboardLayout({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  const { perfil, sair } = useAuth();

  const ehAdmin = perfil?.perfilAcesso === "MASTER_ADMIN";
  const { alertas: alertasSos, dispensar: dispensarSos } = useSosAlertas(ehAdmin);

  return (
    <div className="flex min-h-dvh flex-col bg-arena-950 font-sans text-leather-200">
      {/* Grão de arena em toda página interna (DESIGN-SYSTEM § Materiais):
          overlay fixo, decorativo, atrás de nada e na frente de tudo com
          pointer-events desligado — o filme físico que segura a imersão. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-50">
        <div className="textura-grao" />
      </div>

      {/* Alertas em Tempo Real (Master Admin backlog, item 1): SOS de
          qualquer posto chega aqui, em qualquer tela do painel da gerência. */}
      {alertasSos.length > 0 && (
        <div className="fixed inset-x-0 top-0 z-[60] flex flex-col gap-2 p-4 sm:left-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2">
          {alertasSos.map((alerta) => (
            <Alerta key={alerta.id} tipo="sos" onDispensar={() => dispensarSos(alerta)}>
              <span className="font-bold">{alerta.operadorNome}</span> {rotuloCategoriaSos(alerta.categoria)}
              {" — "}
              <span className="num-tabular">{formatarCentavos(alerta.saldoEmEspecieCentavos)}</span> em espécie
            </Alerta>
          ))}
        </div>
      )}

      <header className="relative border-b border-leather-600/40 bg-arena-900">
        <div className="textura-grao" aria-hidden />
        <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link
            to={perfil ? rotaDoPerfil(perfil.perfilAcesso) : "/"}
            className="flex min-w-0 items-center gap-3 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold-400/30"
          >
            <span className="text-gold-400" aria-hidden>
              {ehAdmin ? <BrasaoIcon className="h-8 w-8" /> : <DistintivoIcon className="h-8 w-8" />}
            </span>
            <span className="min-w-0">
              <span className="block font-display text-lg tracking-wide text-gold-400">
                CONTROLE DA ARENA
              </span>
              <span className="block truncate text-xs text-leather-400">{titulo}</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            {ehAdmin && alertasSos.length > 0 && (
              <span className="num-tabular inline-flex items-center gap-2 rounded-md border border-bordo-500/50 bg-bordo-900 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-bordo-200">
                <span className="h-2 w-2 shrink-0 rounded-full bg-bordo-400 animate-pulse" />
                {alertasSos.length} SOS
              </span>
            )}
            <div className="hidden text-right sm:block">
              <p className="truncate text-sm font-medium text-leather-200">
                {perfil?.nomeCompleto || perfil?.email}
              </p>
              <p className="text-xs font-semibold text-gold-300">
                {ehAdmin ? "Master Admin" : "Operador"}
              </p>
            </div>
            <Botao variante="couro" tamanho="sm" onClick={sair}>
              Sair
            </Botao>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <h1 className="sr-only">{titulo}</h1>
        {children}
      </main>
    </div>
  );
}
