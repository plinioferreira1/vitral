-- =========================================================
-- Reorganiza as etapas padrão: separa a "sequência normal"
-- (uma etapa segue a outra) das "situações especiais"
-- (exceções que podem acontecer a qualquer momento, fora da
-- ordem — judicial, inadimplência, acordo). Comissão deixa de
-- ser uma etapa da fila e vira um controle próprio, já que o
-- pagamento dela é negociado e pode acontecer em qualquer fase.
-- =========================================================

create type tipo_etapa_padrao as enum ('sequencial', 'especial');

alter table etapas_padrao add column tipo tipo_etapa_padrao not null default 'sequencial';

-- Observação livre na comissão, pra anotar quando ela será paga
-- (já que o timing é negociado, não fixo).
alter table comissoes add column observacoes text;

-- ---------------------------------------------------------
-- Reseta o catálogo de Venda e Financiamento pro tenant atual,
-- já com a ordem/tipo corrigidos (etapas_padrao não tem
-- vínculo de chave estrangeira com `etapas`, então isso não
-- afeta processos já criados).
-- ---------------------------------------------------------

do $$
declare
  v_tenant_id uuid;
begin
  select id into v_tenant_id from tenants limit 1;
  if v_tenant_id is null then
    return;
  end if;

  delete from etapas_padrao where tenant_id = v_tenant_id and categoria in ('venda', 'financiamento');

  insert into etapas_padrao (tenant_id, nome, ordem, categoria, tipo) values
    (v_tenant_id, 'Contrato Assinado', 1, 'venda', 'sequencial'),
    (v_tenant_id, 'Trâmites do Financiamento', 2, 'venda', 'sequencial'),
    (v_tenant_id, 'Trâmites do FGTS', 3, 'venda', 'sequencial'),
    (v_tenant_id, 'Pagamento Intermediária', 4, 'venda', 'sequencial'),
    (v_tenant_id, 'Pagamento Financiamento', 5, 'venda', 'sequencial'),
    (v_tenant_id, 'Pagamento FGTS', 6, 'venda', 'sequencial'),
    (v_tenant_id, 'Escritura', 7, 'venda', 'sequencial'),
    (v_tenant_id, 'Registro', 8, 'venda', 'sequencial'),
    (v_tenant_id, 'Aguardando Posse', 9, 'venda', 'sequencial'),
    (v_tenant_id, 'Transferência', 10, 'venda', 'sequencial'),
    (v_tenant_id, '100% Concluído', 11, 'venda', 'sequencial'),
    (v_tenant_id, 'Aguardando Alvará Judicial', 12, 'venda', 'especial'),
    (v_tenant_id, 'Em Acordo/Aditivo', 13, 'venda', 'especial'),
    (v_tenant_id, 'Em Processo Judicial', 14, 'venda', 'especial'),
    (v_tenant_id, 'Inadimplente', 15, 'venda', 'especial');

  insert into etapas_padrao (tenant_id, nome, ordem, categoria, tipo) values
    (v_tenant_id, 'Simulação', 1, 'financiamento', 'sequencial'),
    (v_tenant_id, 'Cadastro', 2, 'financiamento', 'sequencial'),
    (v_tenant_id, 'Análise de Crédito', 3, 'financiamento', 'sequencial'),
    (v_tenant_id, 'Assinatura de Proposta', 4, 'financiamento', 'sequencial'),
    (v_tenant_id, 'Vistoria', 5, 'financiamento', 'sequencial'),
    (v_tenant_id, 'Conformidade', 6, 'financiamento', 'sequencial'),
    (v_tenant_id, 'Emissão de Contrato/Escritura', 7, 'financiamento', 'sequencial'),
    (v_tenant_id, 'Emissão de ITBI', 8, 'financiamento', 'sequencial'),
    (v_tenant_id, 'Registro', 9, 'financiamento', 'sequencial'),
    (v_tenant_id, 'Liberação de Recursos', 10, 'financiamento', 'sequencial'),
    (v_tenant_id, '100% Concluído', 11, 'financiamento', 'sequencial'),
    (v_tenant_id, 'Reprovado', 12, 'financiamento', 'especial'),
    (v_tenant_id, 'Desistência', 13, 'financiamento', 'especial');
end $$;

-- ---------------------------------------------------------
-- Atualiza a função de seed pra qualquer tenant novo já
-- nascer com essa estrutura certa.
-- ---------------------------------------------------------

create or replace function seed_etapas_padrao(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.etapas_padrao (tenant_id, nome, ordem, categoria, tipo) values
    (p_tenant_id, 'Contrato Assinado', 1, 'venda', 'sequencial'),
    (p_tenant_id, 'Trâmites do Financiamento', 2, 'venda', 'sequencial'),
    (p_tenant_id, 'Trâmites do FGTS', 3, 'venda', 'sequencial'),
    (p_tenant_id, 'Pagamento Intermediária', 4, 'venda', 'sequencial'),
    (p_tenant_id, 'Pagamento Financiamento', 5, 'venda', 'sequencial'),
    (p_tenant_id, 'Pagamento FGTS', 6, 'venda', 'sequencial'),
    (p_tenant_id, 'Escritura', 7, 'venda', 'sequencial'),
    (p_tenant_id, 'Registro', 8, 'venda', 'sequencial'),
    (p_tenant_id, 'Aguardando Posse', 9, 'venda', 'sequencial'),
    (p_tenant_id, 'Transferência', 10, 'venda', 'sequencial'),
    (p_tenant_id, '100% Concluído', 11, 'venda', 'sequencial'),
    (p_tenant_id, 'Aguardando Alvará Judicial', 12, 'venda', 'especial'),
    (p_tenant_id, 'Em Acordo/Aditivo', 13, 'venda', 'especial'),
    (p_tenant_id, 'Em Processo Judicial', 14, 'venda', 'especial'),
    (p_tenant_id, 'Inadimplente', 15, 'venda', 'especial'),
    (p_tenant_id, 'Simulação', 1, 'financiamento', 'sequencial'),
    (p_tenant_id, 'Cadastro', 2, 'financiamento', 'sequencial'),
    (p_tenant_id, 'Análise de Crédito', 3, 'financiamento', 'sequencial'),
    (p_tenant_id, 'Assinatura de Proposta', 4, 'financiamento', 'sequencial'),
    (p_tenant_id, 'Vistoria', 5, 'financiamento', 'sequencial'),
    (p_tenant_id, 'Conformidade', 6, 'financiamento', 'sequencial'),
    (p_tenant_id, 'Emissão de Contrato/Escritura', 7, 'financiamento', 'sequencial'),
    (p_tenant_id, 'Emissão de ITBI', 8, 'financiamento', 'sequencial'),
    (p_tenant_id, 'Registro', 9, 'financiamento', 'sequencial'),
    (p_tenant_id, 'Liberação de Recursos', 10, 'financiamento', 'sequencial'),
    (p_tenant_id, '100% Concluído', 11, 'financiamento', 'sequencial'),
    (p_tenant_id, 'Reprovado', 12, 'financiamento', 'especial'),
    (p_tenant_id, 'Desistência', 13, 'financiamento', 'especial');
end;
$$;
