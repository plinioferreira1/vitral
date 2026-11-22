import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, BookOpen, CheckCircle2, GraduationCap, PlayCircle, Settings2 } from "lucide-react";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { CentralAjuda } from "@/components/central-ajuda";
import { GUIAS_FIXOS } from "@/lib/ajuda/guias";
import { tutorialParaTopico } from "@/lib/ajuda/topicos";
import { marcarEtapaAprendizagem } from "../aprendizagem/actions";

const trilhas: Record<string, { nome: string; links: { titulo: string; href: string; descricao: string }[] }> = {
  corretor: { nome: "Corretagem", links: [
    { titulo: "Captação e vendas", href: "#biblioteca", descricao: "Guias de captação, abordagem e documentação" },
    { titulo: "Minhas vendas", href: "/minhas-vendas", descricao: "Acompanhe seus negócios" },
    { titulo: "Termos de visita", href: "/termos-visita", descricao: "Documentos para visitas" },
  ] },
  social_media: { nome: "Comunicação", links: [
    { titulo: "Guias e modelos", href: "#biblioteca", descricao: "Mensagens e conteúdos da equipe" },
    { titulo: "Minhas demandas", href: "/demandas", descricao: "Acompanhe tarefas atribuídas" },
  ] },
  gerente_locacao: { nome: "Locação", links: [
    { titulo: "Contratos", href: "/locacao?aba=contratos", descricao: "Carteira e documentação" },
    { titulo: "Inadimplências", href: "/locacao/debitos", descricao: "Débitos e solicitações" },
    { titulo: "Minhas demandas", href: "/demandas", descricao: "Organize os prazos" },
  ] },
};
const trilhaGeral = { nome: "Operação e gestão", links: [
  { titulo: "Central de Demandas", href: "/demandas", descricao: "Atividades, prazos e prioridades" },
  { titulo: "Tutoriais e modelos", href: "#biblioteca", descricao: "Guias, vídeos e documentos em um só lugar" },
  { titulo: "Calendário", href: "/calendario", descricao: "Compromissos e prazos" },
] };

