import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import {
  DistintivoIcon,
  HorseshoeIcon,
  LivroCaixaIcon,
  PlacaIcon,
  SetaDireitaIcon,
} from "../components/icons";

/** Módulos ainda não construídos — lista discreta, nunca cards falsos. */
const NO_CURRAL = [
  "Fechamento global do evento",
  "Alertas de sangria em tempo real",
  "Relatórios financeiros e scorecard de operadores",
  "Cortesias (passe livre) com motivo e autorizador",
  "Custo de equipe em tempo real",
] as const;

/**
 * Landing do MASTER_ADMIN com hierarquia dominante (DESIGN-SYSTEM.md §
 * Dashboards): a ação mais frequente (Abrir Caixa) é o card de destaque
 * costurado; Gerenciar Equipe é secundário; o futuro fica "no curral".
 */
export default function AdminLandingPage() {
  return (
    <DashboardLayout titulo="Painel da Gerência">
      <h2 className="font-display text-2xl text-gold-300 md:text-3xl">
        Visão geral da arena
      </h2>
      <p className="mt-1 text-[15px] text-leather-300">
        Somente o Master Admin enxerga os valores reais consolidados.
      </p>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {/* Ação dominante: couro costurado com borda dourada */}
        <Link
          to="/admin-dashboard/abrir-caixa"
          className="costura group relative flex flex-col justify-between gap-6 rounded-xl border border-gold-500/50 bg-wood-800 p-7 shadow-arena transition-colors duration-200 ease-couro hover:border-gold-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold-400/30 lg:col-span-2"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-display text-2xl text-gold-300">Abrir Caixa</h3>
              <p className="mt-2 max-w-md text-[15px] leading-relaxed text-leather-300">
                Escolha o operador pela foto e área de trabalho, defina o fundo
                de troco e libere o turno na arena.
              </p>
            </div>
            <HorseshoeIcon className="h-14 w-14 shrink-0 text-gold-400/70 transition-colors duration-200 group-hover:text-gold-400" />
          </div>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-gold-400">
            Escolher operador
            <SetaDireitaIcon className="h-4 w-4 transition-transform duration-200 ease-couro group-hover:translate-x-1" />
          </span>
        </Link>

        {/* Ação secundária */}
        <Link
          to="/admin-dashboard/equipe"
          className="group flex flex-col justify-between gap-6 rounded-xl border border-leather-600/40 bg-wood-900 p-7 shadow-arena transition-colors duration-200 ease-couro hover:border-gold-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold-400/30"
        >
          <div>
            <DistintivoIcon className="h-9 w-9 text-leather-300 transition-colors duration-200 group-hover:text-gold-400" />
            <h3 className="mt-4 font-display text-xl text-gold-300">Gerenciar Equipe</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-leather-300">
              Status de todos os caixas, busca por nome, filtro por área e
              fechamento com conferência.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-gold-400">
            Ver a equipe
            <SetaDireitaIcon className="h-4 w-4 transition-transform duration-200 ease-couro group-hover:translate-x-1" />
          </span>
        </Link>
      </div>

      {/* Futuro do roadmap: lista discreta, sem cards fantasma */}
      <section className="mt-10">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-leather-200">
          <LivroCaixaIcon className="h-5 w-5 text-steel-400" />
          No curral
        </h3>
        <p className="mt-1 text-xs text-steel-400">
          Módulos do roadmap que ainda não entraram na arena.
        </p>
        <ul className="mt-4 divide-y divide-leather-600/20 border-t border-leather-600/20">
          {NO_CURRAL.map((item) => (
            <li key={item} className="flex items-center gap-3 py-3 text-sm text-steel-400">
              <PlacaIcon className="h-4 w-4 shrink-0 text-steel-500" />
              {item}
            </li>
          ))}
        </ul>
      </section>
    </DashboardLayout>
  );
}
