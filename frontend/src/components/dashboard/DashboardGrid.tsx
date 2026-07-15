import { type ReactNode } from "react";

/** Arranjo responsivo do corpo do Centro de Operações: feed mais largo à esquerda, painéis empilhados à direita. */
export default function DashboardGrid({
  feed,
  paineis,
}: {
  feed: ReactNode;
  paineis: ReactNode;
}) {
  return (
    <div className="mt-6 grid gap-5 lg:grid-cols-3">
      <div className="lg:col-span-2">{feed}</div>
      <div className="flex flex-col gap-5">{paineis}</div>
    </div>
  );
}
