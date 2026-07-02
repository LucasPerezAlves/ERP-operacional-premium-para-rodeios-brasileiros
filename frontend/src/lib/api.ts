import { getSupabase } from "./supabase";
import { centavosParaReais } from "./moeda";

/**
 * Camada única de acesso à API Spring Boot: resolve o Bearer token da sessão
 * Supabase, tipa as respostas e traduz falhas HTTP para mensagens pt-BR.
 */

const API_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export type FormaPagamento = "DINHEIRO" | "DEBITO" | "CREDITO" | "PIX";

export interface CaixaApi {
  id: string;
  operadorId: string;
  abertoPorAdminId: string;
  saldoInicial: number;
  status: "ABERTO" | "FECHADO";
  dataAbertura: string;
  dataFechamento: string | null;
  saldoEmEspecie: number;
  valorFinalConfirmado: number | null;
  motivoFechamento: string | null;
  /** valorFinalConfirmado − saldoEmEspecie: positivo = sobra, negativo = falta. */
  divergencia: number | null;
}

export interface VendaApi {
  id: string;
  caixaId: string;
  valor: number;
  formaPagamento: FormaPagamento;
  registradaEm: string;
  saldoEmEspecie: number;
  /** "ALERTA_SANGRIA_ATINGIDO" quando o limite do operador foi alcançado. */
  alerta: string | null;
}

export interface FuncionarioApi {
  id: string;
  nomeCompleto: string;
  email: string;
  cargo: string;
  statusAprovacao: "PENDENTE" | "APROVADO" | "REJEITADO";
  perfilAcesso: "MASTER_ADMIN" | "OPERADOR";
  areaTrabalho: string | null;
  fotoUrl: string | null;
  limiteSangria: number;
  ativo: boolean;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

// O back-end ainda não expõe a razão do erro no corpo (include-message do
// Spring); mapeamos por status até essa melhoria chegar no módulo seguinte.
const MENSAGENS_POR_STATUS: Record<number, string> = {
  401: "Sessão expirada. Saia e entre novamente.",
  403: "Você não tem permissão para esta ação.",
  404: "Não encontrado.",
  409: "Conflito: este operador já tem um caixa aberto, ou o caixa já foi fechado.",
  422: "Valor maior que o dinheiro disponível no caixa.",
};

async function request<T>(
  caminho: string,
  metodo: "GET" | "POST" | "PUT",
  corpo?: unknown,
): Promise<T | null> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;

  if (!token) {
    throw new ApiError(401, MENSAGENS_POR_STATUS[401]);
  }

  let resposta: Response;
  try {
    resposta = await fetch(`${API_URL}${caminho}`, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
  } catch {
    throw new ApiError(0, "Sem conexão com a arena. Verifique a rede e tente de novo.");
  }

  // 204: estado válido de "nada aqui ainda" (ex.: sem caixa aberto) — não é erro.
  if (resposta.status === 204) {
    return null;
  }

  if (!resposta.ok) {
    let mensagem =
      MENSAGENS_POR_STATUS[resposta.status] ?? `Erro inesperado (${resposta.status}).`;
    try {
      const body = (await resposta.json()) as { mensagem?: string; message?: string };
      mensagem = body.mensagem || body.message || mensagem;
    } catch {
      // corpo vazio ou não-JSON: mantém a mensagem mapeada
    }
    throw new ApiError(resposta.status, mensagem);
  }

  return (await resposta.json()) as T;
}

// ---------------------------------------------------------------------------
// Endpoints do Módulo 2 (valores em centavos na assinatura; reais no fio)
// ---------------------------------------------------------------------------

/** Exclusivo do Admin: abre um caixa PARA o operador escolhido. */
export function abrirCaixaParaOperador(
  operadorId: string,
  saldoInicialCentavos: number,
): Promise<CaixaApi> {
  return request<CaixaApi>("/api/caixas/abrir", "POST", {
    operadorId,
    saldoInicial: centavosParaReais(saldoInicialCentavos),
  }) as Promise<CaixaApi>;
}

/** Status do próprio caixa do Operador — null quando ainda não foi aberto. */
export function buscarMeuCaixa(): Promise<CaixaApi | null> {
  return request<CaixaApi>("/api/caixas/meu", "GET");
}

export function registrarVenda(
  caixaId: string,
  valorCentavos: number,
  formaPagamento: FormaPagamento,
): Promise<VendaApi> {
  return request<VendaApi>(`/api/caixas/${caixaId}/vender`, "POST", {
    valor: centavosParaReais(valorCentavos),
    formaPagamento,
  }) as Promise<VendaApi>;
}

/** Exclusivo do Admin: valor contado fisicamente + motivo ficam registrados. */
export function fecharCaixa(
  caixaId: string,
  valorFinalConfirmadoCentavos: number,
  motivo: string,
): Promise<CaixaApi> {
  return request<CaixaApi>(`/api/caixas/${caixaId}/fechar`, "PUT", {
    valorFinalConfirmado: centavosParaReais(valorFinalConfirmadoCentavos),
    motivo,
  }) as Promise<CaixaApi>;
}

/** Exclusivo do Admin (lista completa, com foto e área de trabalho). */
export function listarFuncionarios(): Promise<FuncionarioApi[]> {
  return request<FuncionarioApi[]>("/api/funcionarios", "GET") as Promise<FuncionarioApi[]>;
}

/** Exclusivo do Admin — tela Gerenciamento de Equipe (status de todo mundo). */
export function listarCaixasAbertos(): Promise<CaixaApi[]> {
  return request<CaixaApi[]>("/api/caixas/abertos", "GET") as Promise<CaixaApi[]>;
}
