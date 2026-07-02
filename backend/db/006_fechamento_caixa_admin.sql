-- Módulo 2.2: fechamento de caixa pelo Admin com conferência física e
-- motivo — tela "Gerenciamento de Equipe". Executar DEPOIS de 005.

alter table public.caixas
  add column if not exists valor_final_confirmado numeric(12,2),
  add column if not exists motivo_fechamento text;

comment on column public.caixas.valor_final_confirmado is
    'Dinheiro contado fisicamente pelo Admin no fechamento — comparado a saldo_em_especie (calculado) revela sobra/falta';
comment on column public.caixas.motivo_fechamento is
    'Justificativa obrigatória do fechamento (ex.: "Fim de turno", "Troca de operador", "Quebra de caixa")';
