-- =========================================================
-- Onboarding do Corretor: checklist de primeiros passos,
-- editável (Configurações), com progresso por usuário. Fica
-- na aba "Corretor" do menu.
-- =========================================================

create table onboarding_etapas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  nome text not null,
  descricao text,
  link text,
  ordem int not null default 0
);

create table onboarding_status (
  id uuid primary key default gen_random_uuid(),
  etapa_id uuid not null references onboarding_etapas(id) on delete cascade,
  usuario_id uuid not null references usuarios(id) on delete cascade,
  concluida boolean not null default false,
  concluida_em timestamptz,
  unique (etapa_id, usuario_id)
);

create index idx_onboarding_status_usuario on onboarding_status(usuario_id);

alter table onboarding_etapas enable row level security;
alter table onboarding_status enable row level security;

create policy "onboarding_etapas - leitura" on onboarding_etapas
  for select using (tenant_id = auth_tenant_id());

create policy "onboarding_etapas - escrita" on onboarding_etapas
  for all using (tenant_id = auth_tenant_id()) with check (tenant_id = auth_tenant_id());

create policy "onboarding_status - leitura" on onboarding_status
  for select using (
    etapa_id in (select id from onboarding_etapas where tenant_id = auth_tenant_id())
  );

create policy "onboarding_status - insercao" on onboarding_status
  for insert with check (
    usuario_id = auth.uid()
    and etapa_id in (select id from onboarding_etapas where tenant_id = auth_tenant_id())
  );

create policy "onboarding_status - atualizacao" on onboarding_status
  for update using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

-- etapas padrão, editáveis depois em Configurações → Onboarding
do $$
declare
  v_tenant_id uuid;
begin
  select id into v_tenant_id from tenants limit 1;
  if v_tenant_id is not null then
    insert into onboarding_etapas (tenant_id, nome, descricao, link, ordem) values
      (v_tenant_id, 'Complete seu perfil', 'Confira seus dados em Perfil e ajuste o que precisar.', '/perfil', 1),
      (v_tenant_id, 'Conheça o Termo de Visita', 'Veja como criar um termo de visita e mandar pro cliente assinar.', '/termos-visita', 2),
      (v_tenant_id, 'Conheça a Autorização de Venda', 'Veja como criar uma autorização de venda e mandar pro proprietário assinar.', '/autorizacoes', 3),
      (v_tenant_id, 'Use a Calculadora de Proporcionalidade', 'Pra ratear IPTU, condomínio, luz e água em vendas e locações.', '/calculadora', 4),
      (v_tenant_id, 'Use a Simulação de Custas', 'Pra calcular custas de cartório rapidinho, direto pro cliente.', '/cartorio', 5);
  end if;
end $$;
