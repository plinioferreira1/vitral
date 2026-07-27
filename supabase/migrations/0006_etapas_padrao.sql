-- =========================================================
-- Catálogo de "etapas padrão": uma lista de nomes de etapa
-- que a imobiliária usa no dia a dia (Contrato Assinado,
-- Trâmites do Financiamento, Registro, etc.), configurável,
-- que pode ser marcada/desmarcada em cada processo — em vez
-- de um fluxo fixo sequencial com datas automáticas.
-- =========================================================

create table etapas_padrao (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  nome text not null,
  ordem int not null default 0,
  criado_em timestamptz not null default now()
);

create index idx_etapas_padrao_tenant on etapas_padrao(tenant_id);

alter table etapas_padrao enable row level security;

create policy "tenant isolado - etapas_padrao" on etapas_padrao
  for all using (tenant_id = auth_tenant_id()) with check (tenant_id = auth_tenant_id());

-- ---------------------------------------------------------
-- Função de seed (chamada automaticamente para tenants
-- novos, e pode ser chamada manualmente para o tenant atual)
-- ---------------------------------------------------------

create or replace function seed_etapas_padrao(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.etapas_padrao (tenant_id, nome, ordem) values
    (p_tenant_id, 'Contrato Assinado', 1),
    (p_tenant_id, 'Trâmites do Financiamento', 2),
    (p_tenant_id, 'Trâmites do FGTS', 3),
    (p_tenant_id, 'Pagamento Intermediária', 4),
    (p_tenant_id, 'Pagamento Financiamento', 5),
    (p_tenant_id, 'Pagamento FGTS', 6),
    (p_tenant_id, 'Pagamento Comissão', 7),
    (p_tenant_id, 'Escritura', 8),
    (p_tenant_id, 'Registro', 9),
    (p_tenant_id, 'Aguardando Posse', 10),
    (p_tenant_id, 'Aguardando Alvará Judicial', 11),
    (p_tenant_id, 'Em Acordo/Aditivo', 12),
    (p_tenant_id, 'Em Processo Judicial', 13),
    (p_tenant_id, 'Inadimplente', 14),
    (p_tenant_id, 'Transferência', 15),
    (p_tenant_id, '100% Concluído', 16);
end;
$$;

-- Passa a rodar automaticamente pra organizações novas
create or replace function bootstrap_tenant(p_nome_empresa text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_ja_tem_tenant uuid;
begin
  select tenant_id into v_ja_tem_tenant from public.usuarios where id = auth.uid();
  if v_ja_tem_tenant is not null then
    raise exception 'Este usuário já pertence a uma organização.';
  end if;

  insert into public.tenants (nome) values (p_nome_empresa) returning id into v_tenant_id;

  update public.usuarios
     set tenant_id = v_tenant_id,
         perfil = 'admin'
   where id = auth.uid();

  perform seed_modelos_padrao(v_tenant_id);
  perform seed_etapas_padrao(v_tenant_id);

  return v_tenant_id;
end;
$$;

-- Popula pro tenant que já existe (Sacra)
do $$
declare
  v_tenant_id uuid;
begin
  select id into v_tenant_id from public.tenants limit 1;
  if v_tenant_id is not null and not exists (select 1 from public.etapas_padrao where tenant_id = v_tenant_id) then
    perform seed_etapas_padrao(v_tenant_id);
  end if;
end $$;
