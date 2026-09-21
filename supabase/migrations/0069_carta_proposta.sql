-- =========================================================
-- Carta Proposta de Compra de Imóvel — mesmo mecanismo de
-- formulário + assinatura eletrônica da Autorização de Venda.
--
-- cartas_proposta: dados da proposta (proponente, imóvel,
-- valor, prazo de validade).
-- carta_proposta_condicoes: lista livre de condições de
-- pagamento (descrição + valor), porque cada proposta tem uma
-- distribuição diferente (sinal, FGTS, financiamento, recursos
-- próprios etc.).
-- carta_proposta_signatarios: quem precisa assinar (o(s)
-- proponente(s)), com token público de assinatura — mesmo
-- fluxo de /assinar/[token] usado na autorização.
-- =========================================================

create table cartas_proposta (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  imovel_id uuid not null references imoveis(id),
  proponente_id uuid not null references clientes(id),
  segundo_proponente_id uuid references clientes(id),
  valor_total numeric(14,2),
  prazo_dias_validade integer not null default 5,
  observacoes text,
  status text not null default 'pendente' check (status in ('pendente','assinado','cancelado')),
  criado_por uuid references usuarios(id),
  responsavel_id uuid references usuarios(id),
  criado_em timestamptz not null default now(),
  assinado_em timestamptz
);

create table carta_proposta_condicoes (
  id uuid primary key default gen_random_uuid(),
  carta_proposta_id uuid not null references cartas_proposta(id) on delete cascade,
  descricao text not null,
  valor numeric(14,2),
  ordem integer not null default 0
);

create table carta_proposta_signatarios (
  id uuid primary key default gen_random_uuid(),
  carta_proposta_id uuid not null references cartas_proposta(id) on delete cascade,
  nome_esperado text not null,
  token uuid not null default gen_random_uuid() unique,
  nome_digitado text,
  assinatura_imagem text,
  ip_assinatura text,
  assinado_em timestamptz,
  ordem integer not null default 0
);

create index idx_carta_proposta_imovel on cartas_proposta(imovel_id);
create index idx_carta_proposta_condicoes on carta_proposta_condicoes(carta_proposta_id);
create index idx_carta_proposta_signatarios on carta_proposta_signatarios(carta_proposta_id);

alter table cartas_proposta enable row level security;
alter table carta_proposta_condicoes enable row level security;
alter table carta_proposta_signatarios enable row level security;

-- Leitura/edição: quem tem a categoria 'venda' liberada, quem
-- criou, ou quem é o responsável marcado na proposta.
create policy "cartas_proposta - leitura" on cartas_proposta
  for select using (
    tenant_id = auth_tenant_id() and (
      usuario_pode_ver_documento_cliente('venda', criado_por)
      or responsavel_id = auth.uid()
    )
  );
create policy "cartas_proposta - insercao" on cartas_proposta
  for insert with check (tenant_id = auth_tenant_id() and usuario_pode_criar_documento_cliente());
create policy "cartas_proposta - atualizacao" on cartas_proposta
  for update using (
    tenant_id = auth_tenant_id() and (
      usuario_pode_ver_documento_cliente('venda', criado_por)
      or responsavel_id = auth.uid()
    )
  )
  with check (
    tenant_id = auth_tenant_id() and (
      usuario_pode_ver_documento_cliente('venda', criado_por)
      or responsavel_id = auth.uid()
    )
  );
create policy "cartas_proposta - remocao" on cartas_proposta
  for delete using (tenant_id = auth_tenant_id() and usuario_pode_criar_documento_cliente());

create policy "carta_proposta_condicoes - leitura" on carta_proposta_condicoes
  for select using (
    carta_proposta_id in (
      select id from cartas_proposta where tenant_id = auth_tenant_id() and (
        usuario_pode_ver_documento_cliente('venda', criado_por) or responsavel_id = auth.uid()
      )
    )
  );
