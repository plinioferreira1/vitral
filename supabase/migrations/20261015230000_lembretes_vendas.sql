-- Lembretes de Vendas: etapa opcional "Pagamento de Intermediária" e avisos
-- (sino + e-mail) de intermediária próxima e de fim de contrato (30/15/7 dias).

-- ---------------------------------------------------------------
-- 1) Catálogo de etapas de venda
-- ---------------------------------------------------------------
-- "Escritura + Intermediária" passa a ser só "Escritura" nas vendas novas; a
-- intermediária vira etapa própria, logo antes, marcada só nas vendas que a têm.
-- Processos existentes não mudam (o código trata o nome antigo como equivalente).
update public.etapas_padrao
   set ordem = ordem + 1
 where categoria = 'venda'
   and ordem >= (select min(ordem) from public.etapas_padrao p2
                  where p2.tenant_id = etapas_padrao.tenant_id and p2.categoria = 'venda'
                    and p2.nome in ('Escritura + Intermediária', 'Escritura'))
   and not exists (select 1 from public.etapas_padrao p3
                    where p3.tenant_id = etapas_padrao.tenant_id and p3.categoria = 'venda'
                      and p3.nome = 'Pagamento de Intermediária');

insert into public.etapas_padrao (tenant_id, nome, ordem, categoria, tipo)
select e.tenant_id, 'Pagamento de Intermediária', e.ordem - 1, 'venda', 'sequencial'
  from public.etapas_padrao e
 where e.categoria = 'venda' and e.nome in ('Escritura + Intermediária', 'Escritura')
   and not exists (select 1 from public.etapas_padrao p3
                    where p3.tenant_id = e.tenant_id and p3.categoria = 'venda'
                      and p3.nome = 'Pagamento de Intermediária');

update public.etapas_padrao
   set nome = 'Escritura'
 where categoria = 'venda' and nome = 'Escritura + Intermediária';

-- ---------------------------------------------------------------
-- 2) Lembretes gerados pela rotina diária (um por pessoa, processo, tipo, data e marco)
-- ---------------------------------------------------------------
create table public.vendas_lembretes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  processo_id uuid not null references public.processos(id) on delete cascade,
  etapa_id uuid references public.etapas(id) on delete cascade,
  tipo text not null check (tipo in ('intermediaria', 'fim_contrato')),
  data_referencia date not null,
  marco integer not null,
  titulo text not null,
  mensagem text not null,
  lida_em timestamptz,
  email_enviado_em timestamptz,
  criado_em timestamptz not null default now(),
  unique (usuario_id, processo_id, tipo, data_referencia, marco)
);
create index vendas_lembretes_usuario_idx on public.vendas_lembretes (usuario_id, lida_em, criado_em desc);
create index vendas_lembretes_email_idx on public.vendas_lembretes (email_enviado_em) where email_enviado_em is null;

-- Só leitura dos próprios lembretes; quem grava é a rotina/servidor (chave do servidor).
alter table public.vendas_lembretes enable row level security;
create policy "vendas lembretes leitura" on public.vendas_lembretes
  for select to authenticated
  using (usuario_id = (select auth.uid()));
revoke all on public.vendas_lembretes from anon, authenticated;
grant select on public.vendas_lembretes to authenticated;
