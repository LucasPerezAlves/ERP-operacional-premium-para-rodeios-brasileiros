import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

const CHAVE_STORAGE = "controle-arena:sidebar";

type PreferenciaSidebar = "expandida" | "recolhida";

function lerPreferencia(): PreferenciaSidebar | null {
  try {
    const valor = window.localStorage.getItem(CHAVE_STORAGE);
    return valor === "expandida" || valor === "recolhida" ? valor : null;
  } catch {
    return null; // ambiente sem storage — preferência vive só na sessão
  }
}

function gravarPreferencia(valor: PreferenciaSidebar) {
  try {
    window.localStorage.setItem(CHAVE_STORAGE, valor);
  } catch {
    // best-effort: sem storage, o estado atual continua valendo na sessão
  }
}

/** Sem preferência salva: expandida no desktop (≥1024px), recolhida no tablet. */
function estadoInicialRecolhida(): boolean {
  const salvo = lerPreferencia();
  if (salvo) return salvo === "recolhida";
  return window.matchMedia("(max-width: 1023px)").matches;
}

interface SidebarContextValue {
  /** true = coluna de 72px só com ícones (tablet/desktop). */
  recolhida: boolean;
  alternar: () => void;
  /** Drawer lateral do mobile — nunca persistido. */
  drawerAberto: boolean;
  abrirDrawer: () => void;
  fecharDrawer: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [recolhida, setRecolhida] = useState(estadoInicialRecolhida);
  const [drawerAberto, setDrawerAberto] = useState(false);

  const alternar = useCallback(() => {
    setRecolhida((atual) => {
      const proxima = !atual;
      gravarPreferencia(proxima ? "recolhida" : "expandida");
      return proxima;
    });
  }, []);

  const abrirDrawer = useCallback(() => setDrawerAberto(true), []);
  const fecharDrawer = useCallback(() => setDrawerAberto(false), []);

  return (
    <SidebarContext.Provider
      value={{ recolhida, alternar, drawerAberto, abrirDrawer, fecharDrawer }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar(): SidebarContextValue {
  const contexto = useContext(SidebarContext);
  if (!contexto) {
    throw new Error("useSidebar deve ser usado dentro de <SidebarProvider>");
  }
  return contexto;
}
