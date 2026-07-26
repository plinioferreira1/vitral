-- =========================================================
-- Importação única: planilha SACRA - Acompanhamento de Vendas
-- v2: comprador + vendedor separados, corretores reais,
-- 3 status de comissão (0%/50%/100% pago).
-- Assume 1 único tenant já criado.
-- Rode 0005_comprador_vendedor_comissoes.sql ANTES deste script.
-- =========================================================

do $$
declare
  v_tenant_id uuid;
  v_responsavel_id uuid;
  v_comprador_id uuid;
  v_vendedor_id uuid;
  v_imovel_id uuid;
  v_processo_id uuid;
  v_corretor_id uuid;
  v_corretor_amanda uuid;
  v_corretor_maysa uuid;
  v_corretor_camila uuid;
  v_corretor_renato uuid;
  v_corretor_plinio uuid;
  v_corretor_michele uuid;
begin
  select id into v_tenant_id from public.tenants limit 1;
  select id into v_responsavel_id from public.usuarios where tenant_id = v_tenant_id limit 1;

  -- Corretores da equipe
  insert into public.corretores (tenant_id, nome) values (v_tenant_id, 'Amanda') returning id into v_corretor_amanda;
  insert into public.corretores (tenant_id, nome) values (v_tenant_id, 'Maysa') returning id into v_corretor_maysa;
  insert into public.corretores (tenant_id, nome) values (v_tenant_id, 'Camila') returning id into v_corretor_camila;
  insert into public.corretores (tenant_id, nome) values (v_tenant_id, 'Renato') returning id into v_corretor_renato;
  insert into public.corretores (tenant_id, nome) values (v_tenant_id, 'Plinio') returning id into v_corretor_plinio;
  insert into public.corretores (tenant_id, nome) values (v_tenant_id, 'Michele') returning id into v_corretor_michele;

  -- 1. Jardim das Oliveiras
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Yves / Carla') returning id into v_comprador_id;
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Luiz Antonio / Juciene Serafim') returning id into v_vendedor_id;
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, 'Jardim das Oliveiras') returning id into v_imovel_id;
  v_corretor_id := null;
  insert into public.processos (tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, corretor_id, responsavel_id, tipo, status, valor_total, data_criacao) values (v_tenant_id, 'SAN-1076645', v_comprador_id, v_vendedor_id, v_imovel_id, v_corretor_id, v_responsavel_id, 'R.PRÓPRIOS', 'concluido', 2600000.0, coalesce('2026-08-17', current_date)) returning id into v_processo_id;
  insert into public.comentarios (processo_id, texto) values (v_processo_id, 'Status original na planilha: 100% Concluído');
  insert into public.etapas (processo_id, nome, responsavel_id, data_prevista, data_realizada, status, ordem) values (v_processo_id, '100% Concluído', v_responsavel_id, '2026-08-17', '2026-08-17', 'concluida', 1);
  insert into public.comissoes (processo_id, beneficiario_id, valor_previsto, status, data_prevista, valor_recebido, data_recebida) values (v_processo_id, v_corretor_id, 104000.0, '100% pago', '2026-08-17', 104000.0, current_date);

  -- 2. Spazio Brisas 504B
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Vinicius Santos / Sabrina Rios') returning id into v_comprador_id;
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Thiago Borges / Cristiane Porto') returning id into v_vendedor_id;
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, 'Spazio Brisas 504B') returning id into v_imovel_id;
  v_corretor_id := null;
  insert into public.processos (tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, corretor_id, responsavel_id, tipo, status, valor_total, data_criacao) values (v_tenant_id, 'IMP-2', v_comprador_id, v_vendedor_id, v_imovel_id, v_corretor_id, v_responsavel_id, 'R.PRÓPRIOS', 'concluido', 740000.0, coalesce('2026-07-01', current_date)) returning id into v_processo_id;
  insert into public.comentarios (processo_id, texto) values (v_processo_id, 'Prazo registro 01/07/2026 | Status original na planilha: 100% Concluído');
  insert into public.etapas (processo_id, nome, responsavel_id, data_prevista, data_realizada, status, ordem) values (v_processo_id, 'Acompanhamento de Protocolo: 1100203', v_responsavel_id, '2026-07-01', '2026-07-01', 'concluida', 1);
  insert into public.comissoes (processo_id, beneficiario_id, valor_previsto, status, data_prevista, valor_recebido, data_recebida) values (v_processo_id, v_corretor_id, 37000.0, '100% pago', '2026-07-01', 37000.0, current_date);

  -- 3. Res. Città 1107
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Wellington Pinto') returning id into v_comprador_id;
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Gustavo Leite') returning id into v_vendedor_id;
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, 'Res. Città 1107') returning id into v_imovel_id;
  v_corretor_id := v_corretor_maysa;
  insert into public.processos (tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, corretor_id, responsavel_id, tipo, status, valor_total, data_criacao) values (v_tenant_id, 'SAN-1173311', v_comprador_id, v_vendedor_id, v_imovel_id, v_corretor_id, v_responsavel_id, 'R.PRÓPRIOS, FINANCIAMENTO', 'concluido', 310000.0, coalesce('2026-07-13', current_date)) returning id into v_processo_id;
  insert into public.comentarios (processo_id, texto) values (v_processo_id, 'Status original na planilha: 100% Concluído');
  insert into public.etapas (processo_id, nome, responsavel_id, data_prevista, data_realizada, status, ordem) values (v_processo_id, 'Acompanhamento de Protocolo: 1099450', v_responsavel_id, '2026-06-23', '2026-06-23', 'concluida', 1);
  insert into public.comissoes (processo_id, beneficiario_id, valor_previsto, status, data_prevista) values (v_processo_id, v_corretor_id, 14000.0, '50% pago', '2026-07-13');

  -- 4. CLSW 504 Bl B Sl 111
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Victor / Aline') returning id into v_comprador_id;
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Christiany') returning id into v_vendedor_id;
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, 'CLSW 504 Bl B Sl 111') returning id into v_imovel_id;
  v_corretor_id := null;
  insert into public.processos (tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, corretor_id, responsavel_id, tipo, status, valor_total, data_criacao) values (v_tenant_id, 'SAN-1172040', v_comprador_id, v_vendedor_id, v_imovel_id, v_corretor_id, v_responsavel_id, 'R.PRÓPRIOS', 'concluido', 190000.0, coalesce('2026-08-11', current_date)) returning id into v_processo_id;
  insert into public.comentarios (processo_id, texto) values (v_processo_id, 'Status original na planilha: Transferência');
  insert into public.etapas (processo_id, nome, responsavel_id, data_prevista, data_realizada, status, ordem) values (v_processo_id, 'Emitir certidão de ônus atualizada', v_responsavel_id, '2026-06-22', '2026-06-22', 'concluida', 1);
  insert into public.comissoes (processo_id, beneficiario_id, valor_previsto, status, data_prevista, valor_recebido, data_recebida) values (v_processo_id, v_corretor_id, 9500.0, '100% pago', '2026-08-11', 9500.0, current_date);

  -- 5. Via Turim 607
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Luis Fernando / Rosimere') returning id into v_comprador_id;
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Orlei Seabra') returning id into v_vendedor_id;
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, 'Via Turim 607') returning id into v_imovel_id;
  v_corretor_id := v_corretor_renato;
  insert into public.processos (tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, corretor_id, responsavel_id, tipo, status, valor_total, data_criacao) values (v_tenant_id, 'SAN-1167604', v_comprador_id, v_vendedor_id, v_imovel_id, v_corretor_id, v_responsavel_id, 'R.PRÓPRIOS, FINANCIAMENTO', 'concluido', 360000.0, coalesce('2026-08-23', current_date)) returning id into v_processo_id;
  insert into public.comentarios (processo_id, texto) values (v_processo_id, 'Status original na planilha: 100% Concluído');
  insert into public.etapas (processo_id, nome, responsavel_id, data_prevista, data_realizada, status, ordem) values (v_processo_id, 'Acompanhamento de Protocolo: 1100371', v_responsavel_id, '2026-06-23', '2026-06-23', 'concluida', 1);
  insert into public.comissoes (processo_id, beneficiario_id, valor_previsto, status, data_prevista, valor_recebido, data_recebida) values (v_processo_id, v_corretor_id, 14400.0, '100% pago', '2026-08-23', 14400.0, current_date);

  -- 6. SQN Asa Norte
  v_comprador_id := null;
  v_vendedor_id := null;
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, 'SQN Asa Norte') returning id into v_imovel_id;
  v_corretor_id := null;
  insert into public.processos (tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, corretor_id, responsavel_id, tipo, status, valor_total, data_criacao) values (v_tenant_id, 'IMP-6', v_comprador_id, v_vendedor_id, v_imovel_id, v_corretor_id, v_responsavel_id, 'Venda', 'pendente', NULL, coalesce('2026-08-21', current_date)) returning id into v_processo_id;
  insert into public.etapas (processo_id, nome, responsavel_id, data_prevista, data_realizada, status, ordem) values (v_processo_id, 'Acompanhamento', v_responsavel_id, '2026-08-21', NULL, 'pendente', 1);

  -- 7. Graúna 901
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Ricardo Valeriano Gomes Lopes') returning id into v_comprador_id;
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Wmarlei / Antonia Camila') returning id into v_vendedor_id;
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, 'Graúna 901') returning id into v_imovel_id;
  v_corretor_id := v_corretor_michele;
  insert into public.processos (tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, corretor_id, responsavel_id, tipo, status, valor_total, data_criacao) values (v_tenant_id, 'SAN-1163481', v_comprador_id, v_vendedor_id, v_imovel_id, v_corretor_id, v_responsavel_id, 'R.PRÓPRIOS, FGTS', 'concluido', 1290000.0, coalesce('2026-06-22', current_date)) returning id into v_processo_id;
  insert into public.comentarios (processo_id, texto) values (v_processo_id, 'Status original na planilha: 100% Concluído');
  insert into public.etapas (processo_id, nome, responsavel_id, data_prevista, data_realizada, status, ordem) values (v_processo_id, 'Entrega de Chaves', v_responsavel_id, '2026-07-14', '2026-07-14', 'concluida', 1);
  insert into public.comissoes (processo_id, beneficiario_id, valor_previsto, status, data_prevista, valor_recebido, data_recebida) values (v_processo_id, v_corretor_id, 40000.0, '100% pago', '2026-06-22', 40000.0, current_date);

  -- 8. Centro C. Park Way
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Daniel') returning id into v_comprador_id;
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Larissa') returning id into v_vendedor_id;
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, 'Centro C. Park Way') returning id into v_imovel_id;
  v_corretor_id := null;
  insert into public.processos (tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, corretor_id, responsavel_id, tipo, status, valor_total, data_criacao) values (v_tenant_id, 'IMP-9', v_comprador_id, v_vendedor_id, v_imovel_id, v_corretor_id, v_responsavel_id, 'R.PRÓPRIOS', 'concluido', 220000.0, coalesce('2026-07-17', current_date)) returning id into v_processo_id;
  insert into public.comentarios (processo_id, texto) values (v_processo_id, 'Status original na planilha: 100% Concluído');
  insert into public.etapas (processo_id, nome, responsavel_id, data_prevista, data_realizada, status, ordem) values (v_processo_id, '100% Concluído', v_responsavel_id, '2026-07-17', '2026-07-17', 'concluida', 1);
  insert into public.comissoes (processo_id, beneficiario_id, valor_previsto, status, data_prevista, valor_recebido, data_recebida) values (v_processo_id, v_corretor_id, 8800.0, '100% pago', '2026-07-17', 8800.0, current_date);

  -- 9. Bouganville 401
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Arthur Magno / Amanda Leal') returning id into v_comprador_id;
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Ernesto Takahara') returning id into v_vendedor_id;
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, 'Bouganville 401') returning id into v_imovel_id;
  v_corretor_id := null;
  insert into public.processos (tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, corretor_id, responsavel_id, tipo, status, valor_total, data_criacao) values (v_tenant_id, 'IMP-10', v_comprador_id, v_vendedor_id, v_imovel_id, v_corretor_id, v_responsavel_id, 'R.PRÓPRIOS', 'pendente', 345000.0, coalesce('2025-04-16', current_date)) returning id into v_processo_id;
  insert into public.comentarios (processo_id, texto) values (v_processo_id, 'Multa por atraso de pgto. | Status original na planilha: Em Processo Judicial');
  insert into public.etapas (processo_id, nome, responsavel_id, data_prevista, data_realizada, status, ordem) values (v_processo_id, 'Em Processo Judicial', v_responsavel_id, '2025-04-16', NULL, 'pendente', 1);
  insert into public.comissoes (processo_id, beneficiario_id, valor_previsto, status, data_prevista, valor_recebido, data_recebida) values (v_processo_id, v_corretor_id, 17250.0, '100% pago', '2025-04-16', 17250.0, current_date);

  -- 10. Oasis 1802A
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Mirela Kapleta') returning id into v_comprador_id;
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Suelute Gomes') returning id into v_vendedor_id;
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, 'Oasis 1802A') returning id into v_imovel_id;
  v_corretor_id := null;
  insert into public.processos (tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, corretor_id, responsavel_id, tipo, status, valor_total, data_criacao) values (v_tenant_id, 'IMP-11', v_comprador_id, v_vendedor_id, v_imovel_id, v_corretor_id, v_responsavel_id, 'R.PRÓPRIOS', 'ativo', 1600000.0, coalesce('2026-09-01', current_date)) returning id into v_processo_id;
  insert into public.comentarios (processo_id, texto) values (v_processo_id, 'Aditivo em andamento | Status original na planilha: Em Acordo/Aditivo');
  insert into public.etapas (processo_id, nome, responsavel_id, data_prevista, data_realizada, status, ordem) values (v_processo_id, 'Em Acordo/Aditivo', v_responsavel_id, '2026-09-01', NULL, 'pendente', 1);
  insert into public.comissoes (processo_id, beneficiario_id, valor_previsto, status, data_prevista, valor_recebido, data_recebida) values (v_processo_id, v_corretor_id, 56000.0, '100% pago', '2026-09-01', 56000.0, current_date);

  -- 11. Jales Machado 1104
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Felipe Gonçalves / Larissa') returning id into v_comprador_id;
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Marilene Xavier') returning id into v_vendedor_id;
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, 'Jales Machado 1104') returning id into v_imovel_id;
  v_corretor_id := v_corretor_maysa;
  insert into public.processos (tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, corretor_id, responsavel_id, tipo, status, valor_total, data_criacao) values (v_tenant_id, 'SAN-1146436', v_comprador_id, v_vendedor_id, v_imovel_id, v_corretor_id, v_responsavel_id, 'R.PRÓPRIOS, FINANCIAMENTO', 'ativo', 1070000.0, coalesce('2026-07-15', current_date)) returning id into v_processo_id;
  insert into public.comentarios (processo_id, texto) values (v_processo_id, 'Status original na planilha: Aguardando Posse');
  insert into public.etapas (processo_id, nome, responsavel_id, data_prevista, data_realizada, status, ordem) values (v_processo_id, 'Entrega de Chaves', v_responsavel_id, '2026-07-30', NULL, 'pendente', 1);
  insert into public.comissoes (processo_id, beneficiario_id, valor_previsto, status, data_prevista, valor_recebido, data_recebida) values (v_processo_id, v_corretor_id, 42800.0, '100% pago', '2026-07-15', 42800.0, current_date);

  -- 12. Bella Vida 307B
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Cristiano / Tatiane') returning id into v_comprador_id;
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Talita Sousa') returning id into v_vendedor_id;
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, 'Bella Vida 307B') returning id into v_imovel_id;
  v_corretor_id := v_corretor_amanda;
  insert into public.processos (tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, corretor_id, responsavel_id, tipo, status, valor_total, data_criacao) values (v_tenant_id, 'SAN-1172036', v_comprador_id, v_vendedor_id, v_imovel_id, v_corretor_id, v_responsavel_id, 'R.PRÓPRIOS, FINANCIAMENTO', 'ativo', 445000.0, coalesce('2026-10-17', current_date)) returning id into v_processo_id;
  insert into public.comentarios (processo_id, texto) values (v_processo_id, 'Status original na planilha: Trâmites do Financiamento');
  insert into public.etapas (processo_id, nome, responsavel_id, data_prevista, data_realizada, status, ordem) values (v_processo_id, 'Trâmites do Financiamento', v_responsavel_id, '2026-10-17', NULL, 'pendente', 1);
  insert into public.comissoes (processo_id, beneficiario_id, valor_previsto, status, data_prevista) values (v_processo_id, v_corretor_id, 15000.0, '0% pago', '2026-10-17');

  -- 13. QI 10 Bloco T Apto 214
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Elson') returning id into v_comprador_id;
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Péricles') returning id into v_vendedor_id;
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, 'QI 10 Bloco T Apto 214') returning id into v_imovel_id;
  v_corretor_id := v_corretor_plinio;
  insert into public.processos (tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, corretor_id, responsavel_id, tipo, status, valor_total, data_criacao) values (v_tenant_id, 'SAN-1166706', v_comprador_id, v_vendedor_id, v_imovel_id, v_corretor_id, v_responsavel_id, 'R.PRÓPRIOS, FINANCIAMENTO, FGTS', 'ativo', 425600.0, coalesce('2026-09-17', current_date)) returning id into v_processo_id;
  insert into public.comentarios (processo_id, texto) values (v_processo_id, 'Status original na planilha: Trâmites do Financiamento');
  insert into public.etapas (processo_id, nome, responsavel_id, data_prevista, data_realizada, status, ordem) values (v_processo_id, 'Trâmites do Financiamento', v_responsavel_id, '2026-09-17', NULL, 'pendente', 1);
  insert into public.comissoes (processo_id, beneficiario_id, valor_previsto, status, data_prevista, valor_recebido, data_recebida) values (v_processo_id, v_corretor_id, 17024.0, '100% pago', '2026-09-17', 17024.0, current_date);

  -- 14. Casa Remanso
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Patricia e Mozart') returning id into v_comprador_id;
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Cícero e Elis') returning id into v_vendedor_id;
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, 'Casa Remanso') returning id into v_imovel_id;
  v_corretor_id := null;
  insert into public.processos (tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, corretor_id, responsavel_id, tipo, status, valor_total, data_criacao) values (v_tenant_id, 'SAN-947168', v_comprador_id, v_vendedor_id, v_imovel_id, v_corretor_id, v_responsavel_id, 'R.PRÓPRIOS', 'ativo', 1400000.0, coalesce('2026-10-14', current_date)) returning id into v_processo_id;
  insert into public.comentarios (processo_id, texto) values (v_processo_id, 'Status original na planilha: Pagamento Intermediária');
  insert into public.etapas (processo_id, nome, responsavel_id, data_prevista, data_realizada, status, ordem) values (v_processo_id, 'Pagamento de Intermediaria: R$ 600.000,00', v_responsavel_id, '2026-08-21', NULL, 'pendente', 1);
  insert into public.comissoes (processo_id, beneficiario_id, valor_previsto, status, data_prevista, valor_recebido, data_recebida) values (v_processo_id, v_corretor_id, 56000.0, '100% pago', '2026-10-14', 56000.0, current_date);

  -- 15. Via Majestic
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Cicero e Elis') returning id into v_comprador_id;
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Mark') returning id into v_vendedor_id;
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, 'Via Majestic') returning id into v_imovel_id;
  v_corretor_id := v_corretor_amanda;
  insert into public.processos (tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, corretor_id, responsavel_id, tipo, status, valor_total, data_criacao) values (v_tenant_id, 'SAN-1183920', v_comprador_id, v_vendedor_id, v_imovel_id, v_corretor_id, v_responsavel_id, 'R.PRÓPRIOS, FINANCIAMENTO', 'ativo', 1460000.0, coalesce('2026-09-23', current_date)) returning id into v_processo_id;
  insert into public.comentarios (processo_id, texto) values (v_processo_id, 'Status original na planilha: Trâmites do Financiamento');
  insert into public.etapas (processo_id, nome, responsavel_id, data_prevista, data_realizada, status, ordem) values (v_processo_id, 'Trâmites do Financiamento', v_responsavel_id, '2026-09-23', NULL, 'pendente', 1);
  insert into public.comissoes (processo_id, beneficiario_id, valor_previsto, status, data_prevista, valor_recebido, data_recebida) values (v_processo_id, v_corretor_id, 58400.0, '100% pago', '2026-09-23', 58400.0, current_date);

  -- 16. Via Palacio do Sol 603
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Flavio') returning id into v_comprador_id;
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Petulia') returning id into v_vendedor_id;
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, 'Via Palacio do Sol 603') returning id into v_imovel_id;
  v_corretor_id := v_corretor_michele;
  insert into public.processos (tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, corretor_id, responsavel_id, tipo, status, valor_total, data_criacao) values (v_tenant_id, 'SAN-1162812', v_comprador_id, v_vendedor_id, v_imovel_id, v_corretor_id, v_responsavel_id, 'N/A, R.PRÓPRIOS', 'ativo', 1130000.0, coalesce('2026-07-10', current_date)) returning id into v_processo_id;
  insert into public.comentarios (processo_id, texto) values (v_processo_id, 'Status original na planilha: Aguardando Posse');
  insert into public.etapas (processo_id, nome, responsavel_id, data_prevista, data_realizada, status, ordem) values (v_processo_id, 'Entrega de Chaves', v_responsavel_id, '2026-08-01', NULL, 'pendente', 1);
  insert into public.comissoes (processo_id, beneficiario_id, valor_previsto, status, data_prevista, valor_recebido, data_recebida) values (v_processo_id, v_corretor_id, 39550.0, '100% pago', '2026-07-10', 39550.0, current_date);

  -- 17. Scorpius 102
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Maiane / Luis') returning id into v_comprador_id;
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Maria do Carmo / Bernardo') returning id into v_vendedor_id;
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, 'Scorpius 102') returning id into v_imovel_id;
  v_corretor_id := null;
  insert into public.processos (tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, corretor_id, responsavel_id, tipo, status, valor_total, data_criacao) values (v_tenant_id, 'SAN-1158724', v_comprador_id, v_vendedor_id, v_imovel_id, v_corretor_id, v_responsavel_id, 'R.PRÓPRIOS, FINANCIAMENTO', 'ativo', 1350000.0, coalesce('2026-09-29', current_date)) returning id into v_processo_id;
  insert into public.comentarios (processo_id, texto) values (v_processo_id, 'Status original na planilha: Trâmites do Financiamento');
  insert into public.etapas (processo_id, nome, responsavel_id, data_prevista, data_realizada, status, ordem) values (v_processo_id, 'Trâmites do Financiamento', v_responsavel_id, '2026-09-29', NULL, 'pendente', 1);
  insert into public.comissoes (processo_id, beneficiario_id, valor_previsto, status, data_prevista) values (v_processo_id, v_corretor_id, 54000.0, '0% pago', '2026-09-29');

  -- 18. QE 50
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Vínnie / Luciana') returning id into v_comprador_id;
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Josué / Juliane') returning id into v_vendedor_id;
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, 'QE 50') returning id into v_imovel_id;
  v_corretor_id := null;
  insert into public.processos (tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, corretor_id, responsavel_id, tipo, status, valor_total, data_criacao) values (v_tenant_id, 'SAN-1168120', v_comprador_id, v_vendedor_id, v_imovel_id, v_corretor_id, v_responsavel_id, 'R.PRÓPRIOS, FINANCIAMENTO', 'ativo', 1150000.0, coalesce('2026-10-09', current_date)) returning id into v_processo_id;
  insert into public.comentarios (processo_id, texto) values (v_processo_id, 'Status original na planilha: Trâmites do Financiamento');
  insert into public.etapas (processo_id, nome, responsavel_id, data_prevista, data_realizada, status, ordem) values (v_processo_id, 'Trâmites do Financiamento', v_responsavel_id, '2026-10-09', NULL, 'pendente', 1);
  insert into public.comissoes (processo_id, beneficiario_id, valor_previsto, status, data_prevista) values (v_processo_id, v_corretor_id, 64838.95, '0% pago', '2026-10-09');

  -- 19. Casa Park Way
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Vicente / Maria') returning id into v_comprador_id;
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Emerson') returning id into v_vendedor_id;
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, 'Casa Park Way') returning id into v_imovel_id;
  v_corretor_id := null;
  insert into public.processos (tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, corretor_id, responsavel_id, tipo, status, valor_total, data_criacao) values (v_tenant_id, 'IMP-20', v_comprador_id, v_vendedor_id, v_imovel_id, v_corretor_id, v_responsavel_id, 'R.PRÓPRIOS', 'ativo', 1200000.0, coalesce('2026-07-20', current_date)) returning id into v_processo_id;
  insert into public.comentarios (processo_id, texto) values (v_processo_id, 'Permuta por dois imóveis | Status original na planilha: Aguardando Posse');
  insert into public.etapas (processo_id, nome, responsavel_id, data_prevista, data_realizada, status, ordem) values (v_processo_id, 'Entrega de Chaves', v_responsavel_id, '2026-08-06', NULL, 'pendente', 1);
  insert into public.comissoes (processo_id, beneficiario_id, valor_previsto, status, data_prevista, valor_recebido, data_recebida) values (v_processo_id, v_corretor_id, 42000.0, '100% pago', '2026-07-20', 42000.0, current_date);

  -- 20. SQN 216
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Alessandra') returning id into v_comprador_id;
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Amelia') returning id into v_vendedor_id;
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, 'SQN 216') returning id into v_imovel_id;
  v_corretor_id := null;
  insert into public.processos (tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, corretor_id, responsavel_id, tipo, status, valor_total, data_criacao) values (v_tenant_id, 'IMP-21', v_comprador_id, v_vendedor_id, v_imovel_id, v_corretor_id, v_responsavel_id, 'FINANCIAMENTO, R.PRÓPRIOS', 'ativo', 1365000.0, coalesce('2026-08-21', current_date)) returning id into v_processo_id;
  insert into public.comentarios (processo_id, texto) values (v_processo_id, 'Status original na planilha: Trâmites do Financiamento');
  insert into public.etapas (processo_id, nome, responsavel_id, data_prevista, data_realizada, status, ordem) values (v_processo_id, 'Trâmites do Financiamento', v_responsavel_id, '2026-08-21', NULL, 'pendente', 1);

  -- 21. Residencial Pinheiros
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Marcelo / Lilliane') returning id into v_comprador_id;
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Ana Maria') returning id into v_vendedor_id;
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, 'Residencial Pinheiros') returning id into v_imovel_id;
  v_corretor_id := null;
  insert into public.processos (tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, corretor_id, responsavel_id, tipo, status, valor_total, data_criacao) values (v_tenant_id, 'IMP-22', v_comprador_id, v_vendedor_id, v_imovel_id, v_corretor_id, v_responsavel_id, 'R.PRÓPRIOS', 'ativo', 860000.0, coalesce('2026-07-25', current_date)) returning id into v_processo_id;
  insert into public.comentarios (processo_id, texto) values (v_processo_id, 'Status original na planilha: Aguardando Posse');
  insert into public.etapas (processo_id, nome, responsavel_id, data_prevista, data_realizada, status, ordem) values (v_processo_id, 'Entrega de Chaves', v_responsavel_id, '2026-07-25', NULL, 'pendente', 1);
  insert into public.comissoes (processo_id, beneficiario_id, valor_previsto, status, data_prevista, valor_recebido, data_recebida) values (v_processo_id, v_corretor_id, 43000.0, '100% pago', '2026-07-25', 43000.0, current_date);

end $$;