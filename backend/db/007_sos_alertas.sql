-- Módulo 2.3: persistência dos alertas SOS (Master Admin backlog, item 1).
-- O Realtime Broadcast (canal "arena-sos", useCaixa.ts) continua entregando
-- o alerta instantaneamente; esta tabela garante que a gerência veja o
-- histórico mesmo se o painel estava fechado no momento do acionamento.
-- Executar DEPOIS de 006_fechamento_caixa_admin.sql.

create table if not exists public.sos_alertas (
    id                     uuid primary key default gen_random_uuid(),
    caixa_id               uuid not null references public.caixas (id),
    operador_id            uuid not null references public.perfis_funcionarios (id),
    -- Nome do operador no momento do acionamento (snapshot — evita join na
    -- listagem e sobrevive a uma futura troca de nome no cadastro).
    operador_nome          text not null,
    categoria              varchar(20) not null
                           check (categoria in ('TROCO', 'PROBLEMA_MAQUINA', 'MAIS_GENTE', 'CONFUSAO')),
    saldo_em_especie       numeric(12,2) not null,
    status                 varchar(10) not null default 'ABERTO'
                           check (status in ('ABERTO', 'ATENDIDO')),
    criado_em              timestamptz not null default now(),
    atendido_por_admin_id  uuid references public.perfis_funcionarios (id),
    atendido_em            timestamptz
);

create index if not exists ix_sos_alertas_status on public.sos_alertas (status);

-- RLS: acesso exclusivo do back-end Java (mesmo padrão de 004).
alter table public.sos_alertas enable row level security;
