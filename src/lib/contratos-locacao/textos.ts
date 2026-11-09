/**
 * Textos das minutas da Sacra (locação residencial e prestação de serviços),
 * copiados das minutas corrigidas enviadas pela Amanda em 09/11/2026.
 * Gerado a partir dos .docx — para mudar uma cláusula, altere aqui e mantenha
 * o mesmo texto da minuta oficial. Marcadores {{...}} são preenchidos em `montar.ts`.
 */

export type Clausula = { titulo: string; paragrafos: string[] };

export const PREAMBULO_LOCACAO: string[] = [
 "Pelo presente Instrumento Particular de Locação, o LOCADOR, dá em locação o imóvel descrito no Quadro Resumo, de sua propriedade, ao LOCATÁRIO, mediante as cláusulas e condições abaixo discriminadas em cotejo com as disposições legais pertinentes, em especial a Lei do Inquilinato nº 8.245/91, que voluntariamente aceitam e outorgam.",
 "A SACRA SOLUÇÕES IMOBILIÁRIAS LTDA., inscrita com CNPJ de nº 30.577.408/0001-91, registrada no CRECI CJ-24788, com escritório sito à EPTG Chácara 68 – Loja 01 – Brasília / DF, CEP 72005-355, representada pela administradora, AMANDA OLIVEIRA MARTINS, brasileira, casada, carteira de Identidade CRECI n° 14502 / DF, residente e domiciliada em Brasília / DF, neste contrato representa o LOCADOR como ADMINISTRADORA DO IMÓVEL e/ou INTERMEDIÁRIA."
];

