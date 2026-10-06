import Link from "next/link";
import { KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { carregarPermissoes } from "./dados";

/** Atalho na página da venda: abre o termo existente ou a tela de novo termo já com a venda escolhida. */
export async function AtalhoTermoEntrega({ processoId }: { processoId: string }) {
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario) return null;
  const supabase = await createClient();
  const perms = await carregarPermissoes(supabase, user.id, usuario.nivel_acesso);
  if (!perms.ver) return null;
  const { data: termo } = await supabase.from("termos_entrega").select("id").eq("processo_id", processoId).neq("status", "cancelado").order("criado_em", { ascending: false }).limit(1).maybeSingle();
  if (!termo && !perms.operar) return null;
  return (
    <Link
      href={termo ? `/vendas/termos-entrega/${termo.id}` : `/vendas/termos-entrega/novo?processo=${processoId}`}
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-2 text-xs font-semibold text-ink hover:bg-background"
    >
      <KeyRound size={14} /> {termo ? "Termo de entrega de chaves" : "Criar termo de entrega de chaves"}
    </Link>
  );
}
