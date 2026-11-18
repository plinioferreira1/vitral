-- Central de Demandas: gestão interna, colaboração e notificações sem serviços externos.
-- Migração aditiva. Todo acesso é isolado por tenant e usuário autenticado.
CREATE TABLE public.demandas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  titulo text NOT NULL CHECK (char_length(btrim(titulo)) BETWEEN 4 AND 180),
  descricao text,
  solicitante_id uuid NOT NULL REFERENCES public.usuarios(id),
  responsavel_id uuid NOT NULL REFERENCES public.usuarios(id),
  processo_id uuid REFERENCES public.processos(id) ON DELETE SET NULL,
  prazo date,
  prioridade text NOT NULL DEFAULT 'normal' CHECK (prioridade IN ('baixa','normal','alta','urgente')),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','em_andamento','aguardando','bloqueada','concluida')),
  criada_em timestamptz NOT NULL DEFAULT now(),
  atualizada_em timestamptz NOT NULL DEFAULT now(),
  concluida_em timestamptz
);
-- Chave idempotente de distribuição por áudio/lote para evitar tarefas duplicadas.
ALTER TABLE public.demandas ADD COLUMN lote_id uuid, ADD COLUMN lote_item smallint;
ALTER TABLE public.demandas ADD CONSTRAINT demandas_lote_coerente CHECK (
  (lote_id IS NULL AND lote_item IS NULL) OR
  (lote_id IS NOT NULL AND lote_item BETWEEN 1 AND 10)
);
CREATE UNIQUE INDEX demandas_lote_unico_idx ON public.demandas (tenant_id,lote_id,lote_item)
  WHERE lote_id IS NOT NULL;
CREATE INDEX demandas_responsavel_idx ON public.demandas (tenant_id,responsavel_id,status,prazo);
CREATE INDEX demandas_solicitante_idx ON public.demandas (tenant_id,solicitante_id,criada_em DESC);
CREATE TABLE public.demandas_atualizacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  demanda_id uuid NOT NULL REFERENCES public.demandas(id) ON DELETE CASCADE,
  autor_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  tipo text NOT NULL CHECK (tipo IN ('criacao','comentario','status')),
  comentario text CHECK (comentario IS NULL OR char_length(btrim(comentario)) BETWEEN 1 AND 2000),
  status_anterior text,
  status_novo text,
  criada_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX demandas_atualizacoes_demanda_idx ON public.demandas_atualizacoes(demanda_id,criada_em DESC);

CREATE TABLE public.demandas_notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  demanda_id uuid NOT NULL REFERENCES public.demandas(id) ON DELETE CASCADE,
  destinatario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  mensagem text NOT NULL,
  lida_em timestamptz,
  criada_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX demandas_notificacoes_pendentes_idx ON public.demandas_notificacoes(tenant_id,destinatario_id,criada_em DESC) WHERE lida_em IS NULL;

ALTER TABLE public.demandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demandas_atualizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demandas_notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY demandas_leitura ON public.demandas FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id=(SELECT auth.uid()) AND u.ativo AND u.tenant_id=demandas.tenant_id
    AND (u.nivel_acesso::text IN ('diretor','gerente') OR demandas.responsavel_id=u.id OR demandas.solicitante_id=u.id))
);
CREATE POLICY demandas_cadastro ON public.demandas FOR INSERT TO authenticated WITH CHECK (
  solicitante_id=(SELECT auth.uid())
  AND EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id=(SELECT auth.uid()) AND u.ativo AND u.tenant_id=demandas.tenant_id
    AND u.nivel_acesso::text IN ('diretor','gerente'))
  AND EXISTS (SELECT 1 FROM public.usuarios destino WHERE destino.id=demandas.responsavel_id AND destino.ativo AND destino.tenant_id=demandas.tenant_id)
  AND (processo_id IS NULL OR EXISTS (SELECT 1 FROM public.processos p WHERE p.id=demandas.processo_id AND p.tenant_id=demandas.tenant_id))
);
CREATE POLICY demandas_mudar_status ON public.demandas FOR UPDATE TO authenticated
 USING (EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id=(SELECT auth.uid()) AND u.ativo AND u.tenant_id=demandas.tenant_id
   AND (u.nivel_acesso::text IN ('diretor','gerente') OR demandas.responsavel_id=u.id)))
 WITH CHECK (EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id=(SELECT auth.uid()) AND u.ativo AND u.tenant_id=demandas.tenant_id
   AND (u.nivel_acesso::text IN ('diretor','gerente') OR demandas.responsavel_id=u.id)));