/** Cláusulas 1ª a 22ª, sem a 14ª (garantia), na ordem da minuta. */
export const CLAUSULAS_LOCACAO: Clausula[] = [
 {
  "titulo": "CLÁUSULA PRIMEIRA – DO OBJETO",
  "paragrafos": [
   "O imóvel objeto da presente contratação é o descrito no Quadro Resumo.",
   "PARÁGRAFO ÚNICO: Juntamente com o imóvel, é dado em locação os bens móveis e utensílios que o guarnecem."
  ]
 },
 {
  "titulo": "CLÁUSULA SEGUNDA – DO PRAZO",
  "paragrafos": [
   "O prazo da locação é o previsto no Quadro Resumo, com início e fim nas datas ali indicadas. Findo o contrato, o(a) LOCATÁRIO(A) devolverá o imóvel ao(a) LOCADOR(A) ou ao seu representante legal, independentemente de qualquer aviso, notificação, interpelação judicial ou extrajudicial, na forma e nas condições especificadas neste instrumento e no Termo de Vistoria anexo, o qual faz parte integrante deste contrato de Locação, sob pena de incorrer na multa prevista na Cláusula XVI, salvo notificação no sentido diverso.",
   "PARÁGRAFO ÚNICO: Não obstante o prazo estipulado, fica facultado a qualquer das partes rescindir o presente contrato ao término de cada período de 12 (doze) meses de sua vigência, desde que mediante notificação prévia, por escrito, com antecedência mínima de 30 (trinta) dias contados da data de aniversário contratual, hipótese em que não será devida qualquer multa pela rescisão."
  ]
 },
 {
  "titulo": "CLÁUSULA TERCEIRA – DO VALOR DO ALUGUEL",
  "paragrafos": [
   "O valor mensal do aluguel, livremente pactuado entre as partes, será o previsto no Quadro Resumo, com vencimento no dia ali indicado de cada mês.",
   "PARÁGRAFO PRIMEIRO: Será concedido ao LOCATÁRIO desconto por incentivo à pontualidade no valor previsto no Quadro Resumo, desde que o pagamento seja realizado até a data ali indicada, não implicando tal desconto redução permanente do valor do aluguel.",
   "PARÁGRAFO SEGUNDO: O não pagamento do aluguel na data de vencimento acarretará a incidência de multa moratória de 10% (dez por cento) sobre o valor devido, além de juros de mora de 1% (um por cento) ao mês, calculados pro rata die, e correção monetária pelo índice IPCA.",
   "PARÁGRAFO TERCEIRO: Caso o LOCATÁRIO não receba o respectivo título bancário até 03 (três) dias antes do vencimento, deverá emitir a segunda via por meio da área do cliente disponibilizada no site da ADMINISTRADORA DO IMÓVEL ou entrar em contato para solicitá-la. O LOCATÁRIO compromete-se, ainda, a manter seus dados cadastrais atualizados junto à ADMINISTRADORA DO IMÓVEL, sob pena de incidência de multa, juros e perda do desconto por pontualidade.",
   "PARÁGRAFO QUARTO: Para fins de controle dos pagamentos, somente serão considerados válidos aqueles realizados por meio da liquidação do título bancário emitido pela ADMINISTRADORA DO IMÓVEL, não sendo aceitas, sob nenhuma hipótese, outras formas de pagamento.",
   "PARÁGRAFO QUINTO: Decorrido o prazo de 30 (trinta) dias após o vencimento do título sem a devida quitação, o débito poderá ser encaminhado automaticamente, independentemente de aviso prévio, ao Departamento Jurídico da ADMINISTRADORA DO IMÓVEL para cobrança amigável e/ou judicial. Na hipótese de cobrança administrativa, serão devidos multa de 10% (dez por cento), juros de mora de 1% (um por cento) ao mês e honorários advocatícios de 10% (dez por cento) sobre o montante devido. Caso seja necessário o ajuizamento de medida judicial, os honorários advocatícios serão de 20% (vinte por cento) sobre o valor do débito, arcando o LOCATÁRIO, ainda, com o pagamento das custas processuais e demais consectários legais. Qualquer recebimento fora do prazo ajustado será considerado mera tolerância por parte da ADMINISTRADORA DO IMÓVEL, não implicando novação ou renúncia de direitos.",
   "PARÁGRAFO SEXTO: O LOCATÁRIO perderá o desconto por pontualidade caso não realize o pagamento até o vencimento, bem como na hipótese de permanência no imóvel após o término do contrato sem renovação formal, sem prejuízo da adoção das medidas legais cabíveis, inclusive para desocupação do imóvel.",
   "PARÁGRAFO SÉTIMO: Para fins de ajuste entre a data de início da vigência deste contrato e a data escolhida pelo LOCATÁRIO para pagamento dos aluguéis, o primeiro aluguel, bem como os demais encargos, tais como o duodécimo do IPTU/TLP e a quota condominial, poderão ser cobrados proporcionalmente.",
   "PARÁGRAFO OITAVO: O descumprimento, pelo LOCATÁRIO, de quaisquer obrigações acessórias previstas neste contrato, tais como pagamento de encargos condominiais, contas de consumo (água, energia, gás), tributos ou quaisquer outras despesas a ele atribuídas, autoriza o LOCADOR ou a ADMINISTRADORA DO IMÓVEL a efetuar o respectivo pagamento para evitar prejuízos ou restrições ao imóvel. Nessa hipótese, o valor desembolsado será acrescido de multa de 10% (dez por cento), juros de mora de 1% (um por cento) ao mês, calculados pro rata die, e correção monetária pelo INPC, contados desde a data do desembolso até a efetiva restituição pelo LOCATÁRIO, podendo ser cobrado juntamente com os encargos da locação"
  ]
 },
 {
  "titulo": "CLÁUSULA QUARTA – DO REAJUSTE DO ALUGUEL",
  "paragrafos": [
   "O valor do aluguel será reajustado anualmente, contado da data de início da vigência deste contrato, com base na variação do IGPM/FGV apurada no período. Na hipótese de extinção, indisponibilidade ou não divulgação do índice pactuado, bem como de variação negativa, as partes desde já convencionam a sua substituição por outro índice que reflita a variação dos preços no período, preferencialmente dentre aqueles amplamente utilizados no mercado."
  ]
 },
 {
  "titulo": "CLÁUSULA QUINTA – DAS OBRIGAÇÕES DO LOCATÁRIO",
  "paragrafos": [
   "São de responsabilidade exclusiva do LOCATÁRIO todos os encargos incidentes sobre o imóvel locado durante a vigência da locação, tais como IPTU/TLP, consumo de energia elétrica (CEB), água e esgoto (CAESB), gás, telefone, condomínio, bem como multas de qualquer natureza decorrentes de infrações por ele praticadas, além de taxas ordinárias, complementares ou suplementares, ressalvadas aquelas de responsabilidade do LOCADOR, nos termos do art. 22, inciso X, da Lei nº 8.245/91. Os referidos encargos poderão ser cobrados conjuntamente com o aluguel.",
   "PARÁGRAFO PRIMEIRO: O LOCATÁRIO obriga-se a apresentar os comprovantes de pagamento sempre que solicitado pelo LOCADOR, por intermédio da ADMINISTRADORA DO IMÓVEL, sob pena de caracterização de infração contratual, passível de rescisão, na forma da lei, sem direito a indenização.",
   "PARÁGRAFO SEGUNDO: O LOCATÁRIO fica autorizado a promover, junto às concessionárias competentes, a ligação, transferência de titularidade e desligamento dos serviços de água e energia elétrica do imóvel, obrigando-se a efetuar o cadastro em seu nome no início da locação e a respectiva baixa ou transferência ao seu término, de modo a assumir integral responsabilidade pelos consumos e encargos decorrentes.",
   "PARÁGRAFO TERCEIRO: O LOCATÁRIO obriga-se a contratar e manter vigente, durante todo o prazo da locação e suas eventuais prorrogações, seguro contra incêndio do imóvel locado, com cobertura mínima equivalente a 100 (cem) vezes o valor do aluguel. Neste ato, autoriza a ADMINISTRADORA DO IMÓVEL a providenciar a contratação do seguro, caso necessário, sendo o respectivo prêmio cobrado do LOCATÁRIO. O pagamento do seguro será exigido no ato da assinatura do contrato e renovado anualmente.",
   "PARÁGRAFO QUARTO: Fica expressamente proibido ao LOCATÁRIO manter ou armazenar, no interior do imóvel, materiais inflamáveis, explosivos ou corrosivos, respondendo integralmente por eventuais danos causados ao imóvel ou a terceiros, independentemente da existência de seguro."
  ]
 },
 {
  "titulo": "CLÁUSULA SEXTA – DA DESTINAÇÃO DO IMÓVEL",
  "paragrafos": [
   "O imóvel objeto deste instrumento é locado exclusivamente para servir de residência ao LOCATÁRIO e sua família, não podendo sua destinação ser alterada, substituída ou acrescida de qualquer outra, sem prévia e expressa anuência do LOCADOR e da ADMINISTRADORA DO IMÓVEL. O LOCATÁRIO não poderá transferir o presente contrato, nem sublocar, ceder ou emprestar o imóvel seja a título gratuito ou oneroso, no todo ou parte, sem o expresso consentimento LOCADOR e da ADMINISTRADORA DO IMÓVEL."
  ]
 },
 {
  "titulo": "CLÁUSULA SÉTIMA – DAS CONDIÇÕES DO IMÓVEL",
  "paragrafos": [
   "O imóvel objeto deste, foi entregue ao LOCATÁRIO nas condições descritas no “Termo de Vistoria” devidamente assinado pelas partes, integrando o presente, confessando receber o imóvel em perfeito estado de conservação e funcionamento, obrigando-se a devolvê-lo, uma vez finda a locação, nas mesmas condições em que o recebeu, razão pela qual, no momento da restituição das chaves, proceder-se-á a uma nova vistoria.",
   "PARÁGRAFO PRIMEIRO: Obriga-se o LOCATÁRIO a manter o imóvel sempre limpo e em bom estado de conservação durante toda a vigência da locação, correndo por sua conta os reparos de pequeno porte necessários à manutenção do imóvel, bem como o pagamento de multas decorrentes de infrações por ele cometidas, em razão da inobservância de leis, decretos ou regulamentos aplicáveis.",
   "PARÁGRAFO SEGUNDO: Constatadas irregularidades no imóvel decorrentes de uso inadequado pelo LOCATÁRIO ou a necessidade de adequação às condições descritas no laudo de vistoria inicial, a ADMINISTRADORA DO IMÓVEL poderá apresentar orçamento prévio elaborado por profissional habilitado, facultando ao LOCATÁRIO optar pelo pagamento do valor apresentado, hipótese em que a ADMINISTRADORA não se responsabilizará por eventuais vícios na execução, prazos ou conclusão dos serviços, ou, alternativamente, realizar os reparos por sua própria conta e risco, mediante contratação de mão de obra especializada e aquisição de materiais, assumindo integral responsabilidade pela qualidade, prazos e eventuais consequências decorrentes. Em qualquer hipótese, a locação somente será considerada encerrada após a entrega do imóvel nas mesmas condições em que foi recebido, conforme laudo de vistoria inicial, ou mediante aprovação expressa em vistoria final. O agendamento de mais de 02 (duas) vistorias finais pelo LOCATÁRIO ensejará a cobrança de R$ 120,00 (cento e vinte reais) por vistoria adicional, a partir da terceira solicitação.",
   "PARÁGRAFO TERCEIRO: A ADMINISTRADORA DO IMÓVEL poderá, a qualquer tempo, mediante prévio aviso, vistoriar o imóvel locado, devendo, para tanto, agendar previamente com o LOCATÁRIO data e horário que atendam, na medida do possível, à conveniência de ambas as partes.",
   "PARÁGRAFO QUARTO: Na hipótese de o LOCATÁRIO, devidamente notificado, não promover os reparos de sua responsabilidade no prazo que lhe for assinalado, ficará a ADMINISTRADORA DO IMÓVEL autorizada a realizá-los por conta própria, visando à conservação do imóvel. Nessa hipótese, o LOCATÁRIO deverá reembolsar integralmente os valores despendidos, acrescidos de multa de 10% (dez por cento), juros de mora de 1% (um por cento) ao mês, calculados pro rata die, e correção monetária, desde a data do desembolso até a efetiva restituição."
  ]
 },
 {
  "titulo": "CLÁUSULA OITAVA – DAS MODIFICAÇÕES NO IMÓVEL",
  "paragrafos": [
   "O LOCATÁRIO não poderá realizar quaisquer obras, benfeitorias ou modificações no imóvel, com exceção das benfeitorias necessárias, sem a prévia autorização por escrito do LOCADOR ou de sua ADMINISTRADORA DO IMÓVEL. As benfeitorias, acessões ou modificações eventualmente realizadas incorporar-se-ão automaticamente ao imóvel, não assistindo ao LOCATÁRIO direito à indenização ou retenção, independentemente de sua natureza (voluptuárias, úteis ou necessárias).",
   "PARÁGRAFO ÚNICO: Somente será admitida a retirada de benfeitorias pelo LOCATÁRIO se previamente autorizada pelo LOCADOR e desde que sua remoção não acarrete danos ou deixe vestígios no imóvel, obrigando-se, em qualquer caso, à plena restauração ao estado original."
  ]
 },
 {
  "titulo": "CLÁUSULA NONA – DA COMUNICAÇÃO DE AVARIAS",
  "paragrafos": [
   "Obriga-se o LOCATÁRIO a comunicar imediatamente ao LOCADOR ou à ADMINISTRADORA DO IMÓVEL, por escrito, a ocorrência de qualquer avaria grave na estrutura ou nas instalações do imóvel, sob pena de responder integralmente pelos danos decorrentes de sua omissão. Fica ressalvado que o LOCATÁRIO não será responsabilizado pelas avarias decorrentes de caso fortuito ou força maior, tais como eventos naturais imprevisíveis ou inevitáveis, a exemplo de relâmpagos, inundações, desabamentos ou abalos sísmicos"
  ]
 },
 {
  "titulo": "CLÁUSULA DÉCIMA – DA DESAPROPRIAÇÃO",
  "paragrafos": [
   "Na hipótese de desapropriação, total ou parcial, do imóvel locado, o LOCADOR ou sua ADMINISTRADORA DO IMÓVEL ficará desobrigado do cumprimento das obrigações decorrentes deste contrato, restando rescindida a locação, sem direito a indenização por parte do LOCATÁRIO, ressalvados eventuais direitos previstos em lei."
  ]
 },
 {
  "titulo": "CLÁUSULA DÉCIMA PRIMEIRA – DAS EXIGÊNCIAS DO PODER PÚBLICO",
  "paragrafos": [
   "Obriga-se o LOCATÁRIO a cumprir integralmente todas as exigências dos poderes públicos a que der causa, em decorrência do uso do imóvel. Nenhuma notificação ou intimação de órgãos públicos, inclusive de natureza sanitária, constituirá motivo para abandono do imóvel ou rescisão do contrato pelo LOCATÁRIO, salvo se, mediante decisão judicial, for constatado risco estrutural que comprometa a segurança da edificação."
  ]
 },
 {
  "titulo": "CLÁUSULA DÉCIMA SEGUNDA – DAS CORRESPONDÊNCIAS",
  "paragrafos": [
   "Deverá o LOCATÁRIO entregar imediatamente ao LOCADOR ou sua ADMINISTRADORA DO IMÓVEL toda e qualquer correspondência, intimações, documentos de cobrança de tributos, carnês de pagamento de prestações, encargos condominiais, atas e convocações de assembleias de condomínio, ainda que dirigidas ao LOCATÁRIO – art.23, inciso VII, da Lei 8.245/91, guardando para si um protocolo que comprove o repasse dos documentos."
  ]
 },
 {
  "titulo": "CLÁUSULA DÉCIMA TERCEIRA – DA IMISSÃO DE POSSE",
  "paragrafos": [
   "A fim de resguardar o imóvel de eventual abandono pelo LOCATÁRIO e proteger sua integridade contra esbulhos ou depredações, fica o LOCADOR ou sua ADMINISTRADORA DO IMÓVEL autorizado a retomar a posse direta do imóvel, independentemente de prévia medida judicial, desde que haja fundados indícios de abandono. Considerar-se-á caracterizado o abandono, para os fins desta cláusula, quando verificada a ausência prolongada e injustificada do LOCATÁRIO, aliada à inadimplência por período superior a 02 (dois) meses, bem como outros elementos objetivos que evidenciem a desocupação do imóvel."
  ]
 },
 {
  "titulo": "CLÁUSULA DÉCIMA QUINTA – FALECIMENTO DE CONTRATANTE",
  "paragrafos": [
   "No caso de falecimento do LOCADOR ou do LOCATÁRIO, o presente contrato permanecerá em vigor, sub-rogando-se nos direitos e obrigações contratuais os respectivos herdeiros e/ou sucessores, que se obrigam ao seu integral cumprimento até o término da vigência, nos termos da legislação aplicável."
  ]
 },
 {
  "titulo": "CLÁUSULA DÉCIMA SEXTA – DA MULTA POR INFRIGÊNCIA CONTRATUAL",
  "paragrafos": [
   "O descumprimento de qualquer cláusula ou condição deste contrato constituirá infração contratual e poderá ensejar sua rescisão, a critério da parte prejudicada, ficando a parte infratora sujeita ao pagamento de multa equivalente a 03 (três) meses de aluguel, considerado o valor vigente à época da infração, sem prejuízo da cobrança de perdas e danos, nos termos do art. 4º da Lei nº 8.245/91.",
   "PARÁGRAFO ÚNICO: Na hipótese de prorrogação do contrato por prazo indeterminado, a parte que desejar resilir a locação deverá notificar a outra, por escrito, com antecedência mínima de 30 (trinta) dias, hipótese em que não será devida a multa prevista nesta cláusula, desde que respeitado o referido prazo de aviso prévio."
  ]
 },
 {
  "titulo": "CLÁUSULA DÉCIMA SÉTIMA – DA DESOCUPAÇÃO DO IMÓVEL E DA MULTA RESCISÓRIA",
  "paragrafos": [
   "Durante o prazo de vigência deste contrato, o LOCADOR não poderá reaver o imóvel locado, salvo nas hipóteses previstas em lei. O LOCATÁRIO, por sua vez, poderá devolvê-lo antes do término contratual, mediante pagamento de multa rescisória, proporcional ao período de cumprimento do contrato, nos termos do art. 4º da Lei nº 8.245/91. A multa rescisória corresponderá a 03 (três) aluguéis, calculada proporcionalmente ao tempo restante para o término do contrato, considerando-se o prazo total previsto no Quadro Resumo, de acordo com a seguinte fórmula: Multa = (valor do aluguel × 3 ÷ número de meses do contrato) × número de meses restantes para o término do contrato.",
   "PARÁGRAFO PRIMEIRO: A devolução do imóvel deverá ocorrer no prazo máximo de 30 (trinta) dias contados da comunicação da intenção de rescisão, condicionando-se à aprovação em vistoria final e à quitação integral de todos os débitos locatícios.",
   "PARÁGRAFO SEGUNDO: Nos últimos 15 (quinze) dias de permanência no imóvel, o LOCATÁRIO deverá permitir a realização de visitas para fins de nova locação, em dias e horários previamente ajustados com a ADMINISTRADORA DO IMÓVEL, de modo a não prejudicar a sua rotina.",
   "PARÁGRAFO TERCEIRO: O LOCATÁRIO ficará isento do pagamento da multa rescisória na hipótese de transferência profissional compulsória, determinada por seu empregador, público ou privado, para localidade diversa daquela do início da locação, devendo, para tanto, notificar a ADMINISTRADORA DO IMÓVEL por escrito, com antecedência mínima de 30 (trinta) dias, mediante comprovação documental da transferência."
  ]
 },
 {
  "titulo": "CLÁUSULA DÉCIMA OITAVA – DA OFERTA DE VENDA",
  "paragrafos": [
   "Na hipótese de o imóvel ser colocado à venda, o LOCADOR ou sua ADMINISTRADORA DO IMÓVEL notificará o LOCATÁRIO, por escrito, conferindo-lhe o direito de preferência para aquisição, nos termos da lei, devendo constar da notificação todas as condições da proposta. O LOCATÁRIO terá o prazo de 30 (trinta) dias, contados do recebimento da notificação, para manifestar, de forma expressa e inequívoca, seu interesse na aquisição do imóvel.",
   "PARÁGRAFO ÚNICO: A ausência de manifestação expressa no prazo estipulado será interpretada como renúncia ao direito de preferência. Nessa hipótese, o LOCATÁRIO obriga-se a permitir a visitação do imóvel por potenciais interessados, em dias e horários previamente ajustados com a ADMINISTRADORA DO IMÓVEL, de modo a compatibilizar os interesses de ambas as partes."
  ]
 },
 {
  "titulo": "CLÁUSULA DÉCIMA NONA – DA RESCISÃO DE PLENO DIREITO",
  "paragrafos": [
   "O LOCADOR, por intermédio de sua ADMINISTRADORA DO IMÓVEL, poderá considerar rescindido o presente contrato, independentemente de interpelação judicial ou extrajudicial, na ocorrência de qualquer das seguintes hipóteses:",
   "a) o LOCATÁRIO não pagar o aluguel e demais encargos estipulados nos prazos e locais previstos;",
   "b) o LOCATÁRIO infringir obrigações legais, contratuais ou condominiais;",
   "c) o LOCATÁRIO recusar ou impedir a visita ao imóvel locado, pelo LOCADOR, sua ADMINISTRADORA DO IMÓVEL ou pessoa devidamente autorizada para fins de vistoria, ou – em caso de ser posto à venda – pelas pessoas interessadas na sua aquisição;",
   "d) o imóvel ter sido vendido e o LOCATÁRIO não ter se manifestado no prazo de 30 (trinta) dias do recebimento do pertinente documento ou ter indicando expressamente, de forma inequívoca, que não teve interesse em adquiri-lo, conforme o contido na Cláusula XVIII; e",
   "e) ocorrer incêndio no prédio ou se ele for desapropriado. No caso de desapropriação, ressalva-se o LOCATÁRIO a faculdade de agir contra o poder expropriante em defesa de seus interesses."
  ]
 },
 {
  "titulo": "CLÁUSULA VIGÉSIMA - DO CONDOMÍNIO",
  "paragrafos": [
   "O LOCATÁRIO obriga-se a cumprir e fazer cumprir, por si, seus familiares, prepostos, funcionários, prestadores de serviços e visitantes, a Convenção de Condomínio e o Regulamento Interno, respondendo por quaisquer infrações cometidas.",
   "PARAGRAFO PRIMEIRO: O descumprimento das normas condominiais sujeitará o LOCATÁRIO às multas e demais sanções aplicáveis, cujo valor poderá ser cobrado juntamente com os encargos da locação, caso sejam direcionados ao LOCADOR ou à sua ADMINISTRADORA DO IMÓVEL pelo síndico ou pela administradora do condomínio.",
   "PARAGRAFO SEGUNDO: O LOCATÁRIO compromete-se a comunicar previamente ao LOCADOR ou à ADMINISTRADORA DO IMÓVEL acerca de quaisquer medidas judiciais que pretenda ajuizar em face do condomínio, sua administradora ou síndico, relacionadas ao imóvel objeto deste contrato, responsabilizando-se por eventuais prejuízos que causar ao LOCADOR em razão de sua atuação."
  ]
 },
 {
  "titulo": "CLÁUSULA VIGÉSIMA PRIMEIRA – ASSINATURA DIGITAL",
  "paragrafos": [
   "O presente contrato, caso seja eletrônico e assinado digitalmente e/ou eletronicamente pelas partes, em conformidade com o ICP – Infraestrutura de Chaves Públicas Brasileiras, possui validade jurídica incontestável, amparada pela MP 2.200-2/2001, e é considerado título executivo extrajudicial."
  ]
 },
 {
  "titulo": "CLÁUSULA VIGÉSIMA SEGUNDA - DO FORO",
  "paragrafos": [
   "Elegem as partes contratantes o foro da Circunscrição Judiciária da região administrativa de Brasília /DF, onde está situado o imóvel, para executar o contrato de locação, bem como dirimir todas e quaisquer questões oriundas da interpretação ou aplicação deste contrato, com exclusão dos demais, por mais privilegiadas que sejam."
  ]
 }
];

