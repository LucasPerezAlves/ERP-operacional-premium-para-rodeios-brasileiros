import { Link } from "react-router-dom";
import DashboardSection from "./DashboardSection";
import { HorseshoeIcon, LampiaoIcon, LivroCaixaIcon, MaloteIcon } from "../icons";
import { formatarCentavos } from "../../lib/moeda";
import { rotuloCategoriaSos } from "../../lib/sos";
import type { EventoAtividade } from "../../hooks/useCentroOperacoes";

function formatarHorario(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function IconePorTipo({ tipo }: { tipo: EventoAtividade["tipo"] }) {
  const className = "h-5 w-5 shrink-0 text-gold-400";
  switch (tipo) {
    case "ABERTURA":
    case "FECHAMENTO":
      return <HorseshoeIcon className={className} />;
    case "SANGRIA":
      return <MaloteIcon className={className} />;
    case "SOS":
      return <LampiaoIcon className={`${className} text-bordo-400`} />;
    default:
      return null;
  }
}

function descricaoEvento(evento: EventoAtividade): string {
  switch (evento.tipo) {
    case "ABERTURA":
      return `Caixa aberto — ${evento.operadorNome}`;
    case "FECHAMENTO": {
      if (evento.divergenciaCentavos === null) return `Caixa fechado — ${evento.operadorNome}`;
      if (evento.divergenciaCentavos === 0) return `Caixa fechado (conferido) — ${evento.operadorNome}`;
      const sinal = evento.divergenciaCentavos > 0 ? "sobra" : "falta";
      return `Caixa fechado — ${sinal} de ${formatarCentavos(Math.abs(evento.divergenciaCentavos))} — ${evento.operadorNome}`;
    }
    case "SANGRIA":
      return `Sangria de ${formatarCentavos(evento.valorCentavos ?? 0)} — ${evento.operadorNome}`;
    case "SOS":
      return `SOS ${evento.categoriaSos ? rotuloCategoriaSos(evento.categoriaSos) : ""} — ${evento.operadorNome}`;
    default:
      return evento.operadorNome;
  }
}

/** Timeline mesclada de 4 tipos de evento reais, mais recente primeiro, com stagger "galope" na entrada. */
export default function ActivityFeed({ eventos }: { eventos: EventoAtividade[] }) {
  return (
    <DashboardSection titulo="Atividade Recente" icone={LivroCaixaIcon}>
      {eventos.length === 0 ? (
        <p className="text-sm text-leather-300">Nenhum evento registrado ainda.</p>
      ) : (
        <ul className="space-y-3">
          {eventos.map((evento, indice) => (
            <li
              key={evento.id}
              className="flex items-center gap-3 animate-fade-in-up"
              style={{ animationDelay: `${Math.min(indice, 10) * 60}ms` }}
            >
              <IconePorTipo tipo={evento.tipo} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-leather-200">{descricaoEvento(evento)}</p>
              </div>
              <span className="num-tabular shrink-0 text-xs text-steel-400">
                {formatarHorario(evento.horario)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <Link
        to="/admin-dashboard/historico-turnos"
        className="mt-4 inline-block text-xs font-semibold text-gold-400 hover:text-gold-300"
      >
        Ver Histórico completo →
      </Link>
    </DashboardSection>
  );
}
