/** Cabeçalho do Centro de Operações — sem cards, sem navegação, só título e um resumo real. */
export default function DashboardHeader({ subtitulo }: { subtitulo: string }) {
  return (
    <div>
      <h1 className="font-display text-2xl text-gold-300 md:text-3xl">
        Centro de Operações do Evento
      </h1>
      <p className="mt-1 text-[15px] text-leather-300">{subtitulo}</p>
    </div>
  );
}