CREATE POLICY demandas_atualizacoes_leitura ON public.demandas_atualizacoes FOR SELECT TO authenticated
 USING (EXISTS (SELECT 1 FROM public.demandas d WHERE d.id=demandas_atualizacoes.demanda_id AND d.tenant_id=demandas_atualizacoes.tenant_id));
CREATE POLICY demandas_atualizacoes_comentar ON public.demandas_atualizacoes FOR INSERT TO authenticated WITH CHECK (
  autor_id=(SELECT auth.uid()) AND tipo='comentario' AND comentario IS NOT NULL
  AND status_anterior IS NULL AND status_novo IS NULL
  AND EXISTS (SELECT 1 FROM public.demandas d WHERE d.id=demandas_atualizacoes.demanda_id AND d.tenant_id=demandas_atualizacoes.tenant_id)
);
CREATE POLICY demandas_notificacoes_leitura ON public.demandas_notificacoes FOR SELECT TO authenticated USING (
  destinatario_id=(SELECT auth.uid()) AND
  EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id=(SELECT auth.uid()) AND u.ativo AND u.tenant_id=demandas_notificacoes.tenant_id)
);
-- Notificações são geradas exclusivamente pelos gatilhos. Usuário não altera seus campos além de marcar leitura.
CREATE POLICY demandas_notificacoes_marcar_lida ON public.demandas_notificacoes FOR UPDATE TO authenticated
 USING (destinatario_id=(SELECT auth.uid()) AND
   EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id=(SELECT auth.uid()) AND u.ativo AND u.tenant_id=demandas_notificacoes.tenant_id))
 WITH CHECK (destinatario_id=(SELECT auth.uid()) AND
   EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id=(SELECT auth.uid()) AND u.ativo AND u.tenant_id=demandas_notificacoes.tenant_id));

CREATE FUNCTION public.demandas_guarda_integridade() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
 SET search_path = '' AS $$
DECLARE gestor boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sessão não autenticada.'; END IF;
  SELECT u.nivel_acesso::text IN ('diretor','gerente') INTO gestor
    FROM public.usuarios u WHERE u.id=auth.uid() AND u.ativo AND u.tenant_id=OLD.tenant_id;
  IF (to_jsonb(NEW) - 'status' - 'atualizada_em' - 'concluida_em')
    IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'atualizada_em' - 'concluida_em') THEN
    RAISE EXCEPTION 'Campos da demanda não podem ser alterados por esta operação.';
  END IF;
  IF OLD.status='concluida' AND NEW.status<>OLD.status AND NOT COALESCE(gestor,false)
    THEN RAISE EXCEPTION 'Apenas a gestão pode reabrir demanda concluída.'; END IF;
  NEW.atualizada_em=now();
  NEW.concluida_em=CASE WHEN NEW.status='concluida' THEN COALESCE(OLD.concluida_em,now()) ELSE NULL END;
  RETURN NEW;
END $$;
CREATE TRIGGER demandas_guardar BEFORE UPDATE ON public.demandas
 FOR EACH ROW EXECUTE FUNCTION public.demandas_guarda_integridade();

CREATE FUNCTION public.demandas_registrar_criacao() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
 SET search_path = '' AS $$
