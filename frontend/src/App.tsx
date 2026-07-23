import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./components/AdminLayout";
import AuthPage from "./pages/AuthPage";
import LandingPage from "./pages/LandingPage";
import EventoDetalhe from "./pages/EventoDetalhe";
import AdminLandingPage from "./pages/AdminLandingPage";
import AdminAbrirCaixa from "./pages/AdminAbrirCaixa";
import AdminScorecard from "./pages/AdminScorecard";
import HistoricoTurnos from "./pages/HistoricoTurnos";
import EstoqueAdmin from "./pages/EstoqueAdmin";
import EventosAdmin from "./pages/EventosAdmin";
import GerenciamentoEquipe from "./pages/GerenciamentoEquipe";
import OperadorLandingPage from "./pages/OperadorLandingPage";
import OperadorVenda from "./pages/OperadorVenda";

/**
 * Rotas da aplicação (RBAC):
 * - "/"                            → Landing Page pública (institucional + eventos publicados)
 * - "/eventos/:slug"               → Detalhe público de um evento publicado
 * - "/auth"                        → Login/Cadastro
 * - "/admin-dashboard"             → Landing do MASTER_ADMIN (grid de módulos)
 * - "/admin-dashboard/abrir-caixa" → Abertura de caixa (regra inegociável nº 7)
 * - "/admin-dashboard/equipe"      → Gerenciamento de Equipe (status + fechamento)
 * - "/admin-dashboard/scorecard"   → Scorecard de Divergência de Operadores
 * - "/admin-dashboard/historico-turnos" → Histórico de Turnos (jornada operacional)
 * - "/admin-dashboard/estoque"     → Cadastro de Estoque (catálogo de produtos)
 * - "/admin-dashboard/eventos"     → Cadastro de Eventos (entidade central)
 * - "/operador-dashboard"          → Landing do OPERADOR (status + funções)
 * - "/operador-dashboard/venda"    → PDV de venda (só com caixa aberto)
 */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/eventos/:slug" element={<EventoDetalhe />} />
          <Route path="/auth" element={<AuthPage />} />
          {/* Módulo administrativo: um único guardião + AdminLayout (sidebar
              permanente); cada módulo novo é só mais um <Route> filho aqui. */}
          <Route
            element={
              <ProtectedRoute perfisPermitidos={["MASTER_ADMIN"]}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/admin-dashboard" element={<AdminLandingPage />} />
            <Route path="/admin-dashboard/abrir-caixa" element={<AdminAbrirCaixa />} />
            <Route path="/admin-dashboard/equipe" element={<GerenciamentoEquipe />} />
            <Route path="/admin-dashboard/scorecard" element={<AdminScorecard />} />
            <Route path="/admin-dashboard/historico-turnos" element={<HistoricoTurnos />} />
            <Route path="/admin-dashboard/estoque" element={<EstoqueAdmin />} />
            <Route path="/admin-dashboard/eventos" element={<EventosAdmin />} />
          </Route>
          <Route
            path="/operador-dashboard"
            element={
              <ProtectedRoute perfisPermitidos={["OPERADOR", "MASTER_ADMIN"]}>
                <OperadorLandingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operador-dashboard/venda"
            element={
              <ProtectedRoute perfisPermitidos={["OPERADOR", "MASTER_ADMIN"]}>
                <OperadorVenda />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
