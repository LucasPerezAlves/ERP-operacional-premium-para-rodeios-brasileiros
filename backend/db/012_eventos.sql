-- Sprint 1: Evento como entidade central da plataforma (Velho Promoções).
-- Isolado nesta entrega — nenhuma outra tabela referencia eventos ainda.
-- Caixa ganha evento_id numa sprint futura ("Caixa x Evento"); Venda e
-- Sangria herdam o escopo do evento transitivamente via caixa_id (nunca
-- FK direto). PerfilFuncionario e produtos (Catálogo Operacional) nunca
-- referenciam evento_id — são reutilizáveis entre eventos por design.
-- Executar DEPOIS de 011.

create table if not exists public.eventos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug varchar(160) not null unique,
  descricao_curta varchar(300),
  descricao_completa text,
  banner_url text,
  imagem_destaque_url text,
  cidade varchar(100),
  estado varchar(2),
  endereco text,
  local text,
  data_inicio date not null,
  data_fim date not null,
  horario_abertura time,
  status varchar(20) not null default 'RASCUNHO'
    check (status in ('RASCUNHO','PUBLICADO','EM_ANDAMENTO','ENCERRADO','CANCELADO','ARQUIVADO')),
  capacidade integer check (capacidade is null or capacidade > 0),
  organizador text,
  observacoes text,
  criado_por_admin_id uuid not null references public.perfis_funcionarios (id),
  publicado_em timestamptz,
  encerrado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint chk_evento_datas check (data_fim >= data_inicio)
);

-- Prepara a futura query pública da Landing ("WHERE status = 'PUBLICADO'").
create index if not exists ix_eventos_status on public.eventos (status);

alter table public.eventos enable row level security;
-- Sem policies de escrita: acesso só via backend Java (role postgres),
-- mesmo padrão de todas as tabelas da plataforma. O futuro endpoint
-- público de leitura (Landing) também passa pelo backend, nunca direto
-- no Supabase.

comment on column public.eventos.slug is
    'Gerado a partir do nome na criação; imutável depois — permalink futuro da Landing/página de detalhe do evento';
comment on column public.eventos.status is
    'RASCUNHO/PUBLICADO/EM_ANDAMENTO/ENCERRADO/CANCELADO/ARQUIVADO — só PUBLICADO aparece na Landing (spec futura)';
comment on column public.eventos.criado_por_admin_id is
    'Auditoria: qual MASTER_ADMIN cadastrou o evento (mesmo padrão de caixas.aberto_por_admin_id)';
comment on column public.eventos.horario_abertura is
    'Horário representativo de abertura de portões — grade horária por dia/prova é spec futura';
