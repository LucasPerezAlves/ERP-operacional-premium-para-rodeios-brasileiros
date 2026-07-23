import LandingHeader from "../components/landing/LandingHeader";
import LandingHero from "../components/landing/LandingHero";
import EventosPublicosGrid from "../components/landing/EventosPublicosGrid";
import SecaoInstitucional from "../components/landing/SecaoInstitucional";
import LandingFooter from "../components/landing/LandingFooter";
import { useEventosPublicos } from "../hooks/useEventosPublicos";
import { Carregando } from "../components/ui/interacoes";
import Alerta from "../components/ui/Alerta";

/**
 * Landing Page pública (Módulo 4). Sem lógica própria de eventos — consome
 * só os publicados pelo Admin. Identidade visual própria da Velho
 * Promoções, distinta do tema Rodeio Premium operacional.
 */
export default function LandingPage() {
  const { eventos, carregando, erro } = useEventosPublicos();

  return (
    <div className="min-h-dvh bg-arena-950">
      <h1 className="sr-only">Velho Promoções — Rodeios e eventos</h1>
      <LandingHeader />
      <LandingHero />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-8">
        <h2 className="font-display text-2xl text-gold-300 sm:text-3xl">Próximos Eventos</h2>
        {erro && (
          <Alerta tipo="erro" className="mt-4">
            {erro}
          </Alerta>
        )}
        {carregando ? (
          <Carregando rotulo="Carregando eventos..." />
        ) : !erro ? (
          <div className="mt-6">
            <EventosPublicosGrid eventos={eventos} />
          </div>
        ) : null}
      </main>
      <SecaoInstitucional />
      <LandingFooter />
    </div>
  );
}