export const FECHO_LOCACAO = "Estando justos, contratados e de pleno acordo com todas as cláusula e condições aqui estipuladas, as partes assinam o presente com as correspondentes rubricas em todas as folhas, para um só efeito legal, obrigando-se a cumpri-lo, por si, seus herdeiros e sucessores a qualquer título.";

/** Cláusula 14ª conforme a garantia. */
export const CLAUSULA_GARANTIA = {
 "fiador": {
  "titulo": "CLÁUSULA DÉCIMA QUARTA – DA GARANTIA LOCATÍCIA",
  "paragrafos": [
   "A presente locação será garantida por um FIADOR, nos termos dos arts. 37, II, e 39 da Lei nº 8.245/91 e dos arts. 818 a 839 do Código Civil, obrigando-se solidariamente com o LOCATÁRIO pelo pagamento dos aluguéis, encargos locatícios, multas contratuais, tributos, danos ao imóvel, despesas processuais, honorários advocatícios e demais obrigações assumidas neste contrato.",
   "PARÁGRAFO PRIMEIRO: Sendo o FIADOR casado ou em união estável sob qualquer regime de bens diferente do regime de separação absoluta, o cônjuge ou companheiro deverá autorizar e assinar o presente contrato, nos termos do artigo 1.647, caput e inciso III, do Código Civil de 2002, para que a fiança seja válida e eficaz.",
   "PARÁGRAFO SEGUNDO: Nos casos previstos no artigo 40 da Lei nº 8.245/91, o LOCADOR terá o direito de exigir novo FIADOR ou a substituição da modalidade de garantia.",
   "PARÁGRAFO TERCEIRO: No caso do parágrafo antecedente, sob pena de desfazimento da locação, o LOCATÁRIO poderá ser notificado para apresentar nova garantia locatícia no prazo de 30 (trinta) dias, nos termos do artigo 40, parágrafo único, da Lei nº 8.245/91.",
   "PARÁGRAFO QUARTO: O FIADOR renuncia expressamente ao benefício de ordem previsto no artigo 827, caput, do Código Civil de 2002, autorizando que o Locador cobre diretamente do Fiador todo e qualquer valor devido pelo Locatário, independentemente de prévia excussão dos bens deste.",
   "PARÁGRAFO QUINTO: O pedido de exoneração da fiança somente produzirá efeitos 120 (cento e vinte) dias após a notificação ao Locador, conforme art. 40, X, da Lei nº 8.245/91, permanecendo o Fiador responsável por todas as obrigações vencidas e vincendas nesse período, sendo obrigado, ainda, a indicar novo Fiador idôneo ou outra modalidade de garantia aceita pelo Locador, na forma dos parágrafos acima.",
   "PARÁGRAFO SEXTO: Em caso de falecimento do fiador, transmitem-se aos seus herdeiros as obrigações do fiador, nos limites das forças da herança, conforme os artigos 836 e 1.792 do Código Civil de 2002.",
   "PARÁGRAFO SÉTIMO: O Fiador permanece responsável por todas as obrigações até a efetiva devolução das chaves ao Locador, ainda que a locação seja prorrogada por prazo indeterminado, nos termos do art. 39 da Lei nº 8.245/91."
  ]
 },
 "seguro_fianca": {
  "titulo": "CLÁUSULA DÉCIMA QUARTA – CLÁUSULA FIANÇA ALUGUEL",
  "paragrafos": [
   "O LOCATÁRIO realizou a contratação da LOFT SOLUÇÕES FINANCEIRAS S/A., pessoa jurídica de direito privado, inscrita no CNPJ sob o n.º 25.027.928/0001-90 (“ LOFT”), à qual se compromete, quando solicitado pelo LOCADOR, por meio da ADMINISTRADORA DO IMÓVEL (na qualidade de seu representante), a efetuar o pagamento de eventuais débitos relativos ao aluguel e demais encargos da presente locação que venham a ser inadimplidos pelo LOCATÁRIO até o limite do valor máximo afiançado, conforme condições constantes nos Termos e Condições Gerais da FIANÇA ALUGUEL (“T&C”) firmado pelo LOCATÁRIO, constantes no Anexo I deste instrumento, com o que o LOCADOR anui expressamente..",
   "PARÁGRAFO PRIMEIRO: O LOCADOR e o LOCATÁRIO declaram estar cientes e de acordo com todas as condições e limitações relativas à fiança prestada pela LOFT, notadamente, no tocante a: (i) o valor máximo afiançado, (ii) as limitações da responsabilidade da LOFT; (iii) o prazo de vigência da fiança contratada, (iv) as condições para sua renovação, (v) a possibilidade da LOFT substituir a fiança prestada por outra Modalidade de Garantia, especialmente, por seguro garantia financeiro; (vi) as hipóteses de término da FIANÇA ALUGUEL, que ocorrerá pelo primeiro dos seguintes eventos: (a) a entrega das chaves do Imóvel ao LOCADOR; (b) a certidão de despejo emitida por Oficial de Justiça em ação de despejo; ou (c) a desocupação e disponibilização do Imóvel ao LOCADOR; (vii) a inaplicabilidade, em relação à LOFT, de eventuais cláusulas deste instrumento que contrariem os T&C; e (viii) a rescisão imediata da FIANÇA ALUGUEL, com a consequente liberação da LOFT do pagamento de qualquer indenização, em caso de inadimplemento da contraprestação devida à LOFT pela prestação da fiança (“Taxa LOFT”).",
   "PARÁGRAFO SEGUNDO: O LOCATÁRIO e o LOCADOR reconhecem que, o Contrato de Locação será considerado automaticamente rescindido e, por consequência, também será rescindida a garantia LOFT FIANÇA ALUGUEL em qualquer das hipóteses de término, previstas anteriormente, ficando a LOFT imediatamente liberada do pagamento de qualquer indenização.",
   "PARÁGRAFO TERCEIRO: O LOCADOR declara-se ciente e concorda que os pagamentos dos valores afiançados serão realizados pela LOFT mediante depósito à Imobiliária, na qualidade de representante legal do LOCADOR e se sub-rogará com relação aos valores desembolsados, operando-se, de forma automática, a cessão não onerosa de todos os direitos do LOCADOR em relação ao pagamento efetuado, inclusive, mas não se limitando, a eventuais multas penais ou moratórias devidas pelo LOCATÁRIO.",
   "PARÁGRAFO QUARTO: Nesta hipótese, o LOCADOR reconhece e aceita expressamente que, uma vez realizados os pagamentos à ADMINISTRADORA DO IMÓVEL, a LOFT se exime de qualquer responsabilidade perante o LOCADOR caso a ADMINISTRADORA DO IMÓVEL não realize o repasse dos valores ao LOCADOR.",
   "PARÁGRAFO QUINTO: E o LOCATÁRIO concorda expressamente que, em caso exoneração da LOFT como fiadora por qualquer motivo detalhado no T&C, especialmente decorrente do inadimplemento do LOCATÁRIO, caberá a ele, promover, no prazo máximo de 30 (trinta) dias, a substituição da garantia locatícia prestada, que deverá ser expressamente aceita pelo LOCADOR, sob pena de infração contratual e ajuizamento da competente ação de despejo.",
   "PARÁGRAFO SEXTO: O e-mail indicado pelo LOCATÁRIO para a Loft quando da contratação da FIANÇA ALUGUEL será considerado apto para recebimento de qualquer comunicação (inclusive judiciais) acerca do Contrato de Locação e decorrentes do T&C, independentemente de confirmação de recebimento. Desta forma, o LOCATÁRIO tem ciência que deverá manter seus dados cadastrais atualizados junto a LOFT.",
   "PARÁGRAFO SÉTIMO: Por fim, para fins de cumprimento das obrigações previstas neste Contrato de Locação e nos T&C a ele vinculados, o LOCADOR, por meio deste instrumento, outorga poderes específicos a LOFT, na qualidade de garantidora do contrato de locação, de forma expressa, irrevogável e irretratável, mandato específico para representá-lo nas seguintes situações: (a) Na hipótese de descumprimento pela Imobiliária das obrigações relativas à FIANÇA ALUGUEL, caracterizando rescisão motivada dos Termos e Condições firmados entre a LOFT e a ADMINISTRADORA DO IMÓVEL, o LOCADOR desde já autoriza que a LOFT exerça os poderes anteriormente outorgados pelo LOCADOR à Imobiliária, subrogando-se nos direitos e obrigações daqueles Termos e Condições, inclusive para efetivar a cessão de tais direitos e obrigações a outra imobiliária. (b) Notificar o LOCATÁRIO, em nome do LOCADOR, em especial para que apresente nova modalidade de garantia locatícia no prazo de até 30 (trinta) dias, conforme previsto no artigo 40, §2º da Lei nº 8.245/1991 (Lei do Inquilinato), sob pena de rescisão contratual e adoção das medidas legais cabíveis; (c) Contratar advogado(s) e outorgar-lhes poderes, para promover, em nome do LOCADOR, o ajuizamento, condução e acompanhamento de ação de despejo, bem como outras ações judiciais ou procedimentos arbitrais relacionados à presente locação, incluindo, mas não se limitando a ações possessórias, medidas cautelares e ações de cobrança, perante qualquer juízo, instância, tribunal ou câmara arbitral (procuração ad judicia); (d) Os advogados contratados poderão receber poderes especiais para, em nome do LOCADOR, transigir, desistir, receber e dar quitação, firmar compromissos, renunciar a direitos, desistir de recursos e/ou reconhecer a procedência de pedidos, desde que tais atos estejam relacionados à defesa dos interesses do LOCADOR no âmbito da locação ora contratada. Os poderes permanecerão válidos enquanto vigente o presente contrato ou até que sejam expressamente revogados por instrumento escrito e registrado, sem prejuízo da validade dos atos já praticados. O exercício dos poderes previstos nos itens (c) e (d) deste instrumento está condicionado à adesão do LOCADOR, por meio da Imobiliária, à solução de Gestão de Despejos prestada pela LOFT, conforme regras aplicáveis nos Termos e Condições da Fiança Aluguel."
  ]
 },
 "garantia_investe": {
  "titulo": "CLÁUSULA DÉCIMA QUARTA – GARANTIA LOCATÍCIA",
  "paragrafos": [
   "O LOCATÁRIO contratou o produto Loft/Garantia Investe (“Garantia Investe”), na modalidade de caução em títulos públicos, junto à LOFT SOLUÇÕES FINANCEIRAS S.A. (“Loft”), inscrita no CNPJ sob o n.° 25.027.928/0001-90, que atuará em conjunto com na ADMINISTRADORA para viabilizar a aquisição desses títulos pelo LOCATÁRIO.",
   "PARÁGRAFO PRIMEIRO: A Loft, além de atuar como facilitadora na relação entre o LOCATÁRIO e ADMINISTRADORA em relação à Garantia Investe, será responsável pela gestão da inadimplência deste contrato de locação, conforme descrito nos termos & Condições dos Serviços Loft (T&C), constantes do Anexo I deste instrumento. As Partes estão cientes de que a Loft não possui responsabilidade de acompanhar o cumprimento deste contrato. Assim, caberá exclusivamente à Imobiliária: (i) verificar a efetiva ocorrência de eventuais inadimplências; (ii) comunicar à Loft, informando o valor em aberto; e (iii) acionar a Garantia Investe para que a Loft providencie o resgate dos valores devidos pelo Inquilino. Após o resgate, a Imobiliária receberá os montantes e ficará encarregada de repassá-los ao LOCADOR.",
   "PARÁGRAFO SEGUNDO: A cada Evento de Inadimplência comunicado pela ADMINISTRADORA, a Loft notificará o LOCATÁRIO, nos termos previstos nos T&C do LOCATÁRIO constantes do Anexo I deste instrumento, para que reponha integralmente o valor resgatado destinado à quitação da dívida informada.",
   "PARÁGRAFO TERCEIRO: O não atendimento à notificação será considerado inadimplemento contratual, podendo ensejar a adoção das medidas judiciais cabíveis, incluindo o encerramento do Contrato de Locação e a retomada do imóvel locado. Nesta hipótese, o LOCATÁRIO reconhece ser o único responsável por todos os custos decorrentes das medidas adotadas para retomada do imóvel, incluindo as despesas com o ajuizamento de ação de despejo.",
   "PARÁGRAFO QUARTO: Para operar a Garantia Investe e efetuar os resgates de valores devidos, a Loft atuará como procuradora do LOCATÁRIO, o qual aceitou eletronicamente a procuração constante do ANEXO II deste Contrato de Locação. A referida procuração concede à Loft plenos poderes para comunicar, movimentar, solicitar resgates e reinvestimentos em nome do LOCATÁRIO, sem a necessidade de anuência prévia deste ou das demais Partes deste instrumento",
   "PARÁGRAFO QUINTO: Por fim, ao assinarem este contrato, as Partes declaram que a Loft atuará sempre conforme as instruções da Imobiliária e não terá responsabilidade por verificar a ocorrência de inadimplência, nem por qualquer aspecto relacionado à gestão da locação. LOCATÁRIO, LOCADOR e ADMINISTRADORA reconhecem, de forma inequívoca, que eventuais desacordos ou litígios decorrentes deste Contrato de Locação não envolverão o serviço prestado por meio da Garantia Investe."
  ]
 },
 "titulo_capitalizacao": {
  "titulo": "CLÁUSULA DÉCIMA QUARTA – DA GARANTIA LOCATÍCIA – TÍTULO DE CAPITALIZAÇÃO",
  "paragrafos": [
   "TÍTULO DE CAPITALIZAÇÃO – Para garantir as obrigações assumidas neste contrato, o LOCATÁRIO, por ser de seu interesse, dá neste ato em garantia ao LOCADOR Título de Capitalização da modalidade Instrumento de Garantia, de pagamento único, no valor nominal de {{titulo_valor}}, emitido pela sociedade de capitalização BRASILCAP CAPITALIZAÇÃO S.A., conforme proposta de subscrição de título nº {{titulo_proposta}}.",
   "PARÁGRAFO PRIMEIRO: No caso de inobservância pelo LOCATÁRIO de quaisquer das cláusulas do presente contrato, fica o LOCADOR autorizado a resgatar unilateralmente o Título de Capitalização acima mencionado a qualquer momento, mesmo antes do prazo final de capitalização, respeitando-se a tabela de resgate, inclusive com a atualização monetária devida, independentemente de interpelação judicial ou extrajudicial, pagando-se de qualquer importância que lhe seja devida. Uma vez satisfeita a obrigação, o LOCADOR fará a restituição ao LOCATÁRIO do saldo que porventura haja em seu favor, não se responsabilizando a Sociedade de Capitalização por quaisquer débitos perante aquele.",
   "PARÁGRAFO SEGUNDO: O LOCATÁRIO se obriga a realizar a contratação de novo(s) Título(s) de Capitalização para substituição daquele dado em garantia, caso no curso do contrato seja necessário o resgate do mesmo para adimplemento de débitos com o LOCADOR. Nesta hipótese, o(s) novo(s) Título(s) de Capitalização permanecerá(ão) em garantia do contrato e das obrigações contratuais assumidas pelo LOCATÁRIO, mantidas as demais condições, em especial quanto ao disposto no parágrafo anterior.",
   "PARÁGRAFO TERCEIRO: Durante a vigência deste contrato, o resgate do Título de Capitalização pelo LOCATÁRIO somente poderá ocorrer com expressa anuência do LOCADOR.",
   "PARÁGRAFO QUARTO: Na ocorrência da rescisão antecipada do contrato, o LOCATÁRIO poderá:",
   "a) utilizar o Título de Capitalização para garantir outro contrato;",
   "b) solicitar o resgate antecipado do Título de Capitalização, sem aplicação de qualquer penalidade, respeitada a Tabela de Resgate; e/ou",
   "c) aguardar o término da vigência do Título de Capitalização e realizar o resgate final.",
   "PARÁGRAFO QUINTO: Ao término do contrato, com a satisfação integral das obrigações assumidas contratualmente, sem a existência de quaisquer débitos do LOCATÁRIO perante o LOCADOR, este liberará junto à Sociedade de Capitalização a caução do Título de Capitalização.",
   "PARÁGRAFO SEXTO: Para efeito do cumprimento do disposto na presente cláusula, a autorização concedida ao LOCADOR para resgatar o Título de Capitalização decorre da própria natureza jurídica de sua modalidade, denominada “Instrumento de Garantia”, que visa assegurar o cumprimento de obrigações assumidas contratualmente perante terceiros, nos termos da Resolução CNSP nº 384/2020 e Circular SUSEP nº 656/2022."
  ]
 }
} as const satisfies Record<string, Clausula>;

