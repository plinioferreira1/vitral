-- =========================================================
-- Importa historico das planilhas de Financiamento (CCA) e
-- Vendas: processos concluidos, desistencias e reprovados
-- (financiamento), processos concluidos e ativos (venda).
-- Cada processo entra com comprador/vendedor/imovel/banco/
-- corretor resolvidos por nome (cria na hora se nao existir,
-- igual ao formulario 'Novo processo' faz), etapas coerentes
-- com o estagio atual, e o lancamento de comissao quando o
-- valor estava preenchido na planilha.
-- =========================================================

create or replace function tmp_resolver_cliente(p_tenant_id uuid, p_nome text)
returns uuid language plpgsql as $$
declare v_id uuid;
begin
  if p_nome is null or trim(p_nome) = '' then return null; end if;
  select id into v_id from clientes where tenant_id = p_tenant_id and lower(nome) = lower(trim(p_nome)) limit 1;
  if v_id is null then
    insert into clientes (tenant_id, nome) values (p_tenant_id, trim(p_nome)) returning id into v_id;
  end if;
  return v_id;
end;
$$;

create or replace function tmp_resolver_imovel(p_tenant_id uuid, p_endereco text)
returns uuid language plpgsql as $$
declare v_id uuid;
begin
  if p_endereco is null or trim(p_endereco) = '' then return null; end if;
  select id into v_id from imoveis where tenant_id = p_tenant_id and lower(endereco) = lower(trim(p_endereco)) limit 1;
  if v_id is null then
    insert into imoveis (tenant_id, endereco) values (p_tenant_id, trim(p_endereco)) returning id into v_id;
  end if;
  return v_id;
end;
$$;

create or replace function tmp_resolver_banco(p_tenant_id uuid, p_nome text)
returns uuid language plpgsql as $$
declare v_id uuid;
begin
  if p_nome is null or trim(p_nome) = '' then return null; end if;
  select id into v_id from bancos where tenant_id = p_tenant_id and lower(nome) = lower(trim(p_nome)) limit 1;
  if v_id is null then
    insert into bancos (tenant_id, nome) values (p_tenant_id, trim(p_nome)) returning id into v_id;
  end if;
  return v_id;
end;
$$;

create or replace function tmp_resolver_corretor(p_tenant_id uuid, p_nome text)
returns uuid language plpgsql as $$
declare v_id uuid;
begin
  if p_nome is null or trim(p_nome) = '' then return null; end if;
  select id into v_id from corretores where tenant_id = p_tenant_id and lower(nome) = lower(trim(p_nome)) limit 1;
  if v_id is null then
    insert into corretores (tenant_id, nome) values (p_tenant_id, trim(p_nome)) returning id into v_id;
  end if;
  return v_id;
end;
$$;

-- ---- financiamento #1: Arthur Gabriel ----
do $$
declare
  v_tenant_id uuid;
  v_responsavel_id uuid;
  v_processo_id uuid;
  v_comprador_id uuid;
  v_vendedor_id uuid;
  v_imovel_id uuid;
  v_banco_id uuid;
  v_corretor_id uuid;
  v_numero text;
begin
  select id into v_tenant_id from tenants limit 1;
  select id into v_responsavel_id from usuarios where email = 'plinio.sacraimoveis@gmail.com';
  v_numero := 'PROC-2026-IMP0001';
  v_comprador_id := tmp_resolver_cliente(v_tenant_id, 'Arthur Gabriel');
  v_vendedor_id := null;
  v_imovel_id := tmp_resolver_imovel(v_tenant_id, 'Madison 911-A');
  v_banco_id := tmp_resolver_banco(v_tenant_id, 'Caixa');
  v_corretor_id := tmp_resolver_corretor(v_tenant_id, 'Renato');
  insert into processos (
    tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, banco_id,
    corretor_id, responsavel_id, tipo, status, categoria, valor_total,
    valor_financiado, origem, indicacao_id, data_criacao
  ) values (
    v_tenant_id, v_numero, v_comprador_id, v_vendedor_id, v_imovel_id, v_banco_id,
    v_corretor_id, v_responsavel_id, NULL, 'concluido', 'financiamento', 310000,
    155000, NULL, v_corretor_id, '2026-03-01'
  ) returning id into v_processo_id;
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Simulação', v_responsavel_id, 'concluida', 1, '2026-03-01'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Cadastro', v_responsavel_id, 'concluida', 2, '2026-03-01'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Análise de Crédito', v_responsavel_id, 'concluida', 3, '2026-03-01'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Assinatura de Proposta', v_responsavel_id, 'concluida', 4, '2026-03-01'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Vistoria', v_responsavel_id, 'concluida', 5, '2026-03-01'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Conformidade', v_responsavel_id, 'concluida', 6, '2026-03-01'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Emissão de Contrato', v_responsavel_id, 'concluida', 7, '2026-03-01'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Emissão de ITBI', v_responsavel_id, 'concluida', 8, '2026-03-01'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Registro', v_responsavel_id, 'concluida', 9, '2026-03-01'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Liberação de Recursos', v_responsavel_id, 'concluida', 10, '2026-03-01'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, '100% Concluído', v_responsavel_id, 'concluida', 11, '2026-03-01'::date);
end $$;

-- ---- financiamento #2: Larissa Costa Pessoa ----
do $$
declare
  v_tenant_id uuid;
  v_responsavel_id uuid;
  v_processo_id uuid;
  v_comprador_id uuid;
  v_vendedor_id uuid;
  v_imovel_id uuid;
  v_banco_id uuid;
  v_corretor_id uuid;
  v_numero text;
begin
  select id into v_tenant_id from tenants limit 1;
  select id into v_responsavel_id from usuarios where email = 'plinio.sacraimoveis@gmail.com';
  v_numero := 'PROC-2026-IMP0002';
  v_comprador_id := tmp_resolver_cliente(v_tenant_id, 'Larissa Costa Pessoa');
  v_vendedor_id := null;
  v_imovel_id := tmp_resolver_imovel(v_tenant_id, 'Olympique 702-D');
  v_banco_id := tmp_resolver_banco(v_tenant_id, 'Itaú');
  v_corretor_id := tmp_resolver_corretor(v_tenant_id, 'Amanda');
  insert into processos (
    tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, banco_id,
    corretor_id, responsavel_id, tipo, status, categoria, valor_total,
    valor_financiado, origem, indicacao_id, data_criacao
  ) values (
    v_tenant_id, v_numero, v_comprador_id, v_vendedor_id, v_imovel_id, v_banco_id,
    v_corretor_id, v_responsavel_id, NULL, 'concluido', 'financiamento', 892000,
    500000, NULL, v_corretor_id, '2026-02-01'
  ) returning id into v_processo_id;
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Simulação', v_responsavel_id, 'concluida', 1, '2026-02-01'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Cadastro', v_responsavel_id, 'concluida', 2, '2026-02-01'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Análise de Crédito', v_responsavel_id, 'concluida', 3, '2026-02-01'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Assinatura de Proposta', v_responsavel_id, 'concluida', 4, '2026-02-01'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Vistoria', v_responsavel_id, 'concluida', 5, '2026-02-01'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Conformidade', v_responsavel_id, 'concluida', 6, '2026-02-01'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Emissão de Contrato', v_responsavel_id, 'concluida', 7, '2026-02-01'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Emissão de ITBI', v_responsavel_id, 'concluida', 8, '2026-02-01'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Registro', v_responsavel_id, 'concluida', 9, '2026-02-01'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Liberação de Recursos', v_responsavel_id, 'concluida', 10, '2026-02-01'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, '100% Concluído', v_responsavel_id, 'concluida', 11, '2026-02-01'::date);
end $$;

-- ---- financiamento #3: Núbia e José ----
do $$
declare
  v_tenant_id uuid;
  v_responsavel_id uuid;
  v_processo_id uuid;
  v_comprador_id uuid;
  v_vendedor_id uuid;
  v_imovel_id uuid;
  v_banco_id uuid;
  v_corretor_id uuid;
  v_numero text;
begin
  select id into v_tenant_id from tenants limit 1;
  select id into v_responsavel_id from usuarios where email = 'plinio.sacraimoveis@gmail.com';
  v_numero := 'PROC-2026-IMP0003';
  v_comprador_id := tmp_resolver_cliente(v_tenant_id, 'Núbia e José');
  v_vendedor_id := null;
  v_imovel_id := tmp_resolver_imovel(v_tenant_id, 'Le Ciel 2401');
  v_banco_id := tmp_resolver_banco(v_tenant_id, 'Caixa');
  v_corretor_id := tmp_resolver_corretor(v_tenant_id, 'Maysa');
  insert into processos (
    tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, banco_id,
    corretor_id, responsavel_id, tipo, status, categoria, valor_total,
    valor_financiado, origem, indicacao_id, data_criacao
  ) values (
    v_tenant_id, v_numero, v_comprador_id, v_vendedor_id, v_imovel_id, v_banco_id,
    v_corretor_id, v_responsavel_id, NULL, 'concluido', 'financiamento', 1365000,
    250000, NULL, v_corretor_id, '2026-02-01'
  ) returning id into v_processo_id;
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Simulação', v_responsavel_id, 'concluida', 1, '2026-02-01'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Cadastro', v_responsavel_id, 'concluida', 2, '2026-02-01'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Análise de Crédito', v_responsavel_id, 'concluida', 3, '2026-02-01'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Assinatura de Proposta', v_responsavel_id, 'concluida', 4, '2026-02-01'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Vistoria', v_responsavel_id, 'concluida', 5, '2026-02-01'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Conformidade', v_responsavel_id, 'concluida', 6, '2026-02-01'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Emissão de Contrato', v_responsavel_id, 'concluida', 7, '2026-02-01'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Emissão de ITBI', v_responsavel_id, 'concluida', 8, '2026-02-01'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Registro', v_responsavel_id, 'concluida', 9, '2026-02-01'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Liberação de Recursos', v_responsavel_id, 'concluida', 10, '2026-02-01'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, '100% Concluído', v_responsavel_id, 'concluida', 11, '2026-02-01'::date);
end $$;

