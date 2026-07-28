-- =========================================================
-- Nível de acesso: um campo novo, separado do `perfil`
-- (Corretor/Correspondente/Financeiro/etc continuam existindo
-- como estão). Esse campo novo é quem decide de verdade o que
-- a pessoa pode ver e editar:
--   diretor / gerente  -> vê e edita tudo
--   supervisor         -> vê e edita só as categorias liberadas
--   auxiliar           -> vê tudo, mas não edita nada
-- =========================================================

create type nivel_acesso_usuario as enum ('diretor', 'gerente', 'supervisor', 'auxiliar');

alter table usuarios add column nivel_acesso nivel_acesso_usuario;

-- Grandfathering: mapeia o perfil de quem já existe pro nível
-- de acesso equivalente, pra ninguém perder acesso de surpresa.
update usuarios set nivel_acesso = (case
  when perfil in ('admin', 'diretora') then 'diretor'
  when perfil = 'gerente' then 'gerente'
  else 'supervisor'
end)::nivel_acesso_usuario
where nivel_acesso is null;

alter table usuarios alter column nivel_acesso set default 'supervisor';
alter table usuarios alter column nivel_acesso set not null;

-- ---------------------------------------------------------
-- Funções auxiliares
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
      where u.id = auth.uid() and u.nivel_acesso in ('diretor', 'gerente', 'auxiliar')
    )
    or exists (
      select 1 from usuario_categorias uc
      where uc.usuario_id = auth.uid() and uc.categoria = p_categoria
    )
$$;

create or replace function usuario_pode_editar()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select nivel_acesso != 'auxiliar' from usuarios where id = auth.uid()),
    false
  )
$$;

-- ---------------------------------------------------------
-- processos: leitura segue a categoria (como já era);
-- escrita agora também exige poder editar.
-- ---------------------------------------------------------

drop policy if exists "tenant isolado - processos" on processos;

create policy "processos - leitura" on processos
  for select using (tenant_id = auth_tenant_id() and usuario_tem_categoria(categoria));

create policy "processos - escrita" on processos
  for insert with check (tenant_id = auth_tenant_id() and usuario_tem_categoria(categoria) and usuario_pode_editar());

create policy "processos - atualizacao" on processos
  for update using (tenant_id = auth_tenant_id() and usuario_tem_categoria(categoria) and usuario_pode_editar())
  with check (tenant_id = auth_tenant_id() and usuario_tem_categoria(categoria) and usuario_pode_editar());

create policy "processos - remocao" on processos
  for delete using (tenant_id = auth_tenant_id() and usuario_tem_categoria(categoria) and usuario_pode_editar());

-- ---------------------------------------------------------
-- contratos_locacao: mesmo padrão
-- ---------------------------------------------------------

drop policy if exists "tenant isolado - contratos_locacao" on contratos_locacao;

create policy "contratos_locacao - leitura" on contratos_locacao
  for select using (tenant_id = auth_tenant_id() and usuario_tem_categoria('locacao'));

create policy "contratos_locacao - insercao" on contratos_locacao
  for insert with check (tenant_id = auth_tenant_id() and usuario_tem_categoria('locacao') and usuario_pode_editar());

create policy "contratos_locacao - atualizacao" on contratos_locacao
  for update using (tenant_id = auth_tenant_id() and usuario_tem_categoria('locacao') and usuario_pode_editar())
  with check (tenant_id = auth_tenant_id() and usuario_tem_categoria('locacao') and usuario_pode_editar());

create policy "contratos_locacao - remocao" on contratos_locacao
  for delete using (tenant_id = auth_tenant_id() and usuario_tem_categoria('locacao') and usuario_pode_editar());

-- ---------------------------------------------------------
-- Tabelas "filhas" de processos: a leitura já era filtrada
-- através de processos (que agora já checa categoria). Só
-- precisamos adicionar a checagem de edição na escrita.
-- ---------------------------------------------------------

drop policy if exists "tenant isolado - etapas" on etapas;
create policy "etapas - leitura" on etapas
  for select using (processo_id in (select id from processos where tenant_id = auth_tenant_id()));
create policy "etapas - escrita" on etapas
  for insert with check (
    processo_id in (select id from processos where tenant_id = auth_tenant_id()) and usuario_pode_editar()
  );
create policy "etapas - atualizacao" on etapas
  for update using (
    processo_id in (select id from processos where tenant_id = auth_tenant_id()) and usuario_pode_editar()
  ) with check (
    processo_id in (select id from processos where tenant_id = auth_tenant_id()) and usuario_pode_editar()
  );
