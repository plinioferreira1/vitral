-- Aplicada direto no banco de produção (frente de segurança) em 20261125.
-- Arquivo criado em 25/11/2026 a partir de supabase_migrations.schema_migrations,
-- com o SQL exato, para o repositório acompanhar o banco e o db push não parar.

alter table public.autorizacao_signatarios add column if not exists link_expira_em timestamptz, add column if not exists link_revogado_em timestamptz;
alter table public.carta_proposta_signatarios add column if not exists link_expira_em timestamptz, add column if not exists link_revogado_em timestamptz;
alter table public.termo_entrega_signatarios add column if not exists link_expira_em timestamptz, add column if not exists link_revogado_em timestamptz;
alter table public.termos_visita add column if not exists link_expira_em timestamptz, add column if not exists link_revogado_em timestamptz;

comment on column public.autorizacao_signatarios.link_expira_em is 'Validade opcional do link de assinatura. Nulo preserva links existentes até a política ser ativada.';
comment on column public.autorizacao_signatarios.link_revogado_em is 'Registro opcional de revogação do link; não apagar documentos assinados.';
comment on column public.carta_proposta_signatarios.link_expira_em is 'Validade opcional do link de assinatura.';
comment on column public.carta_proposta_signatarios.link_revogado_em is 'Revogação opcional do link de assinatura.';
comment on column public.termo_entrega_signatarios.link_expira_em is 'Validade opcional do link de assinatura.';
comment on column public.termo_entrega_signatarios.link_revogado_em is 'Revogação opcional do link de assinatura.';
comment on column public.termos_visita.link_expira_em is 'Validade opcional do link do termo de visita.';
comment on column public.termos_visita.link_revogado_em is 'Revogação opcional do link do termo de visita.';
