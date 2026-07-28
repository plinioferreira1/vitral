-- =========================================================
-- Importação única: planilha SACRA - Acompanhamento de Locação
-- Rode a migration 0009 antes.
-- =========================================================

do $$
declare
  v_tenant_id uuid;
  v_responsavel_id uuid;
  v_imovel_id uuid;
  v_locador_id uuid;
  v_locatario_id uuid;
  v_contrato_id uuid;
begin
  select id into v_tenant_id from public.tenants limit 1;
  select id into v_responsavel_id from public.usuarios where tenant_id = v_tenant_id limit 1;

  -- 1. 307 Alegria
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '307 Alegria') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Francisco Janderson Torres de Souza', '(61) 98214-2386', 'jtsfrancisco@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Sandra dos Santos de Andrade', '(61) 99985-7965', 'thalitagabrielacs@gmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0001', v_imovel_id, v_locador_id, v_locatario_id, true, '51688638', 'parcelado', 'ROYAL ASSESSORIA CONDOMINIAL INTELIGENTE', 'meucondominio@royaladm.com.br / 9868-5857', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'condominio', '2026-07-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'agua', '2026-07-01', 'pendente');

  -- 2. 203 Safari
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '203 Safari') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Giuliane da Silva Pimentel', '(61) 999551389', 'giulianepimentel@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Andre Tadashi Kano / Ana Cristina Mouzer Lemos', '(11) 971012646', 'acm.lemos@gmail.com / andretk@gmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0002', v_imovel_id, v_locador_id, v_locatario_id, true, '10218939', 'parcelado', 'atendimento@ascon.com.br', '(61) 3043-5584', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pendente');

  -- 3. 907B Montana
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '907B Montana') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Gabriel Antonio D Oliveira e Silva', 'DDI: 1 (343) 997-1874', 'gaburiero@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Nathalia Farias da Silva', '(61) 99972-3952', 'nathaliafariaas@gmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0003', v_imovel_id, v_locador_id, v_locatario_id, true, '53516206', 'parcelado', 'CONDOMÍNIO RESIDENCIAL MONTANA', '61 98288-2282.', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pendente');

  -- 4. 905A Montana
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '905A Montana') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Flavio Luiz D Oliveira e Silva', '(61) 99267-7267', 'flaviolz@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Priscila de Almeida Lima', '(61) 98172-6343', 'priscilaalmeida1981.adv@gmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0004', v_imovel_id, v_locador_id, v_locatario_id, true, '53514548', 'parcelado', 'contabilidade400@hotmail.com', '61 99441-2149', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pendente');

  -- 5. 424 Maison do Lago
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '424 Maison do Lago') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Elizabete Sales Togawa', '(61) 98442-1845', 'elizabetetogawa@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Ana Barbara Campelo Kwecko', '(48) 98427-6091', 'anabarbara@globalhealthcare.com.br') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0005', v_imovel_id, v_locador_id, v_locatario_id, true, '48626503', 'parcelado', 'atualizacadastro@ancoracondominios.com.br', '(61) 3323-1918', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pendente');

  -- 6. 602 Piazza
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '602 Piazza') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Patricia Matos Peres de Souza', '(61) 99971-6628', 'amaury.aamsj@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Nelson Lugo Sorace', '(61) 98232-1107', 'bebelic@gmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0006', v_imovel_id, v_locador_id, v_locatario_id, true, '50529498', 'parcelado', 'atualizacadastro@ancoracondominios.com.br', '(61) 3323-1918', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pendente');

  -- 7. 801 Dubai
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '801 Dubai') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Jose Geraldo Lucas Junior', '(61) 981636', 'jg.lucas.junior@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Ana Paula Carli Boussif', '(61) 98302-7080', 'carlianapaula11@gmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0007', v_imovel_id, v_locador_id, v_locatario_id, true, '53023528', 'parcelado', 'royalcondominial@gmail.com', '(61) 3436-1600', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pendente');

  -- 8. 503 Smart (Apartamento)
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '503 Smart (Apartamento)') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Jose Geraldo Lucas Junior', '(61) 981636', 'jg.lucas.junior@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Leonardo Oliveira Coelho', '(61) 99875-9511', 'coelhooliveiraleo@gmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0008', v_imovel_id, v_locador_id, v_locatario_id, true, '52198006', 'parcelado', 'sac@focuscondominios.com.br', '(61)3037-0700', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pendente');

  -- 9. 503 Smart (Garagem)
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '503 Smart (Garagem)') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Jose Geraldo Lucas Junior', '(61) 981636', 'jg.lucas.junior@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Leonardo Oliveira Coelho', '(61) 99875-9511', 'coelhooliveiraleo@gmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0009', v_imovel_id, v_locador_id, v_locatario_id, true, '52196852', 'parcelado', 'sac@focuscondominios.com.br', '(61)3037-0700', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pendente');

  -- 10. 201 Tissiana
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '201 Tissiana') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Geraldo Aussismar Braulio', '(38) 998980355', 'gebraulio@hotmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Juliene Barros Moraes Martins', '(19) 99953-1886', 'julienemoraes1501@gmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0010', v_imovel_id, v_locador_id, v_locatario_id, true, '30486416', 'parcelado', 'Condominio Tissiana', '(61) 99271-9594', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pendente');

  -- 11. 1103 Spazio Brisas
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '1103 Spazio Brisas') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Alexandre Bayard Oberlaender Melo', '(61) 99944-2992', 'bayardale@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Lucas Pena Cirqueira', '(61) 98210-8922', 'lucaspenac1@gmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0011', v_imovel_id, v_locador_id, v_locatario_id, true, '51021498', 'parcelado', 'contcervo@hotmail.com', '(61) 98352-9580', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pendente');

  -- 12. 707B Montpellier
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '707B Montpellier') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Maria Ibiapina da Silva Reis', '(61) 99353-6393', 'mariaibiapina@hotmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Leonardo Marcelino de Borba', '(31) 99454-5654', 'ericamesquita@live.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0012', v_imovel_id, v_locador_id, v_locatario_id, true, '50233939', 'parcelado', 'contato@elitecontabilidadedf.com.br', '61 99902-5525', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pendente');

  -- 13. 501 Dubai
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '501 Dubai') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Samuel Sales Fonteles', '(85) 99765-1988', 'samuelsalesfonteles@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Fellipe Gabriel Santos Bond', '(42) 98842-9000', 'fellipebond@gmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0013', v_imovel_id, v_locador_id, v_locatario_id, true, '5302334X', 'parcelado', 'royalcondominial@gmail.com', '(61) 3436-1600', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pendente');

  -- 14. Casa 11 QE 52
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, 'Casa 11 QE 52') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Luciano Moura Castro do Nascimento', '(61) 98145-2234', 'lmcncg@yahoo.com.br') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Anabelle Montagna Barbosa Gouvea', '(61) 98151-4040', 'anabellemontanha@gmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0014', v_imovel_id, v_locador_id, v_locatario_id, true, '50848461', 'parcelado', 'xxxxxx', 'xxxxxx', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pendente');

  -- 15. 80 Mirante Center
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '80 Mirante Center') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'RICARDO CORREA MARTINS AMARAL', '(61) 98260-0202', 'ricardo.cmamaral@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Alcioni Ricardo Peruzzo', '(61) 99139-5374', 'faustoemanoel.adm.sudoeste@gmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0015', v_imovel_id, v_locador_id, v_locatario_id, true, '47306823', 'cota_unica', 'contato@ascon.com.br', '(61) 3344-0000', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pago');

  -- 16. 62 Mirante Center
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '62 Mirante Center') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'RICARDO CORREA MARTINS AMARAL', '(61) 98260-0202', 'ricardo.cmamaral@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Meryonne Moreira', '(61) 99989-3713', 'moreira.vet@gmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0016', v_imovel_id, v_locador_id, v_locatario_id, true, '47306777', 'parcelado', 'contato@ascon.com.br', '(61) 3344-0000', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pendente');

  -- 17. 407 Enzo
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '407 Enzo') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Felipe Ibiapina dos Reis', '(47) 99714-8888', 'reisfelipeir@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Fabiane Barros Barbosa', '(61) 99852-4022', 'Barros.fabi91@gmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0017', v_imovel_id, v_locador_id, v_locatario_id, true, '49539566', 'parcelado', 'cadastro@cobpred.com.br', '(86) 989055243', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pendente');

  -- 18. 1503C Real Celebration
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '1503C Real Celebration') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Gema de Jesus Ribeiro Martins', NULL, 'gjrmartins@hotmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'CARLOS RIBEIRO DA SILVA', '(61) 99144-4305', 'jhonnatan.cruz@outlook.com.br') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0018', v_imovel_id, v_locador_id, v_locatario_id, true, '5173995X', 'parcelado', 'sac@focuscondominios.com.br', '(61)3037-0700', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pendente');

  -- 19. 324 Sophia Space
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '324 Sophia Space') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Geraldo Aussismar Braulio', '(38) 99898-0355', 'gebraulio@hotmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Newiton Rodrigues Pereira', '(21) 98960-4889', 'newiton01@gmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0019', v_imovel_id, v_locador_id, v_locatario_id, true, '51237962', 'parcelado', 'contato@hrdigitalscd.com.br', '61 9276-4246', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pendente');

  -- 20. 401B Graúna
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '401B Graúna') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Ariane Ribeiro Mendes', '(61) 98575-2131', 'arianermendes@hotmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Alessandro de Oliveira Borges', '(61) 98635-3495', 'l.e.o.costa@hotmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0020', v_imovel_id, v_locador_id, v_locatario_id, true, '51152630', 'parcelado', 'sac@focuscondominios.com.br', '(61)3037-0700', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pendente');

  -- 21. 406 Joy
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '406 Joy') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Jose Geraldo Lucas Junior', '(61) 981636', 'jg.lucas.junior@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Ana Claudia Alencar Lopes / Bruno de Oliveira Garcia', '(61) 99424-7060', 'lps.anaclaudia@gmail.com / brunodeoliveiragarcia@gmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0021', v_imovel_id, v_locador_id, v_locatario_id, true, '51791080', 'parcelado', 'elite@elitegestao.com', '(61) 98171-3810', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pendente');

  -- 22. 1305 Modern Life
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '1305 Modern Life') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Juliano Alessi', '(61) 99919-7278', 'julianoalessi1@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Rodrigo Azevedo Martins', '(38) 99160-2909', 'martins.rodrigoazevedo@gmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0022', v_imovel_id, v_locador_id, v_locatario_id, true, '52272214', 'parcelado', 'operacionalmodernlife@gmail.com', '61 3344-9005', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pendente');

  -- 23. 802 Nova Friburgo
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '802 Nova Friburgo') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Ana Rita do Nascimento Cunha', '(61) 98212-4915', 'ncunhaanarita@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Karolina Alves de Matos da Silva', '(61) 99509-4884', 'karolina.unb@gmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0023', v_imovel_id, v_locador_id, v_locatario_id, true, '51698706', 'parcelado', 'condominios@brcon.net.br', '3042-5048', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pendente');

  -- 24. 513 Green Park
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '513 Green Park') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Aline Fernandes Petrucce', '(61) 98112-5952', 'aline.petrucce@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Matheus Moizaniel', '(61) 98272-9265', 'jose.moizaniel@gmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0024', v_imovel_id, v_locador_id, v_locatario_id, true, '50627961', 'parcelado', 'rescon@rescon.com.br', '(61) 98403-7150', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pendente');

  -- 25. 705 Bercy
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '705 Bercy') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Thays Aragao Rezende', '(61) 99846-5985', 'contapassos@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Graziela Fagundes Velasco', '(62) 99943-2121', 'rogeriofvicente@icloud.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0025', v_imovel_id, v_locador_id, v_locatario_id, true, '50442171', 'cota_unica', 'sac@jroffice.com.br', '(61) 3011-7300', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');

  -- 26. 201 SQS 410
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '201 SQS 410') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'RICARDO CORREA MARTINS AMARAL', '(61) 98260-0202', 'ricardo.cmamaral@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Luana Schenflede de Araujo', '(11) 99964-1588', 'luschenflede@gmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0026', v_imovel_id, v_locador_id, v_locatario_id, true, '05371201', 'parcelado', 'contabbsb@gmail.com', '(61) 98136-0319', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;

  -- 27. 101 SQS 410
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '101 SQS 410') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'RICARDO CORREA MARTINS AMARAL', '(61) 98260-0202', 'ricardo.cmamaral@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Leonardo Jose Casalinho Duarte', '(11) 99668-3116', 'leo@conatusbr.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0027', v_imovel_id, v_locador_id, v_locatario_id, true, '05371422', 'parcelado', 'contabbsb@gmail.com', '(61) 98136-0319', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pago');

  -- 28. 1028 Radio Center
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '1028 Radio Center') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Claudia Maria Almeida Xavier de Mendonca', '(61) 98324-7129', 'claudiamaria.mendonca@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'CONSELHO REGIONAL DE PSICOLOGIA', '(61) 99216-8885', 'wanessa.santana@crp-01.org.br') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0028', v_imovel_id, v_locador_id, v_locatario_id, true, '30825555', 'parcelado', 'xxxxxx', '(61) 3328-4584', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pendente');

  -- 29. 1027 Radio Center
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '1027 Radio Center') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Claudia Maria Almeida Xavier de Mendonca', '(61) 98324-7129', 'claudiamaria.mendonca@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'CONSELHO REGIONAL DE PSICOLOGIA', '(61) 99216-8885', 'wanessa.santana@crp-01.org.br') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0029', v_imovel_id, v_locador_id, v_locatario_id, true, '30825547', 'parcelado', ',', '(61) 3328-4584', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pendente');

  -- 30. 1404 Vivaldi Moreira
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '1404 Vivaldi Moreira') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Tiago Souza Fraga', '(61) 98111-3018', 'thyaggus@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Maria Silva Ferreira', '(61) 99864-5092', 'mariasilvaferreira10@hotmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0030', v_imovel_id, v_locador_id, v_locatario_id, true, 'Em Dia', 'cota_unica', 'atendimento@ancoracondominios.com.br', '(61) 3323-1918', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');

  -- 31. 1609 Avant
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '1609 Avant') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Arnaldo Marques Margatto Junior', '(11) 99771-5561', 'a.margatto@uol.com.br') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Caio Simon de Souza', '(11) 98505-5536', 'caiosimons@gmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0031', v_imovel_id, v_locador_id, v_locatario_id, true, '51603659', 'parcelado', 'atendimento@ancoracondominios.com.br', '(61) 3323-1918', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pendente');

  -- 32. 201 Square Home
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '201 Square Home') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'ARTHUR TELECOMUNICACOES E REDES LTDA', '(61) 99983-5659', 'mauricio.moura@foxengenharia.com.br') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Joao Henrique Oliveira Sager', '(51) 99167-7598', 'joao.sager@gmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0032', v_imovel_id, v_locador_id, v_locatario_id, true, '5256603X', 'parcelado', ',', 'xxxxxx', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pendente');

  -- 33. 212 Square Home
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '212 Square Home') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'ARTHUR TELECOMUNICACOES E REDES LTDA', '(61) 99983-5659', 'mauricio.moura@foxengenharia.com.br') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Elenice Bodo Batista', '(14) 99814-8280', 'elenice.b.ferreira@icloud.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0033', v_imovel_id, v_locador_id, v_locatario_id, true, '52566145', 'parcelado', 'ronaldo.silva@grupocontad.com.br', 'xxxxxx', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pendente');

  -- 34. 602 Fusion
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '602 Fusion') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Gustavo Catalino Marecos Leiva / Marines Gusberti', '(61) 99986-3637 / (61) 84655754', 'gmcleiva@gmail.com / marines.gusberti@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'BSB STAY ALUGUEL DE TEMPORADA LTDA', '(61) 98364-6203', 'adm@bsbstay.com.br') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0034', v_imovel_id, v_locador_id, v_locatario_id, true, '52110672', 'parcelado', 'contato@hplus.com.br', '(61) 98380-9288', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pendente');

  -- 35. 1009 Park Style
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '1009 Park Style') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'ANDRADE E SANTOS HOLDING FAMILIAR LTDA', '(61) 99879-0051', 'elvio.fas@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Erica Oliveira Sales', '(61) 99828-0240', 'erica.saales@gmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0035', v_imovel_id, v_locador_id, v_locatario_id, true, '5205120X', 'parcelado', 'condominios@facilbg.com.br', '612470789', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pendente');

  -- 36. 1601B Graúna
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '1601B Graúna') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Cristiane dos Santos Manoel Resende da Silva', '(61) 99692-9190', 'cris.smrsilva@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Ana Paula Teixeira Rode', '(62) 99219-9104', 'anapaularode@gmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0036', v_imovel_id, v_locador_id, v_locatario_id, true, '51153114', 'parcelado', 'sac@focuscondominios.com.br', '(61)3037-0700', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pendente');

  -- 37. Casa 2 QE 26
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, 'Casa 2 QE 26') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Alessandra Beatriz / Erika Cristiane / Joao Paulo', '(61) 99994-0192', 'p.beatriz.ale@gmail.com / criserika1979@gmail.com / jpruii@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Giuliane da Silva Pimentel', '(61) 99955-1389', 'giulianepimentel@gmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0037', v_imovel_id, v_locador_id, v_locatario_id, true, '18478794', 'parcelado', 'xxxxxxx', 'xxxxx', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pendente');

  -- 38. 502 Caribe
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '502 Caribe') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Denise Mitie Taketomi', '61) 992025', 'denisemitie40@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Renata Ribeiro Aragao', '(61) 98274-5859', 'luarflora@gmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0038', v_imovel_id, v_locador_id, v_locatario_id, true, '30864623', 'parcelado', 'condomob@email.condomob.net', '(61) 4042-1052 - (61) 99519-3331', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pendente');

  -- 39. 124 Life Center
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '124 Life Center') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Philipe Martelli de Almeida Escudero', '(61) 99967-9919', 'phescudero.nutri@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Maria Teresa Maiolini Bruzadelli', '(27) 99963-1021', 'dramariateresamaiolini@gmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0039', v_imovel_id, v_locador_id, v_locatario_id, true, '47495421', 'parcelado', 'o-reply@com21.com.br', 'xxxxxxx', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pendente');

  -- 40. 122 Life Center
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '122 Life Center') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Maria Cristina Ribeiro Martins Prates Correia', '(61) 98404-8665', 'sacraimoveis.locacao@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Maria Teresa Maiolini Bruzadelli', '(27) 99963-1021', 'dramariateresamaiolini@gmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0040', v_imovel_id, v_locador_id, v_locatario_id, true, '47495405', 'parcelado', 'o-reply@com21.com.br', 'xxxxxxx', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pendente');

  -- 41. 107 SQS 413
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '107 SQS 413') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'RICARDO CORREA MARTINS AMARAL', '(61) 98260-0202', 'ricardo.cmamaral@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Marcos Cesar de Lima', '(11) 99510-3021', 'mclmarcos@gmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0041', v_imovel_id, v_locador_id, v_locatario_id, true, '05401704', 'parcelado', 'xxxxxxx', 'xxxxxxx', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pago');

  -- 42. 10 Varandas Sudoeste
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '10 Varandas Sudoeste') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'RICARDO CORREA MARTINS AMARAL', '(61) 98260-0202', 'ricardo.cmamaral@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Gisele Reis de Oliveira Irmao', '(61) 98509-9739', 'gisele_roil@hotmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0042', v_imovel_id, v_locador_id, v_locatario_id, true, '4839999X', 'parcelado', 'motacondominio@gmail.com', 'xxxxxxx', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pendente');

  -- 43. 12 Varandas Sudoeste
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '12 Varandas Sudoeste') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'RICARDO CORREA MARTINS AMARAL', '(61) 98260-0202', 'ricardo.cmamaral@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Gisele Reis de Oliveira Irmao', '(61) 98509-9739', 'gisele_roil@hotmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0043', v_imovel_id, v_locador_id, v_locatario_id, true, '48400009', 'parcelado', 'motacondominio@gmail.com', 'xxxxxxx', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pendente');

  -- 44. 202 Monte Alto
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '202 Monte Alto') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Max Roger Gemignani', '(61) 98188-1264', 'maciana.araujo@hotmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Elvio Frans Andrade Santos', '(61) 99879-0051', 'elvio.fas@gmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0044', v_imovel_id, v_locador_id, v_locatario_id, true, '48458732', 'parcelado', 'xxxxxxx', 'xxxxxxx', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pendente');

  -- 45. B008 Saint Tropez
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, 'B008 Saint Tropez') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Marcus Vinicius Monteiro de Carvalho', '(61) 98301-1436', 'marcus.monteiro20@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Ana Beatriz Albuquerque Laurindo', '(21) 97674-5715', 'marcus.monteiro20@gmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0045', v_imovel_id, v_locador_id, v_locatario_id, true, '4821812X', 'parcelado', 'boletos@principalbsb.com.br', '(61) 99114-3679', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pago');

  -- 46. 225 Residencial Veneza
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '225 Residencial Veneza') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'SIMONE DE LIMA TEIXEIRA', '(61) 99163-4219', 'slteixeira023@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Bruno Henrique Parreira Barbosa', '(61) 99285-2113', 'brunohpb28@gmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0046', v_imovel_id, v_locador_id, v_locatario_id, true, '53332873', 'parcelado', 'Walter Sindico', '(61) 99983-0409', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pendente');

  -- 47. 1016 You Life Style
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '1016 You Life Style') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'ELVIO FRANS ANDRADE SANTOS', '(61) 99879-0051', 'elvio.fas@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'RUBENS MARQUES DE OLIVEIRA', '(11) 96619-2234', 'rubens.marques@yahoo.com.br') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0047', v_imovel_id, v_locador_id, v_locatario_id, true, '51759373', 'parcelado', 'contato@hrdigitalscd.com.br', '8004214545', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pendente');

  -- 48. 418 Le Quartier
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '418 Le Quartier') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'FERNANDO HENRIQUE BATISTA DA MOTA', '(61) 98204-1001', 'fhbmed@hotmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'TIAGO SARAIVA KRATKA', '(61) 99977-2404', 'drtiagosk@gmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0048', v_imovel_id, v_locador_id, v_locatario_id, true, '53249267', 'parcelado', 'atendimento@ancoracondominios.com.br', '(61) 37726464', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pendente');

  -- 49. 419 e 420 Le Quartier
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '419 e 420 Le Quartier') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'JAIR TABCHOURY FILHO', '(61) 98118-1013', 'jair.tf@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Daniel Merencio da Silva', '(61) 99657-8068', 'danielmerencio00@gmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0049', v_imovel_id, v_locador_id, v_locatario_id, true, '53249283', 'parcelado', 'atendimento@ancoracondominios.com.br', '(61) 37726464', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pendente');

  -- 50. 421 Le Quartier
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '421 Le Quartier') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'FABIO SANTANA DOS PASSOS', '(61) 98579-4658', 'fabiosago@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'ALEXANDRE COSTA DE SOUZA', '(61) 99579-1999', 'ale_costa2019@outlook.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0050', v_imovel_id, v_locador_id, v_locatario_id, true, '53249291', 'parcelado', 'atendimento@ancoracondominios.com.br', '(61) 37726464', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pendente');

  -- 51. Qe 42 Kit 01
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, 'Qe 42 Kit 01') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'MARIA DO CARMO FERREIRA NEVES', '(61) 98132-9529', 'mariadocarmopereiraneves@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'ELIENE DE JESUS QUEIROZ', '(61) 99116-2610', 'eliqueiroz2009@gmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0051', v_imovel_id, v_locador_id, v_locatario_id, true, '4690915X', 'cota_unica', 'NÃO TEM', NULL, NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pago');

  -- 52. Qe 42 Kit 02
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, 'Qe 42 Kit 02') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'MARIA DO CARMO FERREIRA NEVES', '(61) 98132-9529', 'mariadocarmopereiraneves@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Paulo Henrique Gabriel Porto', '(61) 99291-4690', 'drpaulohgporto@gmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0052', v_imovel_id, v_locador_id, v_locatario_id, true, '4690915X', 'cota_unica', 'NÂO TEM', NULL, NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pago');

  -- 53. Qe 42 Kit 03
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, 'Qe 42 Kit 03') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'MARIA DO CARMO FERREIRA NEVES', '(61) 98132-9529', 'mariadocarmopereiraneves@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Sonia Pires Soares', '(61) 98482-3119', 'soniap_soares@hotmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0053', v_imovel_id, v_locador_id, v_locatario_id, true, '4690915X', 'cota_unica', 'NÂOTEM', NULL, NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pago');

  -- 54. Qe 42 Kit 101
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, 'Qe 42 Kit 101') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'MARIA DO CARMO FERREIRA NEVES', '(61) 98132-9529', 'mariadocarmopereiraneves@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Zania de Jesus Peres da Cruz', '(38) 99988-5211', 'zaniadejesus@gmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0054', v_imovel_id, v_locador_id, v_locatario_id, true, '4690915X', 'cota_unica', 'NÃO TEM', NULL, NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pago');

  -- 55. Qe 42 Kit 102
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, 'Qe 42 Kit 102') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'MARIA DO CARMO FERREIRA NEVES', '(61) 98132-9529', 'mariadocarmopereiraneves@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'RAFAEL ROCHA PEREIRA GUIMARÃES', '(61) 99991-1536', 'rafaelrochapereiraguimaraesr@gmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0055', v_imovel_id, v_locador_id, v_locatario_id, true, '4690915X', 'cota_unica', 'NÂO TEM', NULL, NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pago');

  -- 56. Qe 42 Kit 201
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, 'Qe 42 Kit 201') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'MARIA DO CARMO FERREIRA NEVES', '(61) 98132-9529', 'mariadocarmopereiraneves@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Ian Caetano de Faria Serique', '(61) 99968-0790', 'ian.serique@gmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0056', v_imovel_id, v_locador_id, v_locatario_id, true, '4690915X', 'cota_unica', 'NÃO TEM', NULL, NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pago');

  -- 57. Qe 42 Kit 202
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, 'Qe 42 Kit 202') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'MARIA DO CARMO FERREIRA NEVES', '(61) 98132-9529', 'mariadocarmopereiraneves@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Leandro Igor Vieira Ferreira', '(71) 99378-5040', 'l.igorenka@gmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0057', v_imovel_id, v_locador_id, v_locatario_id, true, '4690915X', 'cota_unica', 'NÃO TEM', NULL, NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pago');

end $$;