create policy "etapas - remocao" on etapas
  for delete using (
    processo_id in (select id from processos where tenant_id = auth_tenant_id()) and usuario_pode_editar()
  );

drop policy if exists "tenant isolado - checklist_itens" on checklist_itens;
create policy "checklist_itens - leitura" on checklist_itens
  for select using (
    etapa_id in (select e.id from etapas e join processos p on p.id = e.processo_id where p.tenant_id = auth_tenant_id())
  );
create policy "checklist_itens - escrita" on checklist_itens
  for insert with check (
    etapa_id in (select e.id from etapas e join processos p on p.id = e.processo_id where p.tenant_id = auth_tenant_id())
    and usuario_pode_editar()
  );
create policy "checklist_itens - atualizacao" on checklist_itens
  for update using (
    etapa_id in (select e.id from etapas e join processos p on p.id = e.processo_id where p.tenant_id = auth_tenant_id())
    and usuario_pode_editar()
  ) with check (
    etapa_id in (select e.id from etapas e join processos p on p.id = e.processo_id where p.tenant_id = auth_tenant_id())
    and usuario_pode_editar()
  );
create policy "checklist_itens - remocao" on checklist_itens
  for delete using (
    etapa_id in (select e.id from etapas e join processos p on p.id = e.processo_id where p.tenant_id = auth_tenant_id())
    and usuario_pode_editar()
  );

drop policy if exists "tenant isolado - comentarios" on comentarios;
create policy "comentarios - leitura" on comentarios
  for select using (processo_id in (select id from processos where tenant_id = auth_tenant_id()));
create policy "comentarios - escrita" on comentarios
  for insert with check (
    processo_id in (select id from processos where tenant_id = auth_tenant_id()) and usuario_pode_editar()
  );
create policy "comentarios - atualizacao" on comentarios
  for update using (
    processo_id in (select id from processos where tenant_id = auth_tenant_id()) and usuario_pode_editar()
  ) with check (
    processo_id in (select id from processos where tenant_id = auth_tenant_id()) and usuario_pode_editar()
  );
create policy "comentarios - remocao" on comentarios
  for delete using (
    processo_id in (select id from processos where tenant_id = auth_tenant_id()) and usuario_pode_editar()
  );

drop policy if exists "tenant isolado - historico" on historico;
create policy "historico - leitura" on historico
  for select using (processo_id in (select id from processos where tenant_id = auth_tenant_id()));
create policy "historico - escrita" on historico
  for insert with check (
    processo_id in (select id from processos where tenant_id = auth_tenant_id()) and usuario_pode_editar()
  );

drop policy if exists "tenant isolado - comissoes" on comissoes;
create policy "comissoes - leitura" on comissoes
  for select using (processo_id in (select id from processos where tenant_id = auth_tenant_id()));
create policy "comissoes - escrita" on comissoes
  for insert with check (
    processo_id in (select id from processos where tenant_id = auth_tenant_id()) and usuario_pode_editar()
  );
create policy "comissoes - atualizacao" on comissoes
  for update using (
    processo_id in (select id from processos where tenant_id = auth_tenant_id()) and usuario_pode_editar()
  ) with check (
    processo_id in (select id from processos where tenant_id = auth_tenant_id()) and usuario_pode_editar()
  );
create policy "comissoes - remocao" on comissoes
  for delete using (
    processo_id in (select id from processos where tenant_id = auth_tenant_id()) and usuario_pode_editar()
  );

-- ---------------------------------------------------------
-- contas_locacao: filha de contratos_locacao
-- ---------------------------------------------------------

drop policy if exists "tenant isolado - contas_locacao" on contas_locacao;
create policy "contas_locacao - leitura" on contas_locacao
  for select using (contrato_id in (select id from contratos_locacao where tenant_id = auth_tenant_id()));
create policy "contas_locacao - escrita" on contas_locacao
  for insert with check (
    contrato_id in (select id from contratos_locacao where tenant_id = auth_tenant_id()) and usuario_pode_editar()
  );
create policy "contas_locacao - atualizacao" on contas_locacao
  for update using (
    contrato_id in (select id from contratos_locacao where tenant_id = auth_tenant_id()) and usuario_pode_editar()
  ) with check (
    contrato_id in (select id from contratos_locacao where tenant_id = auth_tenant_id()) and usuario_pode_editar()
  );
create policy "contas_locacao - remocao" on contas_locacao
  for delete using (
    contrato_id in (select id from contratos_locacao where tenant_id = auth_tenant_id()) and usuario_pode_editar()
  );

