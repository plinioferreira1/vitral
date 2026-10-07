import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual, GESTORES } from "@/lib/usuario-atual";
import { obterSiteUrl } from "@/lib/site-url";
import { traduzirErroAuth } from "@/lib/erros-auth";
import { UsuariosAcessos } from "./usuarios-acessos";

export const maxDuration = 60;

export default async function MembrosPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; sucesso?: string }>;
}) {
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.tenant_id) redirect("/login");
  if (!GESTORES.includes(usuario.nivel_acesso)) redirect("/");
  const supabase = await createClient();
  const [sp, membros, categorias, convites, colaboradores, siteUrl] =
    await Promise.all([
      searchParams,
      supabase
        .from("usuarios")
        .select("id, nome, email, perfil, nivel_acesso, ativo")
        .eq("tenant_id", usuario.tenant_id)
        .order("nome"),
      supabase.from("usuario_categorias").select("usuario_id, categoria"),
      supabase
        .from("convites")
        .select(
          "id, email, perfil, nivel_acesso, token, criado_em, expira_em, categorias",
        )
        .eq("tenant_id", usuario.tenant_id)
        .is("usado_em", null)
        .order("criado_em", { ascending: false }),
      supabase
        .from("dp_colaboradores")
        .select("id, nome, usuario_id, gestor_id, cargo, departamento")
        .eq("tenant_id", usuario.tenant_id)
        .order("nome"),
      obterSiteUrl(),
    ]);
  const erroConsulta = [membros, categorias, convites, colaboradores].some(
    (r) => r.error,
  );
  if (erroConsulta)
    return (
      <div
        role="alert"
        className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800"
      >
        Não foi possível carregar Usuários e Acessos. Atualize a página para
        tentar novamente.
      </div>
    );
  return (
    <>
      {sp.erro && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
        >
          {traduzirErroAuth(sp.erro)}
        </p>
      )}
      {sp.sucesso && (
        <p
          role="status"
          className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
        >
          Link de redefinição enviado para {sp.sucesso} pessoa(s).
        </p>
      )}
      <UsuariosAcessos
        meuId={user.id}
        membros={(membros.data ?? []).map((m) => ({
          ...m,
          categorias: (categorias.data ?? [])
            .filter((c) => c.usuario_id === m.id)
            .map((c) => c.categoria),
        }))}
        colaboradores={colaboradores.data ?? []}
        convites={(convites.data ?? []).map((c) => ({
          ...c,
          url: `${siteUrl}/login?convite=${c.token}`,
        }))}
        agora={new Date().toISOString()}
      />
    </>
  );
}
