-- =========================================================
-- Permissões por categoria: cada usuário só vê os processos
-- (e contratos de locação) das categorias liberadas pra ele.
-- Admin e Diretora sempre veem tudo, sem precisar de linha
-- nenhuma nessa tabela.
-- =========================================================

create table usuario_categorias (
  usuario_id uuid not null references usuarios(id) on delete cascade,
  categoria categoria_processo not null,
  primary key (usuario_id, categoria)
);

alter table usuario_categorias enable row level security;

-- Todo mundo do mesmo tenant pode ver quem tem acesso a quê
-- (útil pra tela de Membros); só admin/diretora podem alterar.
create policy "tenant le usuario_categorias" on usuario_categorias
  for select using (
    usuario_id in (select id from usuarios where tenant_id = auth_tenant_id())
  );

create policy "admin escreve usuario_categorias" on usuario_categorias
  for all using (
    exists (
      select 1 from usuarios u
      where u.id = auth.uid()
        and u.tenant_id = auth_tenant_id()
        and u.perfil in ('admin', 'diretora')
    )
  ) with check (
    usuario_id in (select id from usuarios where tenant_id = auth_tenant_id())
  );

-- ---------------------------------------------------------
-- Função auxiliar: o usuário logado tem acesso a essa
-- categoria? (admin/diretora sempre têm, os demais só se
-- tiverem uma linha liberada em usuario_categorias)
-- ---------------------------------------------------------

create or replace function usuario_tem_categoria(p_categoria categoria_processo)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    exists (
      select 1 from usuarios u
      where u.id = auth.uid() and u.perfil in ('admin', 'diretora')
    )
    or exists (
      select 1 from usuario_categorias uc
      where uc.usuario_id = auth.uid() and uc.categoria = p_categoria
    )
$$;

-- ---------------------------------------------------------
-- Grandfathering: todo mundo que já existe hoje mantém acesso
-- a tudo (ninguém perde acesso de surpresa com essa migration).
-- Pra restringir alguém (ex: Renato só ver Locação), é só
-- remover as categorias que não fazem sentido na tela de
-- Membros depois.
-- ---------------------------------------------------------

insert into usuario_categorias (usuario_id, categoria)
select u.id, c.categoria
from usuarios u
cross join (values ('venda'::categoria_processo), ('financiamento'::categoria_processo), ('locacao'::categoria_processo)) as c(categoria)
where u.tenant_id is not null
on conflict do nothing;

-- ---------------------------------------------------------
-- Passa a aplicar a permissão de categoria nas policies de
-- processos e contratos_locacao. O resto (etapas, checklist,
-- comentários, contas_locacao etc) já filtra através dessas
-- duas tabelas, então herda a proteção automaticamente.
-- ---------------------------------------------------------

drop policy if exists "tenant isolado - processos" on processos;
create policy "tenant isolado - processos" on processos
  for all using (tenant_id = auth_tenant_id() and usuario_tem_categoria(categoria))
  with check (tenant_id = auth_tenant_id() and usuario_tem_categoria(categoria));

drop policy if exists "tenant isolado - contratos_locacao" on contratos_locacao;
create policy "tenant isolado - contratos_locacao" on contratos_locacao
  for all using (tenant_id = auth_tenant_id() and usuario_tem_categoria('locacao'))
  with check (tenant_id = auth_tenant_id() and usuario_tem_categoria('locacao'));

-- ---------------------------------------------------------
-- Quando um usuário novo é criado por um admin/diretora
-- (add_member), agora também recebe as categorias liberadas.
-- ---------------------------------------------------------

create or replace function add_member(p_email text, p_perfil perfil_usuario, p_categorias categoria_processo[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meu_tenant uuid;
  v_meu_perfil perfil_usuario;
  v_alvo_id uuid;
  v_categoria categoria_processo;
begin
  select tenant_id, perfil into v_meu_tenant, v_meu_perfil from public.usuarios where id = auth.uid();

  if v_meu_tenant is null then
    raise exception 'Você ainda não pertence a uma organização.';
  end if;

  if v_meu_perfil not in ('admin','diretora','gerente') then
    raise exception 'Apenas admin, diretora ou gerente podem adicionar membros.';
  end if;

  select id into v_alvo_id from public.usuarios where email = p_email;

  if v_alvo_id is null then
    raise exception 'Essa pessoa ainda não criou uma conta. Peça para ela se cadastrar primeiro em /login.';
  end if;

  update public.usuarios
     set tenant_id = v_meu_tenant,
         perfil = p_perfil
   where id = v_alvo_id;

  delete from public.usuario_categorias where usuario_id = v_alvo_id;
  foreach v_categoria in array p_categorias loop
    insert into public.usuario_categorias (usuario_id, categoria) values (v_alvo_id, v_categoria)
    on conflict do nothing;
  end loop;
end;
$$;

-- Função separada pra editar as categorias de um membro já
-- existente (usada na tela de Membros).
create or replace function atualizar_categorias_membro(p_usuario_id uuid, p_categorias categoria_processo[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meu_perfil perfil_usuario;
  v_meu_tenant uuid;
  v_alvo_tenant uuid;
  v_categoria categoria_processo;
begin
  select tenant_id, perfil into v_meu_tenant, v_meu_perfil from public.usuarios where id = auth.uid();

  if v_meu_perfil not in ('admin','diretora') then
    raise exception 'Apenas admin ou diretora podem alterar permissões.';
  end if;

  select tenant_id into v_alvo_tenant from public.usuarios where id = p_usuario_id;
  if v_alvo_tenant is null or v_alvo_tenant != v_meu_tenant then
    raise exception 'Usuário não encontrado nessa organização.';
  end if;

  delete from public.usuario_categorias where usuario_id = p_usuario_id;
  foreach v_categoria in array p_categorias loop
    insert into public.usuario_categorias (usuario_id, categoria) values (p_usuario_id, v_categoria)
    on conflict do nothing;
  end loop;
end;
$$;
