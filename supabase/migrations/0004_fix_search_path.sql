-- =========================================================
-- Correção: funções SECURITY DEFINER precisam declarar
-- search_path explicitamente. Sem isso, o gatilho que roda
-- quando alguém se cadastra (handle_new_auth_user) não
-- encontra a tabela `usuarios`, porque o contexto do
-- gatilho de auth.users não inclui o schema `public` no
-- search_path por padrão. Isso também deixa as funções
-- mais seguras contra schema injection.
-- =========================================================

create or replace function auth_tenant_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select tenant_id from public.usuarios where id = auth.uid()
$$;

-- =========================================================
-- Função para popular os modelos de processo padrão de um
-- tenant novo (Venda Financiada, Locação, Correspondente
-- Bancário). É chamada automaticamente quando o primeiro
-- usuário de um tenant é criado (ver trigger em 0003).
-- =========================================================

create or replace function seed_modelos_padrao(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_modelo_venda uuid;
  v_modelo_locacao uuid;
  v_modelo_corresp uuid;
  v_modelo_registro uuid;
  v_etapa_contrato uuid;
  v_etapa_intermediaria uuid;
  v_etapa_engenharia uuid;
  v_etapa_registro uuid;
  v_etapa_fgts uuid;
  v_etapa_financiamento uuid;
  v_etapa_pagamento uuid;
  v_etapa_comissao uuid;
  v_etapa_temp uuid;
begin
  -- ---------- Modelo: Venda Financiada ----------
  insert into public.modelos_processo (tenant_id, nome, descricao)
  values (p_tenant_id, 'Venda Financiada', 'Venda de imóvel com financiamento bancário')
  returning id into v_modelo_venda;

  insert into public.modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, responsavel_padrao_perfil)
  values (v_modelo_venda, 1, 'Assinatura do Contrato', 'fixa', 0, 'corretor')
  returning id into v_etapa_contrato;

  insert into public.modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, etapa_referencia_id, responsavel_padrao_perfil)
  values (v_modelo_venda, 2, 'Intermediária', 'relativa_criacao', 30, v_etapa_contrato, 'gerente')
  returning id into v_etapa_intermediaria;

  insert into public.modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, etapa_referencia_id, responsavel_padrao_perfil)
  values (v_modelo_venda, 3, 'Engenharia', 'relativa_etapa_anterior', 10, v_etapa_intermediaria, 'correspondente')
  returning id into v_etapa_engenharia;

  insert into public.modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, etapa_referencia_id, responsavel_padrao_perfil)
  values (v_modelo_venda, 4, 'Registro', 'relativa_etapa_anterior', 15, v_etapa_engenharia, 'corretor')
  returning id into v_etapa_registro;

  insert into public.modelos_checklist_item (modelo_etapa_id, descricao, ordem) values
    (v_etapa_registro, 'Emitir ITBI', 1),
    (v_etapa_registro, 'Protocolar cartório', 2),
    (v_etapa_registro, 'Aguardar devolução', 3),
    (v_etapa_registro, 'Retirar matrícula', 4);

  insert into public.modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, etapa_referencia_id, responsavel_padrao_perfil)
  values (v_modelo_venda, 5, 'Liberação FGTS', 'relativa_etapa_anterior', 15, v_etapa_engenharia, 'correspondente')
  returning id into v_etapa_fgts;

  insert into public.modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, etapa_referencia_id, responsavel_padrao_perfil)
  values (v_modelo_venda, 6, 'Assinatura do Financiamento', 'relativa_etapa_anterior', 5, v_etapa_registro, 'correspondente')
  returning id into v_etapa_financiamento;

  insert into public.modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, etapa_referencia_id, responsavel_padrao_perfil)
  values (v_modelo_venda, 7, 'Pagamento', 'relativa_criacao', 90, v_etapa_contrato, 'financeiro')
  returning id into v_etapa_pagamento;

  insert into public.modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, etapa_referencia_id, responsavel_padrao_perfil)
  values (v_modelo_venda, 8, 'Comissão', 'relativa_etapa_anterior', 5, v_etapa_pagamento, 'financeiro')
  returning id into v_etapa_comissao;

  -- ---------- Modelo: Locação ----------
  insert into public.modelos_processo (tenant_id, nome, descricao)
  values (p_tenant_id, 'Locação', 'Contrato de aluguel residencial ou comercial')
  returning id into v_modelo_locacao;

  insert into public.modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, responsavel_padrao_perfil)
  values (v_modelo_locacao, 1, 'Vistoria de Entrada', 'fixa', 0, 'corretor')
  returning id into v_etapa_temp;

  insert into public.modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, etapa_referencia_id, responsavel_padrao_perfil)
  values (v_modelo_locacao, 2, 'Assinatura do Contrato', 'relativa_etapa_anterior', 3, v_etapa_temp, 'gerente')
  returning id into v_etapa_temp;

  insert into public.modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, etapa_referencia_id, responsavel_padrao_perfil)
  values (v_modelo_locacao, 3, 'Entrega das Chaves', 'relativa_etapa_anterior', 1, v_etapa_temp, 'corretor');

  insert into public.modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, responsavel_padrao_perfil)
  values (v_modelo_locacao, 4, 'Renovação / Reajuste (12 meses)', 'relativa_criacao', 365, 'gerente');

  -- ---------- Modelo: Correspondente Bancário ----------
  insert into public.modelos_processo (tenant_id, nome, descricao)
  values (p_tenant_id, 'Correspondente Bancário', 'Financiamento habitacional via correspondente')
  returning id into v_modelo_corresp;

  insert into public.modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, responsavel_padrao_perfil)
  values (v_modelo_corresp, 1, 'Abertura de Simulação', 'fixa', 0, 'correspondente')
  returning id into v_etapa_temp;

  insert into public.modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, etapa_referencia_id, responsavel_padrao_perfil)
  values (v_modelo_corresp, 2, 'Envio de Documentação ao Banco', 'relativa_etapa_anterior', 3, v_etapa_temp, 'correspondente')
  returning id into v_etapa_temp;

  insert into public.modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, etapa_referencia_id, responsavel_padrao_perfil)
  values (v_modelo_corresp, 3, 'Análise de Crédito', 'relativa_etapa_anterior', 15, v_etapa_temp, 'correspondente')
  returning id into v_etapa_temp;

  insert into public.modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, etapa_referencia_id, responsavel_padrao_perfil)
  values (v_modelo_corresp, 4, 'Assinatura do Contrato de Financiamento', 'relativa_etapa_anterior', 10, v_etapa_temp, 'correspondente')
  returning id into v_etapa_temp;

  insert into public.modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, etapa_referencia_id, responsavel_padrao_perfil)
  values (v_modelo_corresp, 5, 'Liberação de Recursos', 'relativa_etapa_anterior', 10, v_etapa_temp, 'correspondente')
  returning id into v_etapa_temp;

  insert into public.modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, etapa_referencia_id, responsavel_padrao_perfil)
  values (v_modelo_corresp, 6, 'Comissão do Correspondente', 'relativa_etapa_anterior', 5, v_etapa_temp, 'financeiro');

  -- ---------- Modelo: Registro (avulso) ----------
  insert into public.modelos_processo (tenant_id, nome, descricao)
  values (p_tenant_id, 'Registro de Imóvel', 'Registro avulso, fora de uma venda em andamento')
  returning id into v_modelo_registro;

  insert into public.modelos_etapa (modelo_processo_id, ordem, nome, tipo_regra_data, dias_offset, responsavel_padrao_perfil)
  values (v_modelo_registro, 1, 'Registro', 'fixa', 0, 'corretor')
  returning id into v_etapa_temp;

  insert into public.modelos_checklist_item (modelo_etapa_id, descricao, ordem) values
    (v_etapa_temp, 'Emitir ITBI', 1),
    (v_etapa_temp, 'Protocolar cartório', 2),
    (v_etapa_temp, 'Aguardar devolução', 3),
    (v_etapa_temp, 'Retirar matrícula', 4);

