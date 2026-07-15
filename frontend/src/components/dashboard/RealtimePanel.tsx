import DashboardSection from "./DashboardSection";
import Avatar from "../ui/Avatar";
import SeloNumerario from "../ui/SeloNumerario";
import { HorseshoeIcon } from "../icons";
import type { CaixaAbertoResumo } from "../../hooks/useCentroOperacoes";

/** Caixas abertos agora, por nível de alerta — não duplica o banner global de SOS do AdminLayout. */
export default function RealtimePanel({ caixas }: { caixas: CaixaAbertoResumo[] }) {
  return (
    <DashboardSection titulo="Caixas Abertos Agora" icone={HorseshoeIcon}>
      {caixas.length === 0 ? (
        <p className="text-sm text-leather-300">Nenhum caixa aberto no momento.</p>
      ) : (
        <ul className="space-y-3">
          {caixas.map((caixa) => (
            <li key={caixa.caixaId} className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar nome={caixa.operadorNome} fotoUrl={caixa.operadorFotoUrl} />
                <p className="truncate text-sm font-semibold text-leather-200">{caixa.operadorNome}</p>
              </div>
              <SeloNumerario nivel={caixa.nivelAlerta} />
            </li>
          ))}
        </ul>
      )}
    </DashboardSection>
  );
}
