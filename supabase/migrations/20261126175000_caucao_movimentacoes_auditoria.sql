-- Histórico operacional das cauções. NÃO representa extrato bancário conciliado.
-- Não migra valores contratuais para depósitos nem gera entradas financeiras.
create table if not exists public.caucao_movimentacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  contrato_id uuid not null references public.contratos_locacao(id) on delete restrict,
  tipo text not null check (tipo in ('deposito','complemento','rendimento','utilizacao','devolucao')),
  data_movimento date not null,
  valor_centavos bigint not null check (valor_centavos > 0 and valor_centavos <= 100000000000),
  descricao text not null check (char_length(trim(descricao)) between 5 and 1000),
  comprovante_url text check (comprovante_url is null or (char_length(comprovante_url) <= 2048 and comprovante_url ~ '^https://')),
  situacao text not null default 'pendente_conferencia' check (situacao = 'pendente_conferencia'),
  criado_por uuid not null references auth.users(id),
  criado_em timestamptz not null default now(),
  constraint caucao_movimentacoes_contrato_tenant_fk
    foreign key (tenant_id, contrato_id)
    references public.contratos_locacao(tenant_id, id)
);
create index if not exists caucao_movimentacoes_por_contrato
  on public.caucao_movimentacoes(tenant_id,contrato_id,data_movimento desc,criado_em desc);
create index if not exists caucao_movimentacoes_pendentes
  on public.caucao_movimentacoes(tenant_id,situacao);

alter table public.caucao_movimentacoes enable row level security;
revoke all on public.caucao_movimentacoes from anon;
grant select, insert on public.caucao_movimentacoes to authenticated;
revoke update, delete on public.caucao_movimentacoes from authenticated;
create policy "caucao_movimentacoes - leitura"
on public.caucao_movimentacoes for select to authenticated
using (tenant_id = public.auth_tenant_id() and public.usuario_tem_categoria('locacao'::public.categoria_processo));
create policy "caucao_movimentacoes - insercao"
on public.caucao_movimentacoes for insert to authenticated
with check (
  tenant_id = public.auth_tenant_id()
  and criado_por = auth.uid()
  and public.usuario_tem_categoria('locacao'::public.categoria_processo)
  and public.usuario_pode_editar()
  and exists (
    select 1 from public.contratos_locacao c
    where c.id = contrato_id and c.tenant_id = tenant_id
      and c.garantia_locaticia = 'Caução'
  )
);
comment on table public.caucao_movimentacoes is
 'Movimentações declaradas de cauções. Nenhum item deve ser tratado como saldo bancário confirmado sem conciliação externa.';
