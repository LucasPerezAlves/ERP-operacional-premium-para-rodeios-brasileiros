import { Link } from "react-router-dom";
import DashboardSection from "./DashboardSection";
import { CifraoIcon } from "../icons";
import { formatarCentavos } from "../../lib/moeda";

/** Divergência e valor devido do dia — link contextual para o Scorecard completo (permitido: não é navegação estrutural). */
export default function FinancialPanel({
  divergenciaHojeCentavos,
  valorDevidoHojeCentavos,
}: {
  divergenciaHojeCentavos: number;
  valorDevidoHojeCentavos: number;
}) {
  const corDivergencia =
    divergenciaHojeCentavos === 0
      ? "text-gold-300"
      : divergenciaHojeCentavos > 0
        ? "text-campo-300"
        : "text-rust-300";

  return (
    <DashboardSection
      titulo="Financeiro do Dia"
      icone={CifraoIcon}
      acao={
        <Link
          to="/admin-dashboard/scorecard"
          className="text-xs font-semibold text-gold-400 hover:text-gold-300"
        >
          Ver Scorecard →
        </Link>
      }
    >
      <dl className="grid grid-cols-2 gap-3 rounded-lg bg-arena-800 px-4 py-3">
        <div>
          <dt className="text-xs text-steel-400">Divergência hoje</dt>
          <dd className={`num-tabular text-lg font-semibold ${corDivergencia}`}>
            {divergenciaHojeCentavos === 0
              ? "Conferido"
              : `${divergenciaHojeCentavos > 0 ? "+" : "−"}${formatarCentavos(Math.abs(divergenciaHojeCentavos))}`}
          </dd>
        </div>
        <div className="text-right">
          <dt className="text-xs text-steel-400">Valor devido hoje</dt>
          <dd className="num-tabular text-lg font-semibold text-leather-200">
            {formatarCentavos(valorDevidoHojeCentavos)}
          </dd>
        </div>
      </dl>
    </DashboardSection>
  );
}