-- ---- financiamento #4: Felipe Bastos ----
do $$
declare
  v_tenant_id uuid;
  v_responsavel_id uuid;
  v_processo_id uuid;
  v_comprador_id uuid;
  v_vendedor_id uuid;
  v_imovel_id uuid;
  v_banco_id uuid;
  v_corretor_id uuid;
  v_numero text;
begin
  select id into v_tenant_id from tenants limit 1;
  select id into v_responsavel_id from usuarios where email = 'plinio.sacraimoveis@gmail.com';
  v_numero := 'PROC-2026-IMP0004';
  v_comprador_id := tmp_resolver_cliente(v_tenant_id, 'Felipe Bastos');
  v_vendedor_id := null;
  v_imovel_id := tmp_resolver_imovel(v_tenant_id, 'Jales Machado 1104');
  v_banco_id := tmp_resolver_banco(v_tenant_id, 'Caixa');
  v_corretor_id := tmp_resolver_corretor(v_tenant_id, 'Maysa');
  insert into processos (
    tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, banco_id,
    corretor_id, responsavel_id, tipo, status, categoria, valor_total,
    valor_financiado, origem, indicacao_id, data_criacao
  ) values (
    v_tenant_id, v_numero, v_comprador_id, v_vendedor_id, v_imovel_id, v_banco_id,
    v_corretor_id, v_responsavel_id, 'SFH / SBPE', 'concluido', 'financiamento', 1070000,
    350000, 'SACRA', v_corretor_id, '2026-03-17'
  ) returning id into v_processo_id;
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Simulação', v_responsavel_id, 'concluida', 1, '2026-03-17'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Cadastro', v_responsavel_id, 'concluida', 2, '2026-03-17'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Análise de Crédito', v_responsavel_id, 'concluida', 3, '2026-03-17'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Assinatura de Proposta', v_responsavel_id, 'concluida', 4, '2026-03-17'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Vistoria', v_responsavel_id, 'concluida', 5, '2026-03-17'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Conformidade', v_responsavel_id, 'concluida', 6, '2026-03-17'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Emissão de Contrato', v_responsavel_id, 'concluida', 7, '2026-03-17'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Emissão de ITBI', v_responsavel_id, 'concluida', 8, '2026-03-17'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Registro', v_responsavel_id, 'concluida', 9, '2026-03-17'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Liberação de Recursos', v_responsavel_id, 'concluida', 10, '2026-03-17'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, '100% Concluído', v_responsavel_id, 'concluida', 11, '2026-03-17'::date);
end $$;

-- ---- financiamento #5: Alessandra Serrazes ----
do $$
declare
  v_tenant_id uuid;
  v_responsavel_id uuid;
  v_processo_id uuid;
  v_comprador_id uuid;
  v_vendedor_id uuid;
  v_imovel_id uuid;
  v_banco_id uuid;
  v_corretor_id uuid;
  v_numero text;
begin
  select id into v_tenant_id from tenants limit 1;
  select id into v_responsavel_id from usuarios where email = 'plinio.sacraimoveis@gmail.com';
  v_numero := 'PROC-2026-IMP0005';
  v_comprador_id := tmp_resolver_cliente(v_tenant_id, 'Alessandra Serrazes');
  v_vendedor_id := null;
  v_imovel_id := tmp_resolver_imovel(v_tenant_id, 'SQN 216');
  v_banco_id := tmp_resolver_banco(v_tenant_id, 'Caixa');
  v_corretor_id := tmp_resolver_corretor(v_tenant_id, 'Ricardo');
  insert into processos (
    tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, banco_id,
    corretor_id, responsavel_id, tipo, status, categoria, valor_total,
    valor_financiado, origem, indicacao_id, data_criacao
  ) values (
    v_tenant_id, v_numero, v_comprador_id, v_vendedor_id, v_imovel_id, v_banco_id,
    v_corretor_id, v_responsavel_id, NULL, 'cancelado', 'financiamento', NULL,
    NULL, NULL, v_corretor_id, '2026-06-01'
  ) returning id into v_processo_id;
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Simulação', v_responsavel_id, 'pendente', 1, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Cadastro', v_responsavel_id, 'pendente', 2, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Análise de Crédito', v_responsavel_id, 'pendente', 3, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Assinatura de Proposta', v_responsavel_id, 'pendente', 4, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Vistoria', v_responsavel_id, 'pendente', 5, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Conformidade', v_responsavel_id, 'pendente', 6, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Emissão de Contrato', v_responsavel_id, 'pendente', 7, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Emissão de ITBI', v_responsavel_id, 'pendente', 8, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Registro', v_responsavel_id, 'pendente', 9, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Liberação de Recursos', v_responsavel_id, 'pendente', 10, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, '100% Concluído', v_responsavel_id, 'pendente', 11, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem) values (v_processo_id, 'Desistência', v_responsavel_id, 'pendente', 12);
end $$;

-- ---- financiamento #6: Cristiane Gasparin ----
do $$
declare
  v_tenant_id uuid;
  v_responsavel_id uuid;
  v_processo_id uuid;
  v_comprador_id uuid;
  v_vendedor_id uuid;
  v_imovel_id uuid;
  v_banco_id uuid;
  v_corretor_id uuid;
  v_numero text;
begin
  select id into v_tenant_id from tenants limit 1;
  select id into v_responsavel_id from usuarios where email = 'plinio.sacraimoveis@gmail.com';
  v_numero := 'PROC-2026-IMP0006';
  v_comprador_id := tmp_resolver_cliente(v_tenant_id, 'Cristiane Gasparin');
  v_vendedor_id := null;
  v_imovel_id := tmp_resolver_imovel(v_tenant_id, 'Montana');
  v_banco_id := tmp_resolver_banco(v_tenant_id, 'Caixa');
  v_corretor_id := tmp_resolver_corretor(v_tenant_id, 'Michele');
  insert into processos (
    tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, banco_id,
    corretor_id, responsavel_id, tipo, status, categoria, valor_total,
    valor_financiado, origem, indicacao_id, data_criacao
  ) values (
    v_tenant_id, v_numero, v_comprador_id, v_vendedor_id, v_imovel_id, v_banco_id,
    v_corretor_id, v_responsavel_id, NULL, 'cancelado', 'financiamento', NULL,
    NULL, NULL, v_corretor_id, '2026-06-01'
  ) returning id into v_processo_id;
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Simulação', v_responsavel_id, 'pendente', 1, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Cadastro', v_responsavel_id, 'pendente', 2, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Análise de Crédito', v_responsavel_id, 'pendente', 3, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Assinatura de Proposta', v_responsavel_id, 'pendente', 4, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Vistoria', v_responsavel_id, 'pendente', 5, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Conformidade', v_responsavel_id, 'pendente', 6, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Emissão de Contrato', v_responsavel_id, 'pendente', 7, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Emissão de ITBI', v_responsavel_id, 'pendente', 8, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Registro', v_responsavel_id, 'pendente', 9, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Liberação de Recursos', v_responsavel_id, 'pendente', 10, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, '100% Concluído', v_responsavel_id, 'pendente', 11, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem) values (v_processo_id, 'Desistência', v_responsavel_id, 'pendente', 12);
end $$;

-- ---- financiamento #7: Eduardo Felix ----
do $$
declare
  v_tenant_id uuid;
  v_responsavel_id uuid;
  v_processo_id uuid;
  v_comprador_id uuid;
  v_vendedor_id uuid;
  v_imovel_id uuid;
  v_banco_id uuid;
  v_corretor_id uuid;
  v_numero text;
begin
  select id into v_tenant_id from tenants limit 1;
  select id into v_responsavel_id from usuarios where email = 'plinio.sacraimoveis@gmail.com';
  v_numero := 'PROC-2026-IMP0007';
  v_comprador_id := tmp_resolver_cliente(v_tenant_id, 'Eduardo Felix');
  v_vendedor_id := null;
  v_imovel_id := tmp_resolver_imovel(v_tenant_id, 'Montparnasse');
  v_banco_id := tmp_resolver_banco(v_tenant_id, 'Caixa');
  v_corretor_id := tmp_resolver_corretor(v_tenant_id, 'Maysa');
  insert into processos (
    tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, banco_id,
    corretor_id, responsavel_id, tipo, status, categoria, valor_total,
    valor_financiado, origem, indicacao_id, data_criacao
  ) values (
    v_tenant_id, v_numero, v_comprador_id, v_vendedor_id, v_imovel_id, v_banco_id,
    v_corretor_id, v_responsavel_id, 'SFH / SBPE', 'cancelado', 'financiamento', 613000,
    490400, 'SACRA', v_corretor_id, '2026-06-05'
  ) returning id into v_processo_id;
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Simulação', v_responsavel_id, 'pendente', 1, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Cadastro', v_responsavel_id, 'pendente', 2, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Análise de Crédito', v_responsavel_id, 'pendente', 3, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Assinatura de Proposta', v_responsavel_id, 'pendente', 4, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Vistoria', v_responsavel_id, 'pendente', 5, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Conformidade', v_responsavel_id, 'pendente', 6, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Emissão de Contrato', v_responsavel_id, 'pendente', 7, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Emissão de ITBI', v_responsavel_id, 'pendente', 8, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Registro', v_responsavel_id, 'pendente', 9, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Liberação de Recursos', v_responsavel_id, 'pendente', 10, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, '100% Concluído', v_responsavel_id, 'pendente', 11, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem) values (v_processo_id, 'Desistência', v_responsavel_id, 'pendente', 12);
end $$;

-- ---- financiamento #8: Henrique Tostes ----
do $$
declare
  v_tenant_id uuid;
  v_responsavel_id uuid;
  v_processo_id uuid;
  v_comprador_id uuid;
  v_vendedor_id uuid;
  v_imovel_id uuid;
  v_banco_id uuid;
  v_corretor_id uuid;
  v_numero text;
