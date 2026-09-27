-- Contas bancarias padrao e dados para emissao futura de recibos.

alter table financeiro_baixas
  add column if not exists gerar_recibo boolean not null default false,
  add column if not exists recibo_emitido_para text,
  add column if not exists recibo_documento text;

insert into financeiro_contas_bancarias (tenant_id, nome, banco, tipo, saldo_inicial, ativa)
select t.id, 'Caixa', 'Caixa', 'corrente', 0, true
from tenants t
where not exists (
  select 1
  from financeiro_contas_bancarias c
  where c.tenant_id = t.id
    and (
      lower(coalesce(c.nome, '')) like '%caixa%'
      or lower(coalesce(c.banco, '')) like '%caixa%'
    )
);

insert into financeiro_contas_bancarias (tenant_id, nome, banco, tipo, saldo_inicial, ativa)
select t.id, 'Banco do Brasil', 'Banco do Brasil', 'corrente', 0, true
from tenants t
where not exists (
  select 1
  from financeiro_contas_bancarias c
  where c.tenant_id = t.id
    and (
      lower(coalesce(c.nome, '')) like '%banco do brasil%'
      or lower(coalesce(c.banco, '')) like '%banco do brasil%'
      or lower(coalesce(c.nome, '')) = 'bb'
      or lower(coalesce(c.banco, '')) = 'bb'
    )
);
