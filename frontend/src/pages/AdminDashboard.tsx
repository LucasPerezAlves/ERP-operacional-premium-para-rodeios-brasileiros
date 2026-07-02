import DashboardLayout, { ModuloCard } from "../components/DashboardLayout";

/**
 * Painel do MASTER_ADMIN (exclusivo do proprietário):
 * valores financeiros reais, fechamento global e relatórios.
 * Os módulos abaixo são a fundação — implementados nas próximas etapas.
 */
export default function AdminDashboard() {
  return (
    <DashboardLayout titulo="Painel da Gerência">
      <h2 className="font-display text-2xl text-gold-300">Visão Geral da Arena</h2>
      <p className="mt-1 text-sm text-leather-300">
        Somente o Master Admin enxerga os valores reais consolidados.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <ModuloCard
          titulo="Fechamento Global"
          descricao="Consolidado de dinheiro, débito e crédito de todos os caixas do evento, em tempo real."
        />
        <ModuloCard
          titulo="Caixas em Operação"
          descricao="Situação de cada operador: saldo em espécie, limite de sangria e alertas ativos."
        />
        <ModuloCard
          titulo="Alertas de Sangria"
          descricao="Operadores que atingiram o limite de espécie e aguardam recolhimento do supervisor."
        />
        <ModuloCard
          titulo="Relatórios Financeiros"
          descricao="Sobra e falta por caixa, conciliação dinheiro vs. estoque e histórico por evento."
        />
        <ModuloCard
          titulo="Cortesias (Passe Livre)"
          descricao="Rastreio obrigatório de motivo e autorizador; ranking de emissões da noite."
        />
        <ModuloCard
          titulo="Gestão de Funcionários"
          descricao="Aprovação de cadastros, cargos, limites de sangria e desativação de operadores."
        />
      </div>
    </DashboardLayout>
  );
}
