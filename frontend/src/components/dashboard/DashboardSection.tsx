import { type ComponentType, type ReactNode } from "react";

/** Chrome genérico de painel (ícone + título + moldura), reaproveitado pelos 4 painéis do Centro de Operações. */
export default function DashboardSection({
  titulo,
  icone: Icone,
  acao,
  children,
}: {
  titulo: string;
  icone: ComponentType<{ className?: string }>;
  acao?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-leather-600/40 bg-wood-900 p-5 shadow-arena">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg text-gold-300">
          <Icone className="h-5 w-5 text-gold-400" />
          {titulo}
        </h2>
        {acao}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
