import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  pago_parcial: "Pago parcial",
  pago: "Pago",
  cancelado: "Cancelado",
};

function csvEscape(v: string): string {
  if (v.includes(";") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const inicio = searchParams.get("inicio") ?? "";
  const fim = searchParams.get("fim") ?? "";
  const tipo = searchParams.get("tipo") ?? "";
  const unidade = searchParams.get("unidade") ?? "";
  const conta = searchParams.get("conta") ?? "";
  const categoria = searchParams.get("categoria") ?? "";

  const supabase = await createClient();
  let query = supabase
    .from("financeiro_lancamentos")
    .select(
      "vencimento, tipo, descricao, valor, status, financeiro_pessoas ( nome ), financeiro_categorias ( nome ), financeiro_unidades ( nome ), financeiro_contas_bancarias ( nome )"
    )
    .order("vencimento");

  if (inicio) query = query.gte("vencimento", inicio);
  if (fim) query = query.lte("vencimento", fim);
  if (tipo === "receita" || tipo === "despesa") query = query.eq("tipo", tipo);
  if (unidade) query = query.eq("unidade_id", unidade);
  if (conta) query = query.eq("conta_bancaria_id", conta);
  if (categoria) query = query.eq("categoria_id", categoria);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ erro: "Não foi possível gerar o relatório." }, { status: 500 });
  }

  const linhas = (data ?? []) as unknown as {
    vencimento: string;
    tipo: string;
    descricao: string;
    valor: number;
    status: string;
    financeiro_pessoas: { nome: string } | null;
    financeiro_categorias: { nome: string } | null;
    financeiro_unidades: { nome: string } | null;
    financeiro_contas_bancarias: { nome: string } | null;
  }[];

  const cabecalho = ["Vencimento", "Tipo", "Descrição", "Pessoa", "Categoria", "Unidade", "Conta bancária", "Valor", "Status"];
  const corpo = linhas.map((l) =>
    [
      l.vencimento.split("-").reverse().join("/"),
      l.tipo === "receita" ? "Receita" : "Despesa",
      l.descricao,
      l.financeiro_pessoas?.nome ?? "",
      l.financeiro_categorias?.nome ?? "",
      l.financeiro_unidades?.nome ?? "",
      l.financeiro_contas_bancarias?.nome ?? "",
      Number(l.valor).toFixed(2).replace(".", ","),
      STATUS_LABEL[l.status] ?? l.status,
    ]
      .map((v) => csvEscape(String(v)))
      .join(";")
  );

  const csv = "﻿" + [cabecalho.join(";"), ...corpo].join("\n");
  const nomeArquivo = `relatorio-financeiro-${inicio || "inicio"}-a-${fim || "fim"}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
    },
  });
}
