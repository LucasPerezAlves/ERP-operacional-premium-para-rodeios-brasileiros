-- Módulo 1.2: RBAC — níveis de acesso MASTER_ADMIN e OPERADOR
-- Executar no Supabase (SQL Editor) DEPOIS de 002_perfis_funcionarios.sql.

-- ---------------------------------------------------------------------------
-- 1. Nova coluna perfil_acesso (todo cadastro nasce OPERADOR)
-- ---------------------------------------------------------------------------

alter table public.perfis_funcionarios
  add column if not exists perfil_acesso varchar(20) not null default 'OPERADOR'
  check (perfil_acesso in ('MASTER_ADMIN', 'OPERADOR'));

comment on column public.perfis_funcionarios.perfil_acesso is
    'RBAC: MASTER_ADMIN (proprietário — valores reais, fechamento global, relatórios) ou OPERADOR (apenas lançamentos da própria função)';

-- ---------------------------------------------------------------------------
-- 2. Aprovação manual + definição de nível dos usuários existentes
--    (o id do perfil é o mesmo id de auth.users; busca por e-mail via subquery)
-- ---------------------------------------------------------------------------

-- Proprietário: acesso total
update public.perfis_funcionarios
set status_aprovacao = 'APROVADO',
    perfil_acesso    = 'MASTER_ADMIN',
    atualizado_em    = now()
where id = (select id from auth.users where email = 'perezcfnpbnu@gmail.com');

-- Operador de teste: acesso restrito aos próprios lançamentos
update public.perfis_funcionarios
set status_aprovacao = 'APROVADO',
    perfil_acesso    = 'OPERADOR',
    atualizado_em    = now()
where id = (select id from auth.users where email = 'teste@gmail.com');

-- ---------------------------------------------------------------------------
-- 3. Conferência: as duas linhas devem aparecer APROVADO com o nível certo.
--    Se alguma não aparecer, o usuário ainda não fez o cadastro (signUp) —
--    a trigger só cria o perfil quando o usuário existe em auth.users.
-- ---------------------------------------------------------------------------

select p.email, p.nome_completo, p.status_aprovacao, p.perfil_acesso
from public.perfis_funcionarios p
where p.email in ('perezcfnpbnu@gmail.com', 'teste@gmail.com');
