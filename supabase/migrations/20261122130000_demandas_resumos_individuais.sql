-- Registro seguro de envio do resumo matinal de demandas por colaborador.
-- A tabela já foi criada diretamente no ambiente de produção em 22/11/2026;
-- CREATE TABLE IF NOT EXISTS permite sincronizar a migração com o repositório.
CREATE TABLE IF NOT EXISTS public.demandas_resumos_individuais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  usuario_id uuid NOT NULL,
  dia date NOT NULL,
  situacao text NOT NULL DEFAULT 'pendente'
    CHECK (situacao IN ('pendente', 'enviado', 'erro')),
  criado_em timestamptz NOT NULL DEFAULT now(),
  enviado_em timestamptz,
  erro text,
  UNIQUE (tenant_id, usuario_id, dia)
);

CREATE INDEX IF NOT EXISTS demandas_resumos_individuais_dia_idx
  ON public.demandas_resumos_individuais (dia, situacao);
ALTER TABLE public.demandas_resumos_individuais ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.demandas_resumos_individuais FROM anon, authenticated;
