-- Preenchimento documental dos contratos de locação a partir dos arquivos reais do Drive.
-- Cauções = valor contratual previsto, NÃO comprovação de recebimento bancário.
-- Evidência: aditivos prevalecem sobre o contrato original quando alteram garantia.
-- Não altera contratos com garantia preenchida, não modifica status nem pagamentos.
-- Valores de caução foram definidos segundo os documentos/aluguéis atualizados.
-- Atenção: 1601B Graúna tem valor de caução explícito R$ 21.780,00 (3 x 7.260 após pontualidade),
-- embora aluguel bruto seja R$ 7.360,00. 1027/1028 iniciou em R$ 9.000 de caução,
-- sendo R$ 9.300 o equivalente teórico dos 3 x R$ 3.100 do aluguel do aditivo de 2026.
-- 513 Green Park passou de R$ 1.200 para R$ 1.500, logo previsão reajustada R$ 4.500;
-- não presumir complemento recebido. 101 SQS 410 necessita comprovação de depósito.
with fonte(numero,garantia,aluguel,caucao_centavos,documento_url) as (
 values
  ('10/12 Varandas Sudoeste','Fiador',null,null,'https://drive.google.com/file/d/1dNcyZU8uw8SSr1O-wgLB0uiMWN4y2Y2s/view'),
  ('1009 Park Style','Seguro Fiança (Loft)',null,null,'https://drive.google.com/file/d/1MBh-QH40ZnFLkwZo8x-ek-9wVtYui3-6/view'),
  ('101 SQS 410','Caução',5125.17,1537551,'https://drive.google.com/file/d/1sZGcS_DX3fg4j3C5uvNBPOl7fnfDJdat/view'),
  ('1016 You Life Style','Garantia Investe (Loft)',null,null,'https://drive.google.com/file/d/1gu5hyJmJ6repPd2x0QIy3Ylj6PXpGccf/view'),
  ('1027/1028 Radio Center','Caução',3100,930000,'https://drive.google.com/file/d/1oZzVCTYwDNfuexGIpHTUSS2KIpAT0tHF/view'),
  ('107 SQS 413','Caução',3100,930000,'https://drive.google.com/file/d/1m2Zd03CfpJ0xzQ9ZX2CaBnHQ9cfV5mJV/view'),
  ('1103 Spazio Brisas','Seguro Fiança (Loft)',null,null,'https://drive.google.com/file/d/1drN2142A5v2NBb95ZZFbYKpHM0z0kIeV/view'),
  ('1305 Vivaldi Moreira','Fiador',null,null,'https://drive.google.com/file/d/1tlA3fNhylRboLd4wkgo2ByN3KOaBrMx6/view'),
  ('1404 Vivaldi Moreira','CredAluga',null,null,'https://drive.google.com/file/d/1zTVTnySNlDP3_GMOIvlvkBgZcSOB0Jt8/view'),
  ('1503C Real Celebration','Seguro Fiança (Loft)',null,null,'https://drive.google.com/file/d/1np4AzmDVqxoBI0B89qghAfNMxHMGX_h4/view'),
  ('1601B Graúna','Caução',7360,2178000,'https://drive.google.com/file/d/1qneVZ3VIyNhRPngiB_DCm-k4UdOk4V1N/view'),
  ('201 SQS 410','Garantia Investe (Loft)',null,null,'https://drive.google.com/file/d/1SHJf5xohJjr4gh-bWg5fyLEkjV46jIK8/view'),
  ('201 Square Home','Fiador',null,null,'https://drive.google.com/file/d/1CsYySpoXvTxx42iEtCf5g5hIpnvrfN_G/view'),
  ('201 Tissiana','Seguro Fiança (Loft)',null,null,'https://drive.google.com/file/d/1L6qoF10nPcibgZivmgs1QxlXdcrwIHGS/view'),
  ('203 Safari','Seguro Fiança (Loft)',null,null,'https://drive.google.com/file/d/11eKZEvkzJxX3JkRVSkPBdeLan1-xS-ax/view'),
  ('212 Square Home','CredPago',null,null,'https://drive.google.com/file/d/1jV3mkWEXriNhUw57LpCIrjycZecYrUBt/view'),
  ('225 Residencial Veneza','Fiador',null,null,'https://drive.google.com/file/d/1nMzhSXlm46CCuGjTJoqr_2Tq0qRURvyM/view'),
  ('324 Sophia Space','CredAluga',null,null,'https://drive.google.com/file/d/15vEX-60b72XJ_UoXjc2QQb3fc6GAOJL3/view'),
  ('401B Graúna','Fiador',null,null,'https://drive.google.com/file/d/1qLz8Ay4RRuluRLV8iX1x64Ym3bvFwy95/view'),
  ('406 Joy','CredAluga',null,null,'https://drive.google.com/file/d/16cmQgxjyMYo7DWZknt3cNiXdBjj6OIDL/view'),
  ('407 Enzo','Seguro Fiança (Loft)',null,null,'https://drive.google.com/file/d/1XMTKJi6SCIF5TUaS1wmiF6JUDE1Y8r8a/view'),
  ('418 Le Quartier','Fiador',null,null,'https://drive.google.com/file/d/1B9ZZoCrfPXqq6mfwxc6OO0EgMxe-kOGG/view'),
  ('419 e 420 Le Quartier','Fiador',null,null,'https://drive.google.com/file/d/1zq1nqnHyrAc-Neogomn2nmbzgZGS-qEN/view'),
  ('421 Le Quartier','Fiador',null,null,'https://drive.google.com/file/d/1-S8CQESA2F88MKst1Q-rEhTSCrddNpjo/view'),
  ('424 Maison do Lago','CredPago',null,null,'https://drive.google.com/file/d/1vOLXD1ei-Zjbjy72AUWxwfw9xdSQF3go/view'),
  ('501 Dubai','Garantia Investe (Loft)',null,null,'https://drive.google.com/file/d/1fdcPLSHeeBNDao-mwRxke4SwytUWMFhr/view'),
  ('503 Smart (Apartamento)','Seguro Fiança (Loft)',null,null,'https://drive.google.com/file/d/1iJAe5m03AZbONTnDteJjFihsJyjG2B-o/view'),
  ('513 Green Park','Caução',1500,450000,'https://drive.google.com/file/d/1cTSayMGXE7JfP0TX05d65AoQHOGre7Pu/view'),
  ('704 Dalmo Rebello','Garantia Investe (Loft)',null,null,'https://drive.google.com/file/d/16fl5a8FUwJg6SM85kM7u5vSS3hDS5KiM/view'),
  ('705 Bercy','Garantia Investe (Loft)',null,null,'https://drive.google.com/file/d/1aFTtm8A9eG0dUPPAx8T9pTcF8n_FQQPm/view'),
  ('707B Montpellier','CredPago',null,null,'https://drive.google.com/file/d/11gX5C5qYyonlngu9tXw0uarriXJ0jAbX/view'),
  ('801A Grauna','Seguro Fiança (Loft)',null,null,'https://drive.google.com/file/d/1fPjZrvzoVaaeHF1crTrUkPueSBlo2TMn/view'),
  ('905A Montana','Seguro Fiança (Loft)',null,null,'https://drive.google.com/file/d/1hDUuR2zQm_bOFIlTrppdxx0Z5KXKRqBK/view'),
  ('907B Montana','CredAluga',null,null,'https://drive.google.com/file/d/1SOdJoFgy0dl3V1xjsJZ9q0XqtbefmNWE/view'),
  ('Casa 2 QE 26','Título de Capitalização (Brasilcap)',null,null,'https://drive.google.com/file/d/1StKW2CWLQdwjL7Iwqo6CTw0S3uPqiByd/view'),
  ('Qe 42 Kit 01','CredAluga',null,null,'https://drive.google.com/file/d/1ofHzXWllGtSgrbgKAjjimMaPifVnsOwO/view')
)
update public.contratos_locacao c
set garantia_locaticia = f.garantia,
    aluguel_valor = coalesce(c.aluguel_valor,f.aluguel),
    caucao_valor_centavos = case when f.garantia='Caução' then coalesce(c.caucao_valor_centavos,f.caucao_centavos) else c.caucao_valor_centavos end,
    documento_origem_url = coalesce(c.documento_origem_url,f.documento_url)
from fonte f
where c.numero=f.numero
  and c.ativo=true
  and c.garantia_locaticia is null
  and (f.garantia <> 'Caução' or f.caucao_centavos is not null);

-- Confere quais documentos casaram no banco e quais ficaram pendentes de conferência
-- sem criar novos contratos ou mexer nas fontes originais.
