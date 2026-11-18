import Link from "next/link";
import {redirect} from "next/navigation";
import {Trash2, RotateCcw, ArrowLeft} from "lucide-react";
import {createClient} from "@/lib/supabase/server";
import {getUsuarioAtual} from "@/lib/usuario-atual";
import {CabecalhoPagina} from "@/components/cabecalho-pagina";
import {CARD_CLASS, SECONDARY_BUTTON_CLASS} from "@/components/ui/styles";
import {restaurarDemanda} from "../actions";

export default async function LixeiraDemandasPage() {
  const {user,usuario}=await getUsuarioAtual();
  if(!user||!usuario?.ativo||!usuario.tenant_id) redirect("/login");
  if(!["diretor","gerente"].includes(usuario.nivel_acesso)) redirect("/demandas");
  const db=await createClient();
  const {data:itens,error}=await db.from("demandas")
    .select("id,titulo,prioridade,status,responsavel_id,excluida_em,excluida_por")
    .eq("tenant_id",usuario.tenant_id).not("excluida_em","is",null)
    .order("excluida_em",{ascending:false}).limit(250);
  const {data:equipe}=await db.from("usuarios")
    .select("id,nome").eq("tenant_id",usuario.tenant_id);
  const nomes=new Map((equipe??[]).map(p=>[p.id,p.nome]));
  return <main className="w-full min-w-0 space-y-5">
    <Link href="/demandas" className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline"><ArrowLeft size={16}/> Voltar à central</Link>
    <CabecalhoPagina titulo="Lixeira de demandas" descricao="Somente diretores e gerentes podem ver e restaurar demandas. Histórico, comentários e áudios ficam preservados."/>
    {error?<p role="alert" className="text-sm text-rose-700">Não foi possível consultar a lixeira.</p>:
    !itens?.length?<div className={CARD_CLASS+" p-6 text-center text-sm text-ink-muted"}><Trash2 size={23} className="mx-auto mb-2"/>Nenhuma demanda excluída.</div>:
    <div className="space-y-3">{itens.map(d=><section key={d.id} className={CARD_CLASS+" flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"}>
      <div className="min-w-0">
        <Link href={`/demandas/${d.id}`} className="font-semibold text-ink hover:text-brand hover:underline">{d.titulo}</Link>
        <p className="mt-1 text-xs text-ink-muted">Responsável: {nomes.get(d.responsavel_id)??"Colaborador"} · Excluída em {d.excluida_em?new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",dateStyle:"short",timeStyle:"short"}).format(new Date(d.excluida_em)):"—"} · Por {nomes.get(d.excluida_por)??"Gestão"}</p>
      </div>
      <form action={restaurarDemanda} className="shrink-0">
        <input type="hidden" name="demanda_id" value={d.id}/>
        <button type="submit" className={SECONDARY_BUTTON_CLASS}><RotateCcw size={16}/> Restaurar</button>
      </form>
    </section>)}</div>}
  </main>;
}
