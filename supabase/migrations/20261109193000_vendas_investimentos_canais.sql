create table if not exists public.vendas_investimentos_canais (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  canal text not null check (char_length(trim(canal)) between 1 and 100),
  mes text not null check (mes ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'),
  valor numeric(14,2) not null default 0 check (valor >= 0),
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint vendas_investimentos_canais_tenant_canal_mes_unique unique (tenant_id,canal,mes)
);
create index if not exists vendas_investimentos_canais_tenant_mes_idx on public.vendas_investimentos_canais(tenant_id,mes);
alter table public.vendas_investimentos_canais enable row level security;
create policy vendas_investimentos_canais_gestores_select on public.vendas_investimentos_canais for select to authenticated
 using (exists (select 1 from public.usuarios u where u.id=auth.uid() and u.tenant_id=vendas_investimentos_canais.tenant_id and u.ativo=true and u.nivel_acesso::text in ('diretor','gerente')));
create policy vendas_investimentos_canais_gestores_insert on public.vendas_investimentos_canais for insert to authenticated
 with check (exists (select 1 from public.usuarios u where u.id=auth.uid() and u.tenant_id=vendas_investimentos_canais.tenant_id and u.ativo=true and u.nivel_acesso::text in ('diretor','gerente')));
create policy vendas_investimentos_canais_gestores_update on public.vendas_investimentos_canais for update to authenticated
 using (exists (select 1 from public.usuarios u where u.id=auth.uid() and u.tenant_id=vendas_investimentos_canais.tenant_id and u.ativo=true and u.nivel_acesso::text in ('diretor','gerente')))
 with check (exists (select 1 from public.usuarios u where u.id=auth.uid() and u.tenant_id=vendas_investimentos_canais.tenant_id and u.ativo=true and u.nivel_acesso::text in ('diretor','gerente')));
create policy vendas_investimentos_canais_gestores_delete on public.vendas_investimentos_canais for delete to authenticated
 using (exists (select 1 from public.usuarios u where u.id=auth.uid() and u.tenant_id=vendas_investimentos_canais.tenant_id and u.ativo=true and u.nivel_acesso::text in ('diretor','gerente')));
grant select, insert, update, delete on public.vendas_investimentos_canais to authenticated;