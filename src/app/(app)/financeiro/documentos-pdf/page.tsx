import { FileText, ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { createClient } from "@/lib/supabase/server";
import { exigirUsuario, GESTORES } from "@/lib/usuario-atual";
import { EntradaPDF } from "./entrada";
import { linkDocumentoPDF } from "./actions";
import type { SupabaseClient } from "@supabase/supabase-js";

const brl=(centavos:number)=>(centavos/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
export default async function DocumentosPDFPage(){
  const sessao=await exigirUsuario(GESTORES);
  if(!sessao)return <main className="p-6"><p>Acesso restrito aos gestores.</p></main>;
  const db=await createClient() as unknown as SupabaseClient;
  const [a,b,c]=await Promise.all([
    db.from("financeiro_contas_bancarias").select("id,nome").eq("tenant_id",sessao.tenantId).eq("ativa",true).order("nome"),
    db.from("financeiro_cartoes").select("id,nome").eq("tenant_id",sessao.tenantId).eq("ativo",true).order("nome"),
    db.from("financeiro_documentos_pdf").select("id,tipo,arquivo_nome,quantidade_linhas,status,valor_total_centavos,criado_em")
      .eq("tenant_id",sessao.tenantId).order("criado_em",{ascending:false}).limit(80)
  ]);
  const contas=(a.data||[]) as {id:string;nome:string}[];
  const cartoes=(b.data||[]) as {id:string;nome:string}[];
  const docs=(c.data||[]) as {id:string;tipo:string;arquivo_nome:string;quantidade_linhas:number;status:string;valor_total_centavos:number|null;criado_em:string}[];
  return <main className="financeiro-ui w-full min-w-0 space-y-5">
    <CabecalhoPagina titulo="Documentos financeiros" descricao="Envie faturas e extratos em PDF, revise os lançamentos e guarde os originais com acesso restrito aos gestores."/>
    <Link href="/financeiro" className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink"><ArrowLeft size={16}/> Voltar ao Financeiro</Link>
    <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-ink-muted">
      <ShieldCheck size={18} className="shrink-0 text-emerald-600"/>
      Os arquivos ficam em armazenamento privado. Esta etapa não efetua baixas e não cria despesas automaticamente.
    </div>
    <EntradaPDF contas={contas} cartoes={cartoes}/>
    <section className="rounded-xl border border-border bg-surface">
      <div className="border-b border-border p-4 sm:p-5"><h2 className="font-semibold">PDFs recebidos para conferência</h2>
        <p className="mt-1 text-xs text-ink-muted">Documentos enviados pela equipe. A prévia não altera o saldo até ser conciliada.</p></div>
      {docs.length===0?<p className="p-5 text-sm text-ink-muted">Nenhum PDF importado nesta área.</p>:
        <div className="divide-y divide-border">
          {docs.map(doc=><div key={doc.id} className="flex flex-wrap items-center gap-3 p-4">
            <FileText size={21} className="shrink-0 text-brand"/>
            <div className="min-w-0 flex-1"><p className="break-all text-sm font-semibold">{doc.arquivo_nome}</p>
              <p className="mt-1 text-xs text-ink-muted">{doc.tipo==="extrato"?"Extrato":"Fatura"} · {doc.quantidade_linhas} linhas · {doc.valor_total_centavos===null?"Total não registrado":brl(doc.valor_total_centavos)} · {new Date(doc.criado_em).toLocaleDateString("pt-BR")}</p>
              <p className="mt-1 text-xs text-amber-700">{doc.status==="em_revisao"?"Aguardando conferência":doc.status}</p></div>
            <form action={linkDocumentoPDF}><input type="hidden" name="id" value={doc.id}/>
              <button className="rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-background">Baixar original</button>
            </form>
          </div>)}
        </div>}
    </section>
  </main>;
}
