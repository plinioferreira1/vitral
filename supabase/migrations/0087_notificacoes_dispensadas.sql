-- Notificações dispensadas individualmente por usuário.
-- A data faz parte da chave para que uma etapa volte a aparecer
-- quando seu prazo for alterado.

create table public.notificacoes_dispensadas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  etapa_id uuid not null references public.etapas(id) on delete cascade,
  data_prevista date not null,
  criado_em timestamptz not null default now(),
  unique (usuario_id, etapa_id, data_prevista)
);

alter table public.notificacoes_dispensadas enable row level security;

grant select, insert, delete on public.notificacoes_dispensadas to authenticated;

create policy "notificacoes_dispensadas_select_proprias"
on public.notificacoes_dispensadas
for select
to authenticated
using ((select auth.uid()) = usuario_id);

create policy "notificacoes_dispensadas_insert_proprias"
on public.notificacoes_dispensadas
for insert
to authenticated
with check ((select auth.uid()) = usuario_id);

create policy "notificacoes_dispensadas_delete_proprias"
on public.notificacoes_dispensadas
for delete
to authenticated
using ((select auth.uid()) = usuario_id);
