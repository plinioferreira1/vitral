create table if not exists public.vendas_fontes_historicas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  imovel_nome text not null,
  mes_venda text not null check (mes_venda ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'),
  fonte_lead text,
  fonte_lead_observacoes text,
  criado_em timestamptz not null default now(),
  constraint vendas_fontes_historicas_nome_ano_unique unique(tenant_id, imovel_nome, mes_venda)
);
create index if not exists vendas_fontes_historicas_tenant_mes_idx on public.vendas_fontes_historicas (tenant_id, mes_venda);
alter table public.vendas_fontes_historicas enable row level security;
create policy vendas_fontes_historicas_gestores_select on public.vendas_fontes_historicas for select to authenticated
using(exists(select 1 from public.usuarios u where u.id=auth.uid() and u.tenant_id=vendas_fontes_historicas.tenant_id and u.nivel_acesso::text in ('diretor','gerente') and u.ativo=true));
create policy vendas_fontes_historicas_gestores_insert on public.vendas_fontes_historicas for insert to authenticated
with check(exists(select 1 from public.usuarios u where u.id=auth.uid() and u.tenant_id=vendas_fontes_historicas.tenant_id and u.nivel_acesso::text in ('diretor','gerente') and u.ativo=true));
create policy vendas_fontes_historicas_gestores_update on public.vendas_fontes_historicas for update to authenticated
using(exists(select 1 from public.usuarios u where u.id=auth.uid() and u.tenant_id=vendas_fontes_historicas.tenant_id and u.nivel_acesso::text in ('diretor','gerente') and u.ativo=true))
with check(exists(select 1 from public.usuarios u where u.id=auth.uid() and u.tenant_id=vendas_fontes_historicas.tenant_id and u.nivel_acesso::text in ('diretor','gerente') and u.ativo=true));
create policy vendas_fontes_historicas_gestores_delete on public.vendas_fontes_historicas for delete to authenticated
using(exists(select 1 from public.usuarios u where u.id=auth.uid() and u.tenant_id=vendas_fontes_historicas.tenant_id and u.nivel_acesso::text in ('diretor','gerente') and u.ativo=true));