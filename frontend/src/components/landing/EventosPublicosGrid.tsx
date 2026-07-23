import { Link } from "react-router-dom";
import type { EventoPublico } from "../../hooks/useEventosPublicos";
import { PlacaIcon } from "../icons";

function formatarPeriodo(dataInicio: string, dataFim: string): string {
  const inicio = new Date(`${dataInicio}T00:00:00`);
  const fim = new Date(`${dataFim}T00:00:00`);
  const opcoes: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };
  const textoInicio = inicio.toLocaleDateString("pt-BR", opcoes);
  const textoFim = fim.toLocaleDateString("pt-BR", opcoes);
  return dataInicio === dataFim ? textoInicio : `${textoInicio} – ${textoFim}`;
}

/** Grade de cards uniformes dos eventos publicados. */
export default function EventosPublicosGrid({ eventos }: { eventos: EventoPublico[] }) {
  if (eventos.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-leather-600/40 bg-wood-900 p-8 text-leather-300">
        <PlacaIcon className="h-5 w-5 shrink-0 text-steel-400" />
        Nenhum evento no momento — volte em breve.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {eventos.map((evento) => (
        <Link
          key={evento.slug}
          to={`/eventos/${evento.slug}`}
          className="group overflow-hidden rounded-xl border border-leather-600/40 bg-wood-900 shadow-arena transition-colors duration-200 hover:border-gold-400"
        >
          <div className="aspect-video w-full overflow-hidden bg-arena-900">
            {(evento.imagemDestaqueUrl || evento.bannerUrl) && (
              <img
                src={evento.imagemDestaqueUrl || evento.bannerUrl || undefined}
                alt={evento.nome}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            )}
          </div>
          <div className="p-4">
            <h3 className="font-display text-lg text-gold-300">{evento.nome}</h3>
            <p className="mt-1 text-sm text-leather-300">
              {formatarPeriodo(evento.dataInicio, evento.dataFim)}
              {evento.local ? ` · ${evento.local}` : ""}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
