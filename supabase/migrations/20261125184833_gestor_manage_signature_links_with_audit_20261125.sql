-- Aplicada direto no banco de produção (frente de segurança) em 20261125.
-- Arquivo criado em 25/11/2026 a partir de supabase_migrations.schema_migrations,
-- com o SQL exato, para o repositório acompanhar o banco e o db push não parar.

create table if not exists public.links_assinatura_auditoria (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null,
 documento_tipo text not null check (documento_tipo in ('autorizacao_venda','carta_proposta','termo_entrega','termo_visita')),
 signatario_id uuid not null,
 acao text not null check (acao in ('revogar','definir_validade')),
 expira_em_anterior timestamptz,
 expira_em_novo timestamptz,
 revogado_em_anterior timestamptz,
 revogado_em_novo timestamptz,
 executado_por uuid not null,
 criado_em timestamptz not null default now()
);
alter table public.links_assinatura_auditoria enable row level security;
revoke all on public.links_assinatura_auditoria from public, anon, authenticated;
create index if not exists idx_links_assinatura_auditoria_tenant_data on public.links_assinatura_auditoria (tenant_id, criado_em desc);

create or replace function public.gerenciar_link_assinatura(
 p_tipo text, p_signatario_id uuid, p_acao text, p_expira_em timestamptz default null
) returns boolean language plpgsql security definer set search_path = ''
as $func$
declare
 v_usuario uuid := (select auth.uid());
 v_tenant uuid;
 v_expira_anterior timestamptz;
 v_revogado_anterior timestamptz;
 v_expira_novo timestamptz;
 v_revogado_novo timestamptz;
 v_rows integer;
begin
 select u.tenant_id into v_tenant from public.usuarios u
 where u.id=v_usuario and u.ativo is true and u.nivel_acesso in ('diretor','gerente');
 if v_tenant is null or p_signatario_id is null then
   raise exception 'Acesso não autorizado';
 end if;
 if p_acao not in ('revogar','definir_validade') or p_acao is null
    or p_tipo not in ('autorizacao_venda','carta_proposta','termo_entrega','termo_visita') or p_tipo is null then
   raise exception 'Operação inválida';
 end if;
 if p_acao='definir_validade' and (p_expira_em is null or p_expira_em <= now()) then
   raise exception 'A validade deve ser futura';
 end if;
 if p_tipo='autorizacao_venda' then
   select s.link_expira_em,s.link_revogado_em into v_expira_anterior,v_revogado_anterior
   from public.autorizacao_signatarios s join public.autorizacoes_venda a on a.id=s.autorizacao_id
   where s.id=p_signatario_id and a.tenant_id=v_tenant and a.status='pendente' and s.assinado_em is null
   for update of s;
 elsif p_tipo='carta_proposta' then
   select s.link_expira_em,s.link_revogado_em into v_expira_anterior,v_revogado_anterior
   from public.carta_proposta_signatarios s join public.cartas_proposta p on p.id=s.carta_proposta_id
   where s.id=p_signatario_id and p.tenant_id=v_tenant and p.status='pendente' and s.assinado_em is null
   for update of s;
 elsif p_tipo='termo_entrega' then
   select s.link_expira_em,s.link_revogado_em into v_expira_anterior,v_revogado_anterior
   from public.termo_entrega_signatarios s join public.termos_entrega t on t.id=s.termo_id
   where s.id=p_signatario_id and t.tenant_id=v_tenant and t.versao=s.versao and t.status in ('aguardando_assinatura','parcialmente_assinado') and s.assinado_em is null
   for update of s;
 else
   select t.link_expira_em,t.link_revogado_em into v_expira_anterior,v_revogado_anterior
   from public.termos_visita t where t.id=p_signatario_id
   and t.tenant_id=v_tenant and t.status='pendente' and t.assinado_em is null
   for update of t;
 end if;
 if not found then
   raise exception 'Link não encontrado ou documento não está pendente';
 end if;
 if v_revogado_anterior is not null then
   raise exception 'Link já revogado';
 end if;
 v_expira_novo := case when p_acao='definir_validade' then p_expira_em else v_expira_anterior end;
 v_revogado_novo := case when p_acao='revogar' then now() else v_revogado_anterior end;
 if p_tipo='autorizacao_venda' then
   update public.autorizacao_signatarios set link_expira_em=v_expira_novo,link_revogado_em=v_revogado_novo where id=p_signatario_id;
 elsif p_tipo='carta_proposta' then
   update public.carta_proposta_signatarios set link_expira_em=v_expira_novo,link_revogado_em=v_revogado_novo where id=p_signatario_id;
 elsif p_tipo='termo_entrega' then
   update public.termo_entrega_signatarios set link_expira_em=v_expira_novo,link_revogado_em=v_revogado_novo where id=p_signatario_id;
 else
   update public.termos_visita set link_expira_em=v_expira_novo,link_revogado_em=v_revogado_novo where id=p_signatario_id;
 end if;
 get diagnostics v_rows = row_count;
 if v_rows <> 1 then raise exception 'Falha ao alterar link'; end if;
 insert into public.links_assinatura_auditoria(
   tenant_id,documento_tipo,signatario_id,acao,expira_em_anterior,expira_em_novo,
   revogado_em_anterior,revogado_em_novo,executado_por)
 values(v_tenant,p_tipo,p_signatario_id,p_acao,v_expira_anterior,v_expira_novo,
        v_revogado_anterior,v_revogado_novo,v_usuario);
 return true;
end;
$func$;
revoke all on function public.gerenciar_link_assinatura(text,uuid,text,timestamptz) from public, anon;
grant execute on function public.gerenciar_link_assinatura(text,uuid,text,timestamptz) to authenticated;
