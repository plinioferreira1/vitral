import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";

function valorCsv(valor: unknown): string {
  let texto = String(valor ?? "").replace(/\r?\n/g, " ");
  if (/^\s*[=+@\-\t\r]/.test(texto)) texto = "'" + texto;
  return '"' + texto.replace(/"/g, '""') + '"';
}
type Venda = {
  numero_processo: string | null;
  codigo_san: string | null;
  status: string | null;
  fonte_lead: string | null;
  fonte_lead_observacoes: string | null;
  data_venda: string | null;
  mes_venda: string | null;
  data_conclusao: string | null;
  data_assinatura: string | null;
  data_criacao: string | null;
  valor_total: number | null;
  imoveis: { endereco: string | null } | null;
};
const mesComercial = (v: Venda) => v.mes_venda ?? v.data_venda?.slice(0,7) ?? v.data_conclusao?.slice(0,7) ?? v.data_assinatura?.slice(0,7) ?? v.data_criacao?.slice(0,7) ?? "";
export async function GET(request: NextRequest) {
  const { usuario } = await getUsuarioAtual();
  if (!usuario?.tenant_id || !["diretor", "gerente"].includes(usuario.nivel_acesso))
    return new NextResponse("Acesso não autorizado.", { status: 403 });
  const ano = request.nextUrl.searchParams.get("ano") ?? "2026";
  if (!/^20[0-9]{2}$/.test(ano)) return new NextResponse("Ano inválido.", { status: 400 });
  const canal = request.nextUrl.searchParams.get("canal") || "";
  const busca = (request.nextUrl.searchParams.get("busca") || "").trim().toLocaleLowerCase("pt-BR");
  const estado = request.nextUrl.searchParams.get("estado") === "todos" ? "todos" : "concluido";
  const supabase = await createClient();
  const [processos, historicos] = await Promise.all([
    supabase.from("processos")
      .select("numero_processo,codigo_san,status,fonte_lead,fonte_lead_observacoes,data_venda,mes_venda,data_conclusao,data_assinatura,data_criacao,valor_total,imoveis(endereco)")
      .eq("tenant_id", usuario.tenant_id).eq("categoria", "venda"),
    supabase.from("vendas_fontes_historicas")
      .select("imovel_nome,mes_venda,fonte_lead,fonte_lead_observacoes").eq("tenant_id", usuario.tenant_id),
  ]);
  if (processos.error || historicos.error) return new NextResponse("Falha ao exportar vendas.", { status: 500 });
  const vendas = ((processos.data ?? []) as unknown as Venda[])
    .filter(v => mesComercial(v).startsWith(ano))
    .filter(v => estado === "todos" || v.status === "concluido" || !!v.mes_venda || !!v.data_venda)
    .filter(v => !canal || (v.fonte_lead || "Não informado") === canal)
    .filter(v => !busca || [v.imoveis?.endereco,v.numero_processo,v.codigo_san].join(" ").toLocaleLowerCase("pt-BR").includes(busca));
  const antigos = (historicos.data ?? [])
    .filter(v => v.mes_venda.startsWith(ano))
    .filter(v => !canal || (v.fonte_lead || "Não informado") === canal)
    .filter(v => !busca || v.imovel_nome.toLocaleLowerCase("pt-BR").includes(busca));
  const cabecalho = ["Imóvel","Código SAN","Processo","Fonte do lead","Observações","Data exata da venda","Mês da venda","Situação","Valor da venda (R$)"];
  const linhas = [
    ...vendas.map(v => [
      v.imoveis?.endereco ?? "",
      v.codigo_san ?? "",
      v.numero_processo ?? "",
      v.fonte_lead ?? "Não informado",
      v.fonte_lead_observacoes ?? "",
      v.data_venda ? v.data_venda.split("-").reverse().join("/") : "",
      mesComercial(v),
      v.status ?? "",
      Number(v.valor_total ?? 0).toFixed(2).replace(".", ","),
    ]),
    ...antigos.map(v => [
      v.imovel_nome,
      "",
      "Venda histórica",
      v.fonte_lead ?? "Não informado",
      v.fonte_lead_observacoes ?? "",
      "",
      v.mes_venda,
      "Realizada",
      "",
    ]),
  ].sort((a,b) => String(a[6]).localeCompare(String(b[6])));
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
