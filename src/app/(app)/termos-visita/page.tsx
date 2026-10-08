import Link from "next/link";
import { Plus } from "lucide-react";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { ListaDocumentosAssinatura } from "@/components/lista-documentos-assinatura";
import { PRIMARY_BUTTON_CLASS } from "@/components/ui/styles";
import { createClient } from "@/lib/supabase/server";
import { apagarTermosSelecionados } from "./bulk-actions";

export default async function DocumentosPage() {
  const supabase = await createClient();
  const { data: termos, error } = await supabase.from("termos_visita").select("id, status, data_visita, imoveis ( endereco ), clientes ( nome )").order("criado_em", { ascending: false });
  const rows = (termos ?? []) as unknown as { id: string; status: string; data_visita: string; imoveis: { endereco: string } | null; clientes: { nome: string } | null;  }[];
  const indicadores = [{ label: "Total de documentos", valor: rows.length, classe: "text-ink" }, { label: "Aguardando assinatura", valor: rows.filter((d) => d.status === "pendente").length, classe: "text-amber-700" }, { label: "Assinados", valor: rows.filter((d) => d.status === "assinado").length, classe: "text-emerald-700" }];
  return <div className="space-y-6">
    <CabecalhoPagina titulo="Termos de visita" descricao="Acompanhe as assinaturas e abra cada documento para conferir os dados ou enviar o link ao cliente." acao={<Link href="/termos-visita/nova" className={PRIMARY_BUTTON_CLASS}><Plus size={17} /> Novo termo</Link>} />
    {error ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Não foi possível carregar os documentos. Atualize a página para tentar novamente.</p> : <>
      <div className="grid gap-3 sm:grid-cols-3">{indicadores.map((i) => <div key={i.label} className="rounded-xl border border-border bg-surface p-4"><p className="text-xs font-medium text-ink-muted">{i.label}</p><p className={`mt-1 text-2xl font-bold ${i.classe}`}>{i.valor}</p></div>)}</div>
      <ListaDocumentosAssinatura acao={apagarTermosSelecionados} pessoaRotulo="Cliente" novoHref="/termos-visita/nova" vazio="Nenhum termo de visita criado" documentos={rows.map((d) => ({ id: d.id, titulo: d.imoveis?.endereco ?? "Imóvel não informado", pessoa: d.clientes?.nome ?? "Não informado", status: d.status, detalheRotulo: "Data da visita", detalhe: d.data_visita ? new Date(`${d.data_visita}T00:00:00`).toLocaleDateString("pt-BR") : "Não informada", href: `/termos-visita/${d.id}`,  }))} />
    </>}
  </div>;
}