begin
  select id into v_tenant_id from tenants limit 1;
  select id into v_responsavel_id from usuarios where email = 'plinio.sacraimoveis@gmail.com';
  v_numero := 'PROC-2026-IMP0008';
  v_comprador_id := tmp_resolver_cliente(v_tenant_id, 'Henrique Tostes');
  v_vendedor_id := null;
  v_imovel_id := tmp_resolver_imovel(v_tenant_id, NULL);
  v_banco_id := tmp_resolver_banco(v_tenant_id, 'Itaú');
  v_corretor_id := tmp_resolver_corretor(v_tenant_id, 'Taciano');
  insert into processos (
    tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, banco_id,
    corretor_id, responsavel_id, tipo, status, categoria, valor_total,
    valor_financiado, origem, indicacao_id, data_criacao
  ) values (
    v_tenant_id, v_numero, v_comprador_id, v_vendedor_id, v_imovel_id, v_banco_id,
    v_corretor_id, v_responsavel_id, 'SFH / SBPE', 'cancelado', 'financiamento', 500000,
    391000, 'ELEVARE', v_corretor_id, '2026-06-19'
  ) returning id into v_processo_id;
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Simulação', v_responsavel_id, 'pendente', 1, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Cadastro', v_responsavel_id, 'pendente', 2, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Análise de Crédito', v_responsavel_id, 'pendente', 3, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Assinatura de Proposta', v_responsavel_id, 'pendente', 4, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Vistoria', v_responsavel_id, 'pendente', 5, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Conformidade', v_responsavel_id, 'pendente', 6, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Emissão de Contrato', v_responsavel_id, 'pendente', 7, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Emissão de ITBI', v_responsavel_id, 'pendente', 8, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Registro', v_responsavel_id, 'pendente', 9, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Liberação de Recursos', v_responsavel_id, 'pendente', 10, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, '100% Concluído', v_responsavel_id, 'pendente', 11, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem) values (v_processo_id, 'Desistência', v_responsavel_id, 'pendente', 12);
  insert into historico (processo_id, usuario_id, acao, detalhe) values (v_processo_id, v_responsavel_id, 'importado da planilha', jsonb_build_object('observacao', 'Pendência no SERASA'));
end $$;

-- ---- financiamento #9: Maria Eduarda e Ricardo ----
do $$
declare
  v_tenant_id uuid;
  v_responsavel_id uuid;
  v_processo_id uuid;
  v_comprador_id uuid;
  v_vendedor_id uuid;
  v_imovel_id uuid;
  v_banco_id uuid;
  v_corretor_id uuid;
  v_numero text;
begin
  select id into v_tenant_id from tenants limit 1;
  select id into v_responsavel_id from usuarios where email = 'plinio.sacraimoveis@gmail.com';
  v_numero := 'PROC-2026-IMP0009';
  v_comprador_id := tmp_resolver_cliente(v_tenant_id, 'Maria Eduarda e Ricardo');
  v_vendedor_id := null;
  v_imovel_id := tmp_resolver_imovel(v_tenant_id, NULL);
  v_banco_id := tmp_resolver_banco(v_tenant_id, 'Caixa');
  v_corretor_id := tmp_resolver_corretor(v_tenant_id, NULL);
  insert into processos (
    tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, banco_id,
    corretor_id, responsavel_id, tipo, status, categoria, valor_total,
    valor_financiado, origem, indicacao_id, data_criacao
  ) values (
    v_tenant_id, v_numero, v_comprador_id, v_vendedor_id, v_imovel_id, v_banco_id,
    v_corretor_id, v_responsavel_id, NULL, 'cancelado', 'financiamento', NULL,
    NULL, NULL, v_corretor_id, '2026-05-01'
  ) returning id into v_processo_id;
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Simulação', v_responsavel_id, 'pendente', 1, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Cadastro', v_responsavel_id, 'pendente', 2, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Análise de Crédito', v_responsavel_id, 'pendente', 3, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Assinatura de Proposta', v_responsavel_id, 'pendente', 4, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Vistoria', v_responsavel_id, 'pendente', 5, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Conformidade', v_responsavel_id, 'pendente', 6, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Emissão de Contrato', v_responsavel_id, 'pendente', 7, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Emissão de ITBI', v_responsavel_id, 'pendente', 8, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Registro', v_responsavel_id, 'pendente', 9, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Liberação de Recursos', v_responsavel_id, 'pendente', 10, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, '100% Concluído', v_responsavel_id, 'pendente', 11, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem) values (v_processo_id, 'Reprovado', v_responsavel_id, 'pendente', 12);
end $$;

-- ---- financiamento #10: Raiane Santos ----
do $$
declare
  v_tenant_id uuid;
  v_responsavel_id uuid;
  v_processo_id uuid;
  v_comprador_id uuid;
  v_vendedor_id uuid;
  v_imovel_id uuid;
  v_banco_id uuid;
  v_corretor_id uuid;
  v_numero text;
begin
  select id into v_tenant_id from tenants limit 1;
  select id into v_responsavel_id from usuarios where email = 'plinio.sacraimoveis@gmail.com';
  v_numero := 'PROC-2026-IMP0010';
  v_comprador_id := tmp_resolver_cliente(v_tenant_id, 'Raiane Santos');
  v_vendedor_id := null;
  v_imovel_id := tmp_resolver_imovel(v_tenant_id, NULL);
  v_banco_id := tmp_resolver_banco(v_tenant_id, 'Caixa');
  v_corretor_id := tmp_resolver_corretor(v_tenant_id, NULL);
  insert into processos (
    tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, banco_id,
    corretor_id, responsavel_id, tipo, status, categoria, valor_total,
    valor_financiado, origem, indicacao_id, data_criacao
  ) values (
    v_tenant_id, v_numero, v_comprador_id, v_vendedor_id, v_imovel_id, v_banco_id,
    v_corretor_id, v_responsavel_id, NULL, 'cancelado', 'financiamento', NULL,
    NULL, NULL, v_corretor_id, '2026-04-01'
  ) returning id into v_processo_id;
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Simulação', v_responsavel_id, 'pendente', 1, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Cadastro', v_responsavel_id, 'pendente', 2, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Análise de Crédito', v_responsavel_id, 'pendente', 3, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Assinatura de Proposta', v_responsavel_id, 'pendente', 4, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Vistoria', v_responsavel_id, 'pendente', 5, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Conformidade', v_responsavel_id, 'pendente', 6, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Emissão de Contrato', v_responsavel_id, 'pendente', 7, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Emissão de ITBI', v_responsavel_id, 'pendente', 8, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Registro', v_responsavel_id, 'pendente', 9, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Liberação de Recursos', v_responsavel_id, 'pendente', 10, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, '100% Concluído', v_responsavel_id, 'pendente', 11, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem) values (v_processo_id, 'Reprovado', v_responsavel_id, 'pendente', 12);
end $$;

-- ---- venda #11: Yves / Carla ----
do $$
declare
  v_tenant_id uuid;
  v_responsavel_id uuid;
  v_processo_id uuid;
  v_comprador_id uuid;
  v_vendedor_id uuid;
  v_imovel_id uuid;
  v_banco_id uuid;
  v_corretor_id uuid;
  v_numero text;
begin
  select id into v_tenant_id from tenants limit 1;
  select id into v_responsavel_id from usuarios where email = 'plinio.sacraimoveis@gmail.com';
  v_numero := 'PROC-2026-IMP0011';
  v_comprador_id := tmp_resolver_cliente(v_tenant_id, 'Yves / Carla');
  v_vendedor_id := tmp_resolver_cliente(v_tenant_id, 'Luiz Antonio / Juciene Serafim');
  v_imovel_id := tmp_resolver_imovel(v_tenant_id, 'Jardim das Oliveiras');
  v_banco_id := null;
  v_corretor_id := tmp_resolver_corretor(v_tenant_id, NULL);
  insert into processos (
    tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, banco_id,
    corretor_id, responsavel_id, tipo, status, categoria, valor_total,
    valor_financiado, origem, indicacao_id, data_criacao
  ) values (
    v_tenant_id, v_numero, v_comprador_id, v_vendedor_id, v_imovel_id, v_banco_id,
    v_corretor_id, v_responsavel_id, 'R.PRÓPRIOS', 'concluido', 'venda', 2600000,
    NULL, NULL, v_corretor_id, '2026-05-19'
  ) returning id into v_processo_id;
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Contrato Assinado', v_responsavel_id, 'concluida', 1, '2026-05-19'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Trâmites do Financiamento', v_responsavel_id, 'concluida', 2, '2026-05-19'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Trâmites do FGTS', v_responsavel_id, 'concluida', 3, '2026-05-19'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento Intermediária', v_responsavel_id, 'concluida', 4, '2026-05-19'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento Financiamento', v_responsavel_id, 'concluida', 5, '2026-05-19'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento FGTS', v_responsavel_id, 'concluida', 6, '2026-05-19'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Escritura', v_responsavel_id, 'concluida', 7, '2026-05-19'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Registro', v_responsavel_id, 'concluida', 8, '2026-05-19'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Aguardando Posse', v_responsavel_id, 'concluida', 9, '2026-05-19'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Transferência', v_responsavel_id, 'concluida', 10, '2026-05-19'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, '100% Concluído', v_responsavel_id, 'concluida', 11, '2026-05-19'::date);
  insert into comissoes (processo_id, beneficiario_id, valor_previsto, status) values (v_processo_id, v_corretor_id, 104000, '100% pago');
end $$;

-- ---- venda #12: Vinicius Santos / Sabrina Rios ----
do $$
declare
  v_tenant_id uuid;
  v_responsavel_id uuid;
  v_processo_id uuid;
  v_comprador_id uuid;
  v_vendedor_id uuid;
  v_imovel_id uuid;
  v_banco_id uuid;
  v_corretor_id uuid;
  v_numero text;
