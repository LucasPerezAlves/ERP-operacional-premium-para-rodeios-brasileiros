import DashboardSection from "./DashboardSection";
import { DistintivoIcon } from "../icons";

/** Equipe ativa e contagem em alerta — resumo, não substitui Gerenciar Equipe. */
export default function OperationalPanel({
  totalOperadoresAtivos,
  operadoresEmAlerta,
}: {
  totalOperadoresAtivos: number;
  operadoresEmAlerta: number;
}) {
  return (
    <DashboardSection titulo="Equipe" icone={DistintivoIcon}>
      <dl className="grid grid-cols-2 gap-3 rounded-lg bg-arena-800 px-4 py-3">
        <div>
          <dt className="text-xs text-steel-400">Equipe ativa</dt>
          <dd className="num-tabular text-lg font-semibold text-leather-200">{totalOperadoresAtivos}</dd>
        </div>
        <div className="text-right">
          <dt className="text-xs text-steel-400">Em alerta</dt>
          <dd className="num-tabular text-lg font-semibold text-gold-300">{operadoresEmAlerta}</dd>
        </div>
      </dl>
    </DashboardSection>
  );
}
