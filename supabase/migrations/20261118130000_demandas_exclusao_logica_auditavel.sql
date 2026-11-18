-- Exclusão lógica auditável, reservada à gestão. Nunca apaga histórico, áudios ou notificações.
ALTER TABLE public.demandas
  ADD COLUMN IF NOT EXISTS excluida_em timestamptz,
  ADD COLUMN IF NOT EXISTS excluida_por uuid REFERENCES public.usuarios(id);
ALTER TABLE public.demandas ADD CONSTRAINT demandas_exclusao_coerente
  CHECK ((excluida_em IS NULL AND excluida_por IS NULL)
      OR (excluida_em IS NOT NULL AND excluida_por IS NOT NULL));
CREATE INDEX IF NOT EXISTS demandas_lixeira_idx
  ON public.demandas(tenant_id,excluida_em DESC) WHERE excluida_em IS NOT NULL;

-- Restringe tarefas excluídas aos gestores; colaborador perde a visibilidade imediatamente.
DROP POLICY IF EXISTS demandas_leitura ON public.demandas;
CREATE POLICY demandas_leitura ON public.demandas FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.usuarios u
    WHERE u.id=(SELECT auth.uid()) AND u.ativo AND u.tenant_id=demandas.tenant_id
      AND (u.nivel_acesso::text IN ('diretor','gerente')
        OR (demandas.excluida_em IS NULL AND demandas.responsavel_id=u.id)))
);

DROP POLICY IF EXISTS demandas_mudar_status ON public.demandas;
CREATE POLICY demandas_mudar_status ON public.demandas FOR UPDATE TO authenticated
USING (EXISTS(SELECT 1 FROM public.usuarios u
  WHERE u.id=(SELECT auth.uid()) AND u.ativo AND u.tenant_id=demandas.tenant_id
  AND (u.nivel_acesso::text IN ('diretor','gerente')
    OR (demandas.excluida_em IS NULL AND demandas.responsavel_id=u.id))))
WITH CHECK (EXISTS(SELECT 1 FROM public.usuarios u
  WHERE u.id=(SELECT auth.uid()) AND u.ativo AND u.tenant_id=demandas.tenant_id
  AND (u.nivel_acesso::text IN ('diretor','gerente')
    OR (demandas.excluida_em IS NULL AND demandas.responsavel_id=u.id))));

CREATE OR REPLACE FUNCTION public.demandas_guarda_integridade()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE gestor boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sessão não autenticada.'; END IF;
  SELECT u.nivel_acesso::text IN ('diretor','gerente') INTO gestor
    FROM public.usuarios u WHERE u.id=auth.uid() AND u.ativo AND u.tenant_id=OLD.tenant_id;

  IF (to_jsonb(NEW) - 'status' - 'atualizada_em' - 'concluida_em' - 'excluida_em' - 'excluida_por')
    IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'atualizada_em' - 'concluida_em' - 'excluida_em' - 'excluida_por') THEN
    RAISE EXCEPTION 'Campos da demanda não podem ser alterados por esta operação.';
  END IF;

  IF (NEW.excluida_em, NEW.excluida_por) IS DISTINCT FROM (OLD.excluida_em, OLD.excluida_por) THEN
    IF NOT COALESCE(gestor,false) THEN
      RAISE EXCEPTION 'Apenas gestores podem excluir ou restaurar demandas.';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Não altere situação e exclusão na mesma operação.';
    END IF;
    IF OLD.excluida_em IS NULL THEN
      IF NEW.excluida_em IS NULL OR NEW.excluida_por IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Exclusão deve registrar gestor e data.';
      END IF;
    ELSE
      IF NEW.excluida_em IS NOT NULL OR NEW.excluida_por IS NOT NULL THEN
        RAISE EXCEPTION 'Restauração deve limpar ambos os campos.';
      END IF;
    END IF;
  ELSIF OLD.excluida_em IS NOT NULL AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Restaure a demanda antes de alterar seu andamento.';
  END IF;

  IF OLD.status='concluida' AND NEW.status<>OLD.status AND NOT COALESCE(gestor,false) THEN
    RAISE EXCEPTION 'Apenas a gestão pode reabrir demanda concluída.';
  END IF;
  NEW.atualizada_em=now();
  NEW.concluida_em=CASE WHEN NEW.status='concluida' THEN COALESCE(OLD.concluida_em,now()) ELSE NULL END;
  RETURN NEW;
END $$;

ALTER TABLE public.demandas_atualizacoes DROP CONSTRAINT IF EXISTS demandas_atualizacoes_tipo_check;
ALTER TABLE public.demandas_atualizacoes ADD CONSTRAINT demandas_atualizacoes_tipo_check
  CHECK (tipo IN ('criacao','comentario','status','exclusao','restauracao'));

CREATE OR REPLACE FUNCTION public.demandas_registrar_exclusao()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF OLD.excluida_em IS NULL AND NEW.excluida_em IS NOT NULL THEN
    INSERT INTO public.demandas_atualizacoes(tenant_id,demanda_id,autor_id,tipo,comentario)
    VALUES(NEW.tenant_id,NEW.id,auth.uid(),'exclusao','Demanda movida para a lixeira');
  ELSIF OLD.excluida_em IS NOT NULL AND NEW.excluida_em IS NULL THEN
    INSERT INTO public.demandas_atualizacoes(tenant_id,demanda_id,autor_id,tipo,comentario)
    VALUES(NEW.tenant_id,NEW.id,auth.uid(),'restauracao','Demanda restaurada');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS demandas_auditar_exclusao ON public.demandas;
CREATE TRIGGER demandas_auditar_exclusao AFTER UPDATE ON public.demandas
 FOR EACH ROW EXECUTE FUNCTION public.demandas_registrar_exclusao();
REVOKE ALL ON FUNCTION public.demandas_registrar_exclusao() FROM PUBLIC,anon,authenticated;
