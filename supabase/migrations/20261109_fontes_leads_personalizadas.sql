-- Fontes adicionais configuráveis por imobiliária, sem alterar fontes históricas.
create table if not exists public.vendas_fontes_personalizadas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  nome text not null check (char_length(btrim(nome)) between 2 and 100),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create unique index if not exists vendas_fontes_personalizadas_tenant_nome_unique
  on public.vendas_fontes_personalizadas (tenant_id, lower(btrim(nome)));
create index if not exists vendas_fontes_personalizadas_tenant_ativo_idx
  on public.vendas_fontes_personalizadas (tenant_id, ativo, nome);
alter table public.vendas_fontes_personalizadas enable row level security;

create policy "Fontes da propria imobiliaria - leitura"
  on public.vendas_fontes_personalizadas for select to authenticated
  using (exists (
    select 1 from public.usuarios u
    where u.id = auth.uid() and u.tenant_id = vendas_fontes_personalizadas.tenant_id and u.ativo
  ));

create policy "Fontes da propria imobiliaria - cadastro"
  on public.vendas_fontes_personalizadas for insert to authenticated
  with check (exists (
    select 1 from public.usuarios u
    where u.id = auth.uid() and u.tenant_id = vendas_fontes_personalizadas.tenant_id and u.ativo
      and u.nivel_acesso::text in ('diretor','gerente')
  ));

create policy "Fontes da propria imobiliaria - atualizacao"
  on public.vendas_fontes_personalizadas for update to authenticated
  using (exists (
    select 1 from public.usuarios u
    where u.id = auth.uid() and u.tenant_id = vendas_fontes_personalizadas.tenant_id and u.ativo
      and u.nivel_acesso::text in ('diretor','gerente')
  ))
  with check (exists (
    select 1 from public.usuarios u
    where u.id = auth.uid() and u.tenant_id = vendas_fontes_personalizadas.tenant_id and u.ativo
      and u.nivel_acesso::text in ('diretor','gerente')
  ));
