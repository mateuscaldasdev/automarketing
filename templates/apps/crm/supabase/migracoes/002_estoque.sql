-- Estoque: controle interno do cliente.
-- Desligado do funil de propósito — não dá baixa quando o lead fecha.

create table if not exists public.produtos (
  id              uuid primary key default gen_random_uuid(),
  organizacao_id  uuid not null references public.organizacoes(id) on delete cascade,
  nome            text not null,
  sku             text default '',
  unidade         text not null default 'un',
  saldo           numeric(12,3) not null default 0,
  minimo          numeric(12,3) not null default 0,
  ativo           boolean not null default true,
  criado_em       timestamptz not null default now()
);

create index if not exists produtos_org_idx on public.produtos(organizacao_id);

-- Append-only: correção é lançamento de ajuste, nunca edição de histórico.
create table if not exists public.movimentacoes_estoque (
  id              bigint generated always as identity primary key,
  produto_id      uuid not null references public.produtos(id) on delete cascade,
  organizacao_id  uuid not null references public.organizacoes(id) on delete cascade,
  tipo            text not null check (tipo in ('entrada','saida','ajuste')),
  quantidade      numeric(12,3) not null,
  motivo          text default '',
  autor           uuid references public.perfis(id) on delete set null,
  criado_em       timestamptz not null default now()
);

create index if not exists mov_estoque_produto_idx on public.movimentacoes_estoque(produto_id);

-- O saldo é derivado, mas fica materializado para a tela não somar o histórico
-- inteiro a cada carregamento. O trigger é o que mantém os dois coerentes.
create or replace function public.aplicar_movimentacao_estoque()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.tipo = 'entrada' then
    update public.produtos set saldo = saldo + new.quantidade where id = new.produto_id;
  elsif new.tipo = 'saida' then
    update public.produtos set saldo = saldo - new.quantidade where id = new.produto_id;
  else
    update public.produtos set saldo = new.quantidade where id = new.produto_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_mov_estoque on public.movimentacoes_estoque;
create trigger trg_mov_estoque
  after insert on public.movimentacoes_estoque
  for each row execute function public.aplicar_movimentacao_estoque();

alter table public.produtos              enable row level security;
alter table public.movimentacoes_estoque enable row level security;

drop policy if exists produtos_leitura on public.produtos;
create policy produtos_leitura on public.produtos for select
  using (public.sou_super_admin() or organizacao_id = public.minha_organizacao());

drop policy if exists produtos_escrita on public.produtos;
create policy produtos_escrita on public.produtos for all
  using (public.sou_super_admin() or organizacao_id = public.minha_organizacao())
  with check (public.sou_super_admin() or organizacao_id = public.minha_organizacao());

drop policy if exists mov_estoque_leitura on public.movimentacoes_estoque;
create policy mov_estoque_leitura on public.movimentacoes_estoque for select
  using (public.sou_super_admin() or organizacao_id = public.minha_organizacao());

drop policy if exists mov_estoque_insercao on public.movimentacoes_estoque;
create policy mov_estoque_insercao on public.movimentacoes_estoque for insert
  with check (public.sou_super_admin() or organizacao_id = public.minha_organizacao());
