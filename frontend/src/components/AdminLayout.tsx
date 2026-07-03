import { Outlet } from "react-router-dom";
import { SidebarProvider, useSidebar } from "../hooks/useSidebar";
import { useSosAlertas } from "../hooks/useSosAlertas";
import { rotuloCategoriaSos } from "../lib/sos";
import { formatarCentavos } from "../lib/moeda";
import Sidebar from "./navigation/Sidebar";
import Alerta from "./ui/Alerta";

/**
 * Casco do módulo administrativo (layout route): a Porteira da Arena assume
 * marca, navegação, identidade e saída — não há mais header. Os alertas SOS
 * em tempo real (Master Admin backlog, item 1) continuam chegando aqui, em
 * qualquer tela da gerência, exatamente como no layout antigo.
 */
export default function AdminLayout() {
  return (
    <SidebarProvider>
      <CascoAdmin />
    </SidebarProvider>
  );
}

function CascoAdmin() {
  const { alertas: alertasSos, dispensar: dispensarSos } = useSosAlertas(true);
  const { recolhida, abrirDrawer } = useSidebar();

  return (
    <div className="min-h-dvh bg-arena-950 font-sans text-leather-200">
      {/* Grão de arena em toda página interna (DESIGN-SYSTEM § Materiais) */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-50">
        <div className="textura-grao" />
      </div>

      {alertasSos.length > 0 && (
        <div className="fixed inset-x-0 top-0 z-[60] flex flex-col gap-2 p-4 sm:left-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2">
          {alertasSos.map((alerta) => (
            <Alerta key={alerta.id} tipo="sos" onDispensar={() => dispensarSos(alerta)}>
              <span className="font-bold">{alerta.operadorNome}</span>{" "}
              {rotuloCategoriaSos(alerta.categoria)}
              {" — "}
              <span className="num-tabular">
                {formatarCentavos(alerta.saldoEmEspecieCentavos)}
              </span>{" "}
              em espécie
            </Alerta>
          ))}
        </div>
      )}

      <Sidebar />

      {/* ☰ do mobile: composto por barras (regra: zero ícones novos) */}
      <button
        type="button"
        onClick={abrirDrawer}
        aria-label="Abrir navegação"
        className="btn-skeuo fixed left-4 top-4 z-40 flex h-12 w-12 touch-manipulation flex-col items-center justify-center gap-1.5 rounded-lg border border-leather-600/50 bg-wood-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold-400/30 sm:hidden"
      >
        <span aria-hidden className="h-0.5 w-5 rounded-full bg-leather-200" />
        <span aria-hidden className="h-0.5 w-5 rounded-full bg-leather-200" />
        <span aria-hidden className="h-0.5 w-5 rounded-full bg-leather-200" />
      </button>

      <main
        className={`min-h-dvh px-4 pb-8 pt-20 transition-[padding-left] duration-300 ease-couro sm:pr-8 sm:pt-8 ${
          recolhida ? "sm:pl-[104px]" : "sm:pl-[312px]"
        }`}
      >
        <div className="mx-auto w-full max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
