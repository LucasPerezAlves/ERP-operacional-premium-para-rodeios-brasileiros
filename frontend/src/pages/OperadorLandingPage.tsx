import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { useCaixa } from "../hooks/useCaixa";
import { formatarCentavos } from "../lib/moeda";
import {
  HorseshoeIcon,
  LassoSpinner,
  PlacaIcon,
  SetaDireitaIcon,
} from "../components/icons";

/**
 * Landing do Operador (regra inegociável nº 7): o herói da tela é o STATUS
 * do caixa — ferradura acesa (aberto) ou apagada (aguardando a gerência).
 * "Vender" é o card dominante e só habilita com caixa aberto; não existe
 * botão de abrir/fechar em lugar nenhum desta página.
 */
export default function OperadorLandingPage() {
  const { caixa, carregandoStatus } = useCaixa();

  if (carregandoStatus) {
    return (
      <DashboardLayout titulo="Meu Posto">
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <span className="text-gold-400">
            <LassoSpinner className="h-10 w-10" />
          </span>
          <p className="text-sm font-semibold text-leather-300">Consultando seu caixa...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout titulo="Meu Posto">
      {/* Herói de status: a ferradura conta a história */}
      <div className="relative overflow-hidden rounded-xl border border-leather-600/40 bg-wood-900 p-8 shadow-arena">
        <div className="textura-grao" aria-hidden />
        <div className="relative flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            {caixa ? (
              <HorseshoeIcon className="h-20 w-20 animate-ferradura-acende text-gold-400" />
            ) : (
              <HorseshoeIcon className="h-20 w-20 text-steel-300" />
            )}
            <div>
              <h2 className="font-display text-2xl text-gold-300 md:text-3xl">
                {caixa ? "Caixa aberto" : "Aguardando gerência abrir caixa"}
              </h2>
              <p className="mt-1 max-w-md text-[15px] text-leather-300">
                {caixa
                  ? `Fundo de troco de ${formatarCentavos(caixa.saldoInicialCentavos)} recebido. Boa arena!`
                  : "Assim que o Admin abrir o seu turno, a venda libera automaticamente — não precisa recarregar a página."}
              </p>
            </div>
          </div>

          {caixa && (
            <div className="rounded-lg bg-arena-800 px-6 py-4 text-center">
              <p className="text-xs text-leather-400">Em espécie agora</p>
              <p className="num-tabular text-3xl font-bold text-gold-200">
                {formatarCentavos(caixa.saldoEmEspecieCentavos)}
              </p>
            </div>
          )}
        </div>
      </div>

      <h2 className="mt-10 text-lg font-semibold text-leather-200">Minhas funções</h2>

      <div className="mt-4 grid gap-5 lg:grid-cols-3">
        {caixa ? (
          <Link
            to="/operador-dashboard/venda"
            className="costura group flex flex-col justify-between gap-6 rounded-xl border border-gold-500/50 bg-wood-800 p-7 shadow-arena transition-colors duration-200 ease-couro hover:border-gold-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold-400/30 lg:col-span-2"
          >
            <div>
              <h3 className="font-display text-2xl text-gold-300">Vender</h3>
              <p className="mt-2 max-w-md text-[15px] leading-relaxed text-leather-300">
                Lançamento rápido, calculadora de troco e todas as formas de
                pagamento no seu caixa.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-gold-400">
              Abrir o balcão
              <SetaDireitaIcon className="h-4 w-4 transition-transform duration-200 ease-couro group-hover:translate-x-1" />
            </span>
          </Link>
        ) : (
          <div
            className="flex cursor-not-allowed flex-col justify-between gap-6 rounded-xl border border-leather-600/30 bg-wood-900/60 p-7 opacity-70 lg:col-span-2"
            aria-disabled="true"
          >
            <div>
              <h3 className="font-display text-2xl text-leather-400">Vender</h3>
              <p className="mt-2 max-w-md text-[15px] leading-relaxed text-steel-400">
                Lançamento rápido, calculadora de troco e todas as formas de
                pagamento no seu caixa.
              </p>
            </div>
            <span className="text-sm font-semibold text-steel-500">
              Aguardando abertura do caixa
            </span>
          </div>
        )}

        <section className="rounded-xl border border-leather-600/30 bg-wood-900/60 p-7">
          <h3 className="flex items-center gap-2 text-base font-semibold text-leather-200">
            <PlacaIcon className="h-5 w-5 text-steel-400" />
            No curral
          </h3>
          <ul className="mt-4 divide-y divide-leather-600/20 border-t border-leather-600/20">
            <li className="py-3 text-sm text-steel-400">Registrar ponto de entrada e saída</li>
            <li className="py-3 text-sm text-steel-400">Acesso rápido por PIN de 4 dígitos</li>
          </ul>
        </section>
      </div>
    </DashboardLayout>
  );
}
