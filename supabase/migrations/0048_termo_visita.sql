-- =========================================================
-- Termo de Visita de Imóvel — mesma lógica de assinatura
-- pública por token da Autorização de Venda, só que com um
-- único signatário (o cliente que visitou).
-- =========================================================

create table termos_visita (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  imovel_id uuid not null references imoveis(id),
  cliente_id uuid not null references clientes(id),
  corretor_id uuid references corretores(id),
  processo_id uuid references processos(id),
  valor_imovel numeric(14,2),
  codigo_imovel text,
  data_visita date not null default current_date,
  multa_percentual numeric(5,2) not null default 6,
  nota int check (nota between 0 and 10),
  feedback text check (
    feedback in ('vai_fazer_proposta', 'vai_voltar', 'vai_manter_consideracao', 'nao_gostou_quer_outras')
  ),
  observacoes text,
  status text not null check (status in ('pendente', 'assinado', 'cancelado')) default 'pendente',
  token uuid not null default gen_random_uuid() unique,
  nome_digitado text,
  cliente_cpf text,
  cliente_rg text,
  assinatura_imagem text,
  ip_assinatura text,
  assinado_em timestamptz,
  criado_por uuid references usuarios(id),
  criado_em timestamptz not null default now()
);

create index idx_termos_visita_imovel on termos_visita(imovel_id);
create index idx_termos_visita_cliente on termos_visita(cliente_id);

alter table termos_visita enable row level security;

create policy "termos_visita - leitura" on termos_visita
  for select using (tenant_id = auth_tenant_id());
create policy "termos_visita - insercao" on termos_visita
  for insert with check (tenant_id = auth_tenant_id() and usuario_pode_editar());
create policy "termos_visita - atualizacao" on termos_visita
  for update using (tenant_id = auth_tenant_id())
  with check (tenant_id = auth_tenant_id());

-- ---------------------------------------------------------
-- Acesso público, só por token (pra tela de assinatura)
-- ---------------------------------------------------------

create or replace function termo_visita_buscar(p_token uuid)
returns table (
  termo_id uuid,
  ja_assinado boolean,
  imovel_endereco text,
  codigo_imovel text,
  valor_imovel numeric,
  cliente_nome text,
  cliente_telefone text,
  cliente_email text,
  corretor_nome text,
  multa_percentual numeric,
  data_visita date,
  status_termo text
)
language sql
security definer
stable
set search_path = public
as $$
  select
    t.id,
    t.assinado_em is not null,
    i.endereco,
    t.codigo_imovel,
    t.valor_imovel,
    c.nome,
    c.telefone,
    c.email,
    co.nome,
    t.multa_percentual,
    t.data_visita,
    t.status
  from termos_visita t
  join imoveis i on i.id = t.imovel_id
  join clientes c on c.id = t.cliente_id
  left join corretores co on co.id = t.corretor_id
  where t.token = p_token;
$$;

create or replace function termo_visita_registrar(
  p_token uuid,
  p_nome_digitado text,
  p_cpf text,
  p_rg text,
  p_assinatura_imagem text,
  p_ip text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_termo_id uuid;
begin
  select id into v_termo_id
  from termos_visita
  where token = p_token and assinado_em is null;

  if v_termo_id is null then
    return false;
  end if;

  update termos_visita
  set nome_digitado = p_nome_digitado,
      cliente_cpf = p_cpf,
      cliente_rg = p_rg,
      assinatura_imagem = p_assinatura_imagem,
      ip_assinatura = p_ip,
      assinado_em = now(),
      status = 'assinado'
  where token = p_token;

  return true;
end;
$$;

grant execute on function termo_visita_buscar(uuid) to anon, authenticated;
grant execute on function termo_visita_registrar(uuid, text, text, text, text, text) to anon, authenticated;
