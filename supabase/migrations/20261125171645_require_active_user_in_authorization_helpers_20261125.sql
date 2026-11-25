-- Aplicada direto no banco de produção (frente de segurança) em 20261125.
-- Arquivo criado em 25/11/2026 a partir de supabase_migrations.schema_migrations,
-- com o SQL exato, para o repositório acompanhar o banco e o db push não parar.

CREATE OR REPLACE FUNCTION public.usuario_eh_gestor()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $f$
  select exists (
    select 1 from public.usuarios u
    where u.id=(select auth.uid()) and u.ativo is true
      and u.nivel_acesso in ('diretor','gerente')
  )
$f$;
CREATE OR REPLACE FUNCTION public.usuario_pode_editar()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $f$
  select exists (
    select 1 from public.usuarios u
    where u.id=(select auth.uid()) and u.ativo is true
      and u.nivel_acesso not in ('auxiliar','corretor')
  )
$f$;
CREATE OR REPLACE FUNCTION public.usuario_pode_criar_documento_cliente()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $f$
  select exists (
    select 1 from public.usuarios u
    where u.id=(select auth.uid()) and u.ativo is true
      and u.nivel_acesso <> 'auxiliar'
  )
$f$;
CREATE OR REPLACE FUNCTION public.usuario_pode_ver_documento_cliente(p_categoria public.categoria_processo)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $f$
  select exists (
    select 1 from public.usuarios u
    where u.id=(select auth.uid()) and u.ativo is true
      and (
        public.usuario_tem_categoria(p_categoria)
        or u.nivel_acesso='corretor'
      )
  )
$f$;
CREATE OR REPLACE FUNCTION public.usuario_pode_ver_documento_cliente(p_categoria public.categoria_processo,p_criado_por uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $f$
  select exists (
    select 1 from public.usuarios u
    where u.id=(select auth.uid()) and u.ativo is true
      and (
        public.usuario_tem_categoria(p_categoria)
        or p_criado_por=u.id
      )
  )
$f$;
