-- Corretor atual continua sendo o vendedor; captador é um papel separado.
-- Não altera vínculos de acesso aos processos existentes.
alter table public.processos add column if not exists captador_id uuid
  references public.corretores(id) on delete set null;
create index if not exists processos_captador_id_idx on public.processos(captador_id);

create or replace function public.validar_captador_empresa()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.captador_id is not null and not exists (
    select 1 from public.corretores c where c.id = new.captador_id and c.tenant_id = new.tenant_id
  ) then
    raise exception 'O captador precisa pertencer à mesma empresa.' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.validar_captador_empresa() from public, anon;
grant execute on function public.validar_captador_empresa() to authenticated;
drop trigger if exists processos_validar_captador_empresa on public.processos;
create trigger processos_validar_captador_empresa
  before insert or update of captador_id, tenant_id on public.processos
  for each row execute function public.validar_captador_empresa();