BEGIN
  INSERT INTO public.demandas_atualizacoes(tenant_id,demanda_id,autor_id,tipo,comentario,status_novo)
   VALUES(NEW.tenant_id,NEW.id,NEW.solicitante_id,'criacao','Demanda criada',NEW.status);
  IF NEW.responsavel_id<>NEW.solicitante_id THEN
    INSERT INTO public.demandas_notificacoes(tenant_id,demanda_id,destinatario_id,titulo,mensagem)
      VALUES(NEW.tenant_id,NEW.id,NEW.responsavel_id,'Nova demanda',NEW.titulo);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER demandas_criacao AFTER INSERT ON public.demandas
 FOR EACH ROW EXECUTE FUNCTION public.demandas_registrar_criacao();

CREATE FUNCTION public.demandas_registrar_status() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
 SET search_path = '' AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.demandas_atualizacoes(tenant_id,demanda_id,autor_id,tipo,status_anterior,status_novo)
      VALUES(NEW.tenant_id,NEW.id,auth.uid(),'status',OLD.status,NEW.status);
    IF NEW.solicitante_id<>auth.uid() THEN
      INSERT INTO public.demandas_notificacoes(tenant_id,demanda_id,destinatario_id,titulo,mensagem)
        VALUES(NEW.tenant_id,NEW.id,NEW.solicitante_id,'Demanda atualizada',NEW.titulo || ' — ' || NEW.status);
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER demandas_status AFTER UPDATE ON public.demandas
 FOR EACH ROW EXECUTE FUNCTION public.demandas_registrar_status();

CREATE FUNCTION public.demandas_registrar_comentario() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
 SET search_path = '' AS $$
DECLARE d public.demandas%ROWTYPE; destino uuid;
BEGIN
  SELECT * INTO d FROM public.demandas WHERE id=NEW.demanda_id;
  IF NEW.tenant_id<>d.tenant_id THEN RAISE EXCEPTION 'Empresa incompatível.'; END IF;
  IF NEW.tipo='comentario' THEN
    destino:=CASE WHEN NEW.autor_id=d.solicitante_id THEN d.responsavel_id ELSE d.solicitante_id END;
    IF destino IS DISTINCT FROM NEW.autor_id THEN
      INSERT INTO public.demandas_notificacoes(tenant_id,demanda_id,destinatario_id,titulo,mensagem)
        VALUES(NEW.tenant_id,NEW.demanda_id,destino,'Novo comentário na demanda',d.titulo);
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER demandas_comentario AFTER INSERT ON public.demandas_atualizacoes
 FOR EACH ROW EXECUTE FUNCTION public.demandas_registrar_comentario();

CREATE FUNCTION public.demandas_notificacao_guardar() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
 SET search_path = '' AS $$
BEGIN
  IF (to_jsonb(NEW) - 'lida_em') IS DISTINCT FROM (to_jsonb(OLD) - 'lida_em')
     THEN RAISE EXCEPTION 'Somente leitura pode ser alterada.'; END IF;
  IF NEW.lida_em IS NULL THEN NEW.lida_em=COALESCE(OLD.lida_em,now()); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER demandas_notificacao_update BEFORE UPDATE ON public.demandas_notificacoes
 FOR EACH ROW EXECUTE FUNCTION public.demandas_notificacao_guardar();

GRANT SELECT, INSERT, UPDATE ON public.demandas TO authenticated;
GRANT SELECT, INSERT ON public.demandas_atualizacoes TO authenticated;
GRANT SELECT, UPDATE ON public.demandas_notificacoes TO authenticated;
REVOKE ALL ON public.demandas,public.demandas_atualizacoes,public.demandas_notificacoes FROM anon;

-- Funções de gatilho não precisam ser acessadas pela API. Conservar somente uso por triggers.
REVOKE ALL ON FUNCTION public.demandas_guarda_integridade() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.demandas_registrar_criacao() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.demandas_registrar_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.demandas_registrar_comentario() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.demandas_notificacao_guardar() FROM PUBLIC, anon, authenticated;
