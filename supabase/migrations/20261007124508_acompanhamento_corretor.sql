-- Canal de leitura restrito: nenhuma permissão operacional é ampliada.
create schema if not exists vitral_private;
revoke all on schema vitral_private from public, anon;
grant usage on schema vitral_private to authenticated;

create index if not exists corretores_usuario_acompanhamento_idx on public.corretores(usuario_id, tenant_id);
create index if not exists processos_corretor_acompanhamento_idx on public.processos(corretor_id, categoria);

create table public.processo_atualizacoes_corretor (
 id uuid primary key default gen_random_uuid(),
 processo_id uuid not null references public.processos(id) on delete cascade,
 autor_id uuid not null references public.usuarios(id),
 mensagem text not null check (length(btrim(mensagem)) between 1 and 2000),
 criado_em timestamptz not null default now()
);
create index processo_atualizacoes_corretor_processo_idx on public.processo_atualizacoes_corretor(processo_id, criado_em desc);
alter table public.processo_atualizacoes_corretor enable row level security;
revoke all on public.processo_atualizacoes_corretor from anon, authenticated;
grant select, insert on public.processo_atualizacoes_corretor to authenticated;
create policy "gestao consulta atualizacoes corretor" on public.processo_atualizacoes_corretor for select to authenticated using (
 exists(select 1 from public.usuarios u join public.processos p on p.tenant_id=u.tenant_id where u.id=(select auth.uid()) and u.ativo and u.nivel_acesso in ('diretor','gerente') and p.id=processo_id)
);
create policy "gestao publica atualizacoes corretor" on public.processo_atualizacoes_corretor for insert to authenticated with check (
 autor_id=(select auth.uid()) and exists(select 1 from public.usuarios u join public.processos p on p.tenant_id=u.tenant_id where u.id=(select auth.uid()) and u.ativo and u.nivel_acesso in ('diretor','gerente') and p.id=processo_id and p.categoria='venda')
);

-- Um corretor não pode alterar seu próprio vínculo por chamadas diretas.
drop policy "tenant isolado - corretores" on public.corretores;
create policy "corretores operacional" on public.corretores for all to authenticated using (
 tenant_id=public.auth_tenant_id() and exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.ativo and u.nivel_acesso <> 'corretor')
) with check (
 tenant_id=public.auth_tenant_id() and exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.ativo and u.nivel_acesso <> 'corretor')
);
create function vitral_private.validar_vinculo_corretor() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (tg_op='INSERT' and new.usuario_id is not null) or (tg_op='UPDATE' and (new.usuario_id is distinct from old.usuario_id or new.tenant_id is distinct from old.tenant_id)) then
  if not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.ativo and u.tenant_id=new.tenant_id and u.nivel_acesso in ('diretor','gerente')) then
   raise exception 'Somente a gestão pode alterar o vínculo do corretor.' using errcode='42501';
  end if;
  if new.usuario_id is not null and not exists(select 1 from public.usuarios u where u.id=new.usuario_id and u.tenant_id=new.tenant_id and u.nivel_acesso='corretor') then
   raise exception 'Escolha uma conta de corretor da mesma empresa.' using errcode='42501';
  end if;
 end if;
 return new;
end $$;
revoke all on function vitral_private.validar_vinculo_corretor() from public, anon, authenticated;
create trigger corretores_guardar_vinculo before insert or update on public.corretores for each row execute function vitral_private.validar_vinculo_corretor();

-- Mesmo categorias atribuídas por engano não liberam processos operacionais a corretores.
create or replace function public.usuario_tem_categoria(p_categoria public.categoria_processo) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.usuarios u where u.id=auth.uid() and u.ativo and u.nivel_acesso <> 'corretor' and (
 u.nivel_acesso in ('diretor','gerente','auxiliar') or exists(select 1 from public.usuario_categorias c where c.usuario_id=u.id and c.categoria=p_categoria)));
$$;

-- Esta função privada retorna somente o contrato de dados permitido.
create function vitral_private.minhas_vendas(p_id uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_usuario public.usuarios%rowtype; v_vendas jsonb;
begin
 select * into v_usuario from public.usuarios where id=auth.uid() and ativo and nivel_acesso='corretor';
 if not found then raise exception 'Acesso indisponível.' using errcode='42501'; end if;
 select coalesce(jsonb_agg(item order by criado_em desc), '[]'::jsonb) into v_vendas from (
  select p.criado_em, jsonb_build_object(
   'id',p.id,'numero',p.numero_processo,'status',p.status,'imovel',i.endereco,
   'comprador',comprador.nome,'vendedor',vendedor.nome,'responsavel',u.nome,
   'prazo_contrato',p.data_final_contrato,'assinatura_contrato',p.data_assinatura,
   'etapas',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'nome',e.nome,'status',e.status,'prevista',e.data_prevista,'realizada',e.data_realizada,'ordem',e.ordem) order by e.ordem,e.id) from public.etapas e where e.processo_id=p.id),'[]'::jsonb),
   'atualizacoes',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'mensagem',a.mensagem,'criado_em',a.criado_em,'autor',au.nome) order by a.criado_em desc,a.id) from public.processo_atualizacoes_corretor a left join public.usuarios au on au.id=a.autor_id and au.tenant_id=v_usuario.tenant_id where a.processo_id=p.id),'[]'::jsonb)
  ) as item from public.processos p
  join public.corretores c on c.id=p.corretor_id and c.usuario_id=v_usuario.id and c.tenant_id=v_usuario.tenant_id
  left join public.imoveis i on i.id=p.imovel_id and i.tenant_id=v_usuario.tenant_id
  left join public.clientes comprador on comprador.id=p.comprador_id and comprador.tenant_id=v_usuario.tenant_id
  left join public.clientes vendedor on vendedor.id=p.vendedor_id and vendedor.tenant_id=v_usuario.tenant_id
  left join public.usuarios u on u.id=p.responsavel_id and u.tenant_id=v_usuario.tenant_id
  where p.tenant_id=v_usuario.tenant_id and p.categoria='venda' and (p_id is null or p.id=p_id)
 ) vendas;
 return jsonb_build_object('vinculado',exists(select 1 from public.corretores where usuario_id=v_usuario.id and tenant_id=v_usuario.tenant_id),'vendas',v_vendas);
end $$;
revoke all on function vitral_private.minhas_vendas(uuid) from public, anon, authenticated;
grant execute on function vitral_private.minhas_vendas(uuid) to authenticated;
create function public.minhas_vendas(p_id uuid default null) returns jsonb language sql stable security invoker set search_path='' as $$ select vitral_private.minhas_vendas(p_id) $$;
revoke all on function public.minhas_vendas(uuid) from public, anon, authenticated;
grant execute on function public.minhas_vendas(uuid) to authenticated;
