-- Convites: tira do painel do Supabase o cadastro de funcionário.

create table if not exists public.convites (
  id              uuid primary key default gen_random_uuid(),
  organizacao_id  uuid not null references public.organizacoes(id) on delete cascade,
  email           text not null,
  papel           public.papel_usuario not null default 'usuario',
  token           text not null unique default encode(gen_random_bytes(24), 'hex'),
  expira_em       timestamptz not null default now() + interval '7 days',
  aceito_em       timestamptz,
  criado_por      uuid references public.perfis(id) on delete set null,
  criado_em       timestamptz not null default now()
);

create index if not exists convites_org_idx on public.convites(organizacao_id);

alter table public.convites enable row level security;

-- Convite é assunto de quem administra. Usuário comum não lê nem cria.
drop policy if exists convites_leitura on public.convites;
create policy convites_leitura on public.convites for select
  using (
    public.sou_super_admin()
    or (public.meu_papel() = 'admin' and organizacao_id = public.minha_organizacao())
  );

drop policy if exists convites_escrita on public.convites;
create policy convites_escrita on public.convites for all
  using (
    public.sou_super_admin()
    or (public.meu_papel() = 'admin' and organizacao_id = public.minha_organizacao())
  )
  with check (
    public.sou_super_admin()
    or (public.meu_papel() = 'admin' and organizacao_id = public.minha_organizacao())
  );
