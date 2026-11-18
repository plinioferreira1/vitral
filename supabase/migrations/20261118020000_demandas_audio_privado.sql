-- Central de Demandas: visibilidade exclusiva de responsáveis e da gestão.
-- Antigos solicitantes não gestores não podem continuar enxergando tarefas após mudança de cargo.
DROP POLICY IF EXISTS demandas_leitura ON public.demandas;
CREATE POLICY demandas_leitura ON public.demandas FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = (SELECT auth.uid()) AND u.ativo AND u.tenant_id = demandas.tenant_id
      AND (u.nivel_acesso::text IN ('diretor','gerente') OR demandas.responsavel_id = u.id)
  )
);

-- Áudios privados ligados a uma única demanda.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('demandas-audios','demandas-audios',false,4194304,
  ARRAY['audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/wav','audio/x-wav','audio/x-m4a','audio/aac'])
ON CONFLICT (id) DO UPDATE SET public=false, file_size_limit=4194304,
  allowed_mime_types=EXCLUDED.allowed_mime_types;

CREATE TABLE public.demandas_audios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  demanda_id uuid NOT NULL REFERENCES public.demandas(id) ON DELETE CASCADE,
  autor_id uuid NOT NULL REFERENCES public.usuarios(id),
  caminho text NOT NULL UNIQUE,
  mime_type text NOT NULL,
  tamanho_bytes integer NOT NULL CHECK (tamanho_bytes BETWEEN 1 AND 4194304),
  nome_original text,
  criada_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX demandas_audios_demanda_idx ON public.demandas_audios (demanda_id,criada_em DESC);
ALTER TABLE public.demandas_audios ENABLE ROW LEVEL SECURITY;
CREATE POLICY demandas_audios_leitura ON public.demandas_audios FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.demandas d
    WHERE d.id=demandas_audios.demanda_id AND d.tenant_id=demandas_audios.tenant_id)
);
GRANT SELECT ON public.demandas_audios TO authenticated;
REVOKE ALL ON public.demandas_audios FROM anon;
-- A escrita dos metadados/arquivos é feita no servidor após checagem da demanda.

-- Avisar o outro participante quando chegar uma resposta por áudio.
CREATE FUNCTION public.demandas_notificar_audio() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  tarefa public.demandas%ROWTYPE;
  destino uuid;
BEGIN
  SELECT * INTO tarefa FROM public.demandas WHERE id=NEW.demanda_id;
  IF tarefa.tenant_id<>NEW.tenant_id THEN
    RAISE EXCEPTION 'Áudio pertence a outra empresa.';
  END IF;
  destino:=CASE WHEN NEW.autor_id=tarefa.solicitante_id
    THEN tarefa.responsavel_id ELSE tarefa.solicitante_id END;
  IF destino IS DISTINCT FROM NEW.autor_id THEN
    INSERT INTO public.demandas_notificacoes
      (tenant_id,demanda_id,destinatario_id,titulo,mensagem)
    VALUES (NEW.tenant_id,NEW.demanda_id,destino,
      'Novo áudio na demanda',tarefa.titulo);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER demandas_audio_notificar AFTER INSERT ON public.demandas_audios
FOR EACH ROW EXECUTE FUNCTION public.demandas_notificar_audio();
REVOKE ALL ON FUNCTION public.demandas_notificar_audio() FROM PUBLIC,anon,authenticated;
