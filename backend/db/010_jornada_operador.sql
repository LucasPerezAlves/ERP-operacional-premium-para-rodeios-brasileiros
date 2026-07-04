-- Módulo 2.3: controle de jornada operacional (horas x valor/hora). O turno
-- já registra entrada/saída em data_abertura/data_fechamento; aqui fica o
-- snapshot imutável do valor/hora aplicado e do total calculado no momento
-- do fechamento — nunca recalculado retroativamente. Executar DEPOIS de 009.

alter table public.caixas
  add column if not exists valor_hora_aplicado numeric(12,2),
  add column if not exists valor_total_calculado numeric(12,2);

alter table public.caixas
  drop constraint if exists chk_jornada_so_no_fechamento;

alter table public.caixas
  add constraint chk_jornada_so_no_fechamento
  check (
    status = 'FECHADO' or (valor_hora_aplicado is null and valor_total_calculado is null)
  );

comment on column public.caixas.valor_hora_aplicado is
    'Snapshot imutável do valor/hora vigente (área do operador, senão global) no momento do fechamento — nunca recalculado retroativamente';
comment on column public.caixas.valor_total_calculado is
    'minutosTrabalhados/60 * valor_hora_aplicado, calculado com HALF_EVEN — null se não havia valor/hora configurado no fechamento';