export const PREAMBULO_CPS = "Pelo presente instrumento particular, com as formalidades e efeitos de título executivo extrajudicial, as partes acima qualificadas, doravante simplesmente denominadas adiante como CONTRATANTE e CONTRATADA, termos que se aplicam indistintamente às pessoas físicas ou jurídicas acima qualificadas independente de gênero, estado civil ou número, seja no singular ou no plural, celebram este contrato de prestação de serviços de administração e intermediação de locação, nos termos da Lei Nº 8.245/1991, o Código Civil e as demais normas pertinentes.";

export const CLAUSULAS_CPS: Clausula[] = [
 {
  "titulo": "CLÁUSULA PRIMEIRA – DO OBJETO",
  "paragrafos": [
   "O contrato abrange a intermediação, a administração e a gestão da locação do imóvel descrito no quadro resumo, nos limites deste instrumento. O CONTRATANTE declara ser proprietário ou ter poderes suficientes para autorizar a locação e a administração, não haver impedimento jurídico ou documental e compromete-se a comprovar seus poderes e informar restrições ou alterações relevantes."
  ]
 },
 {
  "titulo": "CLÁUSULA SEGUNDA – DA EXCLUSIVIDADE E DOS PODERES DE ADMINISTRAÇÃO",
  "paragrafos": [
   "O CONTRATANTE concede exclusividade à CONTRATADA durante a vigência deste contrato. Nos limites da procuração anexa e das condições aprovadas, a CONTRATADA poderá anunciar o imóvel, analisar propostas e documentos, realizar visitas, contratar a locação, assinar contratos, aditivos, vistorias e termos de chaves, receber aluguéis e encargos, emitir recibos e quitações, cobrar e notificar.",
   "PARÁGRAFO ÚNICO: Atos que excedam a administração ordinária dependerão de autorização específica e, quando exigido por lei, de poderes especiais e expressos."
  ]
 },
 {
  "titulo": "CLÁUSULA TERCEIRA – DA VISTORIA",
  "paragrafos": [
   "A CONTRATADA realizará vistoria inicial, com registro das condições aparentes de conservação, funcionamento e utilização, e vistoria de saída na devolução das chaves, comparando os registros e apontando divergências. Os relatórios serão disponibilizados ao CONTRATANTE e ao LOCATÁRIO para ciência e manifestação.",
   "PARÁGRAFO PRIMEIRO: A apuração de danos considerará os registros iniciais, o desgaste normal e a legislação. A vistoria de saída não condiciona o recebimento das chaves nem implica quitação das obrigações pendentes. A inspeção visual não garante a inexistência de vícios ocultos ou problemas estruturais, técnicos, construtivos, documentais ou jurídicos.",
   "PARÁGRAFO SEGUNDO: O CONTRATANTE responde pela veracidade das informações sobre defeitos, restrições e demais condições do imóvel e providenciará, às suas expensas, os reparos e regularizações de sua responsabilidade. Se desistir da contratação ou retirar o imóvel do processo de locação após a vistoria, pagará o ressarcimento de 30% em cima do valor do aluguel inicial, ainda que não tenha ocorrido locação."
  ]
 },
 {
  "titulo": "CLÁUSULA QUARTA – DA INTERMEDIAÇÃO E ADMINISTRAÇÃO DA LOCAÇÃO",
  "paragrafos": [
   "Compete à CONTRATADA divulgar o imóvel, atender interessados, realizar visitas e análise cadastral e documental, formalizar a locação e as vistorias, entregar e receber chaves, cobrar aluguéis e encargos, emitir recibos e quitações e prestar contas.",
   "PARÁGRAFO ÚNICO: O aluguel inicial é o que consta no quadro resumo. As condições comerciais essenciais, inclusive prazos, serão previamente aprovadas pelo CONTRATANTE. Dentro delas, a CONTRATADA poderá formalizar a locação e praticar os atos ordinários de administração. Na locação residencial, observará as regras legais relativas aos prazos iguais ou superiores a 30 (trinta) meses e aos inferiores a 30 (trinta) meses."
  ]
 },
 {
  "titulo": "CLÁUSULA QUINTA – DA COBRANÇA E DA ASSISTÊNCIA JURÍDICA",
  "paragrafos": [
   "O CONTRATANTE autoriza a CONTRATADA a solicitar advogado ou escritório de advocacia, em seu nome e interesse, para medidas extrajudiciais ou judiciais relacionadas à locação, inclusive cobrança, execução de garantias e despejo.",
   "PARÁGRAFO ÚNICO: Honorários contratuais, custas, despesas processuais, taxas e emolumentos não integram a remuneração ordinária e caberão ao CONTRATANTE, ressalvados os valores atribuídos à parte contrária por decisão ou acordo. A CONTRATADA não garante o resultado da atuação jurídica ou a recuperação de créditos, sem prejuízo da garantia de aluguel da Cláusula Oitava, quando contratada."
  ]
 },
 {
  "titulo": "CLÁUSULA SEXTA – DOS ENCARGOS E DESPESAS DA LOCAÇÃO",
  "paragrafos": [
   "Os encargos serão atribuídos ao CONTRATANTE ou ao LOCATÁRIO conforme a lei e o contrato de locação. Consumos individuais, taxas de serviços, IPTU/TLP e outros encargos legalmente transferíveis poderão caber ao LOCATÁRIO mediante previsão expressa. Obrigações intransferíveis, despesas extraordinárias de condomínio e vícios anteriores à locação caberão ao CONTRATANTE, ressalvada a responsabilidade legal do LOCATÁRIO.",
   "PARÁGRAFO PRIMEIRO: A CONTRATADA cobrará e acompanhará os encargos do LOCATÁRIO, sem assumir seu pagamento ou o de obrigações do CONTRATANTE. Exigirá uma modalidade de garantia locatícia legalmente admitida, previamente definida pela CONTRATADA, vedada a cumulação de modalidades no mesmo contrato.",
   "PARÁGRAFO SEGUNDO: O seguro contra incêndio será de responsabilidade do LOCATÁRIO. A CONTRATADA solicitará apólice e comprovantes, acompanhará vencimento e renovação e comunicará a necessidade de regularização. A cobertura deverá ser de 100x o valor do aluguel convencionado no contrato de locação. A CONTRATADA não antecipa prêmios nem atua como seguradora.",
   "PARÁGRAFO TERCEIRO: Durante o período em que o imóvel permanecer desocupado, serão de responsabilidade do CONTRATANTE os tributos, as taxas, as despesas condominiais, os consumos mínimos, os seguros, a manutenção e as demais despesas incidentes sobre o imóvel."
  ]
 },
 {
  "titulo": "CLÁUSULA SÉTIMA – DA REMUNERAÇÃO",
  "paragrafos": [
   "O CONTRATANTE pagará a intermediação e a administração nos percentuais, bases e mínimos do quadro resumo. A intermediação é devida em cada nova locação, inclusive na substituição do LOCATÁRIO acompanhada de novo contrato. A administração é devida enquanto o imóvel estiver sob gestão da CONTRATADA e, na modalidade garantida, remunera também a garantia da Cláusula Oitava.",
   "PARÁGRAFO PRIMEIRO: A administração incide exclusivamente sobre o aluguel efetivamente recebido na modalidade tradicional e garantida. Excluem-se IPTU/TLP, condomínio, consumo, indenizações e outros encargos.",
   "PARÁGRAFO SEGUNDO: A CONTRATADA poderá deduzir remuneração e despesas autorizadas dos valores sob sua gestão, discriminando-as nas contas. A intermediação também incide na modalidade garantida e será deduzida do primeiro aluguel, além da administração."
  ]
 },
 {
  "titulo": "CLÁUSULA OITAVA – DA LOCAÇÃO GARANTIDA",
  "paragrafos": [
   "Escolhida a modalidade garantida, a CONTRATADA repassará o aluguel líquido, deduzida a administração e as demais parcelas autorizadas, mesmo sem pagamento pelo LOCATÁRIO. O repasse será efetuado em até 1 (um) dia útil após o vencimento do aluguel.",
   "PARÁGRAFO PRIMEIRO: A cobertura abrange somente o aluguel, excluídos condomínio, IPTU/TLP, consumos, danos, multa rescisória e quaisquer outros valores. Vigora enquanto o imóvel estiver efetivamente locado por intermédio da CONTRATADA, até a entrega das chaves ou o encerramento desta administração, conforme a Cláusula Décima Segunda. Não cobre desocupação nem aluguéis vencidos antes do início ou no aditivo, sem retroatividade.",
   "PARÁGRAFO SEGUNDO: Ao antecipar aluguel não pago, a CONTRATADA ficará sub-rogada no respectivo crédito. O CONTRATANTE transfere-lhe expressamente os direitos sobre esse aluguel e seus acessórios, observadas as normas aplicáveis. Os valores recuperados desses créditos, inclusive multa, juros e correção, pertencerão integralmente à CONTRATADA, sem novo repasse ao CONTRATANTE ou administração duplicada da mesma competência. A cobrança judicial observará a titularidade do crédito e será conduzida por advogado inscrito na OAB."
  ]
 },
 {
  "titulo": "CLÁUSULA NONA – DA PRESTAÇÃO DE CONTAS E DOS REPASSES",
  "paragrafos": [
   "A CONTRATADA prestará contas mensalmente, discriminando recebimentos, despesas, deduções, remuneração e demais movimentações. Prestará esclarecimentos quando solicitados, resguardados o sigilo legal e as informações de terceiros.",
   "PARÁGRAFO PRIMEIRO: Os repasses seguirão os prazos da modalidade escolhida e os dados dos beneficiários. Na tradicional, contam-se do recebimento; na garantida, do vencimento, independentemente do pagamento pelo LOCATÁRIO. Aplicam-se as deduções autorizadas e a destinação dos créditos antecipados da Cláusula Oitava.",
   "PARÁGRAFO SEGUNDO: A CONTRATADA apresentará anualmente ao CONTRATANTE o extrato de rendimentos, para fins de declaração de imposto de renda. O imposto de renda incidente sobre os aluguéis é de responsabilidade exclusiva do CONTRATANTE, cabendo-lhe o respectivo recolhimento e declaração."
  ]
 },
 {
  "titulo": "CLÁUSULA DÉCIMA – DO REPASSE DOS VALORES",
  "paragrafos": [
   "O CONTRATANTE manterá os dados bancários atualizados e comunicará alterações por escrito. A CONTRATADA não responde por atrasos comprovadamente decorrentes de dados incorretos ou desatualizados por ele fornecidos ou de indisponibilidade bancária alheia à sua atuação, devendo repassar tão logo cesse o impedimento.",
   "PARÁGRAFO ÚNICO: Na modalidade tradicional, não há garantia de recebimento: a CONTRATADA não é fiadora, seguradora, garantidora ou devedora solidária das obrigações do LOCATÁRIO. Na inadimplência, adotará as cobranças cabíveis, sem obrigação de antecipar ou substituir valores não recebidos."
  ]
 },
 {
  "titulo": "CLÁUSULA DÉCIMA PRIMEIRA – DA COBRANÇA DE ENCARGOS POR INADIMPLEMENTO",
  "paragrafos": [
   "A CONTRATADA cobrará aluguéis e encargos, inclusive multa, juros e correção previstos na locação. Os encargos recebidos serão repassados ao CONTRATANTE após as deduções autorizadas, ressalvados os créditos já antecipados na modalidade garantida, destinados à CONTRATADA conforme a Cláusula Oitava.",
   "PARÁGRAFO PRIMEIRO: Na modalidade tradicional, a CONTRATADA não responde pelo inadimplemento se cumprir seus deveres de cobrança e administração. O CONTRATANTE responde pelas consequências de seus atos, omissões e determinações e pelas condições físicas, estruturais, documentais ou jurídicas do imóvel sob sua responsabilidade, quando não decorrentes de ação ou omissão da CONTRATADA.",
   "PARÁGRAFO SEGUNDO: A CONTRATADA fará jus a 10% sobre o valor cobrado a título de multa e juros pelo LOCATÁRIO, em caso de inadimplemento."
  ]
 },
 {
  "titulo": "CLÁUSULA DÉCIMA SEGUNDA – DO PRAZO E DA RESCISÃO",
  "paragrafos": [
   "Este instrumento é vigente por prazo indeterminado. Qualquer parte poderá encerrar o contrato mediante aviso escrito, ressalvadas a Cláusula Décima Sexta e outra data ajustada por escrito.",
   "PARAGRAFO PRIMEIRO: Com o imóvel locado, a retirada da administração pelo CONTRATANTE sem justa causa ou falha imputável à CONTRATADA implicará pagamento dos honorários de administração relativos ao prazo restante da locação, observadas as limitações legais.",
   "PARÁGRAFO SEGUNDO: Até o encerramento efetivo, serão mantidas a administração e, quando contratada, a garantia de aluguel, nos limites da Cláusula Oitava. Depois, cessam novas obrigações de garantia, preservados os repasses exigíveis e os direitos sobre créditos já antecipados.",
   "PARÁGRAFO TERCEIRO: No caso de rescisão, a CONTRATADA entregará ao CONTRATANTE ou à nova administradora os contratos, aditivos, vistorias, documentos de garantias, notificações, histórico financeiro, pendências e chaves sob sua guarda. As partes comunicarão ao LOCATÁRIO e aos envolvidos a data da mudança e os novos canais de pagamento e atendimento, evitando cobranças duplicadas.",
   "PARÁGRAFO QUARTO: No mesmo prazo, apresentará as contas finais e transferirá saldos disponíveis após as deduções contratuais discriminadas. Recebimentos posteriores gerarão demonstrativo complementar e repasse nos prazos estipulados neste instrumento, ressalvados os créditos próprios da modalidade garantida. Documentos não poderão ser retidos por valores controvertidos, cobráveis separadamente."
  ]
 },
 {
  "titulo": "CLÁUSULA DÉCIMA TERCEIRA – DA VENDA DO IMÓVEL LOCADO",
  "paragrafos": [
   "Na venda durante a locação, a CONTRATADA poderá notificar o LOCATÁRIO sobre seu direito de preferência, observados os arts. 27 e seguintes da Lei nº 8.245/1991. A comunicação conterá preço, pagamento, ônus reais e demais informações exigidas; o exercício observará o prazo legal de 30 (trinta) dias."
  ]
 },
 {
  "titulo": "CLÁUSULA DÉCIMA QUARTA – DO PERÍODO DE DESOCUPAÇÃO",
  "paragrafos": [
   "Na desocupação sem locação vigente, caberão ao CONTRATANTE tributos, taxas, condomínio, consumos mínimos, serviços, seguros, manutenção e demais despesas não atribuídas legalmente a terceiros. Adiantamentos feitos pela CONTRATADA com autorização ou por necessidade de preservação serão ressarcidos mediante comprovantes.",
   "PARÁGRAFO ÚNICO: Na inadimplência dos encargos do LOCATÁRIO, a CONTRATADA comunicará o CONTRATANTE para os pagamentos que lhe sejam exigíveis pelos credores, preservada a cobrança do LOCATÁRIO e o ressarcimento com os encargos previstos na locação."
  ]
 },
 {
  "titulo": "CLÁUSULA DÉCIMA QUINTA – DA ASSINATURA ELETRÔNICA",
  "paragrafos": [
   "As partes poderão assinar fisicamente ou por meio eletrônico admitido em lei, aceitando meios de comprovação de autoria e integridade, inclusive ICP-Brasil e plataformas eletrônicas, conforme o art. 10 da MP nº 2.200-2/2001. A força executiva observará os arts. 783 e 784, III e § 4º, do CPC, com dispensa de testemunhas no instrumento eletrônico quando sua integridade for conferida por provedor de assinatura, na forma da lei."
  ]
 },
 {
  "titulo": "CLÁUSULA DÉCIMA SEXTA – DAS COMUNICAÇÕES",
  "paragrafos": [
   "As comunicações serão escritas e dirigidas aos endereços, e-mails ou números de telefone/whatsapp disponibilizados pelo CONTRATANTE. Alterações deverão ser informadas por escrito e produzirão efeitos após ciência da outra parte.",
   "PARÁGRAFO ÚNICO: Notificações de rescisão, descumprimento e mudança bancária deverão comprovar conteúdo e recebimento, por confirmação de leitura, resposta ou outro meio idôneo. O envio sem comprovação de recebimento não inicia aviso prévio ou prazo de saneamento. Na indisponibilidade do canal, será utilizado outro meio escrito que comprove a ciência."
  ]
 },
 {
  "titulo": "CLÁUSULA DÉCIMA SÉTIMA – DO FORO",
  "paragrafos": [
   "Fica eleito o Foro da Circunscrição Judiciária correspondente à Região Administrativa onde se localiza o imóvel objeto deste instrumento para dirimir quaisquer dúvidas ou questões oriundas do presente instrumento, com renúncia expressa a qualquer outro, por mais privilegiado que seja."
  ]
 }
];

