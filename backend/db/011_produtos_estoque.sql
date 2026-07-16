-- backend/db/011_produtos_estoque.sql
-- Módulo 3, peça 1/6: cadastro de estoque (catálogo de produtos). Sem
-- ledger de movimentação nesta entrega — quantidade é só um campo editável.
-- Carga de Pista/Bar, itemização de venda e conciliação vêm em specs
-- futuras. Executar DEPOIS de 010.

create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria varchar(20) not null check (categoria in ('BEBIDA','COMIDA','INGRESSO','OUTRO')),
  quantidade_estoque integer not null default 0 check (quantidade_estoque >= 0),
  valor_venda numeric(12,2) not null check (valor_venda >= 0),
  valor_custo numeric(12,2) not null check (valor_custo >= 0),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.produtos enable row level security;
-- Sem policies de escrita: acesso só via backend Java (role postgres),
-- mesmo padrão de todas as tabelas financeiras do projeto.

comment on column public.produtos.quantidade_estoque is
    'Estoque central, ainda não alocado a nenhum posto/turno — "Carga de Pista/Bar" (spec futura) debita daqui';
comment on column public.produtos.valor_venda is
    'Preço de venda ao cliente — usado na futura conciliação dinheiro vs. estoque (regra de negócio nº 3)';
comment on column public.produtos.valor_custo is
    'Custo de aquisição — guardado desde já para uma futura análise de margem, ainda não implementada';
