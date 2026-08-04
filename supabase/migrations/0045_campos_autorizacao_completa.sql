-- =========================================================
-- Campos que faltavam pra gerar o texto completo da
-- Autorização de Venda igual ao modelo real usado pela Sacra
-- (RG do proprietário, dados completos do imóvel, e um
-- segundo proprietário/cônjuge quando houver).
-- =========================================================

alter table clientes add column rg text;

alter table imoveis add column cep text;
alter table imoveis add column area_construida text;
alter table imoveis add column area_lote text;
alter table imoveis add column inscricao_iptu text;
alter table imoveis add column valor_condominio numeric(14,2);

alter table autorizacoes_venda add column conjuge_id uuid references clientes(id);
alter table autorizacoes_venda add column foro text not null default 'Brasília/DF';
