import { type ReactNode } from "react";
import { useAuth } from "../lib/auth";

/**
 * Casco comum dos painéis: cabeçalho com marca, identificação do usuário,
 * selo do nível de acesso e botão Sair. O conteúdo vem dos dashboards.
 */
export default function DashboardLayout({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  const { perfil, sair } = useAuth();

  const seloAcesso =
    perfil?.perfilAcesso === "MASTER_ADMIN" ? "Master Admin" : "Operador";

  return (
    <div className="min-h-screen bg-wood-950 font-sans text-amber-50">
      <header className="border-b border-leather-600/40 bg-wood-900/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="min-w-0">
            <p className="font-display text-lg tracking-wide text-gold-400">
              CONTROLE DA ARENA
            </p>
            <p className="text-xs uppercase tracking-[0.25em] text-leather-300">
              {titulo}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="truncate text-sm font-medium text-leather-200">
                {perfil?.nomeCompleto || perfil?.email}
              </p>
              <p className="text-xs font-semibold uppercase tracking-wider text-gold-300">
                {seloAcesso}
              </p>
            </div>
            <button
              type="button"
              onClick={sair}
              className="rounded-lg border border-leather-600/60 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-leather-200 transition-colors duration-200 hover:border-rust-400 hover:text-rust-300"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}

/** Cartão de módulo ainda não implementado (fundação dos painéis). */
export function ModuloCard({
  titulo,
  descricao,
}: {
  titulo: string;
  descricao: string;
}) {
  return (
    <div className="rounded-2xl border border-leather-600/40 bg-wood-800/80 p-6 shadow-arena">
      <h3 className="font-display text-lg text-gold-300">{titulo}</h3>
      <p className="mt-2 text-sm leading-relaxed text-leather-300">{descricao}</p>
      <span className="mt-4 inline-block rounded-full border border-gold-500/40 px-3 py-1 text-xs uppercase tracking-wider text-gold-300/80">
        Em breve
      </span>
    </div>
  );
}
