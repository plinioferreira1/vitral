-- Controle idempotente do fechamento diário da Central de Demandas.
-- Operado apenas pelo servidor de cron com service_role; sem acesso de usuários ao Data API.
CREATE TABLE public.demandas_email_envios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  dia date NOT NULL,
  situacao text NOT NULL DEFAULT 'pendente' CHECK (situacao IN ('pendente','enviado','erro')),
  iniciado_em timestamptz NOT NULL DEFAULT now(),
  enviado_em timestamptz,
  erro text,
  UNIQUE(tenant_id,dia)
);
CREATE INDEX demandas_email_envios_tenant_idx ON public.demandas_email_envios(tenant_id,dia DESC);
ALTER TABLE public.demandas_email_envios ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.demandas_email_envios FROM anon, authenticated;
