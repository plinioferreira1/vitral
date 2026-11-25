-- Atributos de contrato administrativo para registrar a carteira de locações a partir dos documentos assinados.
-- Preserva as contas históricas; não altera os modelos de minutas.
ALTER TABLE public.contratos_locacao
 ADD COLUMN IF NOT EXISTS vigencia_inicio date,
 ADD COLUMN IF NOT EXISTS vigencia_fim date,
 ADD COLUMN IF NOT EXISTS aluguel_valor numeric(14,2),
 ADD COLUMN IF NOT EXISTS aluguel_dia_vencimento smallint,
 ADD COLUMN IF NOT EXISTS primeiro_aluguel_vencimento date,
 ADD COLUMN IF NOT EXISTS desconto_pontualidade numeric(14,2),
 ADD COLUMN IF NOT EXISTS garantia_locaticia text,
 ADD COLUMN IF NOT EXISTS locatarios_adicionais jsonb NOT NULL DEFAULT '[]'::jsonb,
 ADD COLUMN IF NOT EXISTS documento_origem_url text;

DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='contratos_locacao_vigencia_ordem' AND conrelid='public.contratos_locacao'::regclass) THEN
   ALTER TABLE public.contratos_locacao ADD CONSTRAINT contratos_locacao_vigencia_ordem
    CHECK(vigencia_fim IS NULL OR vigencia_inicio IS NULL OR vigencia_fim >= vigencia_inicio);
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='contratos_locacao_dia_vencimento' AND conrelid='public.contratos_locacao'::regclass) THEN
   ALTER TABLE public.contratos_locacao ADD CONSTRAINT contratos_locacao_dia_vencimento
    CHECK(aluguel_dia_vencimento IS NULL OR aluguel_dia_vencimento BETWEEN 1 AND 31);
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='contratos_locacao_aluguel_nao_negativo' AND conrelid='public.contratos_locacao'::regclass) THEN
   ALTER TABLE public.contratos_locacao ADD CONSTRAINT contratos_locacao_aluguel_nao_negativo
    CHECK(aluguel_valor IS NULL OR aluguel_valor >= 0);
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='contratos_locacao_desconto_nao_negativo' AND conrelid='public.contratos_locacao'::regclass) THEN
   ALTER TABLE public.contratos_locacao ADD CONSTRAINT contratos_locacao_desconto_nao_negativo
    CHECK(desconto_pontualidade IS NULL OR desconto_pontualidade >= 0);
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='contratos_locacao_locatarios_json' AND conrelid='public.contratos_locacao'::regclass) THEN
   ALTER TABLE public.contratos_locacao ADD CONSTRAINT contratos_locacao_locatarios_json
    CHECK(jsonb_typeof(locatarios_adicionais)='array');
 END IF;
END $$;
