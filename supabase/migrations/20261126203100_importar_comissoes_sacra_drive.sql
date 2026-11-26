-- Importação documental individualizada das comissões da Sacra.
-- Últimos 3 meses em base móvel: negócios documentados de 26/08 a 26/11/2026.
-- EXCLUÍDOS: Casa Areal, Residencial Castanheiras, Flor das Águas, SQS 410 Bloco R.
-- Vencimento NULL: contrato remete a recebimento de sinal/financiamento pelo vendedor.
-- NÃO converter valor bruto de corretagem em receita Sacra e NÃO marcar baixas pagas.
-- Doc por doc, valor destinatário SACRA (CNPJ 30.577.408/0001-91), separado das quotas de corretores/terceiros.
with fonte(codigo,imovel,parcela,total,valor,competencia,condicao,documento,processo_id,notas) as (
 values
   ('1205701','Via Verano 908',1,1,10780.00,'2026-11-01'::date,'Até 1 dia útil após o vendedor receber o item 2 da Cláusula Segunda','https://drive.google.com/file/d/19Sze_k_QWg7yZK1kDQCKkbGEg9KL4XSW/view','486f5ac2-c563-4458-80b5-f9ed2468ac0d'::uuid,null::text),
  ('960633','Dubai 501',1,1,25220.00,'2026-10-01'::date,'Até 1 dia útil após o vendedor receber o item 1 da Cláusula Segunda','https://drive.google.com/file/d/1p9llPse_yeHMwGeVM5nVR3wccRjJdg9C/view','eda9311e-d705-487f-afb7-afb1293e8a8e'::uuid,null::text),
  ('111874','QE 56 Guará',1,1,21150.00,'2026-11-01'::date,'Até 1 dia útil após o vendedor receber o item 2 da Cláusula Segunda','https://drive.google.com/file/d/11KxCTGaCT-FspsdzWvjCp6DCqdzjcE1F/view','c1571e41-b1d2-425d-8426-9f63ef48dea9'::uuid,'Valor na via em algarismos com três casas decimais; valor por extenso R$ 21.150,00'),
  ('1210999','SQS 410 Bloco P apto 301',1,1,8584.50,'2026-11-01'::date,'No recebimento pelo vendedor do item 2 da Cláusula Segunda','https://drive.google.com/file/d/1B_SHSThNhXqxbapqYm_O8wqzRtbeGCAd/view',null::uuid,'BLOCO P — não confundir com o BLOCO R excluído pelo gestor'),
  ('1094321','Casa Park Way',1,2,66600.00,'2026-11-01'::date,'Parcela 1/2: até 1 dia útil após o vendedor receber o item 1 da Cláusula Segunda','https://drive.google.com/file/d/1FOlBmWXX8HeozWUfs76vmHTMuvqtLT5V/view','413fa95b-778f-43ee-a0fd-9cb1883c0680'::uuid,'Casa Park Way, não Casa Areal'),
  ('1094321','Casa Park Way',2,2,66600.00,'2026-11-01'::date,'Parcela 2/2: até 1 dia útil após o vendedor receber o item 4 da Cláusula Segunda','https://drive.google.com/file/d/1FOlBmWXX8HeozWUfs76vmHTMuvqtLT5V/view','413fa95b-778f-43ee-a0fd-9cb1883c0680'::uuid,'Casa Park Way, não Casa Areal'),
  ('1177506','Milena Baqui',1,2,1309.00,'2026-08-01'::date,'Parcela 1/2: até 1 dia útil após o vendedor receber o item 1 da Cláusula Segunda','https://drive.google.com/file/d/1drvsRC2M8jhGf35IL429-fsdG-HnBeK0/view','59e77ac1-fd8b-4672-8172-1c361befe5bd'::uuid,null::text),
  ('1177506','Milena Baqui',2,2,1309.00,'2026-08-01'::date,'Parcela 2/2: até 1 dia útil após o vendedor receber o item 2 da Cláusula Segunda','https://drive.google.com/file/d/1drvsRC2M8jhGf35IL429-fsdG-HnBeK0/view','59e77ac1-fd8b-4672-8172-1c361befe5bd'::uuid,null::text),
  ('1192870','QE 50 Conjunto H lote 10',1,1,14278.00,'2026-08-01'::date,'Até 1 dia útil após o vendedor receber o item 2 da Cláusula Segunda','https://drive.google.com/file/d/1Eq9A-duhQmZaYLQ8XF2tMakI7BlnjNIP/view','797a13c8-b3d8-4a07-ae6d-c1bf66f893af'::uuid,null::text),
  ('1191441','Oscar Freire',1,2,3640.00,'2026-09-01'::date,'Parcela 1/2: até 1 dia útil após o vendedor receber o item 1 da Cláusula Segunda','https://drive.google.com/file/d/146nIqxKKs1OTQhKz6mFfkX6s1Ww-dDJO/view','492f83b8-98e1-4b27-a0bc-9d6b9919a00e'::uuid,null::text),
  ('1191441','Oscar Freire',2,2,3640.00,'2026-09-01'::date,'Parcela 2/2: até 1 dia útil após o vendedor receber o item 2 da Cláusula Segunda','https://drive.google.com/file/d/146nIqxKKs1OTQhKz6mFfkX6s1Ww-dDJO/view','492f83b8-98e1-4b27-a0bc-9d6b9919a00e'::uuid,null::text),
  ('1193157','Graúna 703A',1,1,17780.00,'2026-09-01'::date,'Até 1 dia útil após o vendedor receber o item 2 da Cláusula Segunda','https://drive.google.com/file/d/1uLy1EyORYeRlTmU6IkH5ocYM--gACEPQ/view','17a4cb31-3fff-4702-af13-94d4e6545790'::uuid,null::text),
  ('1051529','Reserva Parque Clube 804',1,1,3800.00,'2026-09-01'::date,'Até 1 dia útil após o vendedor receber o item 1 da Cláusula Segunda','https://drive.google.com/file/d/1nZ3fJGUEaikyvNPnHekPYyJqxhd3ujnQ/view','61b1f65d-9566-4758-8e85-e0ce43beab15'::uuid,null::text),
  ('1197195','Le Essence du Parc 904',1,2,6720.00,'2026-09-01'::date,'Parcela 1/2: no recebimento pelo vendedor da alínea b do preço','https://drive.google.com/file/d/1x33pNewaKfeAlAHW49lBoCd2NSL4yvH7/view','6e4411d1-1edf-489b-9100-4667915c05d0'::uuid,'As duas parcelas têm valores diferentes; não dividir comissão por 50% automaticamente'),
  ('1197195','Le Essence du Parc 904',2,2,2240.00,'2026-09-01'::date,'Parcela 2/2: no recebimento pelo vendedor da alínea c do preço','https://drive.google.com/file/d/1x33pNewaKfeAlAHW49lBoCd2NSL4yvH7/view','6e4411d1-1edf-489b-9100-4667915c05d0'::uuid,'As duas parcelas têm valores diferentes; não dividir comissão por 50% automaticamente'),
  ('1201931','Via Paradiso 1301',1,1,6037.50,'2026-10-01'::date,'Após o vendedor receber o sinal do preço','https://drive.google.com/file/d/1WvuOOSbd5s8Jsxrh5R1L3JdhB2gj1Nyl/view','f8a4aabc-6be2-4e2a-91ce-a5293557ecf4'::uuid,null::text),
  ('1197296','Polo de Modas QE 40',1,1,5040.00,'2026-10-01'::date,'Até 1 dia útil após o vendedor receber o item 1 da Cláusula Segunda','https://drive.google.com/file/d/1mPVBAt7_c-TkaZqLOMB_rgNwyo1AFnQo/view','838287b2-e835-4dd1-94f9-8a04f8ff8c1c'::uuid,null::text),
  ('1203843','Casa QE 13',1,1,17762.50,'2026-10-01'::date,'Até 1 dia útil após o vendedor receber o item 2 da Cláusula Segunda','https://drive.google.com/file/d/18kZz9mZgzIYb4O97R-eFvi0t6hh1E4il/view','2a04317e-1342-4d9a-8cf5-0d4489deb279'::uuid,null::text),
  ('1193002','QE 12 Bloco D apto 201',1,1,8700.00,'2026-10-01'::date,'Até 1 dia útil após o vendedor receber os itens 3 e 4 da Cláusula Segunda','https://drive.google.com/file/d/1ucATGl9ef6Z9OH6I5EXfGVrEcQUoSKxQ/view','440d6abf-ce0b-4030-89f4-acb387ed736a'::uuid,null::text),
  ('1139461','Condomínio Vitória Arniqueiras',1,1,30988.50,'2026-10-01'::date,'Até 1 dia útil após o vendedor receber o item 2 da Cláusula Segunda','https://drive.google.com/file/d/1Z0yRrsMcqNQp-geNU3nhS81979BbXm-E/view','4aedae0f-348b-4525-9e6b-a987e279c367'::uuid,null::text),
  ('1197633','QI 10 Bloco T apto 210',1,2,2253.13,'2026-10-01'::date,'Parcela 1/2: até 1 dia útil após o vendedor receber o item 1 da Cláusula Segunda','https://drive.google.com/file/d/1ma9xgbq5_tR0Se0UlBxQdGeWfsE2VNvC/view','da658fe9-4307-4f2d-9462-33d5dfbad465'::uuid,'Os centavos das parcelas são distintos conforme o contrato'),
  ('1197633','QI 10 Bloco T apto 210',2,2,2253.12,'2026-10-01'::date,'Parcela 2/2: até 1 dia útil após o vendedor receber o item 2 da Cláusula Segunda','https://drive.google.com/file/d/1ma9xgbq5_tR0Se0UlBxQdGeWfsE2VNvC/view','da658fe9-4307-4f2d-9462-33d5dfbad465'::uuid,'Os centavos das parcelas são distintos conforme o contrato'),
  ('1198416','Costa Verde 403',1,1,4167.40,'2026-10-01'::date,'Até 1 dia útil após o vendedor receber o item 1 da Cláusula Segunda','https://drive.google.com/file/d/1ALdtP5x9S4ja17xVZjySsH8Z_Av1RLoY/view','d3206aa1-5bff-46d3-8ec6-d1e477a28bbf'::uuid,null::text)
)
insert into public.financeiro_comissoes_previstas (
  tenant_id,codigo_referencia,imovel_nome,parcela_numero,parcelas_total,valor,
  competencia,condicao_pagamento,documento_url,processo_id,observacoes
)
select 'fc91a390-af99-4357-95e1-e173a8213abf'::uuid,
  f.codigo,f.imovel,f.parcela,f.total,f.valor,f.competencia,
  f.condicao,f.documento,f.processo_id,f.notas from fonte f
on conflict (tenant_id,codigo_referencia,parcela_numero) do nothing;
