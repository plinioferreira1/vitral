-- Demandas recorrentes: templates apenas para gestores; idempotência por data prevista.
CREATE TABLE public.demandas_recorrencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  solicitante_id uuid NOT NULL REFERENCES public.usuarios(id),
  responsavel_id uuid NOT NULL REFERENCES public.usuarios(id),
  titulo text NOT NULL CHECK (char_length(btrim(titulo)) BETWEEN 4 AND 180),
  descricao text CHECK (descricao IS NULL OR char_length(descricao) <= 5000),
  prioridade text NOT NULL DEFAULT 'normal' CHECK (prioridade IN ('baixa','normal','alta','urgente')),
  periodicidade text NOT NULL CHECK (periodicidade IN ('diaria','semanal','mensal')),
  proxima_data date NOT NULL,
  ativa boolean NOT NULL DEFAULT true,
  criada_em timestamptz NOT NULL DEFAULT now(),
  atualizada_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX demandas_recorrencias_proximas_idx ON public.demandas_recorrencias (proxima_data)
 WHERE ativa;
ALTER TABLE public.demandas_recorrencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY demandas_recorrencias_gestao ON public.demandas_recorrencias FOR ALL TO authenticated
 USING (EXISTS (SELECT 1 FROM public.usuarios u
   WHERE u.id=(SELECT auth.uid()) AND u.ativo AND u.tenant_id=demandas_recorrencias.tenant_id
     AND u.nivel_acesso::text IN ('diretor','gerente')))
 WITH CHECK (
   EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id=(SELECT auth.uid()) AND u.ativo
     AND u.tenant_id=demandas_recorrencias.tenant_id AND u.nivel_acesso::text IN ('diretor','gerente'))
   AND EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id=demandas_recorrencias.responsavel_id
     AND u.tenant_id=demandas_recorrencias.tenant_id AND u.ativo)
   AND EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id=demandas_recorrencias.solicitante_id
     AND u.tenant_id=demandas_recorrencias.tenant_id AND u.ativo)
 );
GRANT SELECT,INSERT,UPDATE ON public.demandas_recorrencias TO authenticated;
REVOKE ALL ON public.demandas_recorrencias FROM anon;

ALTER TABLE public.demandas ADD COLUMN recorrencia_id uuid REFERENCES public.demandas_recorrencias(id) ON DELETE SET NULL;
ALTER TABLE public.demandas ADD COLUMN recorrencia_data date;
CREATE UNIQUE INDEX demandas_recorrencia_unica ON public.demandas (tenant_id,recorrencia_id,recorrencia_data)
 WHERE recorrencia_id IS NOT NULL;
ALTER TABLE public.demandas ADD CONSTRAINT demandas_recorrencia_coerente CHECK (
  (recorrencia_id IS NULL AND recorrencia_data IS NULL) OR
  (recorrencia_id IS NOT NULL AND recorrencia_data IS NOT NULL)
);

-- Notificações de e-mail: armazenadas em fila para não atrasar nem perder a demanda se o SMTP falhar.
CREATE TABLE public.demandas_email_pendentes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 demanda_id uuid NOT NULL REFERENCES public.demandas(id) ON DELETE CASCADE,
 destinatario_id uuid NOT NULL REFERENCES public.usuarios(id),
 tipo text NOT NULL DEFAULT 'atribuicao' CHECK (tipo IN ('atribuicao')),
 situacao text NOT NULL DEFAULT 'pendente' CHECK (situacao IN ('pendente','enviando','enviado','erro')),
 tentativas integer NOT NULL DEFAULT 0,
 proxima_tentativa timestamptz NOT NULL DEFAULT now(),
 enviada_em timestamptz,
 ultimo_erro text,
 criada_em timestamptz NOT NULL DEFAULT now(),
 UNIQUE (demanda_id,destinatario_id,tipo)
);
CREATE INDEX demandas_email_fila_idx ON public.demandas_email_pendentes (situacao,proxima_tentativa)
 WHERE situacao IN ('pendente','erro');
ALTER TABLE public.demandas_email_pendentes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.demandas_email_pendentes FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.demandas_email_enfileirar() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 INSERT INTO public.demandas_email_pendentes (tenant_id,demanda_id,destinatario_id,tipo)
 VALUES (NEW.tenant_id,NEW.id,NEW.responsavel_id,'atribuicao')
 ON CONFLICT (demanda_id,destinatario_id,tipo) DO NOTHING;
 RETURN NEW;
END $$;
CREATE TRIGGER demandas_email_atribuicao AFTER INSERT ON public.demandas
 FOR EACH ROW EXECUTE FUNCTION public.demandas_email_enfileirar();
REVOKE ALL ON FUNCTION public.demandas_email_enfileirar() FROM PUBLIC,anon,authenticated;