create policy "carta_proposta_condicoes - escrita" on carta_proposta_condicoes
  for all using (
    carta_proposta_id in (
      select id from cartas_proposta where tenant_id = auth_tenant_id() and (
        usuario_pode_ver_documento_cliente('venda', criado_por) or responsavel_id = auth.uid()
      )
    )
  )
  with check (
    carta_proposta_id in (
      select id from cartas_proposta where tenant_id = auth_tenant_id() and (
        usuario_pode_ver_documento_cliente('venda', criado_por) or responsavel_id = auth.uid()
      )
    )
  );

create policy "carta_proposta_signatarios - leitura" on carta_proposta_signatarios
  for select using (
    carta_proposta_id in (
      select id from cartas_proposta where tenant_id = auth_tenant_id() and (
        usuario_pode_ver_documento_cliente('venda', criado_por) or responsavel_id = auth.uid()
      )
    )
  );
create policy "carta_proposta_signatarios - insercao" on carta_proposta_signatarios
  for insert with check (
    carta_proposta_id in (select id from cartas_proposta where tenant_id = auth_tenant_id())
    and usuario_pode_criar_documento_cliente()
  );
create policy "carta_proposta_signatarios - remocao" on carta_proposta_signatarios
  for delete using (
    carta_proposta_id in (select id from cartas_proposta where tenant_id = auth_tenant_id())
    and usuario_pode_criar_documento_cliente()
  );

-- ---------------------------------------------------------
-- Acesso público, só por token (tela de assinatura)
-- ---------------------------------------------------------

create or replace function carta_proposta_assinatura_buscar(p_token uuid)
returns table (
  signatario_id uuid,
  nome_esperado text,
  ja_assinado boolean,
  imovel_endereco text,
  proponente_nome text,
  proponente_cpf text,
  segundo_proponente_nome text,
  segundo_proponente_cpf text,
  valor_total numeric,
  prazo_dias_validade int,
  condicoes jsonb,
  observacoes text,
  status_proposta text,
  criado_em timestamptz
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
    i.endereco,
    c.nome,
    c.cpf_cnpj,
    cc.nome,
    cc.cpf_cnpj,
    p.valor_total,
    p.prazo_dias_validade,
    coalesce(
      (select jsonb_agg(jsonb_build_object('descricao', cond.descricao, 'valor', cond.valor) order by cond.ordem)
       from carta_proposta_condicoes cond where cond.carta_proposta_id = p.id),
      '[]'::jsonb
    ),
    p.observacoes,
    p.status,
    p.criado_em
  from carta_proposta_signatarios s
  join cartas_proposta p on p.id = s.carta_proposta_id
  join imoveis i on i.id = p.imovel_id
  join clientes c on c.id = p.proponente_id
  left join clientes cc on cc.id = p.segundo_proponente_id
  where s.token = p_token;
$$;

grant execute on function carta_proposta_assinatura_buscar(uuid) to anon, authenticated;

create or replace function carta_proposta_assinatura_registrar(
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
  v_proposta_id uuid;
  v_pendentes int;
begin
  select carta_proposta_id into v_proposta_id
  from carta_proposta_signatarios
  where token = p_token and assinado_em is null;

  if v_proposta_id is null then
    return false;
  end if;

  update carta_proposta_signatarios
  set nome_digitado = p_nome_digitado,
      assinatura_imagem = p_assinatura_imagem,
      ip_assinatura = p_ip,
      assinado_em = now()
  where token = p_token;

  select count(*) into v_pendentes
  from carta_proposta_signatarios
  where carta_proposta_id = v_proposta_id and assinado_em is null;

  if v_pendentes = 0 then
    update cartas_proposta
    set status = 'assinado', assinado_em = now()
    where id = v_proposta_id;
  end if;

  return true;
end;
$$;

grant execute on function carta_proposta_assinatura_registrar(uuid, text, text, text) to anon, authenticated;
