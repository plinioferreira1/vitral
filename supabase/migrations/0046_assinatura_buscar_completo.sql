-- =========================================================
-- Atualiza assinatura_buscar pra trazer todos os campos do
-- modelo real de Autorização de Venda (CPF/RG/telefone/
-- endereço do proprietário e do cônjuge, dados completos do
-- imóvel, foro).
-- =========================================================

drop function if exists assinatura_buscar(uuid);

create or replace function assinatura_buscar(p_token uuid)
returns table (
  signatario_id uuid,
  nome_esperado text,
  ja_assinado boolean,
  imovel_endereco text,
  imovel_cep text,
  imovel_area_construida text,
  imovel_area_lote text,
  imovel_inscricao_iptu text,
  imovel_matricula text,
  imovel_valor_condominio numeric,
  vendedor_nome text,
  vendedor_cpf text,
  vendedor_rg text,
  vendedor_telefone text,
  vendedor_endereco text,
  conjuge_nome text,
  conjuge_cpf text,
  conjuge_rg text,
  conjuge_telefone text,
  conjuge_endereco text,
  valor_imovel numeric,
  comissao_percentual numeric,
  prazo_dias int,
  exclusividade boolean,
  observacoes text,
  foro text,
  status_autorizacao text,
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
    i.cep,
    i.area_construida,
    i.area_lote,
    i.inscricao_iptu,
    i.matricula,
    i.valor_condominio,
    c.nome,
    c.cpf_cnpj,
    c.rg,
    c.telefone,
    c.endereco,
    cc.nome,
    cc.cpf_cnpj,
    cc.rg,
    cc.telefone,
    cc.endereco,
    a.valor_imovel,
    a.comissao_percentual,
    a.prazo_dias,
    a.exclusividade,
    a.observacoes,
    a.foro,
    a.status,
    a.criado_em
  from autorizacao_signatarios s
  join autorizacoes_venda a on a.id = s.autorizacao_id
  join imoveis i on i.id = a.imovel_id
  join clientes c on c.id = a.vendedor_id
  left join clientes cc on cc.id = a.conjuge_id
  where s.token = p_token;
$$;

grant execute on function assinatura_buscar(uuid) to anon, authenticated;