begin
  select id into v_tenant_id from tenants limit 1;
  select id into v_responsavel_id from usuarios where email = 'plinio.sacraimoveis@gmail.com';
  v_numero := 'PROC-2026-IMP0012';
  v_comprador_id := tmp_resolver_cliente(v_tenant_id, 'Vinicius Santos / Sabrina Rios');
  v_vendedor_id := tmp_resolver_cliente(v_tenant_id, 'Thiago Borges / Cristiane Porto');
  v_imovel_id := tmp_resolver_imovel(v_tenant_id, 'Spazio Brisas 504B');
  v_banco_id := null;
  v_corretor_id := tmp_resolver_corretor(v_tenant_id, NULL);
  insert into processos (
    tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, banco_id,
    corretor_id, responsavel_id, tipo, status, categoria, valor_total,
    valor_financiado, origem, indicacao_id, data_criacao
  ) values (
    v_tenant_id, v_numero, v_comprador_id, v_vendedor_id, v_imovel_id, v_banco_id,
    v_corretor_id, v_responsavel_id, 'R.PRÓPRIOS', 'concluido', 'venda', 740000,
    NULL, NULL, v_corretor_id, '2024-09-20'
  ) returning id into v_processo_id;
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Contrato Assinado', v_responsavel_id, 'concluida', 1, '2024-09-20'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Trâmites do Financiamento', v_responsavel_id, 'concluida', 2, '2024-09-20'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Trâmites do FGTS', v_responsavel_id, 'concluida', 3, '2024-09-20'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento Intermediária', v_responsavel_id, 'concluida', 4, '2024-09-20'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento Financiamento', v_responsavel_id, 'concluida', 5, '2024-09-20'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento FGTS', v_responsavel_id, 'concluida', 6, '2024-09-20'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Escritura', v_responsavel_id, 'concluida', 7, '2024-09-20'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Registro', v_responsavel_id, 'concluida', 8, '2024-09-20'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Aguardando Posse', v_responsavel_id, 'concluida', 9, '2024-09-20'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Transferência', v_responsavel_id, 'concluida', 10, '2024-09-20'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, '100% Concluído', v_responsavel_id, 'concluida', 11, '2024-09-20'::date);
  insert into historico (processo_id, usuario_id, acao, detalhe) values (v_processo_id, v_responsavel_id, 'importado da planilha', jsonb_build_object('observacao', 'Prazo registro 01/07/2026'));
  insert into comissoes (processo_id, beneficiario_id, valor_previsto, status) values (v_processo_id, v_corretor_id, 37000, '100% pago');
end $$;

-- ---- venda #13: Wellington Pinto ----
do $$
declare
  v_tenant_id uuid;
  v_responsavel_id uuid;
  v_processo_id uuid;
  v_comprador_id uuid;
  v_vendedor_id uuid;
  v_imovel_id uuid;
  v_banco_id uuid;
  v_corretor_id uuid;
  v_numero text;
begin
  select id into v_tenant_id from tenants limit 1;
  select id into v_responsavel_id from usuarios where email = 'plinio.sacraimoveis@gmail.com';
  v_numero := 'PROC-2026-IMP0013';
  v_comprador_id := tmp_resolver_cliente(v_tenant_id, 'Wellington Pinto');
  v_vendedor_id := tmp_resolver_cliente(v_tenant_id, 'Gustavo Leite');
  v_imovel_id := tmp_resolver_imovel(v_tenant_id, 'Res. Città 1107');
  v_banco_id := null;
  v_corretor_id := tmp_resolver_corretor(v_tenant_id, NULL);
  insert into processos (
    tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, banco_id,
    corretor_id, responsavel_id, tipo, status, categoria, valor_total,
    valor_financiado, origem, indicacao_id, data_criacao
  ) values (
    v_tenant_id, v_numero, v_comprador_id, v_vendedor_id, v_imovel_id, v_banco_id,
    v_corretor_id, v_responsavel_id, 'R.PRÓPRIOS, FINANCIAMENTO', 'concluido', 'venda', 310000,
    NULL, NULL, v_corretor_id, '2026-04-14'
  ) returning id into v_processo_id;
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Contrato Assinado', v_responsavel_id, 'concluida', 1, '2026-04-14'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Trâmites do Financiamento', v_responsavel_id, 'concluida', 2, '2026-04-14'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Trâmites do FGTS', v_responsavel_id, 'concluida', 3, '2026-04-14'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento Intermediária', v_responsavel_id, 'concluida', 4, '2026-04-14'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento Financiamento', v_responsavel_id, 'concluida', 5, '2026-04-14'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento FGTS', v_responsavel_id, 'concluida', 6, '2026-04-14'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Escritura', v_responsavel_id, 'concluida', 7, '2026-04-14'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Registro', v_responsavel_id, 'concluida', 8, '2026-04-14'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Aguardando Posse', v_responsavel_id, 'concluida', 9, '2026-04-14'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Transferência', v_responsavel_id, 'concluida', 10, '2026-04-14'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, '100% Concluído', v_responsavel_id, 'concluida', 11, '2026-04-14'::date);
  insert into comissoes (processo_id, beneficiario_id, valor_previsto, status) values (v_processo_id, v_corretor_id, 14000, '50% pago');
end $$;

-- ---- venda #14: Victor / Aline ----
do $$
declare
  v_tenant_id uuid;
  v_responsavel_id uuid;
  v_processo_id uuid;
  v_comprador_id uuid;
  v_vendedor_id uuid;
  v_imovel_id uuid;
  v_banco_id uuid;
  v_corretor_id uuid;
  v_numero text;
begin
  select id into v_tenant_id from tenants limit 1;
  select id into v_responsavel_id from usuarios where email = 'plinio.sacraimoveis@gmail.com';
  v_numero := 'PROC-2026-IMP0014';
  v_comprador_id := tmp_resolver_cliente(v_tenant_id, 'Victor / Aline');
  v_vendedor_id := tmp_resolver_cliente(v_tenant_id, 'Christiany');
  v_imovel_id := tmp_resolver_imovel(v_tenant_id, 'CLSW 504 Bl B Sl 111');
  v_banco_id := null;
  v_corretor_id := tmp_resolver_corretor(v_tenant_id, NULL);
  insert into processos (
    tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, banco_id,
    corretor_id, responsavel_id, tipo, status, categoria, valor_total,
    valor_financiado, origem, indicacao_id, data_criacao
  ) values (
    v_tenant_id, v_numero, v_comprador_id, v_vendedor_id, v_imovel_id, v_banco_id,
    v_corretor_id, v_responsavel_id, 'R.PRÓPRIOS', 'concluido', 'venda', 190000,
    NULL, NULL, v_corretor_id, '2026-05-13'
  ) returning id into v_processo_id;
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Contrato Assinado', v_responsavel_id, 'concluida', 1, '2026-05-13'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Trâmites do Financiamento', v_responsavel_id, 'concluida', 2, '2026-05-13'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Trâmites do FGTS', v_responsavel_id, 'concluida', 3, '2026-05-13'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento Intermediária', v_responsavel_id, 'concluida', 4, '2026-05-13'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento Financiamento', v_responsavel_id, 'concluida', 5, '2026-05-13'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento FGTS', v_responsavel_id, 'concluida', 6, '2026-05-13'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Escritura', v_responsavel_id, 'concluida', 7, '2026-05-13'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Registro', v_responsavel_id, 'concluida', 8, '2026-05-13'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Aguardando Posse', v_responsavel_id, 'concluida', 9, '2026-05-13'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Transferência', v_responsavel_id, 'concluida', 10, '2026-05-13'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, '100% Concluído', v_responsavel_id, 'concluida', 11, '2026-05-13'::date);
  insert into comissoes (processo_id, beneficiario_id, valor_previsto, status) values (v_processo_id, v_corretor_id, 9500, '100% pago');
end $$;

-- ---- venda #15: Luis Fernando / Rosimere ----
do $$
declare
  v_tenant_id uuid;
  v_responsavel_id uuid;
  v_processo_id uuid;
  v_comprador_id uuid;
  v_vendedor_id uuid;
  v_imovel_id uuid;
  v_banco_id uuid;
  v_corretor_id uuid;
  v_numero text;
begin
  select id into v_tenant_id from tenants limit 1;
  select id into v_responsavel_id from usuarios where email = 'plinio.sacraimoveis@gmail.com';
  v_numero := 'PROC-2026-IMP0015';
  v_comprador_id := tmp_resolver_cliente(v_tenant_id, 'Luis Fernando / Rosimere');
  v_vendedor_id := tmp_resolver_cliente(v_tenant_id, 'Orlei Seabra');
  v_imovel_id := tmp_resolver_imovel(v_tenant_id, 'Via Turim 607');
  v_banco_id := null;
  v_corretor_id := tmp_resolver_corretor(v_tenant_id, NULL);
  insert into processos (
    tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, banco_id,
    corretor_id, responsavel_id, tipo, status, categoria, valor_total,
    valor_financiado, origem, indicacao_id, data_criacao
  ) values (
    v_tenant_id, v_numero, v_comprador_id, v_vendedor_id, v_imovel_id, v_banco_id,
    v_corretor_id, v_responsavel_id, 'R.PRÓPRIOS, FINANCIAMENTO', 'concluido', 'venda', 360000,
    NULL, NULL, v_corretor_id, '2026-05-25'
  ) returning id into v_processo_id;
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Contrato Assinado', v_responsavel_id, 'concluida', 1, '2026-05-25'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Trâmites do Financiamento', v_responsavel_id, 'concluida', 2, '2026-05-25'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Trâmites do FGTS', v_responsavel_id, 'concluida', 3, '2026-05-25'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento Intermediária', v_responsavel_id, 'concluida', 4, '2026-05-25'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento Financiamento', v_responsavel_id, 'concluida', 5, '2026-05-25'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento FGTS', v_responsavel_id, 'concluida', 6, '2026-05-25'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Escritura', v_responsavel_id, 'concluida', 7, '2026-05-25'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Registro', v_responsavel_id, 'concluida', 8, '2026-05-25'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Aguardando Posse', v_responsavel_id, 'concluida', 9, '2026-05-25'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Transferência', v_responsavel_id, 'concluida', 10, '2026-05-25'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, '100% Concluído', v_responsavel_id, 'concluida', 11, '2026-05-25'::date);
  insert into comissoes (processo_id, beneficiario_id, valor_previsto, status) values (v_processo_id, v_corretor_id, 14400, '100% pago');
