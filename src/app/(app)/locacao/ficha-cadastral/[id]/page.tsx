import Link from "next/link";
import { Download, ClipboardCheck, Files, UsersRound, Link2 } from "lucide-react";
import { notFound } from "next/navigation";
import { BotaoCopiarLink } from "@/components/botao-copiar-link";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { NavegacaoSecoes } from "@/components/navegacao-secoes";
import { VoltarLink } from "@/components/voltar-link";
import { CARD_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import { BotaoComConfirmacao } from "@/components/botao-com-confirmacao";
import { ROTULO_TIPO, pendencias, secoesVisiveis, tipoLocatario, valorExibido, type DadosFicha } from "@/lib/ficha-locacao/campos";
import { checklistDocumentos } from "@/lib/ficha-locacao/documentos";
import { createClient } from "@/lib/supabase/server";
import { obterSiteUrl } from "@/lib/site-url";
import { cancelarFichaLocacao } from "../actions";
import type { SupabaseClient } from "@supabase/supabase-js";

const STATUS: Record<string, { label: string; classe: string }> = {
  aguardando: { label: "Aguardando", classe: "bg-amber-50 text-amber-700" },
  em_preenchimento: { label: "Em preenchimento", classe: "bg-blue-50 text-blue-700" },
  concluida: { label: "Enviada para conferência", classe: "bg-emerald-50 text-emerald-700" },
  cancelada: { label: "Cancelada", classe: "bg-slate-100 text-slate-500" },
};

type Vinculada = { id: string; proponente_nome: string | null; tipo_locatario: string; numero_fiador?: number | null; status: string; garantia: string | null };

export default async function DetalheFichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient() as unknown as SupabaseClient;
  const [{ data: ficha }, { data: documentos }, siteUrl] = await Promise.all([
    supabase.from("fichas_cadastrais_locacao").select("*").eq("id", id).single(),
    supabase.from("ficha_locacao_documentos").select("*").eq("ficha_id", id).order("criado_em"),
    obterSiteUrl(),
  ]);
  if (!ficha) notFound();
  const tipo = tipoLocatario(ficha.tipo_locatario);
  const principalId: string = ficha.ficha_principal_id ?? ficha.id;
  // Todas as pessoas da mesma proposta: o titular e quem está ligado a ele.
  const { data: grupo } = await supabase.from("fichas_cadastrais_locacao").select("id, proponente_nome, tipo_locatario, numero_fiador, status, garantia:dados->>garantia").or(`id.eq.${principalId},ficha_principal_id.eq.${principalId}`).order("criado_em");
  const linksDocumentos = (documentos ?? []).map((d) => ({ ...d, url: `/locacao/ficha-cadastral/${id}/documentos/${d.id}` }));
  const pessoas = (grupo ?? []) as Vinculada[];
  const basePublica = process.env.NEXT_PUBLIC_CADASTRO_URL?.replace(/\/$/, "") || `${siteUrl}/cadastro`;
  const link = `${basePublica}/locacao/${ficha.token}`;
  const dados = (ficha.dados ?? {}) as DadosFicha;
  const garantia = tipo === "titular" ? String(dados.garantia ?? "") : pessoas.find((p) => p.id === principalId)?.garantia ?? "";
  const checklist = checklistDocumentos(tipo, garantia, dados, documentos ?? []);
  const secoes = secoesVisiveis(dados, tipo).map((s) => ({ ...s, campos: s.campos.filter((c) => valorExibido(c, dados) !== "") })).filter((s) => s.campos.length > 0);
  const faltando = ficha.status === "em_preenchimento" ? pendencias(dados, tipo).length : 0;
  const status = STATUS[ficha.status] ?? STATUS.aguardando;

  return <div className="mx-auto w-full min-w-0 space-y-6">
    <div><VoltarLink href="/locacao/ficha-cadastral" label="Fichas cadastrais" /><CabecalhoPagina titulo={ficha.proponente_nome || "Aguardando dados do cliente"} descricao={ficha.imovel_referencia} acao={<>{ficha.status === "concluida" && <a href={`/locacao/ficha-cadastral/${ficha.id}/pdf`} className={PRIMARY_BUTTON_CLASS}><Download size={16} /> PDF assinado</a>}</>} /><div className="mt-3 flex flex-wrap items-center gap-2"><span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">{ROTULO_TIPO[tipo]}</span><span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.classe}`}>{status.label}</span></div></div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div className={`${CARD_CLASS} p-4`}><UsersRound size={18} className="text-brand" /><p className="mt-2 text-xl font-bold">{pessoas.length}</p><p className="text-xs text-ink-muted">Pessoas na proposta</p></div>
      <div className={`${CARD_CLASS} p-4`}><Files size={18} className="text-brand" /><p className="mt-2 text-xl font-bold">{documentos?.length ?? 0}</p><p className="text-xs text-ink-muted">Documentos anexados</p></div>
      <div className={`${CARD_CLASS} col-span-2 p-4 sm:col-span-1`}><ClipboardCheck size={18} className="text-brand" /><p className="mt-2 text-xl font-bold">{new Date(ficha.expira_em).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p><p className="text-xs text-ink-muted">Validade do link</p></div>
    </div>
    <NavegacaoSecoes secoes={[{ id: "pessoas", label: "Pessoas da proposta" }, { id: "dados", label: "Dados informados" }, { id: "documentos", label: "Documentos" }, { id: "controle", label: "Controle" }]} />

    {ficha.status !== "concluida" && ficha.status !== "cancelada" && <section className={`${CARD_CLASS} p-5 sm:p-6`}><h2 className="flex items-center gap-2 font-semibold"><Link2 size={18} className="text-brand" /> Link {tipo === "titular" ? "do cliente" : `do ${ROTULO_TIPO[tipo].toLowerCase()}`}</h2><p className="mt-1 text-sm text-ink-muted">Envie este endereço a {ficha.proponente_nome || "esta pessoa"}. O link é só dela; ela poderá salvar e continuar depois.{faltando > 0 ? ` Ainda faltam ${faltando} campo${faltando === 1 ? "" : "s"} obrigatório${faltando === 1 ? "" : "s"}.` : ""}</p><div className="mt-4 flex flex-col gap-2 sm:flex-row"><code className="min-w-0 flex-1 truncate rounded-lg bg-background px-3 py-2.5 text-xs">{link}</code><BotaoCopiarLink url={link} rotulo="Copiar link" /><a href={link} target="_blank" rel="noreferrer" className={`${SECONDARY_BUTTON_CLASS} min-h-11`}>Abrir ficha</a></div></section>}

    <section id="pessoas" className={`${CARD_CLASS} scroll-mt-24 p-5 sm:p-6`}>
      <h2 className="font-semibold">Pessoas desta proposta</h2>
      <p className="mt-1 text-sm text-ink-muted">Titular, corresponsável e fiador preenchem e assinam cada um a própria ficha.</p>
      <div className="mt-4 divide-y divide-border rounded-lg border border-border">{pessoas.map((p) => { const st = STATUS[p.status] ?? STATUS.aguardando; const atual = p.id === ficha.id; return <Link key={p.id} href={`/locacao/ficha-cadastral/${p.id}`} aria-current={atual ? "page" : undefined} className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-background ${atual ? "bg-background" : ""}`}><span className="min-w-0"><span className="block truncate font-medium text-ink">{p.proponente_nome || "Aguardando dados do cliente"}{atual ? " (esta ficha)" : ""}</span><span className="text-xs text-ink-muted">{p.tipo_locatario === "fiador" && p.numero_fiador ? `Fiador ${p.numero_fiador}` : ROTULO_TIPO[tipoLocatario(p.tipo_locatario)]}</span></span><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${st.classe}`}>{st.label}</span></Link>; })}</div>

      {tipo === "titular" && ficha.status !== "cancelada" && <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
        <p className="font-semibold text-amber-950">Fiador 1, fiador 2 e corresponsável</p>
        <p className="mt-1 text-amber-900">Todos preenchem suas próprias fichas pelo link público: <strong>{siteUrl}/cadastro/locacao</strong>. Cada pessoa informa o código da proposta do titular.</p>
        <p className="mt-2 text-base font-bold tracking-widest text-amber-950">Código: {ficha.codigo_proposta}</p>
        <div className="mt-2"><BotaoCopiarLink texto={`${siteUrl}/cadastro/locacao`} rotulo="Copiar link público" /></div>
      </div>}
    </section>

    <div className="grid gap-5 lg:grid-cols-[1.4fr_.8fr]"><section id="dados" className={`${CARD_CLASS} min-w-0 scroll-mt-24 p-5 sm:p-6`}><h2 className="font-semibold">Dados informados</h2>{secoes.length === 0 ? <p className="mt-4 text-sm text-ink-muted">O preenchimento ainda não foi iniciado.</p> : <div className="mt-4 space-y-6">{secoes.map((s) => <div key={s.id}><h3 className="text-xs font-bold uppercase tracking-wide text-brand">{s.titulo}</h3><dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">{s.campos.map((c) => <div key={c.chave} className={`min-w-0 border-b border-border pb-3 ${c.larga ? "sm:col-span-2" : ""}`}><dt className="text-xs font-medium text-ink-muted">{c.rotulo}</dt><dd className="mt-1 whitespace-pre-line break-words text-sm font-medium">{valorExibido(c, dados)}</dd></div>)}</dl></div>)}</div>}</section>
      <div className="space-y-5"><section id="documentos" className={`${CARD_CLASS} scroll-mt-24 p-5 sm:p-6`}><h2 className="font-semibold">Documentos</h2><ul className="my-3 space-y-2 text-xs">{checklist.filter((i) => i.situacao !== "opcional").map((i) => <li key={i.tipo} className={i.situacao === "pendente" ? "text-amber-800" : "text-ink-muted"}>{i.situacao === "anexado" ? "Anexado" : i.situacao === "nao_aplicavel" ? "Não aplicável" : "Pendente"}: {i.tipo}{i.justificativa ? ` — ${i.justificativa}` : ""}</li>)}</ul>{linksDocumentos.length === 0 ? <p className="mt-3 text-sm text-ink-muted">Nenhum documento anexado.</p> : <div className="mt-3 space-y-2">{linksDocumentos.map((d) => d.url ? <a key={d.id} href={d.url} target="_blank" rel="noreferrer" className="block rounded-lg border border-border p-3 text-sm hover:border-brand"><span className="block break-words font-medium">{d.nome_arquivo}</span><span className="text-xs text-ink-muted">{d.tipo}</span></a> : null)}</div>}</section>
      <section id="controle" className={`${CARD_CLASS} scroll-mt-24 p-5 sm:p-6`}><h2 className="font-semibold">Controle</h2><div className="mt-3 space-y-2 text-sm text-ink-muted"><p>Criada em {new Date(ficha.criado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p><p>Expira em {new Date(ficha.expira_em).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>{ficha.concluido_em && <p>Concluída em {new Date(ficha.concluido_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>}</div>{ficha.status !== "cancelada" && ficha.status !== "concluida" && <form action={cancelarFichaLocacao} className="mt-4"><input type="hidden" name="id" value={ficha.id} /><BotaoComConfirmacao className="min-h-11 rounded-lg border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-700" mensagem="Cancelar este link de preenchimento? O cliente não poderá mais acessar a ficha.">Cancelar link</BotaoComConfirmacao></form>}</section></div>
    </div>
  </div>;
}
