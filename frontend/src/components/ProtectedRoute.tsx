import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { rotaDoPerfil, useAuth, type PerfilAcesso } from "../lib/auth";
import { LassoSpinner } from "./icons";

/** Tela de transição temática enquanto a sessão é restaurada. */
function TelaCarregando() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-wood-950 font-sans">
      <span className="text-gold-400">
        <LassoSpinner className="h-10 w-10" />
      </span>
      <p className="text-sm uppercase tracking-[0.25em] text-leather-300">
        Selando a montaria...
      </p>
    </div>
  );
}

interface ProtectedRouteProps {
  /** Níveis de acesso autorizados a ver esta rota. */
  perfisPermitidos: PerfilAcesso[];
  children: ReactNode;
}

/**
 * Guardião de rotas (RBAC):
 * - sem sessão ou sem aprovação da gerência → volta para o login;
 * - nível de acesso errado (ex.: OPERADOR digitando /admin-dashboard na URL)
 *   → redireciona para o painel do próprio nível, nunca renderiza o conteúdo.
 */
export default function ProtectedRoute({ perfisPermitidos, children }: ProtectedRouteProps) {
  const { perfil, carregando } = useAuth();

  if (carregando) {
    return <TelaCarregando />;
  }

  if (!perfil || perfil.statusAprovacao !== "APROVADO") {
    return <Navigate to="/" replace />;
  }

  if (!perfisPermitidos.includes(perfil.perfilAcesso)) {
    return <Navigate to={rotaDoPerfil(perfil.perfilAcesso)} replace />;
  }

  return <>{children}</>;
}
