-- =============================================================================
-- CRM Automarketing — schema, papéis e RLS
--
-- Aplicada automaticamente no boot. Não rode à mão.
-- É idempotente: pode rodar de novo sem quebrar.
--
-- Modelo de acesso:
--   super_admin  o dev  — enxerga e administra TODAS as organizações
--   admin        o cliente — administra a PRÓPRIA organização e a equipe dela
--   usuario      funcionário — trabalha os leads da organização, sem configurar
-- =============================================================================

create extension if not exists "pgcrypto";

-- ------------------------------- organizações -------------------------------

create table if not exists public.organizacoes (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  documento   text,
  criado_em   timestamptz not null default now()
);

-- ---------------------------------- perfis ----------------------------------
-- Um perfil por usuário do Supabase Auth, ligado a uma organização.

do $$ begin
  create type public.papel_usuario as enum ('super_admin', 'admin', 'usuario');
exception when duplicate_object then null;
end $$;

create table if not exists public.perfis (
  id              uuid primary key references auth.users(id) on delete cascade,
  organizacao_id  uuid references public.organizacoes(id) on delete set null,
  nome            text,
  papel           public.papel_usuario not null default 'usuario',
  criado_em       timestamptz not null default now()
);

create index if not exists perfis_org_idx on public.perfis(organizacao_id);

-- ---------------------------------- leads -----------------------------------

create table if not exists public.leads (
  id              bigint generated always as identity primary key,
  organizacao_id  uuid references public.organizacoes(id) on delete cascade,
  nome            text not null,
  telefone        text default '',
  email           text default '',
  cargo           text default '',
  origem          text not null default 'Manual',
  etapa           text not null default 'novo',
  valor           numeric(12,2) not null default 0,
  score           int not null default 0 check (score between 0 and 100),
  responsavel_id  uuid references public.perfis(id) on delete set null,
  obs             text default '',
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  constraint etapa_valida check (etapa in
    ('novo','contato','qualificado','reuniao','proposta','ganho','perdido'))
);

create index if not exists leads_org_idx   on public.leads(organizacao_id);
create index if not exists leads_etapa_idx on public.leads(etapa);

-- --------------------------- histórico de etapas ----------------------------
-- Append-only: serve para medir tempo em cada etapa e auditar quem moveu.

create table if not exists public.movimentacoes_lead (
  id             bigint generated always as identity primary key,
  lead_id        bigint not null references public.leads(id) on delete cascade,
  de_etapa       text,
  para_etapa     text not null,
  por            uuid references public.perfis(id) on delete set null,
  em             timestamptz not null default now()
);

create or replace function public.registrar_movimentacao()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.etapa is distinct from old.etapa then
    insert into public.movimentacoes_lead (lead_id, de_etapa, para_etapa, por)
    values (new.id, old.etapa, new.etapa, auth.uid());
  end if;
  new.atualizado_em := now();
  return new;
end $$;

drop trigger if exists trg_movimentacao on public.leads;
create trigger trg_movimentacao
  before update on public.leads
  for each row execute function public.registrar_movimentacao();

-- =============================================================================
-- Funções auxiliares de permissão
--
-- SECURITY DEFINER de propósito: as policies precisam ler `perfis` sem cair
-- na própria RLS de `perfis` (o que causaria recursão infinita).
-- =============================================================================

create or replace function public.meu_papel()
returns public.papel_usuario language sql stable security definer set search_path = public as $$
  select papel from public.perfis where id = auth.uid()
$$;

create or replace function public.minha_organizacao()
returns uuid language sql stable security definer set search_path = public as $$
  select organizacao_id from public.perfis where id = auth.uid()
$$;

create or replace function public.sou_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select papel = 'super_admin' from public.perfis where id = auth.uid()), false)
$$;

-- =============================================================================
-- RLS
-- =============================================================================

alter table public.organizacoes       enable row level security;
alter table public.perfis             enable row level security;
alter table public.leads              enable row level security;
alter table public.movimentacoes_lead enable row level security;

-- ------------------------------ organizações --------------------------------

drop policy if exists org_leitura on public.organizacoes;
create policy org_leitura on public.organizacoes for select
  using (public.sou_super_admin() or id = public.minha_organizacao());

drop policy if exists org_escrita on public.organizacoes;
create policy org_escrita on public.organizacoes for all
  using (public.sou_super_admin())
  with check (public.sou_super_admin());

-- --------------------------------- perfis -----------------------------------

drop policy if exists perfis_leitura on public.perfis;
create policy perfis_leitura on public.perfis for select
  using (
    public.sou_super_admin()
    or id = auth.uid()
    or organizacao_id = public.minha_organizacao()
  );

-- Admin gerencia a equipe da própria organização; super admin gerencia tudo.
drop policy if exists perfis_escrita on public.perfis;
create policy perfis_escrita on public.perfis for all
  using (
    public.sou_super_admin()
    or (public.meu_papel() = 'admin' and organizacao_id = public.minha_organizacao())
  )
  with check (
    public.sou_super_admin()
    or (public.meu_papel() = 'admin' and organizacao_id = public.minha_organizacao())
  );

-- Qualquer um edita o próprio nome (sem trocar papel — ver trigger abaixo).
drop policy if exists perfis_proprio on public.perfis;
create policy perfis_proprio on public.perfis for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Impede escalar o próprio papel mesmo com a policy acima.
create or replace function public.travar_autopromocao()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.id = auth.uid()
     and new.papel is distinct from old.papel
     and not public.sou_super_admin() then
    raise exception 'Você não pode alterar o próprio papel.';
  end if;
  return new;
end $$;

drop trigger if exists trg_autopromocao on public.perfis;
create trigger trg_autopromocao
  before update on public.perfis
  for each row execute function public.travar_autopromocao();

-- ---------------------------------- leads -----------------------------------
-- Todos os papéis trabalham os leads da própria organização.
-- O isolamento entre clientes é aqui.

drop policy if exists leads_leitura on public.leads;
create policy leads_leitura on public.leads for select
  using (public.sou_super_admin() or organizacao_id = public.minha_organizacao());

drop policy if exists leads_insercao on public.leads;
create policy leads_insercao on public.leads for insert
  with check (public.sou_super_admin() or organizacao_id = public.minha_organizacao());

drop policy if exists leads_atualizacao on public.leads;
create policy leads_atualizacao on public.leads for update
  using (public.sou_super_admin() or organizacao_id = public.minha_organizacao())
  with check (public.sou_super_admin() or organizacao_id = public.minha_organizacao());

-- Apagar lead é privilégio de admin para cima.
drop policy if exists leads_exclusao on public.leads;
create policy leads_exclusao on public.leads for delete
  using (
    public.sou_super_admin()
    or (public.meu_papel() = 'admin' and organizacao_id = public.minha_organizacao())
  );

-- ------------------------------ movimentações -------------------------------

drop policy if exists mov_leitura on public.movimentacoes_lead;
create policy mov_leitura on public.movimentacoes_lead for select
  using (
    public.sou_super_admin()
    or exists (
      select 1 from public.leads l
      where l.id = lead_id and l.organizacao_id = public.minha_organizacao()
    )
  );

-- =============================================================================
-- Perfil automático a cada cadastro no Auth
-- =============================================================================

create or replace function public.criar_perfil_no_cadastro()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, nome, papel, organizacao_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    'usuario',
    nullif(new.raw_user_meta_data->>'organizacao_id', '')::uuid
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists trg_novo_usuario on auth.users;
create trigger trg_novo_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil_no_cadastro();