end $$;

-- ---- venda #16: Ricardo Valeriano Gomes Lopes ----
do $$
declare
  v_tenant_id uuid;
  v_responsavel_id uuid;
  v_processo_id uuid;
  v_comprador_id uuid;
  v_vendedor_id uuid;
  v_imovel_id uuid;
  v_banco_id uuid;
  v_corretor_id uuid;
  v_numero text;
begin
  select id into v_tenant_id from tenants limit 1;
  select id into v_responsavel_id from usuarios where email = 'plinio.sacraimoveis@gmail.com';
  v_numero := 'PROC-2026-IMP0016';
  v_comprador_id := tmp_resolver_cliente(v_tenant_id, 'Ricardo Valeriano Gomes Lopes');
  v_vendedor_id := tmp_resolver_cliente(v_tenant_id, 'Wmarlei / Antonia Camila');
  v_imovel_id := tmp_resolver_imovel(v_tenant_id, 'Graúna 901');
  v_banco_id := null;
  v_corretor_id := tmp_resolver_corretor(v_tenant_id, NULL);
  insert into processos (
    tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, banco_id,
    corretor_id, responsavel_id, tipo, status, categoria, valor_total,
    valor_financiado, origem, indicacao_id, data_criacao
  ) values (
    v_tenant_id, v_numero, v_comprador_id, v_vendedor_id, v_imovel_id, v_banco_id,
    v_corretor_id, v_responsavel_id, 'R.PRÓPRIOS, FGTS', 'concluido', 'venda', 1290000,
    NULL, NULL, v_corretor_id, '2026-03-03'
  ) returning id into v_processo_id;
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Contrato Assinado', v_responsavel_id, 'concluida', 1, '2026-03-03'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Trâmites do Financiamento', v_responsavel_id, 'concluida', 2, '2026-03-03'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Trâmites do FGTS', v_responsavel_id, 'concluida', 3, '2026-03-03'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento Intermediária', v_responsavel_id, 'concluida', 4, '2026-03-03'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento Financiamento', v_responsavel_id, 'concluida', 5, '2026-03-03'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento FGTS', v_responsavel_id, 'concluida', 6, '2026-03-03'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Escritura', v_responsavel_id, 'concluida', 7, '2026-03-03'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Registro', v_responsavel_id, 'concluida', 8, '2026-03-03'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Aguardando Posse', v_responsavel_id, 'concluida', 9, '2026-03-03'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Transferência', v_responsavel_id, 'concluida', 10, '2026-03-03'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, '100% Concluído', v_responsavel_id, 'concluida', 11, '2026-03-03'::date);
  insert into comissoes (processo_id, beneficiario_id, valor_previsto, status) values (v_processo_id, v_corretor_id, 40000, '100% pago');
end $$;

-- ---- venda #17: Daniel ----
do $$
declare
  v_tenant_id uuid;
  v_responsavel_id uuid;
  v_processo_id uuid;
  v_comprador_id uuid;
  v_vendedor_id uuid;
  v_imovel_id uuid;
  v_banco_id uuid;
  v_corretor_id uuid;
  v_numero text;
begin
  select id into v_tenant_id from tenants limit 1;
  select id into v_responsavel_id from usuarios where email = 'plinio.sacraimoveis@gmail.com';
  v_numero := 'PROC-2026-IMP0017';
  v_comprador_id := tmp_resolver_cliente(v_tenant_id, 'Daniel');
  v_vendedor_id := tmp_resolver_cliente(v_tenant_id, 'Larissa');
  v_imovel_id := tmp_resolver_imovel(v_tenant_id, 'Centro C. Park Way');
  v_banco_id := null;
  v_corretor_id := tmp_resolver_corretor(v_tenant_id, NULL);
  insert into processos (
    tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, banco_id,
    corretor_id, responsavel_id, tipo, status, categoria, valor_total,
    valor_financiado, origem, indicacao_id, data_criacao
  ) values (
    v_tenant_id, v_numero, v_comprador_id, v_vendedor_id, v_imovel_id, v_banco_id,
    v_corretor_id, v_responsavel_id, 'R.PRÓPRIOS', 'concluido', 'venda', 220000,
    NULL, NULL, v_corretor_id, '2026-07-15'
  ) returning id into v_processo_id;
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Contrato Assinado', v_responsavel_id, 'concluida', 1, '2026-07-15'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Trâmites do Financiamento', v_responsavel_id, 'concluida', 2, '2026-07-15'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Trâmites do FGTS', v_responsavel_id, 'concluida', 3, '2026-07-15'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento Intermediária', v_responsavel_id, 'concluida', 4, '2026-07-15'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento Financiamento', v_responsavel_id, 'concluida', 5, '2026-07-15'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento FGTS', v_responsavel_id, 'concluida', 6, '2026-07-15'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Escritura', v_responsavel_id, 'concluida', 7, '2026-07-15'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Registro', v_responsavel_id, 'concluida', 8, '2026-07-15'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Aguardando Posse', v_responsavel_id, 'concluida', 9, '2026-07-15'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Transferência', v_responsavel_id, 'concluida', 10, '2026-07-15'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, '100% Concluído', v_responsavel_id, 'concluida', 11, '2026-07-15'::date);
  insert into comissoes (processo_id, beneficiario_id, valor_previsto, status) values (v_processo_id, v_corretor_id, 8800, '100% pago');
end $$;

-- ---- venda #18: Marcelo / Lilliane ----
do $$
declare
  v_tenant_id uuid;
  v_responsavel_id uuid;
  v_processo_id uuid;
  v_comprador_id uuid;
  v_vendedor_id uuid;
  v_imovel_id uuid;
  v_banco_id uuid;
  v_corretor_id uuid;
  v_numero text;
begin
  select id into v_tenant_id from tenants limit 1;
  select id into v_responsavel_id from usuarios where email = 'plinio.sacraimoveis@gmail.com';
  v_numero := 'PROC-2026-IMP0018';
  v_comprador_id := tmp_resolver_cliente(v_tenant_id, 'Marcelo / Lilliane');
  v_vendedor_id := tmp_resolver_cliente(v_tenant_id, 'Ana Maria');
  v_imovel_id := tmp_resolver_imovel(v_tenant_id, 'Residencial Pinheiros');
  v_banco_id := null;
  v_corretor_id := tmp_resolver_corretor(v_tenant_id, NULL);
  insert into processos (
    tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, banco_id,
    corretor_id, responsavel_id, tipo, status, categoria, valor_total,
    valor_financiado, origem, indicacao_id, data_criacao
  ) values (
    v_tenant_id, v_numero, v_comprador_id, v_vendedor_id, v_imovel_id, v_banco_id,
    v_corretor_id, v_responsavel_id, 'R.PRÓPRIOS', 'concluido', 'venda', 860000,
    NULL, NULL, v_corretor_id, '2026-07-21'
  ) returning id into v_processo_id;
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Contrato Assinado', v_responsavel_id, 'concluida', 1, '2026-07-21'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Trâmites do Financiamento', v_responsavel_id, 'concluida', 2, '2026-07-21'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Trâmites do FGTS', v_responsavel_id, 'concluida', 3, '2026-07-21'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento Intermediária', v_responsavel_id, 'concluida', 4, '2026-07-21'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento Financiamento', v_responsavel_id, 'concluida', 5, '2026-07-21'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento FGTS', v_responsavel_id, 'concluida', 6, '2026-07-21'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Escritura', v_responsavel_id, 'concluida', 7, '2026-07-21'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Registro', v_responsavel_id, 'concluida', 8, '2026-07-21'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Aguardando Posse', v_responsavel_id, 'concluida', 9, '2026-07-21'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Transferência', v_responsavel_id, 'concluida', 10, '2026-07-21'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, '100% Concluído', v_responsavel_id, 'concluida', 11, '2026-07-21'::date);
  insert into comissoes (processo_id, beneficiario_id, valor_previsto, status) values (v_processo_id, v_corretor_id, 43000, '100% pago');
end $$;

-- ---- venda #19: Vicente / Maria ----
do $$
declare
  v_tenant_id uuid;
  v_responsavel_id uuid;
  v_processo_id uuid;
  v_comprador_id uuid;
  v_vendedor_id uuid;
  v_imovel_id uuid;
  v_banco_id uuid;
  v_corretor_id uuid;
  v_numero text;
