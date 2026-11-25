-- Aplicada direto no banco de produção (frente de segurança) em 20261125.
-- Arquivo criado em 25/11/2026 a partir de supabase_migrations.schema_migrations,
-- com o SQL exato, para o repositório acompanhar o banco e o db push não parar.

-- Users may only update non-privileged self-profile fields via the Data API.
-- Membership, access levels, activation and tenant changes remain restricted to controlled SECURITY DEFINER RPCs / service role.
REVOKE UPDATE ON TABLE public.usuarios FROM PUBLIC, anon, authenticated;
GRANT UPDATE (nome, foto_url) ON TABLE public.usuarios TO authenticated;
