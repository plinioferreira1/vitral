import { carregarCaucoes, csvCaucoes } from "@/lib/locacao/caucoes-relatorio";
import { getPermissoesUsuario } from "@/lib/permissoes";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";

/** Planilha das cauções (CSV para Excel). */
export async function GET() {
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.tenant_id || !usuario.ativo) return new Response("Entre no Vitral novamente.", { status: 401 });
  const supabase = await createClient();
  const perms = await getPermissoesUsuario(supabase, user.id, usuario.nivel_acesso);
  if (!perms.temLocacao || perms.ehCorretor || perms.ehSocialMedia) return new Response("Sem permissão.", { status: 403 });
  const csv = csvCaucoes(await carregarCaucoes(supabase, usuario.tenant_id));
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="caucoes-locacao-${hoje}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
