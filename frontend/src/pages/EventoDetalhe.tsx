import { Link, useParams } from "react-router-dom";
import { useEventoPublico } from "../hooks/useEventosPublicos";
import { Carregando } from "../components/ui/interacoes";
import Alerta from "../components/ui/Alerta";
import LandingHeader from "../components/landing/LandingHeader";
import LandingFooter from "../components/landing/LandingFooter";

function formatarData(data: string): string {
  return new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/**
 * Detalhe público do evento (split imagem/conteúdo). 404/não-publicado
 * nunca vaza detalhe técnico — só uma mensagem amigável.
 */
export default function EventoDetalhe() {
  const { slug } = useParams<{ slug: string }>();
  const { evento, carregando, naoEncontrado, erro } = useEventoPublico(slug);

  return (
    <div className="min-h-dvh bg-arena-950">
      <LandingHeader />

      {carregando && <Carregando rotulo="Carregando evento..." />}

      {!carregando && naoEncontrado && (
        <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-8">
          <h1 className="font-display text-2xl text-gold-300">
            Evento não encontrado ou não está mais disponível.
          </h1>
          <Link to="/" className="mt-6 inline-block text-sm font-semibold text-gold-300 hover:text-gold-200">
            ← Voltar para a página inicial
          </Link>
        </div>
      )}

      {!carregando && !naoEncontrado && erro && (
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-8">
          <Alerta tipo="erro">{erro}</Alerta>
          <Link to="/" className="mt-6 inline-block text-sm font-semibold text-gold-300 hover:text-gold-200">
            ← Voltar para a página inicial
          </Link>
        </div>
      )}

      {!carregando && evento && (
        <main className="mx-auto max-w-5xl px-4 py-12 sm:px-8">
          <div className="grid gap-8 md:grid-cols-2">
            <div className="aspect-video overflow-hidden rounded-xl bg-arena-900 md:aspect-auto">
              {(evento.imagemDestaqueUrl || evento.bannerUrl) && (
                <img
                  src={evento.imagemDestaqueUrl ?? evento.bannerUrl ?? undefined}
                  alt={evento.nome}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div>
              <h1 className="font-display text-3xl text-gold-300">{evento.nome}</h1>
              <p className="mt-2 text-sm text-leather-300">
                {formatarData(evento.dataInicio)}
                {evento.dataFim !== evento.dataInicio ? ` – ${formatarData(evento.dataFim)}` : ""}
                {evento.horarioAbertura ? ` · ${evento.horarioAbertura.slice(0, 5)}` : ""}
              </p>
              {(evento.local || evento.cidade) && (
                <p className="mt-1 text-sm text-leather-300">
                  {[evento.local, evento.cidade && evento.estado ? `${evento.cidade}/${evento.estado}` : evento.cidade]
                    .filter(Boolean)
                    .join(" — ")}
                </p>
              )}
              {evento.endereco && <p className="mt-1 text-sm text-leather-400">{evento.endereco}</p>}
              {evento.organizador && (
                <p className="mt-4 text-xs uppercase tracking-wide text-steel-400">
                  Organização: {evento.organizador}
                </p>
              )}
              {evento.descricaoCompleta && (
                <p className="mt-6 whitespace-pre-line text-[15px] leading-relaxed text-leather-200">
                  {evento.descricaoCompleta}
                </p>
              )}
            </div>
          </div>
        </main>
      )}

      <LandingFooter />
    </div>
  );
}
