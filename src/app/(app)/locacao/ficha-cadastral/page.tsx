import Link from "next/link";
import { Plus } from "lucide-react";
import { BotaoCopiarLink } from "@/components/botao-copiar-link";
import { obterSiteUrl } from "@/lib/site-url";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { PRIMARY_BUTTON_CLASS } from "@/components/ui/styles";
import { createClient } from "@/lib/supabase/server";
import { GESTORES, getUsuarioAtual } from "@/lib/usuario-atual";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ListaFichas, type FichaLista } from "./lista";

export default async function FichasCadastraisLocacaoPage() {
  const supabase = await createClient() as unknown as SupabaseClient;
  const siteUrl = await obterSiteUrl();
  const [{ data, error }, { usuario }] = await Promise.all([
    supabase.from("fichas_cadastrais_locacao")
      .select("id, proponente_nome, proponente_email, imovel_referencia, status, criado_em, tipo_locatario, ficha_principal_id")
      .order("criado_em", { ascending: false }),
    getUsuarioAtual(),
  ]);
  const fichas = (data ?? []) as FichaLista[];
  const concluidas = fichas.filter((f) => f.status === "concluida").length;
  const pendentes = fichas.filter((f) => ["aguardando", "em_preenchimento"].includes(f.status)).length;
  const podeExcluir = !!usuario?.ativo && GESTORES.includes(usuario.nivel_acesso);
  return <div className="mx-auto w-full min-w-0 space-y-6">
    <CabecalhoPagina titulo="Fichas cadastrais" descricao="Acompanhe o preenchimento, confira os dados e baixe o PDF assinado das fichas recebidas." acao={<Link href="/locacao/ficha-cadastral/nova" className={PRIMARY_BUTTON_CLASS}><Plus size={17} /> Nova ficha</Link>} />
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-4">
      <div><p className="font-semibold text-ink">Link público para todos os interessados</p><p className="mt-1 break-all text-sm text-ink-muted">{siteUrl}/cadastro/locacao</p><p className="mt-1 text-xs text-ink-muted">Locatário e fiadores acessam o mesmo link. Cada pessoa gera sua própria ficha.</p></div>
      <BotaoCopiarLink texto={siteUrl+"/cadastro/locacao"} rotulo="Copiar link público"/>
    </div>
    {error ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Não foi possível carregar as fichas. Atualize a página para tentar novamente.</p> : <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-4"><p className="text-xs font-medium text-ink-muted">Total</p><p className="mt-1 text-2xl font-bold">{fichas.length}</p></div>
        <div className="rounded-xl border border-border bg-surface p-4"><p className="text-xs font-medium text-ink-muted">Aguardando cliente</p><p className="mt-1 text-2xl font-bold text-amber-700">{pendentes}</p></div>
        <div className="rounded-xl border border-border bg-surface p-4"><p className="text-xs font-medium text-ink-muted">Recebidas para conferência</p><p className="mt-1 text-2xl font-bold text-emerald-700">{concluidas}</p></div>
      </div>
      <ListaFichas fichas={fichas} podeExcluir={podeExcluir} />
    </>}
  </div>;
}
