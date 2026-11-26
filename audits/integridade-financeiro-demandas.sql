-- Auditoria de integridade VITRAL (somente leitura)
-- Executar em ambiente autorizado. Nunca executar UPDATE/DELETE ou reenviar e-mails.
-- Escopo: financeiro, conciliação, central de demandas.
-- Valores acima do título podem ser encargos legítimos: tratar como alerta, não ajuste automático.

-- 1. Resumo financeiro e situações incoerentes.
with baixa_por_lancamento as (
  select l.id, l.tenant_id, l.valor, l.status,
         coalesce(sum(b.valor), 0)::numeric as total_baixado,
         count(b.id)::integer as quantidade_baixas
  from public.financeiro_lancamentos l
  left join public.financeiro_baixas b on b.lancamento_id = l.id
  group by l.id, l.tenant_id, l.valor, l.status
)
select count(*) as titulos,
       count(*) filter (where status = 'pago' and quantidade_baixas = 0) as pagos_sem_baixa,
       count(*) filter (where status = 'pago' and total_baixado < valor - 0.005) as pagos_parcialmente,
       count(*) filter (where status = 'pendente' and total_baixado >= valor - 0.005) as pendentes_quitados,
       count(*) filter (where status = 'cancelado' and quantidade_baixas > 0) as cancelados_com_baixa,
       count(*) filter (where total_baixado > valor + 0.005) as com_diferenca_a_maior
from baixa_por_lancamento;

-- 2. Detalhes de diferenças a maior, sem expor dados pessoais.
select l.id as lancamento_id, l.descricao, l.vencimento,
       l.valor as valor_lancado, sum(b.valor) as total_baixas,
       round(sum(b.valor)-l.valor, 2) as diferenca, l.status
from public.financeiro_lancamentos l
join public.financeiro_baixas b on b.lancamento_id=l.id
group by l.id, l.descricao, l.vencimento, l.valor, l.status
having sum(b.valor)>l.valor+0.005
order by diferenca desc;

-- 3. Integridade de baixas e isolamento por organização.
select count(*) filter (where b.valor<=0) as baixa_nao_positiva,
       count(*) filter (where l.id is null) as baixa_orfa,
       count(*) filter (where l.id is not null and l.tenant_id <> b.tenant_id) as baixa_outro_tenant
from public.financeiro_baixas b
left join public.financeiro_lancamentos l on l.id=b.lancamento_id;

-- 4. Extratos conciliados sem baixa nem transferência.
-- Alguns extratos são conciliações de transferências e não devem criar baixa.
select count(*) as extratos_sem_vinculo
from public.financeiro_extrato_linhas e
where e.status='conciliado'
  and e.lancamento_criado_id is null
  and not exists (select 1 from public.financeiro_baixas b where b.extrato_linha_id=e.id)
  and not exists (select 1 from public.financeiro_transferencias t where t.extrato_linha_id=e.id);

-- 5. Reutilização de linha do extrato em mais de uma baixa (revisão necessária, não necessariamente erro).
select count(*) as linhas_reutilizadas
from (select extrato_linha_id from public.financeiro_baixas
      where extrato_linha_id is not null
      group by extrato_linha_id having count(*)>1) q;

-- 6. Situação operacional de recorrências e pendências de e-mail.
select
 (select count(*) from public.demandas_recorrencias where ativa) as recorrencias_ativas,
 (select count(*) from public.demandas where recorrencia_id is not null and recorrencia_data is null) as demanda_recorrente_sem_data,
 (select count(*) from public.demandas_email_pendentes where situacao <> 'enviado') as notificacoes_pendentes;

-- 7. Resumos individuais recentes, horários em Brasília (observação: logs não provam entrega na caixa postal).
select dia, situacao, count(*) as quantidade,
       (min(criado_em) at time zone 'America/Sao_Paulo') as primeiro_registro_brasilia,
       (max(enviado_em) at time zone 'America/Sao_Paulo') as ultimo_envio_brasilia
from public.demandas_resumos_individuais
where dia >= (now() at time zone 'America/Sao_Paulo')::date - 7
group by dia, situacao
order by dia desc;

-- 8. Resumo gerencial: horário e status dos últimos 7 dias.
select dia, situacao, count(*) as quantidade,
       (max(enviado_em) at time zone 'America/Sao_Paulo') as ultimo_envio_brasilia
from public.demandas_email_envios
where dia >= (now() at time zone 'America/Sao_Paulo')::date - 7
group by dia, situacao
order by dia desc;
