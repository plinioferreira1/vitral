import Link from "next/link";
import { Plus } from "lucide-react";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { ListaDocumentosAssinatura } from "@/components/lista-documentos-assinatura";
import { PRIMARY_BUTTON_CLASS } from "@/components/ui/styles";
import { createClient } from "@/lib/supabase/server";
import { apagarAutorizacoesSelecionadas } from "./bulk-actions";

export default async function DocumentosPage() {
  const supabase = await createClient();
  const { data: autorizacoes, error } = await supabase.from("autorizacoes_venda").select("id, status, criado_em, imoveis ( endereco ), clientes!autorizacoes_venda_vendedor_id_fkey ( nome ), usuarios!autorizacoes_venda_criado_por_fkey ( nome )").order("criado_em", { ascending: false });
  const rows = (autorizacoes ?? []) as unknown as { id: string; status: string; criado_em: string; imoveis: { endereco: string } | null; clientes: { nome: string } | null; usuarios: { nome: string } | null; }[];
  const indicadores = [{ label: "Total de documentos", valor: rows.length, classe: "text-ink" }, { label: "Aguardando assinatura", valor: rows.filter((d) => d.status === "pendente").length, classe: "text-amber-700" }, { label: "Assinados", valor: rows.filter((d) => d.status === "assinado").length, classe: "text-emerald-700" }];
  return <div className="space-y-6">
    <CabecalhoPagina titulo="Autorizações de venda" descricao="Acompanhe as assinaturas e abra cada documento para conferir os dados ou enviar o link ao cliente." acao={<Link href="/autorizacoes/nova" className={PRIMARY_BUTTON_CLASS}><Plus size={17} /> Nova autorização</Link>} />
    {error ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Não foi possível carregar os documentos. Atualize a página para tentar novamente.</p> : <>
      <div className="grid gap-3 sm:grid-cols-3">{indicadores.map((i) => <div key={i.label} className="rounded-xl border border-border bg-surface p-4"><p className="text-xs font-medium text-ink-muted">{i.label}</p><p className={`mt-1 text-2xl font-bold ${i.classe}`}>{i.valor}</p></div>)}</div>
      <ListaDocumentosAssinatura acao={apagarAutorizacoesSelecionadas} pessoaRotulo="Proprietário" novoHref="/autorizacoes/nova" vazio="Nenhuma autorização criada" documentos={rows.map((d) => ({ id: d.id, titulo: d.imoveis?.endereco ?? "Imóvel não informado", pessoa: d.clientes?.nome ?? "Não informado", status: d.status, detalheRotulo: "Criado por", detalhe: d.usuarios?.nome ?? "Não informado", href: `/autorizacoes/${d.id}`, editarHref: d.status === "pendente" ? `/autorizacoes/${d.id}/editar` : undefined, }))} />
    </>}
  </div>;
}
