-- Comissões de intermediação devidas EXCLUSIVAMENTE à Sacra, por parcela.
-- Fase de conferência: vencimento é NULL quando condicionado a evento futuro
-- (recebimento do vendedor), evitando vencimento inventado no Financeiro.
create table if not exists public.financeiro_comissoes_previstas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  processo_id uuid references public.processos(id) on delete set null,
  codigo_referencia text not null,
  imovel_nome text not null,
  parcela_numero smallint not null check (parcela_numero between 1 and 20),
  parcelas_total smallint not null check (parcelas_total between 1 and 20 and parcelas_total >= parcela_numero),
  valor numeric(14,2) not null check (valor > 0),
  competencia date,
  condicao_pagamento text not null check (length(trim(condicao_pagamento)) between 8 and 1000),
  documento_url text not null check (documento_url ~ '^https://drive.google.com/'),
  observacoes text,
  vencimento date,
  lancamento_id uuid unique references public.financeiro_lancamentos(id) on delete restrict,
  criado_em timestamptz not null default now(),
  unique(tenant_id, codigo_referencia, parcela_numero)
);
create index if not exists financeiro_comissoes_previstas_pendentes_idx
on public.financeiro_comissoes_previstas(tenant_id,competencia,parcela_numero)
where lancamento_id is null;
alter table public.financeiro_comissoes_previstas enable row level security;
revoke all on public.financeiro_comissoes_previstas from public, anon, authenticated;
grant select on public.financeiro_comissoes_previstas to authenticated;
create policy "Comissões da Sacra: gestão lê"
on public.financeiro_comissoes_previstas for select to authenticated
using (
  tenant_id = public.auth_tenant_id()
  and exists (
    select 1 from public.usuarios u
    where u.id = auth.uid() and u.tenant_id=financeiro_comissoes_previstas.tenant_id
      and u.ativo and u.nivel_acesso in ('diretor','gerente')
  )
);
comment on table public.financeiro_comissoes_previstas is
'Recebíveis documentais por parcela, ainda sem data contratual comprovada. Não são lançamentos vencidos nem receitas recebidas. Após informar vencimento, a função transacional publica no Financeiro.';

insert into public.financeiro_categorias(tenant_id,nome,tipo,grupo)
select t.id,'Comissão de Intermediação Imobiliária','receita','Receitas Operacionais'
from public.tenants t where t.id='fc91a390-af99-4357-95e1-e173a8213abf'
on conflict (tenant_id,nome,tipo) do nothing;

create or replace function public.financeiro_publicar_comissao_prevista(p_id uuid,p_vencimento date)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v public.financeiro_comissoes_previstas%rowtype;
  v_lancamento uuid;
  v_categoria uuid;
  v_unidade uuid;
  v_numero text;
begin
  if auth.uid() is null or p_vencimento is null or
     p_vencimento < date '2026-01-01' or p_vencimento > (current_date + interval '3 years')::date
  then
    raise exception 'Identificação ou vencimento inválidos';
  end if;
  select * into v from public.financeiro_comissoes_previstas where id=p_id for update;
  if not found or not exists(
    select 1 from public.usuarios u where u.id=auth.uid() and u.ativo
      and u.tenant_id=v.tenant_id and u.nivel_acesso in ('diretor','gerente')
  ) then
    raise exception 'Acesso não autorizado ao recebível';
  end if;
  if v.lancamento_id is not null then return v.lancamento_id; end if;
  v_numero := 'COMSACRA-' || v.codigo_referencia || '-P' || v.parcela_numero;
  select l.id into v_lancamento from public.financeiro_lancamentos l
    where l.tenant_id=v.tenant_id and l.numero_documento=v_numero limit 1;
  if v_lancamento is null then
    select id into v_categoria from public.financeiro_categorias
      where tenant_id=v.tenant_id and tipo='receita'
      and nome='Comissão de Intermediação Imobiliária' limit 1;
    select id into v_unidade from public.financeiro_unidades
      where tenant_id=v.tenant_id and nome='Sacra Netimóveis' limit 1;
    if v_categoria is null or v_unidade is null then
      raise exception 'Categoria ou unidade Sacra não configurada';
    end if;
    insert into public.financeiro_lancamentos(
      tenant_id,tipo,descricao,categoria_id,unidade_id,valor,
      vencimento,competencia,numero_documento,observacoes,status,criado_por
    ) values (
      v.tenant_id,'receita',
      'Comissão Sacra — ' || v.imovel_nome ||
        (case when v.parcelas_total>1 then ' ('||v.parcela_numero||'/'||v.parcelas_total||')' else '' end),
      v_categoria,v_unidade,v.valor,p_vencimento,v.competencia,
      v_numero,
      'Condição: '||v.condicao_pagamento||'. Fonte: '||v.documento_url||
        case when v.observacoes is null then '' else '. '||v.observacoes end,
      'pendente',auth.uid()
    ) returning id into v_lancamento;
  end if;
  update public.financeiro_comissoes_previstas
    set vencimento=p_vencimento,lancamento_id=v_lancamento
    where id=v.id;
  return v_lancamento;
end;
$$;
revoke execute on function public.financeiro_publicar_comissao_prevista(uuid,date) from public,anon;
grant execute on function public.financeiro_publicar_comissao_prevista(uuid,date) to authenticated;
