-- Módulo 2: Caixas, Vendas e Sangrias
-- Executar no Supabase (SQL Editor) DEPOIS de 003_perfil_acesso_rbac.sql.
-- Dinheiro é sempre NUMERIC(12,2) — nunca float/double (CLAUDE.md, regra 1).

create table if not exists public.caixas (
    id               uuid primary key default gen_random_uuid(),
    operador_id      uuid not null references public.perfis_funcionarios (id),
    saldo_inicial    numeric(12,2) not null check (saldo_inicial >= 0),
    status           varchar(10) not null default 'ABERTO'
                     check (status in ('ABERTO', 'FECHADO')),
    data_abertura    timestamptz not null default now(),
    data_fechamento  timestamptz
);

-- Um operador só pode ter UM caixa aberto por vez (guarda no banco, além do service)
create unique index if not exists ux_caixa_aberto_por_operador
    on public.caixas (operador_id)
    where status = 'ABERTO';

create table if not exists public.vendas (
    id               uuid primary key default gen_random_uuid(),
    caixa_id         uuid not null references public.caixas (id),
    valor            numeric(12,2) not null check (valor > 0),
    forma_pagamento  varchar(10) not null
                     check (forma_pagamento in ('DINHEIRO', 'DEBITO', 'CREDITO', 'PIX')),
    registrada_em    timestamptz not null default now()
);

create index if not exists ix_vendas_caixa on public.vendas (caixa_id);
create index if not exists ix_vendas_caixa_forma on public.vendas (caixa_id, forma_pagamento);

create table if not exists public.sangrias (
    id             uuid primary key default gen_random_uuid(),
    caixa_id       uuid not null references public.caixas (id),
    -- Quem recolheu o dinheiro físico (MASTER_ADMIN autorizador)
    admin_id       uuid not null references public.perfis_funcionarios (id),
    valor          numeric(12,2) not null check (valor > 0),
    registrada_em  timestamptz not null default now()
);

create index if not exists ix_sangrias_caixa on public.sangrias (caixa_id);

-- RLS: o acesso a estas tabelas é exclusivo do back-end Java (role postgres,
-- não afetado por policies). Bloqueia acesso direto via anon key do front.
alter table public.caixas enable row level security;
alter table public.vendas enable row level security;
alter table public.sangrias enable row level security;
