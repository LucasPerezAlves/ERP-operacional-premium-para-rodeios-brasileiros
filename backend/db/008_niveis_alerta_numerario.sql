-- Módulo 2.4: substitui o limite binário de sangria (limite_sangria + bloqueio
-- de venda) por dois limiares configuráveis por operador que alimentam o
-- NivelAlertaNumerario (NORMAL/ATENCAO/CRITICO) — regra de negócio nº 2
-- revisada: o sistema nunca bloqueia venda, só escala o alerta à gerência.
-- Executar DEPOIS de 007_sos_alertas.sql.

alter table public.perfis_funcionarios
    add column if not exists limite_atencao numeric(12,2) not null default 5000.00
        check (limite_atencao >= 0),
    add column if not exists limite_critico numeric(12,2) not null default 10000.00
        check (limite_critico >= 0);

comment on column public.perfis_funcionarios.limite_atencao is
    'Espécie em caixa a partir da qual o nível de alerta vira ATENCAO (regra de negócio nº 2)';
comment on column public.perfis_funcionarios.limite_critico is
    'Espécie em caixa a partir da qual o nível de alerta vira CRITICO (regra de negócio nº 2)';

alter table public.perfis_funcionarios drop column if exists limite_sangria;

-- Realtime em "vendas": o painel do Admin precisa saber quando o numerário
-- de qualquer caixa muda para recalcular o nível de alerta na hora (o
-- payload bruto não é confiável — o front sempre revalida via API, como já
-- faz useCaixa.ts para a tabela "caixas").
alter publication supabase_realtime add table public.vendas;
