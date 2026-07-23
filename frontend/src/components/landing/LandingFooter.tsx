import { Link } from "react-router-dom";

/** Rodapé da Landing: logo pequeno, copyright, link "Entrar". */
export default function LandingFooter() {
  return (
    <footer className="border-t border-leather-700/40 bg-arena-950 px-4 py-8 sm:px-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
        <img src="/images/logo-1.png" alt="Velho Promoções" className="h-7 w-auto object-contain" />
        <p className="text-xs text-leather-400">
          © {new Date().getFullYear()} Velho Promoções. Todos os direitos reservados.
        </p>
        <Link to="/auth" className="text-xs font-semibold text-gold-300 hover:text-gold-200">
          Entrar
        </Link>
      </div>
    </footer>
  );
}
