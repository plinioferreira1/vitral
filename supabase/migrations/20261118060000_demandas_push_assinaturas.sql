-- Push consentido por dispositivo. Dados da assinatura são acessíveis só no servidor.
CREATE TABLE public.demandas_push_assinaturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE CHECK (char_length(endpoint) BETWEEN 20 AND 2000),
  p256dh text NOT NULL CHECK (char_length(p256dh) BETWEEN 40 AND 300),
  auth_secret text NOT NULL CHECK (char_length(auth_secret) BETWEEN 12 AND 300),
  criada_em timestamptz NOT NULL DEFAULT now(),
  atualizada_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX demandas_push_usuario_idx ON public.demandas_push_assinaturas(tenant_id,usuario_id);
ALTER TABLE public.demandas_push_assinaturas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.demandas_push_assinaturas FROM anon,authenticated;
