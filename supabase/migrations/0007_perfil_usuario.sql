-- =========================================================
-- Perfil de usuário: cargo (título livre, ex: "Gerente
-- Administrativo") separado do `perfil` (nível de acesso do
-- sistema). Versão segura pra rodar de novo (idempotente):
-- usa "se não existir" em cada passo, então não quebra mesmo
-- que parte disso já tenha sido criado antes.
-- =========================================================

alter table usuarios add column if not exists cargo text;
alter table usuarios add column if not exists foto_url text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatar - upload proprio" on storage.objects;
create policy "avatar - upload proprio" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar - atualizar proprio" on storage.objects;
create policy "avatar - atualizar proprio" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar - remover proprio" on storage.objects;
create policy "avatar - remover proprio" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar - leitura publica" on storage.objects;
create policy "avatar - leitura publica" on storage.objects
  for select to public
  using (bucket_id = 'avatars');
