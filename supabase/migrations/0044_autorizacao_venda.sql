-- =========================================================
-- Autorização de Venda com assinatura digital.
--
-- Cada autorização pode ter um ou mais signatários (ex: os
-- dois cônjuges proprietários). Cada signatário tem um token
-- próprio (link individual de assinatura), pra poder mandar
-- um link separado pra cada pessoa.
--
-- A tela de assinatura (/assinar/[token]) é pública — a pessoa
-- assina sem precisar ter conta nem estar logada. Por isso, em
-- vez de dar acesso direto de leitura/escrita nas tabelas pro
-- usuário anônimo (que exigiria abrir a tabela toda), o acesso
-- é só através de duas funções (security definer), que só
-- devolvem/alteram dados quando o token exato é informado —
-- ninguém consegue listar ou adivinhar outras autorizações.
-- =========================================================

create table autorizacoes_venda (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  imovel_id uuid not null references imoveis(id),
  vendedor_id uuid not null references clientes(id),
  processo_id uuid references processos(id),
  valor_imovel numeric(14,2),
  comissao_percentual numeric(5,2),
  prazo_dias int,
  exclusividade boolean not null default false,
  observacoes text,
  status text not null check (status in ('pendente', 'assinado', 'cancelado')) default 'pendente',
  criado_por uuid references usuarios(id),
  criado_em timestamptz not null default now(),
  assinado_em timestamptz
);

create table autorizacao_signatarios (
  id uuid primary key default gen_random_uuid(),
  autorizacao_id uuid not null references autorizacoes_venda(id) on delete cascade,
  nome_esperado text not null,
  token uuid not null default gen_random_uuid() unique,
  nome_digitado text,
  assinatura_imagem text,
  ip_assinatura text,
  assinado_em timestamptz,
  ordem int not null default 0
);

create index idx_autorizacao_signatarios_autorizacao on autorizacao_signatarios(autorizacao_id);
create index idx_autorizacao_venda_imovel on autorizacoes_venda(imovel_id);

alter table autorizacoes_venda enable row level security;
alter table autorizacao_signatarios enable row level security;

-- Acesso normal (autenticado, dentro do tenant) — igual ao
-- resto do sistema. Quem cria/gerencia autorizações precisa
-- ter a categoria 'venda' liberada.
create policy "autorizacoes_venda - leitura" on autorizacoes_venda
  for select using (tenant_id = auth_tenant_id() and usuario_tem_categoria('venda'));
create policy "autorizacoes_venda - insercao" on autorizacoes_venda
  for insert with check (tenant_id = auth_tenant_id() and usuario_tem_categoria('venda') and usuario_pode_editar());
create policy "autorizacoes_venda - atualizacao" on autorizacoes_venda
  for update using (tenant_id = auth_tenant_id() and usuario_tem_categoria('venda'))
  with check (tenant_id = auth_tenant_id() and usuario_tem_categoria('venda'));

create policy "autorizacao_signatarios - leitura" on autorizacao_signatarios
  for select using (
    autorizacao_id in (select id from autorizacoes_venda where tenant_id = auth_tenant_id())
  );
create policy "autorizacao_signatarios - insercao" on autorizacao_signatarios
  for insert with check (
    autorizacao_id in (select id from autorizacoes_venda where tenant_id = auth_tenant_id())
    and usuario_pode_editar()
  );
create policy "autorizacao_signatarios - remocao" on autorizacao_signatarios
  for delete using (
    autorizacao_id in (select id from autorizacoes_venda where tenant_id = auth_tenant_id())
    and usuario_pode_editar()
  );

-- ---------------------------------------------------------
-- Acesso público, só por token (pra tela de assinatura)
-- ---------------------------------------------------------

create or replace function assinatura_buscar(p_token uuid)
returns table (
  signatario_id uuid,
  nome_esperado text,
  ja_assinado boolean,
  autorizacao_titulo text,
  imovel_endereco text,
  vendedor_nome text,
  valor_imovel numeric,
  comissao_percentual numeric,
  prazo_dias int,
  exclusividade boolean,
  observacoes text,
  status_autorizacao text
)
language sql
security definer
stable
set search_path = public
as $$
  select
    s.id,
    s.nome_esperado,
    s.assinado_em is not null,
    'Autorização de Venda',
    i.endereco,
    c.nome,
    a.valor_imovel,
    a.comissao_percentual,
    a.prazo_dias,
    a.exclusividade,
    a.observacoes,
    a.status
  from autorizacao_signatarios s
  join autorizacoes_venda a on a.id = s.autorizacao_id
  join imoveis i on i.id = a.imovel_id
  join clientes c on c.id = a.vendedor_id
  where s.token = p_token;
$$;

create or replace function assinatura_registrar(
  p_token uuid,
  p_nome_digitado text,
  p_assinatura_imagem text,
  p_ip text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_autorizacao_id uuid;
  v_pendentes int;
begin
  select autorizacao_id into v_autorizacao_id
  from autorizacao_signatarios
  where token = p_token and assinado_em is null;

  if v_autorizacao_id is null then
    return false; -- token inválido ou já assinado
  end if;

  update autorizacao_signatarios
  set nome_digitado = p_nome_digitado,
      assinatura_imagem = p_assinatura_imagem,
      ip_assinatura = p_ip,
      assinado_em = now()
  where token = p_token;

  select count(*) into v_pendentes
  from autorizacao_signatarios
  where autorizacao_id = v_autorizacao_id and assinado_em is null;

  if v_pendentes = 0 then
    update autorizacoes_venda
    set status = 'assinado', assinado_em = now()
    where id = v_autorizacao_id;
  end if;

  return true;
end;
$$;

grant execute on function assinatura_buscar(uuid) to anon, authenticated;
grant execute on function assinatura_registrar(uuid, text, text, text) to anon, authenticated;
