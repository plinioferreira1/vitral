import Link from "next/link";
import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIAS_FONTES, FONTES_PADRAO } from "@/lib/vendas/fontes-leads";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { NavegacaoContexto } from "@/components/navegacao-contexto";
import { CARD_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import { adicionarFonteLead, atualizarCategoriaFonte, desativarFonteLead } from "../actions";

export default async function GerenciarFontesPage() {
  const { usuario } = await getUsuarioAtual();
  if (!usuario?.tenant_id) redirect("/login");
  if (!["diretor", "gerente"].includes(usuario.nivel_acesso)) redirect("/vendas");
  const supabase = await createClient();
  const { data, error } = await supabase.from("vendas_fontes_personalizadas")
    .select("id,nome,ativo,categoria").eq("tenant_id", usuario.tenant_id).order("nome");
  if (error) return <p className="p-6 text-sm text-rose-700">Erro ao carregar as fontes: {error.message}</p>;
  const ativas = (data ?? []).filter(f => f.ativo);
  return <div className="w-full min-w-0 space-y-5">
    <CabecalhoPagina titulo="Fontes de leads" descricao="Uma lista organizada por origem. Novos canais ficam disponíveis na planilha e nas próximas vendas." />
    <NavegacaoContexto nome="Vendas" links={[
      { href: "/vendas", label: "Processos de venda" },
      { href: "/vendas/fontes-leads", label: "Fonte de Vendas" },
      { href: "/vendas/fontes-leads/fontes", label: "Gerenciar fontes" },
    ]} />
    <Link href="/vendas/fontes-leads" className={SECONDARY_BUTTON_CLASS}>Voltar à planilha</Link>
    <section className={`${CARD_CLASS} space-y-3 p-4 sm:p-6`}>
      <h2 className="font-semibold text-ink">Nova fonte</h2>
      <p className="text-sm text-ink-muted">Cadastre apenas a origem real do cliente; não precisa repetir o nome da categoria.</p>
      <form action={adicionarFonteLead} className="grid gap-3 sm:grid-cols-[1fr_220px_auto] sm:items-end">
        <label className="block text-xs font-medium text-ink-muted">Nome
          <input type="text" name="nome" required minLength={2} maxLength={100} placeholder="Ex.: Google Ads"
            className={`${INPUT_CLASS} mt-1`} />
        </label>
        <label className="block text-xs font-medium text-ink-muted">Categoria
          <select name="categoria" defaultValue="marketing" className={`${INPUT_CLASS} mt-1`}>
            {CATEGORIAS_FONTES.map(c => <option key={c.id} value={c.id}>{c.titulo}</option>)}
          </select>
        </label>
        <button type="submit" className={PRIMARY_BUTTON_CLASS}>Adicionar</button>
      </form>
    </section>
    <div className="grid gap-4 lg:grid-cols-2">
      {CATEGORIAS_FONTES.map(categoria => {
        const padrao = FONTES_PADRAO.filter(f => f.categoria === categoria.id);
        const proprias = ativas.filter(f => f.categoria === categoria.id);
        return <section key={categoria.id} className={`${CARD_CLASS} p-4 sm:p-5`}>
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="font-semibold text-ink">{categoria.titulo}</h2>
            <span className="text-xs tabular-nums text-ink-muted">{padrao.length + proprias.length} fontes</span>
          </div>
          <div className="divide-y divide-border/60">
            {padrao.map(f => <div key={f.nome} className="flex items-center justify-between gap-2 py-2.5 text-sm">
              <span className="text-ink">{f.nome}</span>
              <span className="text-xs text-ink-muted">Padrão</span>
            </div>)}
            {proprias.map(f => <div key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
              <span className="min-w-0 break-words font-medium text-ink">{f.nome}</span>
              <div className="flex items-center gap-2">
                <form action={atualizarCategoriaFonte} className="flex items-center gap-1">
                  <input type="hidden" name="id" value={f.id}/>
                  <select name="categoria" defaultValue={f.categoria} aria-label={`Categoria de ${f.nome}`}
                    className="max-w-32 rounded-md border border-border bg-surface p-1.5 text-xs text-ink">
                    {CATEGORIAS_FONTES.map(c => <option key={c.id} value={c.id}>{c.titulo}</option>)}
                  </select>
                  <button type="submit" className="text-xs font-medium text-brand underline underline-offset-2">Salvar</button>
                </form>
                <form action={desativarFonteLead}>
                  <input type="hidden" name="id" value={f.id}/>
                  <button type="submit" className="text-xs text-ink-muted underline underline-offset-2 hover:text-rose-700"
                    title="Ocultar das opções, preservando as vendas existentes">Ocultar</button>
                </form>
              </div>
            </div>)}
            {!padrao.length && !proprias.length && <p className="py-3 text-sm text-ink-muted">Nenhuma fonte nesta categoria.</p>}
          </div>
        </section>;
      })}
    </div>
    <p className="text-xs text-ink-muted">Vendas classificadas como “Indefinido” permanecem no histórico, mas essa opção não é mais oferecida para novos registros.</p>
  </div>;
}