begin
  select id into v_tenant_id from tenants limit 1;
  select id into v_responsavel_id from usuarios where email = 'plinio.sacraimoveis@gmail.com';
  v_numero := 'PROC-2026-IMP0019';
  v_comprador_id := tmp_resolver_cliente(v_tenant_id, 'Vicente / Maria');
  v_vendedor_id := tmp_resolver_cliente(v_tenant_id, 'Emerson');
  v_imovel_id := tmp_resolver_imovel(v_tenant_id, 'Casa Park Way');
  v_banco_id := null;
  v_corretor_id := tmp_resolver_corretor(v_tenant_id, NULL);
  insert into processos (
    tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, banco_id,
    corretor_id, responsavel_id, tipo, status, categoria, valor_total,
    valor_financiado, origem, indicacao_id, data_criacao
  ) values (
    v_tenant_id, v_numero, v_comprador_id, v_vendedor_id, v_imovel_id, v_banco_id,
    v_corretor_id, v_responsavel_id, 'R.PRÓPRIOS', 'concluido', 'venda', 1200000,
    NULL, NULL, v_corretor_id, '2026-07-10'
  ) returning id into v_processo_id;
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Contrato Assinado', v_responsavel_id, 'concluida', 1, '2026-07-10'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Trâmites do Financiamento', v_responsavel_id, 'concluida', 2, '2026-07-10'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Trâmites do FGTS', v_responsavel_id, 'concluida', 3, '2026-07-10'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento Intermediária', v_responsavel_id, 'concluida', 4, '2026-07-10'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento Financiamento', v_responsavel_id, 'concluida', 5, '2026-07-10'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento FGTS', v_responsavel_id, 'concluida', 6, '2026-07-10'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Escritura', v_responsavel_id, 'concluida', 7, '2026-07-10'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Registro', v_responsavel_id, 'concluida', 8, '2026-07-10'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Aguardando Posse', v_responsavel_id, 'concluida', 9, '2026-07-10'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Transferência', v_responsavel_id, 'concluida', 10, '2026-07-10'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, '100% Concluído', v_responsavel_id, 'concluida', 11, '2026-07-10'::date);
  insert into historico (processo_id, usuario_id, acao, detalhe) values (v_processo_id, v_responsavel_id, 'importado da planilha', jsonb_build_object('observacao', 'Permuta por dois imóveis'));
  insert into comissoes (processo_id, beneficiario_id, valor_previsto, status) values (v_processo_id, v_corretor_id, 42000, '100% pago');
end $$;

-- ---- venda #20: Flavio ----
do $$
declare
  v_tenant_id uuid;
  v_responsavel_id uuid;
  v_processo_id uuid;
  v_comprador_id uuid;
  v_vendedor_id uuid;
  v_imovel_id uuid;
  v_banco_id uuid;
  v_corretor_id uuid;
  v_numero text;
begin
  select id into v_tenant_id from tenants limit 1;
  select id into v_responsavel_id from usuarios where email = 'plinio.sacraimoveis@gmail.com';
  v_numero := 'PROC-2026-IMP0020';
  v_comprador_id := tmp_resolver_cliente(v_tenant_id, 'Flavio');
  v_vendedor_id := tmp_resolver_cliente(v_tenant_id, 'Petulia');
  v_imovel_id := tmp_resolver_imovel(v_tenant_id, 'Via Palácio do Sol 603');
  v_banco_id := null;
  v_corretor_id := tmp_resolver_corretor(v_tenant_id, NULL);
  insert into processos (
    tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, banco_id,
    corretor_id, responsavel_id, tipo, status, categoria, valor_total,
    valor_financiado, origem, indicacao_id, data_criacao
  ) values (
    v_tenant_id, v_numero, v_comprador_id, v_vendedor_id, v_imovel_id, v_banco_id,
    v_corretor_id, v_responsavel_id, 'N/A, R.PRÓPRIOS', 'concluido', 'venda', 1130000,
    NULL, NULL, v_corretor_id, '2026-03-26'
  ) returning id into v_processo_id;
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Contrato Assinado', v_responsavel_id, 'concluida', 1, '2026-03-26'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Trâmites do Financiamento', v_responsavel_id, 'concluida', 2, '2026-03-26'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Trâmites do FGTS', v_responsavel_id, 'concluida', 3, '2026-03-26'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento Intermediária', v_responsavel_id, 'concluida', 4, '2026-03-26'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento Financiamento', v_responsavel_id, 'concluida', 5, '2026-03-26'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento FGTS', v_responsavel_id, 'concluida', 6, '2026-03-26'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Escritura', v_responsavel_id, 'concluida', 7, '2026-03-26'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Registro', v_responsavel_id, 'concluida', 8, '2026-03-26'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Aguardando Posse', v_responsavel_id, 'concluida', 9, '2026-03-26'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Transferência', v_responsavel_id, 'concluida', 10, '2026-03-26'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, '100% Concluído', v_responsavel_id, 'concluida', 11, '2026-03-26'::date);
  insert into comissoes (processo_id, beneficiario_id, valor_previsto, status) values (v_processo_id, v_corretor_id, 39550, '100% pago');
end $$;

-- ---- venda #21: Felipe Gonçalves / Larissa ----
do $$
declare
  v_tenant_id uuid;
  v_responsavel_id uuid;
  v_processo_id uuid;
  v_comprador_id uuid;
  v_vendedor_id uuid;
  v_imovel_id uuid;
  v_banco_id uuid;
  v_corretor_id uuid;
  v_numero text;
begin
  select id into v_tenant_id from tenants limit 1;
  select id into v_responsavel_id from usuarios where email = 'plinio.sacraimoveis@gmail.com';
  v_numero := 'PROC-2026-IMP0021';
  v_comprador_id := tmp_resolver_cliente(v_tenant_id, 'Felipe Gonçalves / Larissa');
  v_vendedor_id := tmp_resolver_cliente(v_tenant_id, 'Marilene Xavier');
  v_imovel_id := tmp_resolver_imovel(v_tenant_id, 'Jales Machado 1104');
  v_banco_id := null;
  v_corretor_id := tmp_resolver_corretor(v_tenant_id, NULL);
  insert into processos (
    tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, banco_id,
    corretor_id, responsavel_id, tipo, status, categoria, valor_total,
    valor_financiado, origem, indicacao_id, data_criacao
  ) values (
    v_tenant_id, v_numero, v_comprador_id, v_vendedor_id, v_imovel_id, v_banco_id,
    v_corretor_id, v_responsavel_id, 'R.PRÓPRIOS, FINANCIAMENTO', 'concluido', 'venda', 1070000,
    NULL, NULL, v_corretor_id, '2026-03-17'
  ) returning id into v_processo_id;
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Contrato Assinado', v_responsavel_id, 'concluida', 1, '2026-03-17'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Trâmites do Financiamento', v_responsavel_id, 'concluida', 2, '2026-03-17'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Trâmites do FGTS', v_responsavel_id, 'concluida', 3, '2026-03-17'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento Intermediária', v_responsavel_id, 'concluida', 4, '2026-03-17'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento Financiamento', v_responsavel_id, 'concluida', 5, '2026-03-17'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento FGTS', v_responsavel_id, 'concluida', 6, '2026-03-17'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Escritura', v_responsavel_id, 'concluida', 7, '2026-03-17'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Registro', v_responsavel_id, 'concluida', 8, '2026-03-17'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Aguardando Posse', v_responsavel_id, 'concluida', 9, '2026-03-17'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Transferência', v_responsavel_id, 'concluida', 10, '2026-03-17'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, '100% Concluído', v_responsavel_id, 'concluida', 11, '2026-03-17'::date);
  insert into comissoes (processo_id, beneficiario_id, valor_previsto, status) values (v_processo_id, v_corretor_id, 42800, '100% pago');
end $$;

-- ---- venda #22: Arthur Magno / Amanda Leal ----
do $$
declare
  v_tenant_id uuid;
  v_responsavel_id uuid;
  v_processo_id uuid;
  v_comprador_id uuid;
  v_vendedor_id uuid;
  v_imovel_id uuid;
  v_banco_id uuid;
  v_corretor_id uuid;
  v_numero text;
begin
  select id into v_tenant_id from tenants limit 1;
  select id into v_responsavel_id from usuarios where email = 'plinio.sacraimoveis@gmail.com';
  v_numero := 'PROC-2026-IMP0022';
  v_comprador_id := tmp_resolver_cliente(v_tenant_id, 'Arthur Magno / Amanda Leal');
  v_vendedor_id := tmp_resolver_cliente(v_tenant_id, 'Ernesto Takahara');
  v_imovel_id := tmp_resolver_imovel(v_tenant_id, 'Bouganville 401');
  v_banco_id := null;
  v_corretor_id := tmp_resolver_corretor(v_tenant_id, NULL);
  insert into processos (
    tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, banco_id,
    corretor_id, responsavel_id, tipo, status, categoria, valor_total,
    valor_financiado, origem, indicacao_id, data_criacao
  ) values (
    v_tenant_id, v_numero, v_comprador_id, v_vendedor_id, v_imovel_id, v_banco_id,
    v_corretor_id, v_responsavel_id, 'R.PRÓPRIOS', 'ativo', 'venda', 345000,
    NULL, NULL, v_corretor_id, '2025-01-16'
  ) returning id into v_processo_id;
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Contrato Assinado', v_responsavel_id, 'pendente', 1, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Trâmites do Financiamento', v_responsavel_id, 'pendente', 2, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Trâmites do FGTS', v_responsavel_id, 'pendente', 3, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento Intermediária', v_responsavel_id, 'pendente', 4, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento Financiamento', v_responsavel_id, 'pendente', 5, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento FGTS', v_responsavel_id, 'pendente', 6, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Escritura', v_responsavel_id, 'pendente', 7, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Registro', v_responsavel_id, 'pendente', 8, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Aguardando Posse', v_responsavel_id, 'pendente', 9, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Transferência', v_responsavel_id, 'pendente', 10, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, '100% Concluído', v_responsavel_id, 'pendente', 11, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem) values (v_processo_id, 'Em Processo Judicial', v_responsavel_id, 'pendente', 12);
  insert into historico (processo_id, usuario_id, acao, detalhe) values (v_processo_id, v_responsavel_id, 'importado da planilha', jsonb_build_object('observacao', 'Multa por atraso de pgto.'));
  insert into comissoes (processo_id, beneficiario_id, valor_previsto, status) values (v_processo_id, v_corretor_id, 17250, '100% pago');
end $$;

-- ---- venda #23: Mirela Kapleta ----
do $$
declare
  v_tenant_id uuid;
  v_responsavel_id uuid;
  v_processo_id uuid;
  v_comprador_id uuid;
  v_vendedor_id uuid;
  v_imovel_id uuid;
  v_banco_id uuid;
  v_corretor_id uuid;
  v_numero text;
