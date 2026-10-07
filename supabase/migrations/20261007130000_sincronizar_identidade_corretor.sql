-- E-mail de login e cadastro ficam consistentes na mesma transação do Auth.
create function vitral_private.sincronizar_email_usuario() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.email is not null then
  update public.usuarios set email=new.email where id=new.id and email is distinct from new.email;
 end if;
 return new;
end $$;
revoke all on function vitral_private.sincronizar_email_usuario() from public, anon, authenticated;
create trigger vitral_sincronizar_email after update of email on auth.users
for each row when (old.email is distinct from new.email) execute function vitral_private.sincronizar_email_usuario();

-- Só sincroniza cadastros explicitamente vinculados, nunca por semelhança de nome.
create function vitral_private.sincronizar_nome_corretor() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 update public.corretores set nome=new.nome where usuario_id=new.id and tenant_id=new.tenant_id and nome is distinct from new.nome;
 return new;
end $$;
revoke all on function vitral_private.sincronizar_nome_corretor() from public, anon, authenticated;
create trigger vitral_sincronizar_nome_corretor after update of nome on public.usuarios
for each row when (old.nome is distinct from new.nome) execute function vitral_private.sincronizar_nome_corretor();

-- Corrige divergências deixadas por edições que atualizaram somente o Auth.
update public.usuarios u set email=a.email from auth.users a
where a.id=u.id and a.email is not null and u.email is distinct from a.email;
