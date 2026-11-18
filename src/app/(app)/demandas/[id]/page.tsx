import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Clock3, MessageSquare, CheckCircle2, Trash2, RotateCcw } from "lucide-react";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { CARD_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { atualizarStatusDemanda, comentarDemanda, excluirDemanda, restaurarDemanda } from "../actions";
import { AudioDemanda } from "./audio-demanda";

const STATUS = [
  {id:"pendente",nome:"Pendente"},
  {id:"em_andamento",nome:"Em andamento"},
  {id:"aguardando",nome:"Aguardando terceiros"},
  {id:"bloqueada",nome:"Bloqueada"},
  {id:"concluida",nome:"Concluída"},
];
const dataFormatada=(v:string|null)=>v?new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",dateStyle:"short",timeStyle:"short"}).format(new Date(v)):"—";
const dia=(v:string|null)=>v?v.slice(0,10).split("-").reverse().join("/"):"Sem prazo";

export default async function DetalheDemandaPage({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  const {user,usuario}=await getUsuarioAtual();
  if(!user||!usuario?.tenant_id||!usuario.ativo) redirect("/login");
  const supabase=await createClient();
  const {data:demanda,error}=await supabase.from("demandas").select("*")
    .eq("id",id).eq("tenant_id",usuario.tenant_id).maybeSingle();
  if(error||!demanda) notFound();
  const {data:audioOriginal}=demanda.lote_id
    ?await supabase.from("demandas_lote_audios").select("lote_id,nome_original,criada_em")
      .eq("lote_id",demanda.lote_id).eq("tenant_id",usuario.tenant_id).maybeSingle()
    :{data:null};
  const gestor=["diretor","gerente"].includes(usuario.nivel_acesso);
  const excluida=!!demanda.excluida_em;
  const podeAlterar=!excluida&&(gestor||demanda.responsavel_id===user.id);
  const [eventosResult,usuarioResult,audiosResult]=await Promise.all([
    supabase.from("demandas_atualizacoes").select("id,autor_id,tipo,comentario,status_anterior,status_novo,criada_em")
      .eq("demanda_id",id).eq("tenant_id",usuario.tenant_id).order("criada_em",{ascending:false}).limit(150),
    supabase.from("usuarios").select("id,nome").eq("tenant_id",usuario.tenant_id)
      .in("id",[demanda.solicitante_id,demanda.responsavel_id]),
    supabase.from("demandas_audios").select("id,autor_id,nome_original,criada_em,tamanho_bytes")
      .eq("demanda_id",id).eq("tenant_id",usuario.tenant_id).order("criada_em",{ascending:false}).limit(50),
  ]);
  const nomes=new Map((usuarioResult.data??[]).map(u=>[u.id,u.nome]));
  const statusNome=(s:string|null)=>STATUS.find(x=>x.id===s)?.nome??s??"";
  return <main className="w-full min-w-0 space-y-5">
    <Link href="/demandas" className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline"><ArrowLeft size={16}/> Voltar às demandas</Link>
    <CabecalhoPagina titulo={demanda.titulo} descricao="Acompanhe as atualizações, informe o andamento e registre o que foi feito."/>
    {excluida&&<div role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      Esta demanda está na lixeira. Seu histórico foi preservado, mas não é possível atualizar o andamento nem enviar novas respostas antes de restaurá-la.
    </div>}
    {gestor&&<div className="flex flex-wrap items-center gap-3">
      {excluida?
        <form action={restaurarDemanda}><input type="hidden" name="demanda_id" value={id}/>
          <button type="submit" className={SECONDARY_BUTTON_CLASS}><RotateCcw size={16}/> Restaurar demanda</button>
        </form>:
        <form action={excluirDemanda} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="demanda_id" value={id}/>
          <label className="flex items-center gap-2 text-xs font-medium text-ink-muted">
            <input type="checkbox" name="confirmacao" value="EXCLUIR" required className="h-4 w-4"/>
            Confirmo mover esta demanda para a lixeira
          </label>
          <button type="submit" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-rose-300 px-3 text-sm font-semibold text-rose-800 hover:bg-rose-50"><Trash2 size={16}/> Excluir demanda</button>
        </form>}
    </div>}
    <div className="grid gap-3 sm:grid-cols-3">
      <div className={`${CARD_CLASS} p-4`}><span className="text-xs text-ink-muted">Responsável</span><p className="mt-2 font-semibold text-ink">{nomes.get(demanda.responsavel_id)??"Colaborador"}</p></div>
      <div className={`${CARD_CLASS} p-4`}><span className="text-xs text-ink-muted">Prazo</span><p className="mt-2 font-semibold text-ink">{dia(demanda.prazo)}</p></div>
      <div className={`${CARD_CLASS} p-4`}><span className="text-xs text-ink-muted">Situação</span><p className="mt-2 font-semibold text-ink">{statusNome(demanda.status)}</p></div>
    </div>
    {audioOriginal&&<section className={CARD_CLASS+" space-y-3 p-4 sm:p-5"}>
      <h2 className="font-semibold text-ink">Áudio original das orientações</h2>
      <p className="text-xs text-ink-muted">Ouça a mensagem do gestor que originou este conjunto de demandas. O acesso é privado.</p>
      <audio controls preload="none" className="w-full" src={`/api/demandas/lote-audio/${audioOriginal.lote_id}`}>Seu navegador não reproduz o áudio.</audio>
    </section>}
    <section className={`${CARD_CLASS} space-y-3 p-4 sm:p-5`}>
      <h2 className="font-semibold text-ink">Orientações</h2>
      <p className="whitespace-pre-wrap text-sm leading-6 text-ink">{demanda.descricao??"Nenhuma orientação adicional registrada."}</p>
      <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-border pt-3 text-xs text-ink-muted">
        <span>Solicitado por: {nomes.get(demanda.solicitante_id)??"Gestão"}</span>
        <span>Prioridade: {demanda.prioridade}</span>
        <span>Solicitado em: {dataFormatada(demanda.criada_em)}</span>
        {demanda.processo_id && <Link href={`/processos/${demanda.processo_id}`} className="font-medium text-brand underline">Ver processo relacionado</Link>}
      </div>
    </section>
    {podeAlterar && <section className={`${CARD_CLASS} p-4 sm:p-5`}>
      <h2 className="mb-3 flex items-center gap-2 font-semibold text-ink"><CheckCircle2 size={18}/> Atualizar andamento</h2>
      <form action={atualizarStatusDemanda} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <input type="hidden" name="demanda_id" value={id}/>
        <label className="min-w-0 flex-1 text-xs font-medium text-ink-muted">Nova situação
          <select className={`${INPUT_CLASS} mt-1`} name="status" defaultValue={demanda.status}>
            {STATUS.map(x=><option key={x.id} value={x.id}>{x.nome}</option>)}
          </select>
        </label>
        <button className={PRIMARY_BUTTON_CLASS} type="submit">Salvar andamento</button>
      </form>
      <p className="mt-2 text-xs text-ink-muted">Toda mudança de situação entra automaticamente no histórico.</p>
    </section>}
    <section className={`${CARD_CLASS} space-y-4 p-4 sm:p-5`}>
      <h2 className="flex items-center gap-2 font-semibold text-ink">Áudios da demanda</h2>
      {!excluida&&<AudioDemanda demandaId={id}/>}
      {audiosResult.error && <p role="alert" className="text-xs text-rose-700">Não foi possível consultar os áudios da demanda.</p>}
      {(audiosResult.data??[]).map(a=><div key={a.id} className="space-y-2 rounded-lg border border-border bg-background p-3">
        <p className="text-xs text-ink-muted">Enviado por {a.autor_id===user.id?"você":nomes.get(a.autor_id)??"colaborador"} · {dataFormatada(a.criada_em)}</p>
        <audio controls preload="none" className="w-full" src={`/demandas/${id}/audios/${a.id}`}>
          Seu navegador não suporta reprodução de áudio.
        </audio>
      </div>)}
      {!audiosResult.error&&!audiosResult.data?.length&&<p className="text-xs text-ink-muted">Nenhum áudio registrado ainda.</p>}
    </section>
    <section className={`${CARD_CLASS} space-y-4 p-4 sm:p-5`}>
      <h2 className="flex items-center gap-2 font-semibold text-ink"><MessageSquare size={18}/> Atualizações da equipe</h2>
      {!excluida&&<form action={comentarDemanda} className="space-y-3">
        <input type="hidden" name="demanda_id" value={id}/>
        <label className="block text-xs font-medium text-ink-muted">Comente o que foi feito, o que está faltando ou o motivo de algum impedimento
          <textarea name="comentario" required minLength={1} maxLength={2000} rows={3} className={`${INPUT_CLASS} mt-1`}
            placeholder="Ex.: solicitei a certidão, aguardando retorno do cartório..."/>
        </label>
        <button type="submit" className={SECONDARY_BUTTON_CLASS}>Adicionar atualização</button>
      </form>}
      <div className="space-y-3 border-t border-border pt-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink"><Clock3 size={16}/> Histórico de atividades</h3>
        {eventosResult.error && <p role="alert" className="text-sm text-rose-700">Não foi possível carregar o histórico.</p>}
        {(eventosResult.data??[]).map(ev=><div className="border-l-2 border-border pl-4" key={ev.id}>
          <p className="text-sm font-medium text-ink">
            {ev.tipo==="comentario"?"Comentário":ev.tipo==="status"?`Situação: ${statusNome(ev.status_anterior)} → ${statusNome(ev.status_novo)}`:"Demanda criada"}
          </p>
          {ev.comentario && <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-ink-muted">{ev.comentario}</p>}
          <p className="mt-1 text-xs text-ink-muted">{ev.autor_id===user.id?"Você":nomes.get(ev.autor_id??"")??"Colaborador"} · {dataFormatada(ev.criada_em)}</p>
        </div>)}
        {!eventosResult.error && !eventosResult.data?.length && <p className="text-sm text-ink-muted">Ainda não há atualizações.</p>}
      </div>
    </section>
  </main>;
}