begin
  select id into v_tenant_id from tenants limit 1;
  select id into v_responsavel_id from usuarios where email = 'plinio.sacraimoveis@gmail.com';
  v_numero := 'PROC-2026-IMP0023';
  v_comprador_id := tmp_resolver_cliente(v_tenant_id, 'Mirela Kapleta');
  v_vendedor_id := tmp_resolver_cliente(v_tenant_id, 'Suelute Gomes');
  v_imovel_id := tmp_resolver_imovel(v_tenant_id, 'Oasis 1802A');
  v_banco_id := null;
  v_corretor_id := tmp_resolver_corretor(v_tenant_id, NULL);
  insert into processos (
    tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, banco_id,
    corretor_id, responsavel_id, tipo, status, categoria, valor_total,
    valor_financiado, origem, indicacao_id, data_criacao
  ) values (
    v_tenant_id, v_numero, v_comprador_id, v_vendedor_id, v_imovel_id, v_banco_id,
    v_corretor_id, v_responsavel_id, 'R.PRÓPRIOS', 'ativo', 'venda', 1600000,
    NULL, NULL, v_corretor_id, '2026-06-02'
  ) returning id into v_processo_id;
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Contrato Assinado', v_responsavel_id, 'pendente', 1, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Trâmites do Financiamento', v_responsavel_id, 'pendente', 2, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Trâmites do FGTS', v_responsavel_id, 'pendente', 3, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento Intermediária', v_responsavel_id, 'pendente', 4, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento Financiamento', v_responsavel_id, 'pendente', 5, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento FGTS', v_responsavel_id, 'pendente', 6, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Escritura', v_responsavel_id, 'pendente', 7, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Registro', v_responsavel_id, 'pendente', 8, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Aguardando Posse', v_responsavel_id, 'pendente', 9, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Transferência', v_responsavel_id, 'pendente', 10, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, '100% Concluído', v_responsavel_id, 'pendente', 11, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem) values (v_processo_id, 'Em Acordo/Aditivo', v_responsavel_id, 'pendente', 12);
  insert into historico (processo_id, usuario_id, acao, detalhe) values (v_processo_id, v_responsavel_id, 'importado da planilha', jsonb_build_object('observacao', 'Aditivo em andamento'));
  insert into comissoes (processo_id, beneficiario_id, valor_previsto, status) values (v_processo_id, v_corretor_id, 56000, '100% pago');
end $$;

-- ---- venda #24: Cristiano / Tatiane ----
do $$
declare
  v_tenant_id uuid;
  v_responsavel_id uuid;
  v_processo_id uuid;
  v_comprador_id uuid;
  v_vendedor_id uuid;
  v_imovel_id uuid;
  v_banco_id uuid;
  v_corretor_id uuid;
  v_numero text;
begin
  select id into v_tenant_id from tenants limit 1;
  select id into v_responsavel_id from usuarios where email = 'plinio.sacraimoveis@gmail.com';
  v_numero := 'PROC-2026-IMP0024';
  v_comprador_id := tmp_resolver_cliente(v_tenant_id, 'Cristiano / Tatiane');
  v_vendedor_id := tmp_resolver_cliente(v_tenant_id, 'Talita Sousa');
  v_imovel_id := tmp_resolver_imovel(v_tenant_id, 'Bella Vida 307B');
  v_banco_id := null;
  v_corretor_id := tmp_resolver_corretor(v_tenant_id, NULL);
  insert into processos (
    tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, banco_id,
    corretor_id, responsavel_id, tipo, status, categoria, valor_total,
    valor_financiado, origem, indicacao_id, data_criacao
  ) values (
    v_tenant_id, v_numero, v_comprador_id, v_vendedor_id, v_imovel_id, v_banco_id,
    v_corretor_id, v_responsavel_id, 'R.PRÓPRIOS, FINANCIAMENTO', 'ativo', 'venda', 445000,
    NULL, NULL, v_corretor_id, '2026-06-19'
  ) returning id into v_processo_id;
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Contrato Assinado', v_responsavel_id, 'concluida', 1, '2026-06-19'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Trâmites do Financiamento', v_responsavel_id, 'pendente', 2, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Trâmites do FGTS', v_responsavel_id, 'pendente', 3, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento Intermediária', v_responsavel_id, 'pendente', 4, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento Financiamento', v_responsavel_id, 'pendente', 5, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento FGTS', v_responsavel_id, 'pendente', 6, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Escritura', v_responsavel_id, 'pendente', 7, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Registro', v_responsavel_id, 'pendente', 8, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Aguardando Posse', v_responsavel_id, 'pendente', 9, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Transferência', v_responsavel_id, 'pendente', 10, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, '100% Concluído', v_responsavel_id, 'pendente', 11, null);
  insert into comissoes (processo_id, beneficiario_id, valor_previsto, status) values (v_processo_id, v_corretor_id, 15000, '0% pago');
end $$;

-- ---- venda #25: Elson ----
do $$
declare
  v_tenant_id uuid;
  v_responsavel_id uuid;
  v_processo_id uuid;
  v_comprador_id uuid;
  v_vendedor_id uuid;
  v_imovel_id uuid;
  v_banco_id uuid;
  v_corretor_id uuid;
  v_numero text;
begin
  select id into v_tenant_id from tenants limit 1;
  select id into v_responsavel_id from usuarios where email = 'plinio.sacraimoveis@gmail.com';
  v_numero := 'PROC-2026-IMP0025';
  v_comprador_id := tmp_resolver_cliente(v_tenant_id, 'Elson');
  v_vendedor_id := tmp_resolver_cliente(v_tenant_id, 'Péricles');
  v_imovel_id := tmp_resolver_imovel(v_tenant_id, 'QI 10 Bloco T Apto 214');
  v_banco_id := null;
  v_corretor_id := tmp_resolver_corretor(v_tenant_id, NULL);
  insert into processos (
    tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, banco_id,
    corretor_id, responsavel_id, tipo, status, categoria, valor_total,
    valor_financiado, origem, indicacao_id, data_criacao
  ) values (
    v_tenant_id, v_numero, v_comprador_id, v_vendedor_id, v_imovel_id, v_banco_id,
    v_corretor_id, v_responsavel_id, 'R.PRÓPRIOS, FINANCIAMENTO, FGTS', 'ativo', 'venda', 425600,
    NULL, NULL, v_corretor_id, '2026-06-22'
  ) returning id into v_processo_id;
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Contrato Assinado', v_responsavel_id, 'concluida', 1, '2026-06-22'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Trâmites do Financiamento', v_responsavel_id, 'pendente', 2, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Trâmites do FGTS', v_responsavel_id, 'pendente', 3, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento Intermediária', v_responsavel_id, 'pendente', 4, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento Financiamento', v_responsavel_id, 'pendente', 5, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento FGTS', v_responsavel_id, 'pendente', 6, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Escritura', v_responsavel_id, 'pendente', 7, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Registro', v_responsavel_id, 'pendente', 8, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Aguardando Posse', v_responsavel_id, 'pendente', 9, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Transferência', v_responsavel_id, 'pendente', 10, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, '100% Concluído', v_responsavel_id, 'pendente', 11, null);
  insert into comissoes (processo_id, beneficiario_id, valor_previsto, status) values (v_processo_id, v_corretor_id, 17024, '100% pago');
end $$;

-- ---- venda #26: Patricia e Mozart ----
do $$
declare
  v_tenant_id uuid;
  v_responsavel_id uuid;
  v_processo_id uuid;
  v_comprador_id uuid;
  v_vendedor_id uuid;
  v_imovel_id uuid;
  v_banco_id uuid;
  v_corretor_id uuid;
  v_numero text;
begin
  select id into v_tenant_id from tenants limit 1;
  select id into v_responsavel_id from usuarios where email = 'plinio.sacraimoveis@gmail.com';
  v_numero := 'PROC-2026-IMP0026';
  v_comprador_id := tmp_resolver_cliente(v_tenant_id, 'Patricia e Mozart');
  v_vendedor_id := tmp_resolver_cliente(v_tenant_id, 'Cícero e Elis');
  v_imovel_id := tmp_resolver_imovel(v_tenant_id, 'Casa Remanso');
  v_banco_id := null;
  v_corretor_id := tmp_resolver_corretor(v_tenant_id, NULL);
  insert into processos (
    tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, banco_id,
    corretor_id, responsavel_id, tipo, status, categoria, valor_total,
    valor_financiado, origem, indicacao_id, data_criacao
  ) values (
    v_tenant_id, v_numero, v_comprador_id, v_vendedor_id, v_imovel_id, v_banco_id,
    v_corretor_id, v_responsavel_id, 'R.PRÓPRIOS', 'ativo', 'venda', 1400000,
    NULL, NULL, v_corretor_id, '2026-06-22'
  ) returning id into v_processo_id;
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Contrato Assinado', v_responsavel_id, 'concluida', 1, '2026-06-22'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Trâmites do Financiamento', v_responsavel_id, 'concluida', 2, '2026-06-22'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Trâmites do FGTS', v_responsavel_id, 'concluida', 3, '2026-06-22'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento Intermediária', v_responsavel_id, 'pendente', 4, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento Financiamento', v_responsavel_id, 'pendente', 5, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento FGTS', v_responsavel_id, 'pendente', 6, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Escritura', v_responsavel_id, 'pendente', 7, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Registro', v_responsavel_id, 'pendente', 8, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Aguardando Posse', v_responsavel_id, 'pendente', 9, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Transferência', v_responsavel_id, 'pendente', 10, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, '100% Concluído', v_responsavel_id, 'pendente', 11, null);
  insert into comissoes (processo_id, beneficiario_id, valor_previsto, status) values (v_processo_id, v_corretor_id, 56000, '100% pago');
end $$;

-- ---- venda #27: Cícero e Elis ----
do $$
declare
  v_tenant_id uuid;
  v_responsavel_id uuid;
  v_processo_id uuid;
  v_comprador_id uuid;
  v_vendedor_id uuid;
  v_imovel_id uuid;
  v_banco_id uuid;
  v_corretor_id uuid;
  v_numero text;
