import { createClient } from "@/lib/supabase/server";
import { BotaoEnviar } from "@/components/botao-enviar";
import { vincularCorretor } from "./actions";
export async function VinculosCorretores({ tenantId }: { tenantId: string }) {
 const supabase = await createClient();
 const [corretores, contas, vendas] = await Promise.all([
  supabase.from("corretores").select("id,nome,usuario_id").eq("tenant_id",tenantId).order("nome"),
  supabase.from("usuarios").select("id,nome,ativo,nivel_acesso").eq("tenant_id",tenantId).order("nome"),
  supabase.from("processos").select("id",{ count:"exact",head:true }).eq("categoria","venda").is("corretor_id",null),
 ]);
 if (corretores.error || contas.error || vendas.error) return <p role="alert">Não foi possível carregar os vínculos dos corretores.</p>;
 return <section className="mt-6 rounded-xl border border-border bg-white p-5"><h2 className="text-xl font-semibold">Vínculos dos corretores</h2><p className="mt-2 text-sm text-ink-muted">Confirme qual conta pertence a cada cadastro. A conta verá somente as vendas atribuídas a esse corretor. Um cadastro histórico da mesma pessoa também pode ser vinculado à conta dela.</p>{!!vendas.count && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{vendas.count} venda(s) sem corretor definido. Atribua o corretor no cadastro do processo para liberar o acompanhamento.</p>}
 <div className="mt-4 space-y-3">{(corretores.data ?? []).map((c) => <form key={c.id} action={vincularCorretor} className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-end"><input type="hidden" name="corretor_id" value={c.id}/><input type="hidden" name="vinculo_anterior" value={c.usuario_id ?? ""}/><label className="min-w-0 flex-1 text-sm font-semibold">{c.nome}<select name="conta_corretor_id" defaultValue={c.usuario_id ?? ""} className="mt-2 w-full rounded-lg border border-border px-3 py-2 font-normal"><option value="">Sem conta vinculada</option>{(contas.data ?? []).filter((u) => (u.ativo && u.nivel_acesso === "corretor") || u.id === c.usuario_id).map((u) => <option key={u.id} value={u.id} disabled={!u.ativo || u.nivel_acesso !== "corretor"}>{u.nome}{!u.ativo ? " (desativada)" : u.nivel_acesso !== "corretor" ? " (outro nível de acesso)" : ""}</option>)}</select></label><BotaoEnviar textoEnviando="Salvando…" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">Salvar vínculo</BotaoEnviar></form>)}</div></section>;
}
