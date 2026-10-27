-- Extratos: guarda o que cada linha conciliada gerou, para "Desfazer" voltar
-- exatamente ao estado anterior (lançamento criado a partir da linha e
-- transferência entre contas registrada a partir dela).

alter table public.financeiro_extrato_linhas
  add column lancamento_criado_id uuid references public.financeiro_lancamentos(id) on delete set null;
create index financeiro_extrato_linhas_lancamento_idx on public.financeiro_extrato_linhas (lancamento_criado_id)
  where lancamento_criado_id is not null;

alter table public.financeiro_transferencias
  add column extrato_linha_id uuid references public.financeiro_extrato_linhas(id) on delete set null;
create index financeiro_transferencias_extrato_idx on public.financeiro_transferencias (extrato_linha_id)
  where extrato_linha_id is not null;