-- ---------------------------------------------------------
-- tarefas_mensais_status: não é ligado a categoria, mas
-- ainda assim protegido contra edição por Auxiliar.
-- ---------------------------------------------------------

drop policy if exists "tenant isolado - tarefas_mensais_status" on tarefas_mensais_status;
create policy "tarefas_mensais_status - leitura" on tarefas_mensais_status
  for select using (tarefa_id in (select id from tarefas_mensais where tenant_id = auth_tenant_id()));
create policy "tarefas_mensais_status - escrita" on tarefas_mensais_status
  for insert with check (
    tarefa_id in (select id from tarefas_mensais where tenant_id = auth_tenant_id()) and usuario_pode_editar()
  );
create policy "tarefas_mensais_status - atualizacao" on tarefas_mensais_status
  for update using (
    tarefa_id in (select id from tarefas_mensais where tenant_id = auth_tenant_id()) and usuario_pode_editar()
  ) with check (
    tarefa_id in (select id from tarefas_mensais where tenant_id = auth_tenant_id()) and usuario_pode_editar()
  );

-- ---------------------------------------------------------
-- Atualiza add_member e a função de editar categorias pra
-- também aceitar o nível de acesso.
-- ---------------------------------------------------------

create or replace function add_member(
  p_email text,
  p_perfil perfil_usuario,
  p_categorias categoria_processo[],
  p_nivel_acesso nivel_acesso_usuario default 'supervisor'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meu_tenant uuid;
  v_meu_nivel nivel_acesso_usuario;
  v_alvo_id uuid;
  v_categoria categoria_processo;
begin
  select tenant_id, nivel_acesso into v_meu_tenant, v_meu_nivel from public.usuarios where id = auth.uid();

  if v_meu_tenant is null then
    raise exception 'Você ainda não pertence a uma organização.';
  end if;

  if v_meu_nivel not in ('diretor', 'gerente') then
    raise exception 'Apenas Diretor ou Gerente podem adicionar membros.';
  end if;

  select id into v_alvo_id from public.usuarios where email = p_email;

  if v_alvo_id is null then
    raise exception 'Essa pessoa ainda não criou uma conta. Peça para ela se cadastrar primeiro em /login.';
  end if;

  update public.usuarios
     set tenant_id = v_meu_tenant,
         perfil = p_perfil,
         nivel_acesso = p_nivel_acesso
   where id = v_alvo_id;

  delete from public.usuario_categorias where usuario_id = v_alvo_id;
  foreach v_categoria in array p_categorias loop
    insert into public.usuario_categorias (usuario_id, categoria) values (v_alvo_id, v_categoria)
    on conflict do nothing;
  end loop;
end;
$$;

create or replace function atualizar_categorias_membro(
  p_usuario_id uuid,
  p_categorias categoria_processo[],
  p_nivel_acesso nivel_acesso_usuario default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meu_nivel nivel_acesso_usuario;
  v_meu_tenant uuid;
  v_alvo_tenant uuid;
  v_categoria categoria_processo;
begin
  select tenant_id, nivel_acesso into v_meu_tenant, v_meu_nivel from public.usuarios where id = auth.uid();

  if v_meu_nivel not in ('diretor', 'gerente') then
    raise exception 'Apenas Diretor ou Gerente podem alterar permissões.';
  end if;

  select tenant_id into v_alvo_tenant from public.usuarios where id = p_usuario_id;
  if v_alvo_tenant is null or v_alvo_tenant != v_meu_tenant then
    raise exception 'Usuário não encontrado nessa organização.';
  end if;

  if p_nivel_acesso is not null then
    update public.usuarios set nivel_acesso = p_nivel_acesso where id = p_usuario_id;
  end if;

  delete from public.usuario_categorias where usuario_id = p_usuario_id;
  foreach v_categoria in array p_categorias loop
    insert into public.usuario_categorias (usuario_id, categoria) values (p_usuario_id, v_categoria)
    on conflict do nothing;
  end loop;
end;
$$;

-- admin (write) da tabela usuario_categorias também passa a
-- respeitar o nível de acesso, não só o perfil antigo.
drop policy if exists "admin escreve usuario_categorias" on usuario_categorias;
create policy "diretor/gerente escreve usuario_categorias" on usuario_categorias
  for all using (
    exists (
      select 1 from usuarios u
      where u.id = auth.uid()
        and u.tenant_id = auth_tenant_id()
        and u.nivel_acesso in ('diretor', 'gerente')
    )
  ) with check (
    usuario_id in (select id from usuarios where tenant_id = auth_tenant_id())
  );
