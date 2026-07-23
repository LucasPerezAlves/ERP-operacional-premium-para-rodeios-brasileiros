import { getSupabase } from "./supabase";
import { centavosParaReais } from "./moeda";
import type { CategoriaSos } from "./sos";
import type { NivelAlertaNumerario } from "./numerario";

/**
 * Camada única de acesso à API Spring Boot: resolve o Bearer token da sessão
 * Supabase, tipa as respostas e traduz falhas HTTP para mensagens pt-BR.
 */

const API_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export type FormaPagamento = "DINHEIRO" | "DEBITO" | "CREDITO" | "PIX";

export type CategoriaProduto = "BEBIDA" | "COMIDA" | "INGRESSO" | "OUTRO";

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
  /** Nível de numerário em espécie (regra de negócio nº 2) — nunca bloqueia venda. */
  nivelAlerta: NivelAlertaNumerario;
  /** Controle de jornada operacional: null enquanto o caixa está ABERTO. */
  minutosTrabalhados: number | null;
  /** Snapshot imutável do valor/hora vigente no fechamento — null se não configurado. */
  valorHoraAplicado: number | null;
  /** minutosTrabalhados/60 * valorHoraAplicado — null se valorHoraAplicado for null. */
  valorTotalCalculado: number | null;
}

export interface VendaApi {
  id: string;
  caixaId: string;
  valor: number;
  formaPagamento: FormaPagamento;
  registradaEm: string;
  saldoEmEspecie: number;
  nivelAlerta: NivelAlertaNumerario;
}

export interface SangriaApi {
  id: string;
  caixaId: string;
  adminId: string;
  valor: number;
  registradaEm: string;
  /** Espécie restante no caixa após o recolhimento. */
  saldoEmEspecie: number;
}

export interface SangriaResumoApi {
  id: string;
  caixaId: string;
  operadorId: string;
  valor: number;
  registradaEm: string;
}

export interface SosAlertaApi {
  id: string;
  caixaId: string;
  operadorId: string;
  operadorNome: string;
  categoria: CategoriaSos;
  saldoEmEspecie: number;
  status: "ABERTO" | "ATENDIDO";
  criadoEm: string;
  atendidoPorAdminId: string | null;
  atendidoEm: string | null;
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
  limiteAtencao: number;
  limiteCritico: number;
  ativo: boolean;
}

export interface ValorVigenteApi {
  /** null quando é o valor global (sem área específica). */
  areaTrabalho: string | null;
  valorHora: number;
  vigenciaInicio: string;
  alteradoPorAdminId: string;
  alteradoPorNome: string;
}

export interface ValorHoraAtualApi {
  /** null quando nenhum admin configurou um valor global ainda. */
  global: ValorVigenteApi | null;
  overridesPorArea: ValorVigenteApi[];
}

