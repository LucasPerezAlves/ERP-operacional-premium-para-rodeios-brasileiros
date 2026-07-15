-- Configuração de valor/hora dos funcionários: um valor GLOBAL (padrão) e
-- overrides opcionais por ÁREA de trabalho. Cada alteração cria uma nova
-- versão (vigencia_inicio/vigencia_fim) em vez de sobrescrever — histórico
-- auditável (quem/quando) e pronto para folha de pagamento por período.
-- Executar DEPOIS de 008_niveis_alerta_numerario.sql.

create table if not exists public.configuracoes_valor_hora (
    id                    uuid primary key default gen_random_uuid(),
    escopo                varchar(10) not null check (escopo in ('GLOBAL', 'AREA')),
    area_trabalho         varchar(60),
    valor_hora            numeric(12,2) not null check (valor_hora >= 0),
    vigencia_inicio       timestamptz not null default now(),
    vigencia_fim          timestamptz,
    ativo                 boolean not null default true,
    criado_por_admin_id   uuid not null references public.perfis_funcionarios (id),
    criado_em             timestamptz not null default now(),
    constraint ck_valor_hora_area_conforme_escopo check (
        (escopo = 'GLOBAL' and area_trabalho is null) or
        (escopo = 'AREA' and area_trabalho is not null)
    )
);

-- No máximo 1 valor GLOBAL ativo, e no máximo 1 valor ativo por ÁREA — o
-- histórico completo fica preservado nos registros com ativo=false.
create unique index if not exists ux_valor_hora_global_ativo
    on public.configuracoes_valor_hora (escopo)
    where escopo = 'GLOBAL' and ativo;

create unique index if not exists ux_valor_hora_area_ativo
    on public.configuracoes_valor_hora (area_trabalho)
    where escopo = 'AREA' and ativo;

create index if not exists ix_valor_hora_vigencia
    on public.configuracoes_valor_hora (vigencia_inicio desc);

comment on table public.configuracoes_valor_hora is
    'Valor/hora pago aos funcionários: um valor GLOBAL (padrão) e overrides opcionais por AREA. Cada alteração versiona um novo registro em vez de sobrescrever — auditoria e efetivação por período.';

-- RLS: acesso exclusivo do back-end Java (role postgres), mesmo padrão de
-- 004_caixas_vendas_sangrias.sql — bloqueia acesso direto via anon key do front.
alter table public.configuracoes_valor_hora enable row level security;
