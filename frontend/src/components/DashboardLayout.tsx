import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { rotaDoPerfil, useAuth } from "../lib/auth";
import { BrasaoIcon, DistintivoIcon } from "./icons";
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

  return (
    <div className="flex min-h-dvh flex-col bg-arena-950 font-sans text-leather-200">
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
