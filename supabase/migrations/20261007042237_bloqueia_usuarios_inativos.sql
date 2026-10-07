-- Um usuário desativado deixa de receber tenant_id nas políticas RLS.
-- Assim, sessões já abertas perdem acesso aos dados imediatamente, sem
-- apagar a conta nem o histórico ligado a ela.
create or replace function public.auth_tenant_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select tenant_id
  from public.usuarios
  where id = (select auth.uid())
    and ativo = true
$$;

-- A pessoa ainda pode ler a própria linha para que o middleware mostre a
-- tela correta, mesmo depois de perder acesso às demais linhas do tenant.
drop policy if exists "usuario le a si mesmo" on public.usuarios;
create policy "usuario le a si mesmo" on public.usuarios
  for select to authenticated
  using (id = (select auth.uid()));

-- A política antiga deixava a própria pessoa atualizar a linha inteira.
-- Além de exigir que ela ainda esteja ativa, o WITH CHECK impede que uma
-- sessão comum altere `ativo`; essa mudança fica restrita ao servidor admin.
drop policy if exists "usuario atualiza a si mesmo" on public.usuarios;
create policy "usuario atualiza a si mesmo" on public.usuarios
  for update to authenticated
  using (id = (select auth.uid()) and ativo = true)
  with check (id = (select auth.uid()) and ativo = true);

