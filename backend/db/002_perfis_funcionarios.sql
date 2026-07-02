-- Módulo 1.1: fluxo de Aprovação de Gerência (Admin Approval)
-- Executar no Supabase (SQL Editor), substituindo o schema do script 001.
-- Ninguém acessa o sistema sem status APROVADO.

-- A tabela do script 001 é substituída pelo perfil 1:1 com auth.users
-- (ainda não há dados de produção).
drop table if exists public.funcionarios;

create table if not exists public.perfis_funcionarios (
    -- 1:1 com auth.users: a PK é o próprio id do usuário no Supabase Auth
    id                uuid primary key references auth.users (id) on delete cascade,
    nome_completo     text not null default '',
    email             text not null,
    cargo             varchar(20) not null default 'GARCOM'
                      check (cargo in ('ADMIN', 'SUPERVISOR', 'CAIXA', 'GARCOM', 'PORTARIA')),
    status_aprovacao  varchar(10) not null default 'PENDENTE'
                      check (status_aprovacao in ('PENDENTE', 'APROVADO', 'REJEITADO')),
    -- Dinheiro é sempre NUMERIC(12,2) — nunca float/double (CLAUDE.md, regra 1)
    limite_sangria    numeric(12,2) not null default 2000.00
                      check (limite_sangria >= 0),
    pin_hash          text,
    ativo             boolean not null default true,
    criado_em         timestamptz not null default now(),
    atualizado_em     timestamptz not null default now()
);

comment on column public.perfis_funcionarios.status_aprovacao is
    'Fluxo de Aprovação de Gerência: todo cadastro nasce PENDENTE e só entra na arena após APROVADO';

-- ---------------------------------------------------------------------------
-- Trigger: todo usuário novo em auth.users ganha automaticamente um perfil
-- PENDENTE em perfis_funcionarios (padrão documentado pelo Supabase).
-- ---------------------------------------------------------------------------

create or replace function public.criar_perfil_funcionario()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.perfis_funcionarios (id, nome_completo, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.criar_perfil_funcionario();

-- ---------------------------------------------------------------------------
-- RLS: o funcionário autenticado pode LER apenas o próprio perfil
-- (o front-end consulta o status_aprovacao logo após o login).
-- O back-end Java conecta como postgres e não é afetado pelas policies.
-- ---------------------------------------------------------------------------

alter table public.perfis_funcionarios enable row level security;

drop policy if exists "ler o proprio perfil" on public.perfis_funcionarios;
create policy "ler o proprio perfil"
  on public.perfis_funcionarios
  for select
  to authenticated
  using ((select auth.uid()) = id);
