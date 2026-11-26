-- Reforço de privilégios e escopo de tenant no histórico de cauções.
-- Executado depois da criação da tabela; nenhum registro é alterado.
revoke all privileges on public.caucao_movimentacoes from PUBLIC, anon, authenticated;
grant select, insert on public.caucao_movimentacoes to authenticated;
drop policy if exists "caucao_movimentacoes - insercao" on public.caucao_movimentacoes;
create policy "caucao_movimentacoes - insercao"
on public.caucao_movimentacoes for insert to authenticated
with check (
  tenant_id = public.auth_tenant_id()
  and criado_por = auth.uid()
  and public.usuario_tem_categoria('locacao'::public.categoria_processo)
  and public.usuario_pode_editar()
  and exists (
    select 1 from public.contratos_locacao c
    where c.id = caucao_movimentacoes.contrato_id
      and c.tenant_id = caucao_movimentacoes.tenant_id
      and c.garantia_locaticia = 'Caução'
  )
);
