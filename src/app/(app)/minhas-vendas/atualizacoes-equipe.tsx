import { getUsuarioAtual, GESTORES } from "@/lib/usuario-atual";
import { createClient } from "@/lib/supabase/server";
import { BotaoEnviar } from "@/components/botao-enviar";
import { publicarAtualizacaoCorretor } from "./actions-equipe";
import type { SupabaseClient } from "@supabase/supabase-js";
export async function AtualizacoesCorretor({ processoId }: { processoId: string }) {
 const { usuario } = await getUsuarioAtual();
 if (!usuario?.ativo || !GESTORES.includes(usuario.nivel_acesso)) return null;
 const supabase=await createClient() as unknown as SupabaseClient;
 const { data, error } = await supabase.from("processo_atualizacoes_corretor").select("id,mensagem,criado_em").eq("processo_id",processoId).order("criado_em",{ascending:false});
 return <section className="rounded-xl border border-border bg-white p-5"><h2 className="font-semibold">Atualizações para o corretor</h2><p className="mt-2 text-sm text-ink-muted">Tudo que for publicado aqui ficará visível ao corretor vinculado à venda. As observações internas continuam separadas.</p>{error ? <p role="alert" className="mt-3 text-sm">Não foi possível carregar as atualizações.</p> : <><form action={publicarAtualizacaoCorretor} className="mt-4 space-y-3"><input type="hidden" name="processo_id" value={processoId}/><label className="block text-sm font-medium">Informação ou pendência para o corretor<textarea name="mensagem" required maxLength={2000} className="mt-2 min-h-24 w-full rounded-lg border border-border p-3" /></label><BotaoEnviar textoEnviando="Publicando…" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">Publicar para o corretor</BotaoEnviar></form><ul className="mt-4 space-y-3">{(data ?? []).map((a) => <li key={a.id} className="rounded-lg bg-background p-3"><p className="whitespace-pre-wrap break-words text-sm">{a.mensagem}</p><p className="mt-2 text-xs text-ink-muted">{new Date(a.criado_em).toLocaleString("pt-BR",{ timeZone:"America/Sao_Paulo" })}</p></li>)}</ul></>}</section>;
}
