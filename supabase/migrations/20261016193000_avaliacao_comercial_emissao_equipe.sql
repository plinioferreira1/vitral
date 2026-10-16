-- Estudo comercial: qualquer pessoa ativa da equipe (exceto social media) pode
-- aprovar e emitir; o documento sai assinado pela responsável técnica
-- configurada. PTAM continua exclusivo da responsável técnica.
-- As configurações de avaliação continuam só com a gestão/responsável técnica.

create or replace function public.avaliacao_pode_configurar()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios u
    left join public.avaliacao_config c on c.tenant_id = u.tenant_id
    where u.id = (select auth.uid())
      and (c.responsavel_usuario_id = u.id or u.nivel_acesso in ('diretor', 'gerente'))
  );
$$;
revoke all on function public.avaliacao_pode_configurar() from public, anon;
grant execute on function public.avaliacao_pode_configurar() to authenticated;

drop policy if exists "avaliacao_config insercao gestores" on public.avaliacao_config;
create policy "avaliacao_config insercao gestores" on public.avaliacao_config
  for insert to authenticated
  with check (tenant_id = public.auth_tenant_id() and public.avaliacao_pode_configurar());
drop policy if exists "avaliacao_config edicao gestores" on public.avaliacao_config;
create policy "avaliacao_config edicao gestores" on public.avaliacao_config
  for update to authenticated
  using (tenant_id = public.auth_tenant_id() and public.avaliacao_pode_configurar())
  with check (tenant_id = public.auth_tenant_id());

create or replace function public.avaliacao_pode_aprovar(p_modalidade text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios u
    left join public.avaliacao_config c on c.tenant_id = u.tenant_id
    where u.id = (select auth.uid())
      and coalesce(u.ativo, true)
      and (
        c.responsavel_usuario_id = u.id
        or (p_modalidade = 'estudo_comercial' and u.nivel_acesso <> 'social_media')
      )
  );
$$;
