import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";

function valorCsv(valor: unknown): string {
  let texto = String(valor ?? "").replace(/\r?\n/g, " ");
  if (/^[\s]*[=+@\-\t\r]/.test(texto)) texto = "'" + texto;
  return '"' + texto.replace(/"/g, '""') + '"';
}
type VendaExportacao = {
  numero_processo: string | null;
  codigo_san: string | null;
  status: string | null;
  fonte_lead: string | null;
  fonte_lead_observacoes: string | null;
  data_venda: string | null;
  data_conclusao: string | null;
  data_assinatura: string | null;
  data_criacao: string | null;
  valor_total: number | null;
  imoveis: { endereco: string | null } | null;
};
const dataReferencia = (v: VendaExportacao) => v.data_venda ?? v.data_conclusao ?? v.data_assinatura ?? v.data_criacao ?? "";
export async function GET(request: NextRequest) {
  const { usuario } = await getUsuarioAtual();
  if (!usuario?.tenant_id || !["diretor", "gerente"].includes(usuario.nivel_acesso)) {
    return new NextResponse("Acesso não autorizado.", { status: 403 });
  }
  const ano = request.nextUrl.searchParams.get("ano") ?? "2026";
  if (!/^20\d{2}$/.test(ano)) return new NextResponse("Ano inválido.", { status: 400 });
  const canal = request.nextUrl.searchParams.get("canal") || "";
  const busca = (request.nextUrl.searchParams.get("busca") || "").trim().toLocaleLowerCase("pt-BR");
  const estado = request.nextUrl.searchParams.get("estado") === "todos" ? "todos" : "concluido";
  const supabase = await createClient();
  const { data, error } = await supabase.from("processos")
    .select("numero_processo,codigo_san,status,fonte_lead,fonte_lead_observacoes,data_venda,data_conclusao,data_assinatura,data_criacao,valor_total,imoveis(endereco)")
    .eq("tenant_id", usuario.tenant_id).eq("categoria", "venda");
  if (error) return new NextResponse("Falha ao exportar vendas.", { status: 500 });
  const vendas = ((data ?? []) as unknown as VendaExportacao[])
    .filter(v => dataReferencia(v).startsWith(ano))
    .filter(v => estado === "todos" || v.status === "concluido" || !!v.data_venda)
    .filter(v => !canal || (v.fonte_lead || "Não informado") === canal)
    .filter(v => !busca || [v.imoveis?.endereco, v.numero_processo, v.codigo_san].join(" ").toLocaleLowerCase("pt-BR").includes(busca))
    .sort((a,b)=>dataReferencia(a).localeCompare(dataReferencia(b)));
  const cabecalho = ["Imóvel", "Código SAN", "Processo", "Fonte do lead", "Observações", "Data da venda", "Mês da venda", "Status", "Valor da venda (R$)"];
  const linhas = vendas.map(v => [
    v.imoveis?.endereco ?? "",
    v.codigo_san ?? "",
    v.numero_processo ?? "",
    v.fonte_lead ?? "Não informado",
    v.fonte_lead_observacoes ?? "",
    dataReferencia(v).split("-").reverse().join("/"),
    dataReferencia(v).slice(0,7),
    v.status ?? "",
    Number(v.valor_total ?? 0).toFixed(2).replace(".", ","),
  ]);
  const csv = "\uFEFF" + [cabecalho, ...linhas].map(l => l.map(valorCsv).join(";")).join("\r\n");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="fontes-leads-'+ano+'.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