export default async function OnboardingAjudaPage() {
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.ativo || !usuario.tenant_id) redirect("/login");
  const db = await createClient();
  const [{ data: etapas, error: erroEtapas }, { data: progresso }, { data: tutoriais, error: erroTutoriais }] = await Promise.all([
    db.from("onboarding_etapas").select("id,nome,descricao,link,ordem")
      .eq("tenant_id", usuario.tenant_id).order("ordem"),
    db.from("onboarding_status").select("etapa_id,concluida").eq("usuario_id", user.id),
    db.from("tutoriais").select("id,categoria,tipo,titulo,descricao,conteudo,link,ordem")
      .eq("tenant_id", usuario.tenant_id).order("categoria").order("ordem"),
  ]);
  if (erroEtapas || erroTutoriais) {
    return <p role="alert" className="rounded-xl border border-rose-200 p-5 text-sm text-rose-700">
      Não foi possível carregar o Onboarding e Ajuda. Tente novamente.
    </p>;
  }
  const concluidas = new Set((progresso ?? []).filter(p => p.concluida).map(p => p.etapa_id));
  const total = etapas?.length ?? 0;
  const feitos = (etapas ?? []).filter(e => concluidas.has(e.id)).length;
  const trilha = trilhas[usuario.nivel_acesso] ?? trilhaGeral;
  const gestor = ["diretor","gerente"].includes(usuario.nivel_acesso);
  const topicos = [...(tutoriais ?? []).map(tutorialParaTopico), ...GUIAS_FIXOS];

  return <div className="mx-auto w-full min-w-0 space-y-6">
    <CabecalhoPagina titulo="Onboarding e Ajuda"
      descricao="Aprenda a usar o VITRAL, acompanhe seus primeiros passos e consulte tutoriais, guias e documentos em um único lugar." />
    <nav aria-label="Seções de Onboarding e Ajuda" className="flex flex-wrap gap-2">
      <a href="#onboarding" className="rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-medium text-brand hover:bg-background">Meu onboarding</a>
      <a href="#biblioteca" className="rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-medium text-brand hover:bg-background">Tutoriais e guias</a>
      <a href="#biblioteca" className="rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-medium text-brand hover:bg-background">Materiais e modelos</a>
      {gestor && <a href="#gestao" className="rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-medium text-brand hover:bg-background">Gestão do conteúdo</a>}
    </nav>

    <section id="onboarding" className="scroll-mt-24 space-y-4" aria-labelledby="titulo-onboarding">
      <div className="flex items-center gap-2"><GraduationCap size={20} className="text-brand"/><h2 id="titulo-onboarding" className="text-lg font-semibold text-ink">Meu onboarding</h2></div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div><h3 className="font-semibold text-ink">Primeiros passos</h3><p className="mt-1 text-sm text-ink-muted">Marque uma etapa quando concluir a atividade.</p></div>
            <span className="text-xl font-semibold text-brand tabular-nums">{feitos}/{total}</span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-background" role="progressbar" aria-label="Progresso do onboarding" aria-valuemin={0} aria-valuemax={total} aria-valuenow={feitos}>
            <div className="h-full rounded-full bg-brand" style={{width: (total ? feitos / total * 100 : 0) + "%"}} />
          </div>
          <div className="mt-4 space-y-2">
            {!total ? <p className="rounded-lg border border-dashed border-border p-4 text-sm text-ink-muted">O checklist ainda não foi configurado pela gestão.</p> :
              (etapas ?? []).map(e => <article key={e.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 p-3">
                <span className={"flex h-9 w-9 items-center justify-center rounded-full " + (concluidas.has(e.id) ? "bg-emerald-50 text-emerald-700" : "bg-background text-ink-muted")}><CheckCircle2 size={18}/></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{e.nome}</p>
                  {e.descricao && <p className="text-xs text-ink-muted">{e.descricao}</p>}
                  {e.link && <Link href={e.link} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">Abrir etapa <ArrowUpRight size={13}/></Link>}
                </div>
                <form action={marcarEtapaAprendizagem}>
                  <input type="hidden" name="etapa_id" value={e.id}/>
                  <input type="hidden" name="concluir" value={concluidas.has(e.id) ? "0" : "1"}/>
                  <button className={"min-h-10 rounded-lg px-3 py-2 text-xs font-semibold " + (concluidas.has(e.id) ? "border border-border text-ink-muted" : "bg-brand text-white")}>{concluidas.has(e.id) ? "Refazer" : "Concluir"}</button>
                </form>
              </article>)}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center gap-2"><BookOpen size={19} className="text-brand"/><h3 className="font-semibold text-ink">Sua trilha · {trilha.nome}</h3></div>
          <p className="mt-2 text-sm text-ink-muted">Acesse os recursos mais importantes para sua função.</p>
          <div className="mt-4 space-y-3">{trilha.links.map(l =>
            <Link key={l.href} href={l.href} className="flex items-start gap-2 rounded-lg border border-border/70 p-3 hover:bg-background">
              <ArrowUpRight size={17} className="mt-0.5 shrink-0 text-brand"/>
              <span><strong className="block text-sm text-ink">{l.titulo}</strong><span className="block text-xs text-ink-muted">{l.descricao}</span></span>
            </Link>)}
          </div>
        </div>
      </div>
    </section>

    <section id="biblioteca" className="scroll-mt-24 space-y-4" aria-labelledby="titulo-biblioteca">
      <div className="flex items-center gap-2"><PlayCircle size={20} className="text-brand"/><h2 id="titulo-biblioteca" className="text-lg font-semibold text-ink">Tutoriais, guias e materiais</h2></div>
      <p className="text-sm text-ink-muted">Busque vídeos, passo a passo, modelos de mensagem, documentos e links úteis. Todos os conteúdos da antiga Central de Ajuda continuam disponíveis.</p>
      <CentralAjuda topicos={topicos}/>
    </section>

    {gestor && <section id="gestao" className="scroll-mt-24 rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2"><Settings2 size={20} className="text-brand"/><h2 className="text-lg font-semibold text-ink">Gestão do onboarding e conteúdo</h2></div>
      <p className="mt-2 text-sm text-ink-muted">Edite tutoriais e etapas de integração. As configurações existentes foram preservadas.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href="/tutoriais" className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white">Gerenciar tutoriais</Link>
        <Link href="/onboarding-corretor" className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm font-semibold text-brand">Editar checklist</Link>
      </div>
    </section>}
  </div>;
}
