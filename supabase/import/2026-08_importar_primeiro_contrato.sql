-- =========================================================
-- Cria o primeiro contrato de Locação (307 Alegria), sozinho,
-- pra revisar o padrão antes de replicar pros outros 56.
-- Rode 2026-08_limpar_locacao.sql ANTES deste script.
-- =========================================================

do $$
declare
  v_tenant_id uuid;
  v_responsavel_id uuid;
  v_imovel_id uuid;
  v_locador_id uuid;
  v_locatario_id uuid;
  v_contrato_id uuid;
begin
  select id into v_tenant_id from public.tenants limit 1;
  select id into v_responsavel_id from public.usuarios where tenant_id = v_tenant_id limit 1;

  insert into public.imoveis (tenant_id, endereco) values (v_tenant_id, '307 Alegria') returning id into v_imovel_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Francisco Janderson Torres de Souza', '(61) 98214-2386', 'jtsfrancisco@gmail.com') returning id into v_locador_id;
  insert into public.clientes (tenant_id, nome, telefone, email) values (v_tenant_id, 'Sandra dos Santos de Andrade', '(61) 99985-7965', 'thalitagabrielacs@gmail.com') returning id into v_locatario_id;
  insert into public.contratos_locacao (tenant_id, numero, imovel_id, locador_id, locatario_id, emite_nf, iptu_inscricao, iptu_tipo, condominio_administradora, condominio_contato, agua_inscricao, agua_codigo_cliente, responsavel_id, ativo) values (v_tenant_id, 'LOC-0001', v_imovel_id, v_locador_id, v_locatario_id, true, '51688638', 'parcelado', 'ROYAL ASSESSORIA CONDOMINIAL INTELIGENTE', 'meucondominio@royaladm.com.br / 9868-5857', NULL, NULL, v_responsavel_id, true) returning id into v_contrato_id;

  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-05-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-06-01', 'pago');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-07-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-08-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-09-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'iptu', '2026-10-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'condominio', '2026-07-01', 'pendente');
  insert into public.contas_locacao (contrato_id, tipo, competencia, status) values (v_contrato_id, 'agua', '2026-07-01', 'pendente');
end $$;