end;
$$;

-- =========================================================
-- Onboarding: quando alguém se cadastra (auth.users), cria
-- uma linha em `usuarios` sem tenant_id ainda. A primeira
-- pessoa "funda" a organização (bootstrap_tenant). Ela então
-- adiciona as demais pessoas ao mesmo tenant (add_member).
-- =========================================================

create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, tenant_id, nome, email, perfil, ativo)
  values (
    new.id,
    null,
    coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
    new.email,
    'corretor',
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- usuarios.tenant_id precisa aceitar null temporariamente até o bootstrap
alter table usuarios alter column tenant_id drop not null;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- ---------------------------------------------------------
-- Primeira pessoa cria a organização (tenant) e vira admin
-- ---------------------------------------------------------
create or replace function bootstrap_tenant(p_nome_empresa text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_ja_tem_tenant uuid;
begin
  select tenant_id into v_ja_tem_tenant from public.usuarios where id = auth.uid();
  if v_ja_tem_tenant is not null then
    raise exception 'Este usuário já pertence a uma organização.';
  end if;

  insert into public.tenants (nome) values (p_nome_empresa) returning id into v_tenant_id;

  update public.usuarios
     set tenant_id = v_tenant_id,
         perfil = 'admin'
   where id = auth.uid();

  perform seed_modelos_padrao(v_tenant_id);

  return v_tenant_id;
end;
$$;

-- ---------------------------------------------------------
-- Admin/gerente adiciona um colega (que já criou login) ao
-- mesmo tenant, definindo o perfil dela.
-- ---------------------------------------------------------
create or replace function add_member(p_email text, p_perfil perfil_usuario)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meu_tenant uuid;
  v_meu_perfil perfil_usuario;
  v_alvo_id uuid;
begin
  select tenant_id, perfil into v_meu_tenant, v_meu_perfil from public.usuarios where id = auth.uid();

  if v_meu_tenant is null then
    raise exception 'Você ainda não pertence a uma organização.';
  end if;

  if v_meu_perfil not in ('admin','diretora','gerente') then
    raise exception 'Apenas admin, diretora ou gerente podem adicionar membros.';
  end if;

  select id into v_alvo_id from public.usuarios where email = p_email;

  if v_alvo_id is null then
    raise exception 'Essa pessoa ainda não criou uma conta. Peça para ela se cadastrar primeiro em /login.';
  end if;

  update public.usuarios
     set tenant_id = v_meu_tenant,
         perfil = p_perfil
   where id = v_alvo_id;
end;
$$;
