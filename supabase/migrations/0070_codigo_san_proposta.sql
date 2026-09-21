-- =========================================================
-- Campo "Código SAN" na Carta Proposta — código de referência
-- interno/da instituição financeira pra essa negociação.
-- =========================================================

alter table cartas_proposta add column codigo_san text;

drop function if exists carta_proposta_assinatura_buscar(uuid);

create or replace function carta_proposta_assinatura_buscar(p_token uuid)
returns table (
  signatario_id uuid,
  nome_esperado text,
  ja_assinado boolean,
  imovel_endereco text,
  codigo_san text,
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
    p.codigo_san,
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
