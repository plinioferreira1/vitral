-- Amplia apenas o vínculo profissional, não os privilégios administrativos.
-- A checagem de gestor por auth.uid continua obrigatória no app.
-- session_user='postgres' é reservado à migração executada pelo administrador do banco.
CREATE OR REPLACE FUNCTION vitral_private.validar_vinculo_corretor()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if (tg_op='INSERT' and new.usuario_id is not null) or (tg_op='UPDATE' and (new.usuario_id is distinct from old.usuario_id or new.tenant_id is distinct from old.tenant_id)) then
  if session_user <> 'postgres' and not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.ativo and u.tenant_id=new.tenant_id and u.nivel_acesso in ('diretor','gerente')) then
   raise exception 'Somente a gestão pode alterar o vínculo do corretor.' using errcode='42501';
  end if;
  if new.usuario_id is not null and not exists(select 1 from public.usuarios u where u.id=new.usuario_id and u.tenant_id=new.tenant_id and u.ativo and u.nivel_acesso <> 'social_media') then
   raise exception 'Escolha uma conta ativa da operação imobiliária da mesma empresa.' using errcode='42501';
  end if;
 end if;
 return new;
end $function$
;
