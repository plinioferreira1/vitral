-- Carteira de relacionamento: separada dos clientes e processos operacionais.
create type public.radar_situacao as enum ('ativo','pausado','convertido','arquivado');
create table public.radar_clientes (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references public.tenants(id),
 responsavel_id uuid not null references public.usuarios(id),
 nome text not null check (length(trim(nome)) between 2 and 160),
 telefone text not null default '' check (length(telefone)<=40),
 email text not null default '' check (length(email)<=200),
 interesse text not null default '' check (length(interesse)<=2000),
 proxima_acao text not null check (length(trim(proxima_acao)) between 2 and 500),
 proximo_contato date not null,
 situacao public.radar_situacao not null default 'ativo',
 criado_em timestamptz not null default now(),
 atualizado_em timestamptz not null default clock_timestamp()
);
create index radar_carteira on public.radar_clientes(tenant_id,responsavel_id,situacao,proximo_contato);
create table public.radar_contatos (
 id uuid primary key default gen_random_uuid(),
 cliente_id uuid not null references public.radar_clientes(id),
 autor_id uuid not null references public.usuarios(id) default auth.uid(),
 resumo text not null check (length(trim(resumo)) between 2 and 3000),
 criado_em timestamptz not null default now()
);
create index radar_historico on public.radar_contatos(cliente_id,criado_em desc);
alter table public.radar_clientes enable row level security;
alter table public.radar_contatos enable row level security;
revoke all on public.radar_clientes, public.radar_contatos from anon,authenticated;
grant select,insert on public.radar_clientes to authenticated;
grant update(nome,telefone,email,interesse,proxima_acao,proximo_contato,situacao,atualizado_em) on public.radar_clientes to authenticated;
grant select,insert on public.radar_contatos to authenticated;
create policy radar_leitura on public.radar_clientes for select to authenticated using (
 exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.ativo and u.tenant_id=radar_clientes.tenant_id
 and (u.nivel_acesso in ('diretor','gerente') or (u.nivel_acesso='corretor' and u.id=responsavel_id)))
);
create policy radar_cadastro on public.radar_clientes for insert to authenticated with check (
 exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.ativo and u.tenant_id=radar_clientes.tenant_id
 and (u.nivel_acesso in ('diretor','gerente') or (u.nivel_acesso='corretor' and u.id=responsavel_id)))
 and exists(select 1 from public.usuarios dono where dono.id=responsavel_id and dono.tenant_id=radar_clientes.tenant_id and dono.ativo and dono.nivel_acesso in ('corretor','diretor','gerente'))
);
create policy radar_edicao on public.radar_clientes for update to authenticated using (
 exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.ativo and u.tenant_id=radar_clientes.tenant_id
 and (u.nivel_acesso in ('diretor','gerente') or (u.nivel_acesso='corretor' and u.id=responsavel_id)))
) with check (
 exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.ativo and u.tenant_id=radar_clientes.tenant_id
 and (u.nivel_acesso in ('diretor','gerente') or (u.nivel_acesso='corretor' and u.id=responsavel_id)))
);
create policy radar_historico_leitura on public.radar_contatos for select to authenticated using (exists(select 1 from public.radar_clientes c where c.id=cliente_id));
create policy radar_historico_cadastro on public.radar_contatos for insert to authenticated with check (autor_id=(select auth.uid()) and exists(select 1 from public.radar_clientes c where c.id=cliente_id));
-- A gravação do contato e o reagendamento acontecem juntos, respeitando RLS.
create function public.radar_registrar_contato(p_cliente uuid,p_resumo text,p_data date,p_acao text,p_versao timestamptz)
returns void language plpgsql security invoker set search_path='' as $$
begin
 if p_data < (now() at time zone 'America/Sao_Paulo')::date then raise exception 'Escolha hoje ou uma data futura para o próximo contato.'; end if;
 update public.radar_clientes set proximo_contato=p_data,proxima_acao=p_acao,atualizado_em=clock_timestamp()
 where id=p_cliente and atualizado_em=p_versao and situacao='ativo';
 if not found then raise exception 'O cadastro mudou ou não está disponível. Atualize a página antes de continuar.'; end if;
 insert into public.radar_contatos(cliente_id,resumo) values(p_cliente,p_resumo);
end $$;
revoke all on function public.radar_registrar_contato(uuid,text,date,text,timestamptz) from public,anon;
grant execute on function public.radar_registrar_contato(uuid,text,date,text,timestamptz) to authenticated;
