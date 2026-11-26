-- Complemento verificado no Drive: garantias e encerramentos com distratos assinados.
-- Todos os updates preservam dados anteriormente preenchidos, salvo ativo=true
-- em dois contratos que possuem distrato definitivo assinado em 25/11/2026.
with docs(numero, garantia, aluguel, caucao, origem) as (values
 ('Casa 11 QE 52','Título de Capitalização (Brasilcap)',null::numeric,null::bigint,'https://drive.google.com/file/d/1FMQqO1g6VCUs4cSkde-Nj2pWNWJL5wKb/view'),
 ('1609 Avant','Título de Capitalização (Brasilcap)',null,null,'https://drive.google.com/file/d/18qZTYopKBG24Pg401ZJzOkGXwC0QP6Iy/view'),
 ('B008 Saint Tropez','Seguro Fiança (Loft)',null,null,'https://drive.google.com/file/d/1g1IxcOF9WpVM3goI8wFpLzbPXLFV15cy/view'),
 ('1305 Modern Life','CredPago',null,null,'https://drive.google.com/file/d/1-53B7RrPwMCqZ8HcAVA5KQcPG9IHJYO1/view'),
 ('802 Nova Friburgo','Caução',1400,420000,'https://drive.google.com/file/d/1ObClTs1xa-oFUrKNpc8wMWJ9FKUGnoC6/view')
)
update public.contratos_locacao c
set garantia_locaticia=d.garantia,
    aluguel_valor=coalesce(c.aluguel_valor,d.aluguel),
    caucao_valor_centavos=coalesce(c.caucao_valor_centavos,d.caucao),
    documento_origem_url=coalesce(c.documento_origem_url,d.origem)
from docs d where c.numero=d.numero and c.garantia_locaticia is null;

-- Datas de efetivo encerramento indicadas nos distratos:
-- Modern Life 1305: entrega das chaves 12/11/2026, finalizado/assinado 25/11.
-- Nova Friburgo 802: entrega das chaves 23/11/2026, finalizado/assinado 25/11.
-- A caução histórica de Nova Friburgo não deve constar como dinheiro ativo em caixa.
update public.contratos_locacao
set ativo=false, data_encerramento='2026-11-12'::date
where numero='1305 Modern Life' and ativo=true;
update public.contratos_locacao
set ativo=false, data_encerramento='2026-11-23'::date
where numero='802 Nova Friburgo' and ativo=true;