begin
  select id into v_tenant_id from tenants limit 1;
  select id into v_responsavel_id from usuarios where email = 'plinio.sacraimoveis@gmail.com';
  v_numero := 'PROC-2026-IMP0027';
  v_comprador_id := tmp_resolver_cliente(v_tenant_id, 'Cícero e Elis');
  v_vendedor_id := tmp_resolver_cliente(v_tenant_id, 'Mark');
  v_imovel_id := tmp_resolver_imovel(v_tenant_id, 'Via Majestic');
  v_banco_id := null;
  v_corretor_id := tmp_resolver_corretor(v_tenant_id, NULL);
  insert into processos (
    tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, banco_id,
    corretor_id, responsavel_id, tipo, status, categoria, valor_total,
    valor_financiado, origem, indicacao_id, data_criacao
  ) values (
    v_tenant_id, v_numero, v_comprador_id, v_vendedor_id, v_imovel_id, v_banco_id,
    v_corretor_id, v_responsavel_id, 'R.PRÓPRIOS, FINANCIAMENTO', 'ativo', 'venda', 1460000,
    NULL, NULL, v_corretor_id, '2026-06-23'
  ) returning id into v_processo_id;
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Contrato Assinado', v_responsavel_id, 'concluida', 1, '2026-06-23'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Trâmites do Financiamento', v_responsavel_id, 'pendente', 2, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Trâmites do FGTS', v_responsavel_id, 'pendente', 3, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento Intermediária', v_responsavel_id, 'pendente', 4, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento Financiamento', v_responsavel_id, 'pendente', 5, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento FGTS', v_responsavel_id, 'pendente', 6, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Escritura', v_responsavel_id, 'pendente', 7, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Registro', v_responsavel_id, 'pendente', 8, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Aguardando Posse', v_responsavel_id, 'pendente', 9, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Transferência', v_responsavel_id, 'pendente', 10, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, '100% Concluído', v_responsavel_id, 'pendente', 11, null);
  insert into comissoes (processo_id, beneficiario_id, valor_previsto, status) values (v_processo_id, v_corretor_id, 58400, '100% pago');
end $$;

-- ---- venda #28: Maiane / Luis ----
do $$
declare
  v_tenant_id uuid;
  v_responsavel_id uuid;
  v_processo_id uuid;
  v_comprador_id uuid;
  v_vendedor_id uuid;
  v_imovel_id uuid;
  v_banco_id uuid;
  v_corretor_id uuid;
  v_numero text;
begin
  select id into v_tenant_id from tenants limit 1;
  select id into v_responsavel_id from usuarios where email = 'plinio.sacraimoveis@gmail.com';
  v_numero := 'PROC-2026-IMP0028';
  v_comprador_id := tmp_resolver_cliente(v_tenant_id, 'Maiane / Luis');
  v_vendedor_id := tmp_resolver_cliente(v_tenant_id, 'Maria do Carmo / Bernardo');
  v_imovel_id := tmp_resolver_imovel(v_tenant_id, 'Scorpius 102');
  v_banco_id := null;
  v_corretor_id := tmp_resolver_corretor(v_tenant_id, NULL);
  insert into processos (
    tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, banco_id,
    corretor_id, responsavel_id, tipo, status, categoria, valor_total,
    valor_financiado, origem, indicacao_id, data_criacao
  ) values (
    v_tenant_id, v_numero, v_comprador_id, v_vendedor_id, v_imovel_id, v_banco_id,
    v_corretor_id, v_responsavel_id, 'R.PRÓPRIOS, FINANCIAMENTO', 'ativo', 'venda', 1350000,
    NULL, NULL, v_corretor_id, '2026-07-01'
  ) returning id into v_processo_id;
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Contrato Assinado', v_responsavel_id, 'concluida', 1, '2026-07-01'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Trâmites do Financiamento', v_responsavel_id, 'pendente', 2, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Trâmites do FGTS', v_responsavel_id, 'pendente', 3, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento Intermediária', v_responsavel_id, 'pendente', 4, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento Financiamento', v_responsavel_id, 'pendente', 5, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento FGTS', v_responsavel_id, 'pendente', 6, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Escritura', v_responsavel_id, 'pendente', 7, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Registro', v_responsavel_id, 'pendente', 8, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Aguardando Posse', v_responsavel_id, 'pendente', 9, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Transferência', v_responsavel_id, 'pendente', 10, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, '100% Concluído', v_responsavel_id, 'pendente', 11, null);
  insert into comissoes (processo_id, beneficiario_id, valor_previsto, status) values (v_processo_id, v_corretor_id, 54000, '0% pago');
end $$;

-- ---- venda #29: Vínnie / Luciana ----
do $$
declare
  v_tenant_id uuid;
  v_responsavel_id uuid;
  v_processo_id uuid;
  v_comprador_id uuid;
  v_vendedor_id uuid;
  v_imovel_id uuid;
  v_banco_id uuid;
  v_corretor_id uuid;
  v_numero text;
begin
  select id into v_tenant_id from tenants limit 1;
  select id into v_responsavel_id from usuarios where email = 'plinio.sacraimoveis@gmail.com';
  v_numero := 'PROC-2026-IMP0029';
  v_comprador_id := tmp_resolver_cliente(v_tenant_id, 'Vínnie / Luciana');
  v_vendedor_id := tmp_resolver_cliente(v_tenant_id, 'Josué / Juliane');
  v_imovel_id := tmp_resolver_imovel(v_tenant_id, 'QE 50');
  v_banco_id := null;
  v_corretor_id := tmp_resolver_corretor(v_tenant_id, NULL);
  insert into processos (
    tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, banco_id,
    corretor_id, responsavel_id, tipo, status, categoria, valor_total,
    valor_financiado, origem, indicacao_id, data_criacao
  ) values (
    v_tenant_id, v_numero, v_comprador_id, v_vendedor_id, v_imovel_id, v_banco_id,
    v_corretor_id, v_responsavel_id, 'R.PRÓPRIOS, FINANCIAMENTO', 'ativo', 'venda', 1150000,
    NULL, NULL, v_corretor_id, '2026-07-06'
  ) returning id into v_processo_id;
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Contrato Assinado', v_responsavel_id, 'concluida', 1, '2026-07-06'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Trâmites do Financiamento', v_responsavel_id, 'pendente', 2, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Trâmites do FGTS', v_responsavel_id, 'pendente', 3, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento Intermediária', v_responsavel_id, 'pendente', 4, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento Financiamento', v_responsavel_id, 'pendente', 5, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento FGTS', v_responsavel_id, 'pendente', 6, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Escritura', v_responsavel_id, 'pendente', 7, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Registro', v_responsavel_id, 'pendente', 8, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Aguardando Posse', v_responsavel_id, 'pendente', 9, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Transferência', v_responsavel_id, 'pendente', 10, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, '100% Concluído', v_responsavel_id, 'pendente', 11, null);
  insert into comissoes (processo_id, beneficiario_id, valor_previsto, status) values (v_processo_id, v_corretor_id, 64838.95, '0% pago');
end $$;

-- ---- venda #30: Alessandra ----
do $$
declare
  v_tenant_id uuid;
  v_responsavel_id uuid;
  v_processo_id uuid;
  v_comprador_id uuid;
  v_vendedor_id uuid;
  v_imovel_id uuid;
  v_banco_id uuid;
  v_corretor_id uuid;
  v_numero text;
begin
  select id into v_tenant_id from tenants limit 1;
  select id into v_responsavel_id from usuarios where email = 'plinio.sacraimoveis@gmail.com';
  v_numero := 'PROC-2026-IMP0030';
  v_comprador_id := tmp_resolver_cliente(v_tenant_id, 'Alessandra');
  v_vendedor_id := tmp_resolver_cliente(v_tenant_id, 'Amelia');
  v_imovel_id := tmp_resolver_imovel(v_tenant_id, 'SQN 216');
  v_banco_id := null;
  v_corretor_id := tmp_resolver_corretor(v_tenant_id, NULL);
  insert into processos (
    tenant_id, numero_processo, comprador_id, vendedor_id, imovel_id, banco_id,
    corretor_id, responsavel_id, tipo, status, categoria, valor_total,
    valor_financiado, origem, indicacao_id, data_criacao
  ) values (
    v_tenant_id, v_numero, v_comprador_id, v_vendedor_id, v_imovel_id, v_banco_id,
    v_corretor_id, v_responsavel_id, 'FINANCIAMENTO, R.PRÓPRIOS', 'ativo', 'venda', 1365000,
    NULL, NULL, v_corretor_id, '2026-08-21'
  ) returning id into v_processo_id;
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Contrato Assinado', v_responsavel_id, 'concluida', 1, '2026-08-21'::date);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Trâmites do Financiamento', v_responsavel_id, 'pendente', 2, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Trâmites do FGTS', v_responsavel_id, 'pendente', 3, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento Intermediária', v_responsavel_id, 'pendente', 4, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento Financiamento', v_responsavel_id, 'pendente', 5, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Pagamento FGTS', v_responsavel_id, 'pendente', 6, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Escritura', v_responsavel_id, 'pendente', 7, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Registro', v_responsavel_id, 'pendente', 8, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Aguardando Posse', v_responsavel_id, 'pendente', 9, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, 'Transferência', v_responsavel_id, 'pendente', 10, null);
  insert into etapas (processo_id, nome, responsavel_id, status, ordem, data_realizada) values (v_processo_id, '100% Concluído', v_responsavel_id, 'pendente', 11, null);
end $$;

-- limpa as funcoes auxiliares temporarias
drop function tmp_resolver_cliente(uuid, text);
drop function tmp_resolver_imovel(uuid, text);
drop function tmp_resolver_banco(uuid, text);
drop function tmp_resolver_corretor(uuid, text);
