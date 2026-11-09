import Link from "next/link";
import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { createClient } from "@/lib/supabase/server";
import { FONTES_LEADS } from "@/lib/vendas/fontes-leads";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { NavegacaoContexto } from "@/components/navegacao-contexto";
import { CARD_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import { adicionarFonteLead, desativarFonteLead } from "../actions";

export default async function GerenciarFontesPage() {
  const { usuario } = await getUsuarioAtual();
  if (!usuario?.tenant_id) redirect("/login");
  if (!["diretor", "gerente"].includes(usuario.nivel_acesso)) redirect("/vendas");

  const supabase = await createClient();
  const { data, error } = await supabase.from("vendas_fontes_personalizadas")
    .select("id, nome, ativo")
    .eq("tenant_id", usuario.tenant_id)
    .order("nome");
  if (error) return <p className="p-6 text-sm text-rose-700">Erro ao carregar as fontes: {error.message}</p>;
  const ativas = (data ?? []).filter(f => f.ativo);

  return <div className="w-full min-w-0 space-y-5">
    <CabecalhoPagina titulo="Gerenciar fontes de leads" descricao="Inclua um novo canal uma única vez. Ele aparecerá na planilha e nas próximas vendas." />
    <NavegacaoContexto nome="Vendas" links={[
      { href: "/vendas", label: "Processos de venda" },
      { href: "/vendas/fontes-leads", label: "Controle de vendas" },
      { href: "/vendas/fontes-leads/fontes", label: "Gerenciar fontes" },
    ]} />
    <Link href="/vendas/fontes-leads" className={SECONDARY_BUTTON_CLASS}>Voltar à planilha</Link>

    <section className={`${CARD_CLASS} space-y-3 p-4 sm:p-6`}>
      <h2 className="font-semibold text-ink">Adicionar fonte</h2>
      <p className="text-sm text-ink-muted">Por exemplo: Facebook, Google Ads, Indicação de cliente ou Plantão.</p>
      <form action={adicionarFonteLead} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1 text-xs font-medium text-ink-muted">
          Nome da fonte
          <input type="text" name="nome" required minLength={2} maxLength={100}
            placeholder="Digite o nome da nova fonte" className={`${INPUT_CLASS} mt-1`} />
        </label>
        <button type="submit" className={PRIMARY_BUTTON_CLASS}>Adicionar fonte</button>
      </form>
    </section>

    <section className={`${CARD_CLASS} p-4 sm:p-6`}>
      <h2 className="font-semibold text-ink">Fontes disponíveis</h2>
      <p className="mt-1 text-sm text-ink-muted">As fontes padrão continuam disponíveis. As fontes criadas podem ser ocultadas sem apagar vendas já registradas.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {FONTES_LEADS.map(nome => <div key={nome}
          className="flex items-center justify-between rounded-lg border border-border p-3 text-sm text-ink">
          <span>{nome}</span><span className="text-xs text-ink-muted">Padrão</span>
        </div>)}
        {ativas.map(fonte => <div key={fonte.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm text-ink">
          <span className="min-w-0 break-words font-medium">{fonte.nome}</span>
          <form action={desativarFonteLead}>
            <input type="hidden" name="id" value={fonte.id}/>
            <button type="submit" className="text-xs text-ink-muted underline underline-offset-2 hover:text-rose-700"
              title="Ocultar esta fonte do seletor, preservando as vendas existentes">Ocultar</button>
          </form>
        </div>)}
      </div>
    </section>
  </div>;
}
