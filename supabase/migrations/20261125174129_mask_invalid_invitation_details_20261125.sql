-- Aplicada direto no banco de produção (frente de segurança) em 20261125.
-- Arquivo criado em 25/11/2026 a partir de supabase_migrations.schema_migrations,
-- com o SQL exato, para o repositório acompanhar o banco e o db push não parar.

create or replace function public.convite_validar(p_token uuid)
returns table(email text, valido boolean, nome_empresa text)
language sql stable security definer
set search_path = ''
as $$
  select
    case when c.usado_em is null and c.expira_em > now() then c.email else null::text end as email,
    (c.usado_em is null and c.expira_em > now()) as valido,
    case when c.usado_em is null and c.expira_em > now() then t.nome else null::text end as nome_empresa
  from public.convites c
  join public.tenants t on t.id = c.tenant_id
  where c.token = p_token;
$$;