export const FECHO_CPS = "E, por estarem justos e contratados, as partes assinam o presente instrumento, eletronicamente ou em vias físicas de igual teor e forma.";

export const PROCURACAO_TITULO = "PROCURAÇÃO PARA ADMINISTRAÇÃO E INTERMEDIAÇÃO DE LOCAÇÃO";

export const PROCURACAO: Clausula[] = [
 {
  "titulo": "",
  "paragrafos": [
   "O CONTRATANTE identificado e qualificado no quadro resumo deste instrumento, doravante OUTORGANTE, nomeia como sua procuradora a CONTRATADA no quadro resumo, doravante OUTORGADA, para administrar a locação do imóvel identificado no quadro resumo, nos limites do Contrato de Prestação de Serviços que antecede esta procuração. Os referidos itens do quadro resumo integram este instrumento de mandato."
  ]
 },
 {
  "titulo": "PODERES DE ADMINISTRAÇÃO",
  "paragrafos": [
   "O OUTORGANTE nomeia a OUTORGADA sua procuradora para promover a intermediação e administrar a locação do imóvel acima, nos limites do contrato vinculado, podendo anunciar o imóvel, receber e analisar propostas e documentos, acompanhar visitas, elaborar, celebrar e assinar contratos de locação e aditivos nas condições previamente aprovadas, formalizar o encerramento da locação conforme a lei e as condições autorizadas, assinar termos de vistoria e entrega ou recebimento de chaves, receber aluguéis e encargos, emitir recibos e quitações dos valores efetivamente recebidos, realizar cobranças e enviar notificações extrajudiciais.",
   "Poderá representar o OUTORGANTE perante a administradora de condomínio, CAESB, NEOENERGIA e demais concessionárias e órgãos públicos, exclusivamente para providências necessárias à administração da locação, solicitar informações e apresentar documentos relacionados ao imóvel."
  ]
 },
 {
  "titulo": "LIMITES E ATUAÇÃO JURÍDICA",
  "paragrafos": [
   "Esta procuração não confere poderes para alienar ou onerar o imóvel, renunciar a direitos, perdoar dívidas, transigir, reconhecer pedidos ou firmar compromissos fora da administração ordinária. Esses atos dependerão de autorização e poderes especiais e expressos em instrumento próprio. A OUTORGADA não poderá substabelecer estes poderes sem prévia autorização escrita do OUTORGANTE.",
   "A OUTORGADA poderá providenciar a contratação de advogado regularmente inscrito na OAB, em nome e no interesse do OUTORGANTE, nos limites do contrato vinculado. A representação judicial dependerá de procuração própria outorgada ao advogado, com os poderes processuais necessários; este instrumento não autoriza a OUTORGADA a exercer atividade privativa de advocacia"
  ]
 },
 {
  "titulo": "VIGÊNCIA E ASSINATURA",
  "paragrafos": [
   "Esta procuração vincula-se à vigência do contrato de prestação de serviços, sem prejuízo das hipóteses legais de extinção do mandato e dos efeitos perante terceiros. Poderá ser assinada fisicamente ou por meio eletrônico admitido em lei, com comprovação de autoria e integridade, nos termos do art. 10 da Medida Provisória nº 2.200-2/2001."
  ]
 }
];
