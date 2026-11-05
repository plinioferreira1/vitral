-- Controle de Débitos: IPTU/TLP só é conferido nos meses em que há cobrança.
-- No DF as parcelas de 2026 terminaram em outubro; a equipe ajusta os meses
-- em Configurações quando sair o calendário do ano seguinte.

alter table public.debitos_config
  add column meses_iptu smallint[] not null default '{1,2,3,4,5,6,7,8,9,10}'
  check (meses_iptu <@ '{1,2,3,4,5,6,7,8,9,10,11,12}'::smallint[]);

-- Remove as conferências de IPTU/TLP já geradas fora desses meses que ninguém
-- tocou (pendentes, sem observação, sem solicitação nem itens), registrando no histórico.
do $$
declare
  t record;
begin
  for t in
    select v.tenant_id, count(*) as n
    from public.debitos_verificacoes v
    where v.tipo = 'iptu_tlp'
      and v.competencia >= '2026-11-01'
      and extract(month from v.competencia)::smallint <> all ('{1,2,3,4,5,6,7,8,9,10}'::smallint[])
      and v.status = 'pendente' and v.observacao is null and v.solicitacao_id is null
      and not exists (select 1 from public.debitos_itens i where i.verificacao_id = v.id)
      and not exists (select 1 from public.debitos_solicitacao_itens s where s.verificacao_id = v.id)
      and not exists (select 1 from public.debitos_eventos e where e.verificacao_id = v.id)
    group by v.tenant_id
  loop
    delete from public.debitos_verificacoes v
    where v.tenant_id = t.tenant_id
      and v.tipo = 'iptu_tlp'
      and v.competencia >= '2026-11-01'
      and extract(month from v.competencia)::smallint <> all ('{1,2,3,4,5,6,7,8,9,10}'::smallint[])
      and v.status = 'pendente' and v.observacao is null and v.solicitacao_id is null
      and not exists (select 1 from public.debitos_itens i where i.verificacao_id = v.id)
      and not exists (select 1 from public.debitos_solicitacao_itens s where s.verificacao_id = v.id)
      and not exists (select 1 from public.debitos_eventos e where e.verificacao_id = v.id);
    insert into public.debitos_eventos (tenant_id, acao, descricao, usuario_nome)
    values (t.tenant_id, 'iptu_fora_do_periodo',
      t.n || ' conferência(s) de IPTU/TLP removidas: cobrança de 2026 encerrada em outubro.', 'Vitral');
  end loop;
end $$;
