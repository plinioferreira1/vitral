-- Categorias customizáveis por empresa, incluindo as cinco opções iniciais da Sacra.
CREATE TABLE public.demandas_categorias (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 nome text NOT NULL CHECK (char_length(btrim(nome)) BETWEEN 2 AND 60),
 ativa boolean NOT NULL DEFAULT true,
 criada_em timestamptz NOT NULL DEFAULT now(),
 criada_por uuid REFERENCES public.usuarios(id),
 CONSTRAINT demandas_categorias_unica UNIQUE (tenant_id,nome),
 CONSTRAINT demandas_categorias_tenant_id_id UNIQUE (tenant_id,id)
);
CREATE INDEX demandas_categorias_tenant_ativas ON public.demandas_categorias (tenant_id,ativa,nome);
ALTER TABLE public.demandas_categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY demandas_categorias_leitura ON public.demandas_categorias
 FOR SELECT TO authenticated USING(
 EXISTS(SELECT 1 FROM public.usuarios u WHERE u.id=(SELECT auth.uid()) AND u.ativo
 AND u.tenant_id=demandas_categorias.tenant_id));
CREATE POLICY demandas_categorias_cadastro ON public.demandas_categorias
 FOR INSERT TO authenticated WITH CHECK(
 criada_por=(SELECT auth.uid()) AND
 EXISTS(SELECT 1 FROM public.usuarios u WHERE u.id=(SELECT auth.uid()) AND u.ativo
 AND u.tenant_id=demandas_categorias.tenant_id AND u.nivel_acesso::text IN ('diretor','gerente')));
CREATE POLICY demandas_categorias_edicao ON public.demandas_categorias
 FOR UPDATE TO authenticated USING(
 EXISTS(SELECT 1 FROM public.usuarios u WHERE u.id=(SELECT auth.uid()) AND u.ativo
 AND u.tenant_id=demandas_categorias.tenant_id AND u.nivel_acesso::text IN ('diretor','gerente')))
 WITH CHECK(
 EXISTS(SELECT 1 FROM public.usuarios u WHERE u.id=(SELECT auth.uid()) AND u.ativo
 AND u.tenant_id=demandas_categorias.tenant_id AND u.nivel_acesso::text IN ('diretor','gerente')));
GRANT SELECT,INSERT,UPDATE ON public.demandas_categorias TO authenticated;
REVOKE ALL ON public.demandas_categorias FROM anon;

-- Categorias antigas continuam opcionalmente nulas. Novas tarefas exigem categoria na ação de cadastro.
ALTER TABLE public.demandas ADD COLUMN categoria_id uuid;
ALTER TABLE public.demandas_recorrencias ADD COLUMN categoria_id uuid;
ALTER TABLE public.demandas ADD CONSTRAINT demandas_categoria_empresa_fk
 FOREIGN KEY(tenant_id,categoria_id) REFERENCES public.demandas_categorias(tenant_id,id);
ALTER TABLE public.demandas_recorrencias ADD CONSTRAINT demandas_recorrencia_categoria_empresa_fk
 FOREIGN KEY(tenant_id,categoria_id) REFERENCES public.demandas_categorias(tenant_id,id);
CREATE INDEX demandas_categoria_idx ON public.demandas (tenant_id,categoria_id);
CREATE INDEX demandas_recorrencias_categoria_idx ON public.demandas_recorrencias (tenant_id,categoria_id);

INSERT INTO public.demandas_categorias(tenant_id,nome)
 SELECT t.id,n.nome FROM public.tenants t
 CROSS JOIN (VALUES ('Vendas'),('Locação'),('Correspondente'),('Administrativo'),('Marketing')) AS n(nome)
 ON CONFLICT (tenant_id,nome) DO NOTHING;

-- Identidade da categoria é imutável; só o nome e estado podem ser ajustados pela gestão.
CREATE FUNCTION public.demandas_categorias_guardar() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.id IS DISTINCT FROM OLD.id OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
 OR NEW.criada_por IS DISTINCT FROM OLD.criada_por OR NEW.criada_em IS DISTINCT FROM OLD.criada_em
 THEN RAISE EXCEPTION 'Identidade da categoria não pode ser alterada'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER demandas_categorias_guardar BEFORE UPDATE ON public.demandas_categorias
 FOR EACH ROW EXECUTE FUNCTION public.demandas_categorias_guardar();
REVOKE ALL ON FUNCTION public.demandas_categorias_guardar() FROM PUBLIC,anon,authenticated;
