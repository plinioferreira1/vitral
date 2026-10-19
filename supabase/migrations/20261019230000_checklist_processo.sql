-- Checklists de financiamento (ex.: Conformidade) marcados em cada processo.
-- Os itens vêm do modelo editável em Configurações; aqui fica só o que já foi
-- conferido em cada processo. Item removido do modelo some junto (cascade).
-- Leitura para quem enxerga o processo; gravação só pelo servidor.
create table public.processo_checklist_marcas (
  processo_id uuid not null references public.processos(id) on delete cascade,
  item_id uuid not null references public.checklist_grupo_itens(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  marcado_por uuid references public.usuarios(id) on delete set null,
  marcado_em timestamptz not null default now(),
  primary key (processo_id, item_id)
);
create index processo_checklist_marcas_item_idx on public.processo_checklist_marcas (item_id);
create index processo_checklist_marcas_tenant_idx on public.processo_checklist_marcas (tenant_id);
create index processo_checklist_marcas_usuario_idx on public.processo_checklist_marcas (marcado_por);

alter table public.processo_checklist_marcas enable row level security;
revoke all on public.processo_checklist_marcas from anon, authenticated;
grant select on public.processo_checklist_marcas to authenticated;
grant all on public.processo_checklist_marcas to service_role;

create policy "processo checklist marcas leitura" on public.processo_checklist_marcas
  for select to authenticated
  using (
    tenant_id = (select public.auth_tenant_id())
    and exists (select 1 from public.processos p where p.id = processo_id)
  );
