-- Áudio de origem de lotes de demandas. Arquivo privado, acessível apenas por gestores
-- ou colaboradores que receberam uma demanda ativa daquele mesmo lote.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('demandas-lotes-audios','demandas-lotes-audios',false,8388608,
ARRAY['audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/wav','audio/x-wav','audio/x-m4a','audio/aac'])
ON CONFLICT (id) DO UPDATE SET public=false,file_size_limit=8388608,
allowed_mime_types=EXCLUDED.allowed_mime_types;

CREATE TABLE IF NOT EXISTS public.demandas_lote_audios (
  lote_id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  autor_id uuid NOT NULL REFERENCES public.usuarios(id),
  caminho text NOT NULL UNIQUE,
  mime_type text NOT NULL,
  tamanho_bytes integer NOT NULL CHECK (tamanho_bytes BETWEEN 1 AND 8388608),
  nome_original text,
  criada_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS demandas_lote_audios_tenant_idx
  ON public.demandas_lote_audios (tenant_id,criada_em DESC);

ALTER TABLE public.demandas_lote_audios ENABLE ROW LEVEL SECURITY;
CREATE POLICY demandas_lote_audios_leitura ON public.demandas_lote_audios
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.usuarios u
    WHERE u.id=(SELECT auth.uid()) AND u.ativo AND u.tenant_id=demandas_lote_audios.tenant_id
    AND (
      u.nivel_acesso::text IN ('diretor','gerente')
      OR EXISTS (SELECT 1 FROM public.demandas d
        WHERE d.tenant_id=demandas_lote_audios.tenant_id
          AND d.lote_id=demandas_lote_audios.lote_id
          AND d.responsavel_id=u.id AND d.excluida_em IS NULL)
    ))
);
GRANT SELECT ON public.demandas_lote_audios TO authenticated;
REVOKE ALL ON public.demandas_lote_audios FROM anon;
