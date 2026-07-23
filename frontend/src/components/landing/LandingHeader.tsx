import { Link } from "react-router-dom";

/** Nav da Landing: logo oficial + CTA "Entrar". Fixa no topo, fundo sólido. */
export default function LandingHeader() {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 bg-arena-950/95 px-4 py-3 backdrop-blur-sm sm:px-8">
      <img src="/images/logo-1.png" alt="Velho Promoções" className="h-9 w-auto object-contain sm:h-10" />
      <Link
        to="/auth"
        className="ml-auto rounded-lg border border-gold-400/60 px-4 py-2 text-sm font-semibold text-gold-300 transition-colors duration-200 hover:border-gold-300 hover:text-gold-200"
      >
        Entrar
      </Link>
    </header>
  );
}
