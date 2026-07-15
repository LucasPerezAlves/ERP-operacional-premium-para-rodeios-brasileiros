import { type ComponentType } from "react";

export interface KpiItem {
  rotulo: string;
  valor: string;
  icone: ComponentType<{ className?: string }>;
}

/** Linha de 4 indicadores derivados — nunca persistidos, sempre calculados na hora. */
export default function DashboardKPIRow({ itens }: { itens: KpiItem[] }) {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {itens.map((item) => {
        const Icone = item.icone;
        return (
          <div
            key={item.rotulo}
            className="flex items-center gap-4 rounded-xl border border-leather-600/40 bg-wood-900 p-5 shadow-arena"
          >
            <Icone className="h-8 w-8 shrink-0 text-gold-400" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-steel-400">
                {item.rotulo}
              </p>
              <p className="num-tabular truncate text-xl font-bold text-leather-200">
                {item.valor}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
