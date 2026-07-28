-- =========================================================
-- Importação única: planilha SACRA - Acompanhamento CCA
-- (Correspondente Bancário). Rode a migration 0008 antes.
-- =========================================================

do $$
declare
  v_tenant_id uuid;
  v_responsavel_id uuid;
  v_cliente_id uuid;
  v_imovel_id uuid;
  v_banco_id uuid;
  v_indicacao_id uuid;
  v_processo_id uuid;
begin
  select id into v_tenant_id from public.tenants limit 1;
  select id into v_responsavel_id from public.usuarios where tenant_id = v_tenant_id limit 1;

  -- Garante que todo corretor de indicação existe (não duplica, graças à unique constraint)
  insert into public.corretores (tenant_id, nome) values (v_tenant_id, 'Amanda') on conflict (tenant_id, nome) do nothing;
  insert into public.corretores (tenant_id, nome) values (v_tenant_id, 'Maysa') on conflict (tenant_id, nome) do nothing;
  insert into public.corretores (tenant_id, nome) values (v_tenant_id, 'Michele') on conflict (tenant_id, nome) do nothing;
  insert into public.corretores (tenant_id, nome) values (v_tenant_id, 'Plinio') on conflict (tenant_id, nome) do nothing;
  insert into public.corretores (tenant_id, nome) values (v_tenant_id, 'Renato') on conflict (tenant_id, nome) do nothing;
  insert into public.corretores (tenant_id, nome) values (v_tenant_id, 'Ricardo') on conflict (tenant_id, nome) do nothing;
  insert into public.corretores (tenant_id, nome) values (v_tenant_id, 'Taciano') on conflict (tenant_id, nome) do nothing;

  -- Garante que todo banco existe
  insert into public.bancos (tenant_id, nome) values (v_tenant_id, 'CAIXA') on conflict (tenant_id, nome) do nothing;
  insert into public.bancos (tenant_id, nome) values (v_tenant_id, 'ITAÚ') on conflict (tenant_id, nome) do nothing;

  -- 1. Vinicius e Andreia — Via do Sol
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Vinicius e Andreia') returning id into v_cliente_id;
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, 'Via do Sol') returning id into v_imovel_id;
  select id into v_banco_id from public.bancos where tenant_id = v_tenant_id and nome = 'ITAÚ';
  select id into v_indicacao_id from public.corretores where tenant_id = v_tenant_id and nome = 'Plinio';
  insert into public.processos (tenant_id, numero_processo, comprador_id, imovel_id, banco_id, indicacao_id, responsavel_id, tipo, status, categoria, valor_total, valor_financiado, origem, data_criacao) values (v_tenant_id, 'CCA-0001', v_cliente_id, v_imovel_id, v_banco_id, v_indicacao_id, v_responsavel_id, 'SFH / SBPE', 'ativo', 'financiamento', 275000.0, 220000.0, 'Indicação', coalesce('2026-05-20', current_date)) returning id into v_processo_id;
  insert into public.comentarios (processo_id, texto) values (v_processo_id, 'Fase original na planilha: Emissão de Contrato/Escritura');
  insert into public.etapas (processo_id, nome, responsavel_id, status, ordem) values (v_processo_id, 'Emissão de Contrato/Escritura', v_responsavel_id, 'pendente', 1);
  insert into public.comissoes (processo_id, beneficiario_id, valor_previsto, status) values (v_processo_id, v_indicacao_id, 2200.0, '0% pago');

  -- 2. Mateus Martins C. — —
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Mateus Martins C.') returning id into v_cliente_id;
  v_imovel_id := null;
  select id into v_banco_id from public.bancos where tenant_id = v_tenant_id and nome = 'CAIXA';
  select id into v_indicacao_id from public.corretores where tenant_id = v_tenant_id and nome = 'Ricardo';
  insert into public.processos (tenant_id, numero_processo, comprador_id, imovel_id, banco_id, indicacao_id, responsavel_id, tipo, status, categoria, valor_total, valor_financiado, origem, data_criacao) values (v_tenant_id, 'CCA-0002', v_cliente_id, v_imovel_id, v_banco_id, v_indicacao_id, v_responsavel_id, 'SFH / MCMV', 'ativo', 'financiamento', 250000.0, 200000.0, 'SACRA', coalesce('2026-05-15', current_date)) returning id into v_processo_id;
  insert into public.comentarios (processo_id, texto) values (v_processo_id, 'Fase original na planilha: Conformidade');
  insert into public.etapas (processo_id, nome, responsavel_id, status, ordem) values (v_processo_id, 'Conformidade', v_responsavel_id, 'pendente', 1);
  insert into public.comissoes (processo_id, beneficiario_id, valor_previsto, status) values (v_processo_id, v_indicacao_id, 2000.0, '0% pago');

  -- 3. Cristiano / Tatiane Belem — Bella Vida 307B
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Cristiano / Tatiane Belem') returning id into v_cliente_id;
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, 'Bella Vida 307B') returning id into v_imovel_id;
  select id into v_banco_id from public.bancos where tenant_id = v_tenant_id and nome = 'CAIXA';
  select id into v_indicacao_id from public.corretores where tenant_id = v_tenant_id and nome = 'Plinio';
  insert into public.processos (tenant_id, numero_processo, comprador_id, imovel_id, banco_id, indicacao_id, responsavel_id, tipo, status, categoria, valor_total, valor_financiado, origem, data_criacao) values (v_tenant_id, 'CCA-0003', v_cliente_id, v_imovel_id, v_banco_id, v_indicacao_id, v_responsavel_id, 'SFH / SBPE', 'ativo', 'financiamento', 445000.0, 235000.0, 'SACRA', coalesce('2026-06-18', current_date)) returning id into v_processo_id;
  insert into public.comentarios (processo_id, texto) values (v_processo_id, 'Fase original na planilha: Conformidade');
  insert into public.etapas (processo_id, nome, responsavel_id, status, ordem) values (v_processo_id, 'Conformidade', v_responsavel_id, 'pendente', 1);
  insert into public.comissoes (processo_id, beneficiario_id, valor_previsto, status) values (v_processo_id, v_indicacao_id, 1880.0, '0% pago');

  -- 4. Cícero Araruna — Via Majestic
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Cícero Araruna') returning id into v_cliente_id;
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, 'Via Majestic') returning id into v_imovel_id;
  select id into v_banco_id from public.bancos where tenant_id = v_tenant_id and nome = 'CAIXA';
  select id into v_indicacao_id from public.corretores where tenant_id = v_tenant_id and nome = 'Amanda';
  insert into public.processos (tenant_id, numero_processo, comprador_id, imovel_id, banco_id, indicacao_id, responsavel_id, tipo, status, categoria, valor_total, valor_financiado, origem, data_criacao) values (v_tenant_id, 'CCA-0004', v_cliente_id, v_imovel_id, v_banco_id, v_indicacao_id, v_responsavel_id, 'SFH / SBPE', 'ativo', 'financiamento', 1460000.0, 510000.0, 'SACRA', coalesce('2026-06-30', current_date)) returning id into v_processo_id;
  insert into public.comentarios (processo_id, texto) values (v_processo_id, 'Fase original na planilha: Conformidade');
  insert into public.etapas (processo_id, nome, responsavel_id, status, ordem) values (v_processo_id, 'Conformidade', v_responsavel_id, 'pendente', 1);
  insert into public.comissoes (processo_id, beneficiario_id, valor_previsto, status) values (v_processo_id, v_indicacao_id, 4080.0, '0% pago');

  -- 5. Arthur Gabriel — Madison 911-A
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Arthur Gabriel') returning id into v_cliente_id;
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, 'Madison 911-A') returning id into v_imovel_id;
  select id into v_banco_id from public.bancos where tenant_id = v_tenant_id and nome = 'CAIXA';
  select id into v_indicacao_id from public.corretores where tenant_id = v_tenant_id and nome = 'Renato';
  insert into public.processos (tenant_id, numero_processo, comprador_id, imovel_id, banco_id, indicacao_id, responsavel_id, tipo, status, categoria, valor_total, valor_financiado, origem, data_criacao) values (v_tenant_id, 'CCA-0005', v_cliente_id, v_imovel_id, v_banco_id, v_indicacao_id, v_responsavel_id, NULL, 'concluido', 'financiamento', 310000.0, 155000.0, NULL, coalesce('2026-03-01', current_date)) returning id into v_processo_id;
  insert into public.comentarios (processo_id, texto) values (v_processo_id, 'Fase original na planilha: 100% Concluído');
  insert into public.etapas (processo_id, nome, responsavel_id, status, ordem) values (v_processo_id, '100% Concluído', v_responsavel_id, 'concluida', 1);
  insert into public.comissoes (processo_id, beneficiario_id, valor_previsto, status, valor_recebido, data_recebida) values (v_processo_id, v_indicacao_id, 1240.0, '100% pago', 1240.0, current_date);

  -- 6. Larissa Costa Pessoa — Olympique 702-D
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Larissa Costa Pessoa') returning id into v_cliente_id;
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, 'Olympique 702-D') returning id into v_imovel_id;
  select id into v_banco_id from public.bancos where tenant_id = v_tenant_id and nome = 'ITAÚ';
  select id into v_indicacao_id from public.corretores where tenant_id = v_tenant_id and nome = 'Amanda';
  insert into public.processos (tenant_id, numero_processo, comprador_id, imovel_id, banco_id, indicacao_id, responsavel_id, tipo, status, categoria, valor_total, valor_financiado, origem, data_criacao) values (v_tenant_id, 'CCA-0006', v_cliente_id, v_imovel_id, v_banco_id, v_indicacao_id, v_responsavel_id, NULL, 'concluido', 'financiamento', 892000.0, 500000.0, NULL, coalesce('2026-02-01', current_date)) returning id into v_processo_id;
  insert into public.comentarios (processo_id, texto) values (v_processo_id, 'Fase original na planilha: 100% Concluído');
  insert into public.etapas (processo_id, nome, responsavel_id, status, ordem) values (v_processo_id, '100% Concluído', v_responsavel_id, 'concluida', 1);
  insert into public.comissoes (processo_id, beneficiario_id, valor_previsto, status, valor_recebido, data_recebida) values (v_processo_id, v_indicacao_id, 5000.0, '100% pago', 5000.0, current_date);

  -- 7. Núbia e José — Le Ciel 2401
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Núbia e José') returning id into v_cliente_id;
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, 'Le Ciel 2401') returning id into v_imovel_id;
  select id into v_banco_id from public.bancos where tenant_id = v_tenant_id and nome = 'CAIXA';
  select id into v_indicacao_id from public.corretores where tenant_id = v_tenant_id and nome = 'Maysa';
  insert into public.processos (tenant_id, numero_processo, comprador_id, imovel_id, banco_id, indicacao_id, responsavel_id, tipo, status, categoria, valor_total, valor_financiado, origem, data_criacao) values (v_tenant_id, 'CCA-0007', v_cliente_id, v_imovel_id, v_banco_id, v_indicacao_id, v_responsavel_id, NULL, 'concluido', 'financiamento', 1365000.0, 250000.0, NULL, coalesce('2026-02-01', current_date)) returning id into v_processo_id;
  insert into public.comentarios (processo_id, texto) values (v_processo_id, 'Fase original na planilha: 100% Concluído');
  insert into public.etapas (processo_id, nome, responsavel_id, status, ordem) values (v_processo_id, '100% Concluído', v_responsavel_id, 'concluida', 1);
  insert into public.comissoes (processo_id, beneficiario_id, valor_previsto, status, valor_recebido, data_recebida) values (v_processo_id, v_indicacao_id, 2000.0, '100% pago', 2000.0, current_date);

  -- 8. Felipe Bastos — Jales Machado 1104
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Felipe Bastos') returning id into v_cliente_id;
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, 'Jales Machado 1104') returning id into v_imovel_id;
  select id into v_banco_id from public.bancos where tenant_id = v_tenant_id and nome = 'CAIXA';
  select id into v_indicacao_id from public.corretores where tenant_id = v_tenant_id and nome = 'Maysa';
  insert into public.processos (tenant_id, numero_processo, comprador_id, imovel_id, banco_id, indicacao_id, responsavel_id, tipo, status, categoria, valor_total, valor_financiado, origem, data_criacao) values (v_tenant_id, 'CCA-0008', v_cliente_id, v_imovel_id, v_banco_id, v_indicacao_id, v_responsavel_id, NULL, 'concluido', 'financiamento', 1070000.0, 350000.0, NULL, coalesce('2026-03-17', current_date)) returning id into v_processo_id;
  insert into public.comentarios (processo_id, texto) values (v_processo_id, 'Fase original na planilha: 100% Concluído | SACRA');
  insert into public.etapas (processo_id, nome, responsavel_id, status, ordem) values (v_processo_id, '100% Concluído', v_responsavel_id, 'concluida', 1);
  insert into public.comissoes (processo_id, beneficiario_id, valor_previsto, status, valor_recebido, data_recebida) values (v_processo_id, v_indicacao_id, 3500.0, '100% pago', 3500.0, current_date);

  -- 9. Alessandra Serrazes — SQN 216
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Alessandra Serrazes') returning id into v_cliente_id;
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, 'SQN 216') returning id into v_imovel_id;
  select id into v_banco_id from public.bancos where tenant_id = v_tenant_id and nome = 'CAIXA';
  select id into v_indicacao_id from public.corretores where tenant_id = v_tenant_id and nome = 'Ricardo';
  insert into public.processos (tenant_id, numero_processo, comprador_id, imovel_id, banco_id, indicacao_id, responsavel_id, tipo, status, categoria, valor_total, valor_financiado, origem, data_criacao) values (v_tenant_id, 'CCA-0009', v_cliente_id, v_imovel_id, v_banco_id, v_indicacao_id, v_responsavel_id, NULL, 'cancelado', 'financiamento', NULL, NULL, NULL, coalesce('2026-06-01', current_date)) returning id into v_processo_id;
  insert into public.comentarios (processo_id, texto) values (v_processo_id, 'Fase original na planilha: Desistência');
  insert into public.etapas (processo_id, nome, responsavel_id, status, ordem) values (v_processo_id, 'Desistência', v_responsavel_id, 'pendente', 1);

  -- 10. Cristiane Gasparin — Montana
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Cristiane Gasparin') returning id into v_cliente_id;
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, 'Montana') returning id into v_imovel_id;
  select id into v_banco_id from public.bancos where tenant_id = v_tenant_id and nome = 'CAIXA';
  select id into v_indicacao_id from public.corretores where tenant_id = v_tenant_id and nome = 'Michele';
  insert into public.processos (tenant_id, numero_processo, comprador_id, imovel_id, banco_id, indicacao_id, responsavel_id, tipo, status, categoria, valor_total, valor_financiado, origem, data_criacao) values (v_tenant_id, 'CCA-0010', v_cliente_id, v_imovel_id, v_banco_id, v_indicacao_id, v_responsavel_id, NULL, 'cancelado', 'financiamento', NULL, NULL, NULL, coalesce('2026-06-01', current_date)) returning id into v_processo_id;
  insert into public.comentarios (processo_id, texto) values (v_processo_id, 'Fase original na planilha: Desistência');
  insert into public.etapas (processo_id, nome, responsavel_id, status, ordem) values (v_processo_id, 'Desistência', v_responsavel_id, 'pendente', 1);

  -- 11. Eduardo Felix — Montparnasse
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Eduardo Felix') returning id into v_cliente_id;
  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, 'Montparnasse') returning id into v_imovel_id;
  select id into v_banco_id from public.bancos where tenant_id = v_tenant_id and nome = 'CAIXA';
  select id into v_indicacao_id from public.corretores where tenant_id = v_tenant_id and nome = 'Maysa';
  insert into public.processos (tenant_id, numero_processo, comprador_id, imovel_id, banco_id, indicacao_id, responsavel_id, tipo, status, categoria, valor_total, valor_financiado, origem, data_criacao) values (v_tenant_id, 'CCA-0011', v_cliente_id, v_imovel_id, v_banco_id, v_indicacao_id, v_responsavel_id, NULL, 'cancelado', 'financiamento', 613000.0, 490400.0, NULL, coalesce('2026-06-05', current_date)) returning id into v_processo_id;
  insert into public.comentarios (processo_id, texto) values (v_processo_id, 'Fase original na planilha: Desistência | SACRA');
  insert into public.etapas (processo_id, nome, responsavel_id, status, ordem) values (v_processo_id, 'Desistência', v_responsavel_id, 'pendente', 1);
  insert into public.comissoes (processo_id, beneficiario_id, valor_previsto, status) values (v_processo_id, v_indicacao_id, 3923.2, '0% pago');

  -- 12. Mateus Cavalcanti — —
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Mateus Cavalcanti') returning id into v_cliente_id;
  v_imovel_id := null;
  select id into v_banco_id from public.bancos where tenant_id = v_tenant_id and nome = 'CAIXA';
  select id into v_indicacao_id from public.corretores where tenant_id = v_tenant_id and nome = 'Ricardo';
  insert into public.processos (tenant_id, numero_processo, comprador_id, imovel_id, banco_id, indicacao_id, responsavel_id, tipo, status, categoria, valor_total, valor_financiado, origem, data_criacao) values (v_tenant_id, 'CCA-0012', v_cliente_id, v_imovel_id, v_banco_id, v_indicacao_id, v_responsavel_id, NULL, 'cancelado', 'financiamento', 250000.0, 200000.0, NULL, coalesce('2026-05-15', current_date)) returning id into v_processo_id;
  insert into public.comentarios (processo_id, texto) values (v_processo_id, 'Fase original na planilha: Conformidade | SACRA');
  insert into public.etapas (processo_id, nome, responsavel_id, status, ordem) values (v_processo_id, 'Conformidade', v_responsavel_id, 'pendente', 1);
  insert into public.comissoes (processo_id, beneficiario_id, valor_previsto, status) values (v_processo_id, v_indicacao_id, 1600.0, '0% pago');

  -- 13. Henrique Tostes — —
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Henrique Tostes') returning id into v_cliente_id;
  v_imovel_id := null;
  select id into v_banco_id from public.bancos where tenant_id = v_tenant_id and nome = 'ITAÚ';
  select id into v_indicacao_id from public.corretores where tenant_id = v_tenant_id and nome = 'Taciano';
  insert into public.processos (tenant_id, numero_processo, comprador_id, imovel_id, banco_id, indicacao_id, responsavel_id, tipo, status, categoria, valor_total, valor_financiado, origem, data_criacao) values (v_tenant_id, 'CCA-0013', v_cliente_id, v_imovel_id, v_banco_id, v_indicacao_id, v_responsavel_id, NULL, 'cancelado', 'financiamento', 500000.0, 391000.0, NULL, coalesce('2026-06-19', current_date)) returning id into v_processo_id;
  insert into public.comentarios (processo_id, texto) values (v_processo_id, 'Fase original na planilha: Desistência | ELEVARE');
  insert into public.etapas (processo_id, nome, responsavel_id, status, ordem) values (v_processo_id, 'Desistência', v_responsavel_id, 'pendente', 1);
  insert into public.comissoes (processo_id, beneficiario_id, valor_previsto, status) values (v_processo_id, v_indicacao_id, 3910.0, '0% pago');

  -- 14. Maria Eduarda e Ricardo — —
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Maria Eduarda e Ricardo') returning id into v_cliente_id;
  v_imovel_id := null;
  select id into v_banco_id from public.bancos where tenant_id = v_tenant_id and nome = 'CAIXA';
  v_indicacao_id := null;
  insert into public.processos (tenant_id, numero_processo, comprador_id, imovel_id, banco_id, indicacao_id, responsavel_id, tipo, status, categoria, valor_total, valor_financiado, origem, data_criacao) values (v_tenant_id, 'CCA-0014', v_cliente_id, v_imovel_id, v_banco_id, v_indicacao_id, v_responsavel_id, NULL, 'cancelado', 'financiamento', NULL, NULL, NULL, coalesce('2026-05-01', current_date)) returning id into v_processo_id;
  insert into public.comentarios (processo_id, texto) values (v_processo_id, 'Fase original na planilha: Reprovado');
  insert into public.etapas (processo_id, nome, responsavel_id, status, ordem) values (v_processo_id, 'Reprovado', v_responsavel_id, 'pendente', 1);

  -- 15. Raiane Santos — —
  insert into public.clientes (tenant_id, nome) values (v_tenant_id, 'Raiane Santos') returning id into v_cliente_id;
  v_imovel_id := null;
  select id into v_banco_id from public.bancos where tenant_id = v_tenant_id and nome = 'CAIXA';
  v_indicacao_id := null;
  insert into public.processos (tenant_id, numero_processo, comprador_id, imovel_id, banco_id, indicacao_id, responsavel_id, tipo, status, categoria, valor_total, valor_financiado, origem, data_criacao) values (v_tenant_id, 'CCA-0015', v_cliente_id, v_imovel_id, v_banco_id, v_indicacao_id, v_responsavel_id, NULL, 'cancelado', 'financiamento', NULL, NULL, NULL, coalesce('2026-04-01', current_date)) returning id into v_processo_id;
  insert into public.comentarios (processo_id, texto) values (v_processo_id, 'Fase original na planilha: Reprovado');
  insert into public.etapas (processo_id, nome, responsavel_id, status, ordem) values (v_processo_id, 'Reprovado', v_responsavel_id, 'pendente', 1);

end $$;