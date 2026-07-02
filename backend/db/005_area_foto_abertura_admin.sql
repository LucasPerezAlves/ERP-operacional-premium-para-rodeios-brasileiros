-- Módulo 2.1: Abertura de caixa exclusiva do Admin + campos de identificação
-- do funcionário (Área de Trabalho e Foto). Executar DEPOIS de 004.

-- ---------------------------------------------------------------------------
-- 1. perfis_funcionarios: Área de Trabalho e Foto (regra de cadastro do
--    Módulo 1 revisada) — usados pelo Admin para identificar o operador na
--    lista de "Abrir Caixa" e nos alertas de sangria/SOS.
-- ---------------------------------------------------------------------------

alter table public.perfis_funcionarios
  add column if not exists area_trabalho varchar(60),
  add column if not exists foto_url varchar(500);

comment on column public.perfis_funcionarios.area_trabalho is
    'Posto do funcionário no evento (ex.: Bar de Fora, Portaria) — exibido na lista de Abrir Caixa do Admin';
comment on column public.perfis_funcionarios.foto_url is
    'URL pública da foto no bucket fotos-funcionarios (Supabase Storage) — identificação visual pelo Admin';

-- Trigger de criação do perfil (002) passa a copiar também area_trabalho e
-- foto_url dos metadados do cadastro (o front-end envia via signUp options.data,
-- foto já enviada ao Storage antes do signUp — ver AuthPage.tsx).
create or replace function public.criar_perfil_funcionario()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.perfis_funcionarios (id, nome_completo, email, area_trabalho, foto_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    new.raw_user_meta_data ->> 'area_trabalho',
    new.raw_user_meta_data ->> 'foto_url'
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Storage: bucket público para as fotos de cadastro. Upload acontece
--    ANTES do signUp (usuário ainda anônimo) — por isso a policy de INSERT
--    é aberta para o bucket específico, com nome de arquivo aleatório
--    (gerado no cliente) para não permitir sobrescrita por adivinhação.
--    Pior caso de abuso: lixo visual, nunca comprometimento de dados
--    financeiros (essas tabelas continuam com RLS travado para o backend).
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fotos-funcionarios',
  'fotos-funcionarios',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "upload publico de fotos de cadastro" on storage.objects;
create policy "upload publico de fotos de cadastro"
  on storage.objects for insert
  to public
  with check (bucket_id = 'fotos-funcionarios');

drop policy if exists "leitura publica de fotos de funcionarios" on storage.objects;
create policy "leitura publica de fotos de funcionarios"
  on storage.objects for select
  to public
  using (bucket_id = 'fotos-funcionarios');

-- ---------------------------------------------------------------------------
-- 3. caixas: separa quem ABRIU (Admin) de quem é o DONO (Operador) do caixa
--    (regra inegociável nº 7).
-- ---------------------------------------------------------------------------

alter table public.caixas
  add column if not exists aberto_por_admin_id uuid references public.perfis_funcionarios (id);

comment on column public.caixas.aberto_por_admin_id is
    'MASTER_ADMIN que executou a abertura — sempre diferente de operador_id (regra inegociável nº 7: operador não abre o próprio caixa)';

-- ---------------------------------------------------------------------------
-- 4. RLS de LEITURA (não escrita) para o Operador acompanhar o próprio caixa
--    em tempo real via Supabase Realtime, sem depender só de polling REST.
--    Escrita continua exclusiva do back-end Java (nenhuma policy de INSERT/
--    UPDATE/DELETE é criada aqui).
-- ---------------------------------------------------------------------------

drop policy if exists "operador ve o proprio caixa" on public.caixas;
create policy "operador ve o proprio caixa"
  on public.caixas
  for select
  to authenticated
  using ((select auth.uid()) = operador_id);

-- Sem isto, a subscription Realtime do front-end (OperadorLandingPage/
-- useCaixa) não recebe nenhum evento — a policy acima só controla QUEM pode
-- ver, esta publicação controla SE a tabela emite eventos.
alter publication supabase_realtime add table public.caixas;
