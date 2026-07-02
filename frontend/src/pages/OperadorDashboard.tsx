import DashboardLayout, { ModuloCard } from "../components/DashboardLayout";

/**
 * Painel do OPERADOR: somente as telas de lançamento da própria função.
 * Nunca exibe totais de outros caixas nem valores consolidados do evento.
 */
export default function OperadorDashboard() {
  return (
    <DashboardLayout titulo="Painel do Operador">
      <h2 className="font-display text-2xl text-gold-300">Meu Posto</h2>
      <p className="mt-1 text-sm text-leather-300">
        Aqui aparecem apenas os lançamentos da sua função — os totais do evento
        são visíveis somente para a gerência.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <ModuloCard
          titulo="Lançar Venda"
          descricao="Registro rápido de venda em dinheiro, débito ou crédito no seu caixa."
        />
        <ModuloCard
          titulo="Meu Caixa"
          descricao="Saldo em espécie do seu turno e aviso quando o limite de sangria se aproximar."
        />
        <ModuloCard
          titulo="Registrar Ponto"
          descricao="Bater ponto de entrada e saída do turno no evento."
        />
      </div>
    </DashboardLayout>
  );
}
