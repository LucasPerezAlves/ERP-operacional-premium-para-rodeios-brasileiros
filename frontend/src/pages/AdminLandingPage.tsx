import DashboardHeader from "../components/dashboard/DashboardHeader";
import DashboardKPIRow, { type KpiItem } from "../components/dashboard/DashboardKPIRow";
import DashboardGrid from "../components/dashboard/DashboardGrid";
import RealtimePanel from "../components/dashboard/RealtimePanel";
import OperationalPanel from "../components/dashboard/OperationalPanel";
import FinancialPanel from "../components/dashboard/FinancialPanel";
import ActivityFeed from "../components/dashboard/ActivityFeed";
import Alerta from "../components/ui/Alerta";
import { Carregando } from "../components/ui/interacoes";
import { useCentroOperacoes } from "../hooks/useCentroOperacoes";
import { formatarCentavos } from "../lib/moeda";
import { CifraoIcon, HorseshoeIcon, LampadaIcon, RelogioIcon } from "../components/icons";

/**
 * Centro de Operações do Evento (Admin): visão operacional consolidada,
 * só com dados reais já existentes — sem gráfico, sem card de navegação
 * (toda navegação estrutural é da Sidebar).
 */
export default function AdminLandingPage() {
  const { dados, carregando, erro, limparErro } = useCentroOperacoes();

  const kpis: KpiItem[] = dados
    ? [
        { rotulo: "Caixas Abertos", valor: String(dados.caixasAbertosCount), icone: HorseshoeIcon },
        { rotulo: "Espécie em Caixa Agora", valor: formatarCentavos(dados.especieAgoraCentavos), icone: CifraoIcon },
        { rotulo: "Operadores em Alerta", valor: String(dados.operadoresEmAlertaCount), icone: LampadaIcon },
        { rotulo: "Valor Devido Hoje", valor: formatarCentavos(dados.valorDevidoHojeCentavos), icone: RelogioIcon },
      ]
    : [];

  return (
    <>
      <DashboardHeader
        subtitulo={
          dados
            ? `${dados.caixasAbertosCount} caixa(s) aberto(s) · ${formatarCentavos(dados.especieAgoraCentavos)} em espécie agora`
            : "Visão operacional consolidada do evento."
        }
      />

      {erro && (
        <Alerta tipo="erro" className="mt-4" onDispensar={limparErro}>
          {erro}
        </Alerta>
      )}

      {carregando ? (
        <Carregando rotulo="Carregando o Centro de Operações..." />
      ) : (
        dados && (
          <>
            <DashboardKPIRow itens={kpis} />
            <DashboardGrid
              feed={<ActivityFeed eventos={dados.eventos} />}
              paineis={
                <>
                  <RealtimePanel caixas={dados.caixasAbertos} />
                  <FinancialPanel
                    divergenciaHojeCentavos={dados.divergenciaHojeCentavos}
                    valorDevidoHojeCentavos={dados.valorDevidoHojeCentavos}
                  />
                  <OperationalPanel
                    totalOperadoresAtivos={dados.totalOperadoresAtivos}
                    operadoresEmAlerta={dados.operadoresEmAlertaCount}
                  />
                </>
              }
            />
          </>
        )
      )}
    </>
  );
}