export interface HistoricoValorHoraApi {
  id: string;
  escopo: "GLOBAL" | "AREA";
  areaTrabalho: string | null;
  valorHora: number;
  vigenciaInicio: string;
  vigenciaFim: string | null;
  ativo: boolean;
  alteradoPorAdminId: string;
  alteradoPorNome: string;
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
  409: "Conflito: a ação não é permitida no estado atual.",
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

/** Exclusivo do Admin: recolhimento de espécie (regra de negócio nº 2). */
export function registrarSangria(
  caixaId: string,
  valorCentavos: number,
): Promise<SangriaApi> {
  return request<SangriaApi>(`/api/caixas/${caixaId}/sangria`, "POST", {
    valor: centavosParaReais(valorCentavos),
  }) as Promise<SangriaApi>;
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

/** Histórico do SOS (Master Admin backlog, item 1) — o acionamento em tempo
 * real acontece via Supabase Realtime Broadcast; isto só persiste o registro. */
export function registrarSos(
  caixaId: string,
  operadorNome: string,
  categoria: CategoriaSos,
  saldoEmEspecieCentavos: number,
): Promise<SosAlertaApi> {
  return request<SosAlertaApi>("/api/sos", "POST", {
    caixaId,
    operadorNome,
    categoria,
    saldoEmEspecie: centavosParaReais(saldoEmEspecieCentavos),
  }) as Promise<SosAlertaApi>;
}

/** Exclusivo do Admin: hidrata o painel com SOS abertos antes desta sessão. */
export function listarSosAbertos(): Promise<SosAlertaApi[]> {
  return request<SosAlertaApi[]>("/api/sos/abertos", "GET") as Promise<SosAlertaApi[]>;
}

/** Exclusivo do Admin: marca que a gerência já chegou ao posto. */
export function atenderSos(id: string): Promise<SosAlertaApi> {
  return request<SosAlertaApi>(`/api/sos/${id}/atender`, "PUT") as Promise<SosAlertaApi>;
}

/** Exclusivo do Admin (lista completa, com foto e área de trabalho). */
export function listarFuncionarios(): Promise<FuncionarioApi[]> {
  return request<FuncionarioApi[]>("/api/funcionarios", "GET") as Promise<FuncionarioApi[]>;
}

/**
 * Exclusivo do Admin: atualização completa do perfil (o PUT substitui o
 * registro inteiro — nome/cargo/área precisam viajar junto mesmo quando só
 * os limiares de numerário mudam, regra de negócio nº 2).
 */
export function atualizarFuncionario(
  id: string,
  dados: {
    nomeCompleto: string;
    cargo: string;
    areaTrabalho: string | null;
    limiteAtencaoCentavos: number;
    limiteCriticoCentavos: number;
  },
): Promise<FuncionarioApi> {
  return request<FuncionarioApi>(`/api/funcionarios/${id}`, "PUT", {
    nomeCompleto: dados.nomeCompleto,
    cargo: dados.cargo,
    areaTrabalho: dados.areaTrabalho,
    limiteAtencao: centavosParaReais(dados.limiteAtencaoCentavos),
    limiteCritico: centavosParaReais(dados.limiteCriticoCentavos),
  }) as Promise<FuncionarioApi>;
}

/** Exclusivo do Admin — tela Gerenciamento de Equipe (status de todo mundo). */
export function listarCaixasAbertos(): Promise<CaixaApi[]> {
  return request<CaixaApi[]>("/api/caixas/abertos", "GET") as Promise<CaixaApi[]>;
}

/** Exclusivo do Admin — Scorecard de Divergência de Operadores. */
export function listarCaixasFechados(): Promise<CaixaApi[]> {
  return request<CaixaApi[]>("/api/caixas/fechados", "GET") as Promise<CaixaApi[]>;
}

/** Exclusivo do Admin — Activity Feed do Centro de Operações do Evento. */
export function listarSangrias(): Promise<SangriaResumoApi[]> {
  return request<SangriaResumoApi[]>("/api/caixas/sangrias", "GET") as Promise<SangriaResumoApi[]>;
}

/** Exclusivo do Admin — estado efetivo atual (valor global + overrides por área). */
export function buscarValoresHora(): Promise<ValorHoraAtualApi> {
  return request<ValorHoraAtualApi>("/api/valores-hora", "GET") as Promise<ValorHoraAtualApi>;
}

/** Exclusivo do Admin — histórico completo (vigências fechadas e ativas). */
export function buscarHistoricoValoresHora(): Promise<HistoricoValorHoraApi[]> {
  return request<HistoricoValorHoraApi[]>("/api/valores-hora/historico", "GET") as Promise<
    HistoricoValorHoraApi[]
  >;
}

/**
 * Exclusivo do Admin — salva o valor global e a lista completa de overrides
 * por área (payload substitui o estado inteiro; o back-end versiona só o
 * que mudou).
 */
export function salvarValoresHora(dados: {
  valorHoraGlobalCentavos: number;
  overrides: Array<{ area: string; valorHoraCentavos: number }>;
}): Promise<ValorHoraAtualApi> {
  return request<ValorHoraAtualApi>("/api/valores-hora", "PUT", {
    valorHoraGlobal: centavosParaReais(dados.valorHoraGlobalCentavos),
    overrides: dados.overrides.map((item) => ({
      area: item.area,
      valorHora: centavosParaReais(item.valorHoraCentavos),
    })),
  }) as Promise<ValorHoraAtualApi>;
}

export interface ProdutoApi {
  id: string;
  nome: string;
  categoria: CategoriaProduto;
  quantidadeEstoque: number;
  valorVenda: number;
  valorCusto: number;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

/** Exclusivo do Admin — Cadastro de Estoque (lista só produtos ativos). */
export function listarProdutos(): Promise<ProdutoApi[]> {
  return request<ProdutoApi[]>("/api/produtos", "GET") as Promise<ProdutoApi[]>;
}

/** Exclusivo do Admin. */
export function criarProduto(dados: {
  nome: string;
  categoria: CategoriaProduto;
  quantidadeEstoque: number;
  valorVendaCentavos: number;
  valorCustoCentavos: number;
}): Promise<ProdutoApi> {
  return request<ProdutoApi>("/api/produtos", "POST", {
    nome: dados.nome,
    categoria: dados.categoria,
    quantidadeEstoque: dados.quantidadeEstoque,
    valorVenda: centavosParaReais(dados.valorVendaCentavos),
    valorCusto: centavosParaReais(dados.valorCustoCentavos),
  }) as Promise<ProdutoApi>;
}

/** Exclusivo do Admin — PUT substitui o registro inteiro. */
export function atualizarProduto(
  id: string,
  dados: {
    nome: string;
    categoria: CategoriaProduto;
    quantidadeEstoque: number;
    valorVendaCentavos: number;
    valorCustoCentavos: number;
  },
): Promise<ProdutoApi> {
  return request<ProdutoApi>(`/api/produtos/${id}`, "PUT", {
    nome: dados.nome,
    categoria: dados.categoria,
    quantidadeEstoque: dados.quantidadeEstoque,
    valorVenda: centavosParaReais(dados.valorVendaCentavos),
    valorCusto: centavosParaReais(dados.valorCustoCentavos),
  }) as Promise<ProdutoApi>;
}

/** Exclusivo do Admin — desativação lógica, nunca apaga o registro. */
export function desativarProduto(id: string): Promise<ProdutoApi> {
  return request<ProdutoApi>(`/api/produtos/${id}/desativar`, "PUT") as Promise<ProdutoApi>;
}

// ---------------------------------------------------------------------------
// Evento (Sprint 1) — entidade central da plataforma, isolada nesta entrega:
// nenhum outro módulo (Caixa, Funcionário, Catálogo) referencia Evento ainda.
// ---------------------------------------------------------------------------

export type StatusEvento =
  | "RASCUNHO"
  | "PUBLICADO"
  | "EM_ANDAMENTO"
  | "ENCERRADO"
  | "CANCELADO"
  | "ARQUIVADO";

export interface EventoApi {
  id: string;
  nome: string;
  slug: string;
  descricaoCurta: string | null;
  descricaoCompleta: string | null;
  bannerUrl: string | null;
  imagemDestaqueUrl: string | null;
  cidade: string | null;
  estado: string | null;
  endereco: string | null;
  local: string | null;
  dataInicio: string;
  dataFim: string;
  horarioAbertura: string | null;
  status: StatusEvento;
  capacidade: number | null;
  organizador: string | null;
  observacoes: string | null;
  criadoPorAdminId: string;
  publicadoEm: string | null;
  encerradoEm: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface DadosEvento {
  nome: string;
  descricaoCurta: string | null;
  descricaoCompleta: string | null;
  bannerUrl: string | null;
  imagemDestaqueUrl: string | null;
  cidade: string | null;
  estado: string | null;
  endereco: string | null;
  local: string | null;
  dataInicio: string;
  dataFim: string;
  horarioAbertura: string | null;
  capacidade: number | null;
  organizador: string | null;
  observacoes: string | null;
}

/** Exclusivo do Admin — CRUD administrativo (todos os status; sem endpoint público ainda). */
export function listarEventos(): Promise<EventoApi[]> {
  return request<EventoApi[]>("/api/eventos", "GET") as Promise<EventoApi[]>;
}

export function criarEvento(dados: DadosEvento): Promise<EventoApi> {
  return request<EventoApi>("/api/eventos", "POST", dados) as Promise<EventoApi>;
}

/** PUT substitui o registro inteiro; o slug nunca é regerado pelo back-end. */
export function atualizarEvento(id: string, dados: DadosEvento): Promise<EventoApi> {
  return request<EventoApi>(`/api/eventos/${id}`, "PUT", dados) as Promise<EventoApi>;
}

export function publicarEvento(id: string): Promise<EventoApi> {
  return request<EventoApi>(`/api/eventos/${id}/publicar`, "PUT") as Promise<EventoApi>;
}

export function despublicarEvento(id: string): Promise<EventoApi> {
  return request<EventoApi>(`/api/eventos/${id}/despublicar`, "PUT") as Promise<EventoApi>;
}

export function iniciarEvento(id: string): Promise<EventoApi> {
  return request<EventoApi>(`/api/eventos/${id}/iniciar`, "PUT") as Promise<EventoApi>;
}

export function encerrarEvento(id: string): Promise<EventoApi> {
  return request<EventoApi>(`/api/eventos/${id}/encerrar`, "PUT") as Promise<EventoApi>;
}

export function cancelarEvento(id: string): Promise<EventoApi> {
  return request<EventoApi>(`/api/eventos/${id}/cancelar`, "PUT") as Promise<EventoApi>;
}

export function arquivarEvento(id: string): Promise<EventoApi> {
  return request<EventoApi>(`/api/eventos/${id}/arquivar`, "PUT") as Promise<EventoApi>;
}

/**
 * Fetch sem autenticação — paralelo ao request() acima, que sempre exige
 * sessão Supabase (lançaria 401 sem token). Usado só pelos endpoints
 * públicos da Landing Page.
 */
async function requestPublico<T>(caminho: string): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(`${API_URL}${caminho}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    throw new ApiError(0, "Sem conexão com a arena. Verifique a rede e tente de novo.");
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

export interface EventoPublicoApi {
  slug: string;
  nome: string;
  descricaoCurta: string | null;
  descricaoCompleta: string | null;
  bannerUrl: string | null;
  imagemDestaqueUrl: string | null;
  cidade: string | null;
  estado: string | null;
  endereco: string | null;
  local: string | null;
  dataInicio: string;
  dataFim: string;
  horarioAbertura: string | null;
  capacidade: number | null;
  organizador: string | null;
}

/** Público — sem autenticação, consumido pela Landing Page. */
export function listarEventosPublicos(): Promise<EventoPublicoApi[]> {
  return requestPublico<EventoPublicoApi[]>("/api/eventos/publicos");
}

/** Público — 404 se o slug não existir ou o evento não estiver PUBLICADO. */
export function buscarEventoPublicoPorSlug(slug: string): Promise<EventoPublicoApi> {
  return requestPublico<EventoPublicoApi>(`/api/eventos/publicos/${encodeURIComponent(slug)}`);
}
