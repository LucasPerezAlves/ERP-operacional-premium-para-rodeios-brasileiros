create table if not exists public.funcionarios (
    id              uuid primary key default gen_random_uuid(),
    auth_user_id    uuid unique references auth.users (id),
    nome_completo   text not null,
    email           text not null unique,
    cargo           varchar(20) not null
                    check (cargo in ('ADMIN', 'SUPERVISOR', 'CAIXA', 'GARCOM', 'PORTARIA')),
    -- Dinheiro é sempre NUMERIC(12,2) — nunca float/double (CLAUDE.md, regra 1)
    limite_sangria  numeric(12,2) not null default 2000.00
                    check (limite_sangria >= 0),
    pin_hash        text,
    ativo           boolean not null default true,
    criado_em       timestamptz not null default now(),
    atualizado_em   timestamptz not null default now()
);

comment on column public.funcionarios.limite_sangria is
    'Limite de espécie em caixa antes do alerta obrigatório de Sangria (regra de negócio nº 2)';
comment on column public.funcionarios.pin_hash is
    'Hash do PIN de 4 dígitos para acesso rápido em terminais compartilhados (regra nº 4)';
