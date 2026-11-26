import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { getPermissoesUsuario } from "@/lib/permissoes";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { registrarMovimentoCaucao } from "../actions";
import { hojeISO } from "@/lib/data-br";

const tipos: Record<string,string> = {
  deposito: "Depósito inicial",
  complemento: "Complemento",
  rendimento: "Rendimento",
  utilizacao: "Utilização da garantia",
  devolucao: "Devolução",
};
const moeda = (v:number) => (v/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const dataBR = (s:string) => s.slice(0,10).split("-").reverse().join("/");

export default async function DetalheCaucao({params}:{params:Promise<{contratoId:string}>}) {
  const {contratoId} = await params;
  const {user, usuario} = await getUsuarioAtual();
  if (!user || !usuario?.tenant_id) redirect("/login");
  const supabase = await createClient();
  const perms = await getPermissoesUsuario(supabase,user.id,usuario.nivel_acesso);
  if (!perms.temLocacao || perms.ehCorretor || perms.ehSocialMedia) redirect("/");

  const [{data:contrato},{data:movimentos,error}] = await Promise.all([
    supabase.from("contratos_locacao").select("id,numero,ativo,caucao_valor_centavos").eq("id",contratoId).eq("tenant_id",usuario.tenant_id).eq("garantia_locaticia","Caução").maybeSingle(),
    supabase.from("caucao_movimentacoes").select("id,tipo,data_movimento,valor_centavos,descricao,comprovante_url,situacao,criado_em").eq("contrato_id",contratoId).eq("tenant_id",usuario.tenant_id).order("data_movimento",{ascending:false}).order("criado_em",{ascending:false}),
  ]);
  if (!contrato) notFound();
  const lista = movimentos ?? [];
  const entrada = lista.filter(m=>["deposito","complemento","rendimento"].includes(m.tipo)).reduce((s,m)=>s+m.valor_centavos,0);
  const saida = lista.filter(m=>["utilizacao","devolucao"].includes(m.tipo)).reduce((s,m)=>s+m.valor_centavos,0);

  return (
    <div className="w-full min-w-0 space-y-5">
      <Link href="/locacao/caucoes" className="text-sm font-medium text-brand hover:underline">← Todas as cauções</Link>
      <CabecalhoPagina titulo={`Caução · ${contrato.numero}`}
        descricao="Livro de eventos declarados. Registro não comprova crédito bancário, não concilia OFX e não altera lançamentos financeiros." />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-ink-muted">Garantia prevista em contrato</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{contrato.caucao_valor_centavos==null?"Não informada":moeda(contrato.caucao_valor_centavos)}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-ink-muted">Entradas declaradas · não conciliadas</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{moeda(entrada)}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-ink-muted">Saídas declaradas · não conciliadas</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{moeda(saida)}</p>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-3">
        <h2 className="font-semibold text-ink">Histórico de movimentações</h2>
        <p className="text-xs text-ink-muted">Todos os registros são imutáveis e ficam pendentes de conciliação bancária. Saldo declarado (entradas − saídas): {moeda(entrada-saida)}. Este NÃO é o saldo comprovado.</p>
        {error ? <p className="text-sm text-rose-700">Não foi possível consultar o histórico.</p> : lista.length===0 ?
          <p className="text-sm text-ink-muted">Nenhum depósito ou movimentação foi registrado. O valor contratual não foi convertido em recebimento.</p> :
          <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-sm">
            <thead><tr className="border-b border-border text-left text-xs text-ink-muted"><th className="py-2">Data</th><th>Tipo</th><th>Valor</th><th>Descrição</th><th>Conferência</th><th>Documento</th></tr></thead>
            <tbody>{lista.map(m=><tr className="border-b border-border/60" key={m.id}>
              <td className="py-3 whitespace-nowrap">{dataBR(m.data_movimento)}</td>
              <td>{tipos[m.tipo]??m.tipo}</td><td className="tabular-nums font-medium">{moeda(m.valor_centavos)}</td>
              <td className="max-w-72 break-words">{m.descricao}</td>
              <td className="text-amber-800">Pendente</td>
              <td>{m.comprovante_url?<a className="text-brand underline" href={m.comprovante_url} target="_blank" rel="noreferrer">Abrir</a>:"—"}</td>
            </tr>)}</tbody>
          </table></div>}
      </section>

      <section className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-3">
        <h2 className="font-semibold text-ink">Registrar evento para conferência</h2>
        <p className="text-xs text-ink-muted">Preencha somente movimentações verificadas em documento. O lançamento ficará pendente de conciliação; nenhum lançamento bancário será criado ou baixado automaticamente.</p>
        <form action={registrarMovimentoCaucao} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="contrato_id" value={contrato.id}/>
          <label className="text-xs font-medium text-ink-muted">Tipo
            <select required name="tipo" defaultValue="deposito" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-ink">
              {Object.entries(tipos).map(([v,l])=><option value={v} key={v}>{l}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-ink-muted">Data do movimento
            <input required type="date" name="data_movimento" defaultValue={hojeISO()} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-ink"/>
          </label>
          <label className="text-xs font-medium text-ink-muted">Valor (R$)
            <input required type="text" inputMode="decimal" name="valor" placeholder="Ex.: 3.000,00" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-ink"/>
          </label>
          <label className="text-xs font-medium text-ink-muted">URL HTTPS do comprovante (opcional)
            <input type="url" name="comprovante_url" placeholder="https://..." className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-ink"/>
          </label>
          <label className="sm:col-span-2 text-xs font-medium text-ink-muted">Descrição / referência documental
            <textarea required name="descricao" minLength={5} maxLength={1000} rows={3} placeholder="Informe origem, referência do extrato ou documento e contexto do movimento" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-ink"/>
          </label>
          <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-ink-muted">Após salvar, o registro é permanente. Eventual correção exigirá lançamento de ajuste em etapa futura.</p>
            <button type="submit" className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90">Registrar pendente de conferência</button>
          </div>
        </form>
      </section>
    </div>
  );
}
