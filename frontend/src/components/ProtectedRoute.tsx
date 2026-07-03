import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { rotaDoPerfil, useAuth, type PerfilAcesso } from "../lib/auth";
import { Carregando } from "./ui/interacoes";

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
    return <Carregando telaCheia rotulo="Selando a montaria..." />;
  }

  if (!perfil || perfil.statusAprovacao !== "APROVADO") {
    return <Navigate to="/" replace />;
  }

  if (!perfisPermitidos.includes(perfil.perfilAcesso)) {
    return <Navigate to={rotaDoPerfil(perfil.perfilAcesso)} replace />;
  }

  return <>{children}</>;
}
