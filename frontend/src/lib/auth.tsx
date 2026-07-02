import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getSupabase, isSupabaseConfigured } from "./supabase";

// ---------------------------------------------------------------------------
// RBAC: dois níveis de acesso (CLAUDE.md)
// MASTER_ADMIN — proprietário: valores reais, fechamento global, relatórios.
// OPERADOR     — apenas lançamentos da própria função.
// ---------------------------------------------------------------------------

export type PerfilAcesso = "MASTER_ADMIN" | "OPERADOR";

export interface PerfilUsuario {
  id: string;
  email: string;
  nomeCompleto: string;
  perfilAcesso: PerfilAcesso;
  statusAprovacao: "PENDENTE" | "APROVADO" | "REJEITADO";
}

/** Painel inicial de cada nível de acesso. */
export function rotaDoPerfil(perfilAcesso: PerfilAcesso): string {
  return perfilAcesso === "MASTER_ADMIN" ? "/admin-dashboard" : "/operador-dashboard";
}

async function buscarPerfil(
  userId: string,
  email: string,
): Promise<PerfilUsuario | null> {
  const { data, error } = await getSupabase()
    .from("perfis_funcionarios")
    .select("nome_completo, status_aprovacao, perfil_acesso")
    .eq("id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: userId,
    email,
    nomeCompleto: data.nome_completo ?? "",
    statusAprovacao: data.status_aprovacao,
    perfilAcesso: (data.perfil_acesso ?? "OPERADOR") as PerfilAcesso,
  };
}

// ---------------------------------------------------------------------------
// Contexto: mantém a sessão do Supabase + o perfil (com nível de acesso)
// disponíveis para o guardião de rotas e os painéis.
// ---------------------------------------------------------------------------

interface AuthContextValue {
  perfil: PerfilUsuario | null;
  /** true enquanto a sessão persistida ainda está sendo restaurada. */
  carregando: boolean;
  sair: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  perfil: null,
  carregando: true,
  sair: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setCarregando(false);
      return;
    }

    const supabase = getSupabase();
    let ativo = true;

    async function restaurarSessao() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      const carregado = user ? await buscarPerfil(user.id, user.email ?? "") : null;
      if (ativo) {
        setPerfil(carregado);
        setCarregando(false);
      }
    }

    restaurarSessao();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      // setTimeout: o supabase-js trava se fizermos chamadas await
      // diretamente dentro deste callback (limitação documentada).
      setTimeout(async () => {
        const user = session?.user;
        const carregado = user ? await buscarPerfil(user.id, user.email ?? "") : null;
        if (ativo) {
          setPerfil(carregado);
        }
      }, 0);
    });

    return () => {
      ativo = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function sair() {
    await getSupabase().auth.signOut();
    setPerfil(null);
  }

  return (
    <AuthContext.Provider value={{ perfil, carregando, sair }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
