-- Central de Desenvolvimento: acesso exclusivo à direção e isolamento por empresa.
CREATE TABLE IF NOT EXISTS public.vitral_desenvolvimento (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 titulo text NOT NULL CHECK (char_length(btrim(titulo)) BETWEEN 4 AND 180),
 modulo text NOT NULL DEFAULT 'Geral' CHECK (char_length(btrim(modulo)) BETWEEN 2 AND 80),
 descricao text,
 prioridade text NOT NULL DEFAULT 'media' CHECK (prioridade IN ('critica','alta','media','baixa')),
 situacao text NOT NULL DEFAULT 'planejado' CHECK (situacao IN ('planejado','desenvolvimento','laboratorio','homologacao','publicado','pausado')),
 responsavel_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
 prazo date,
 observacoes text,
 criado_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
 criado_em timestamptz NOT NULL DEFAULT now(),
 atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vitral_desenvolvimento_tenant_situacao_idx ON public.vitral_desenvolvimento (tenant_id,situacao,prioridade);
ALTER TABLE public.vitral_desenvolvimento ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='vitral_desenvolvimento' AND policyname='vitral_desenvolvimento_diretoria') THEN
  CREATE POLICY vitral_desenvolvimento_diretoria ON public.vitral_desenvolvimento FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id=(SELECT auth.uid()) AND u.ativo AND u.tenant_id=vitral_desenvolvimento.tenant_id AND u.nivel_acesso::text='diretor'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id=(SELECT auth.uid()) AND u.ativo AND u.tenant_id=vitral_desenvolvimento.tenant_id AND u.nivel_acesso::text='diretor'));
 END IF;
END $$;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.vitral_desenvolvimento TO authenticated;
REVOKE ALL ON public.vitral_desenvolvimento FROM anon;