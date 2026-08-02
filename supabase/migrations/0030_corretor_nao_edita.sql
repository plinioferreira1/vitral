-- =========================================================
-- Corretor nunca pode editar processos/locação, mesmo que por
-- engano ganhe alguma categoria liberada em usuario_categorias
-- (defensivo — o normal é ele não ter nenhuma).
-- =========================================================

create or replace function usuario_pode_editar()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select nivel_acesso not in ('auxiliar', 'corretor') from usuarios where id = auth.uid()),
    false
  )
$$;
