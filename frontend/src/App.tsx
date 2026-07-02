import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import ProtectedRoute from "./components/ProtectedRoute";
import AuthPage from "./pages/AuthPage";
import AdminDashboard from "./pages/AdminDashboard";
import OperadorDashboard from "./pages/OperadorDashboard";

/**
 * Rotas da aplicação (RBAC):
 * - "/"                   → Login/Cadastro (sem landing page)
 * - "/admin-dashboard"    → exclusivo MASTER_ADMIN
 * - "/operador-dashboard" → OPERADOR (o Master Admin também pode inspecionar)
 */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AuthPage />} />
          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute perfisPermitidos={["MASTER_ADMIN"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operador-dashboard"
            element={
              <ProtectedRoute perfisPermitidos={["OPERADOR", "MASTER_ADMIN"]}>
                <OperadorDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
