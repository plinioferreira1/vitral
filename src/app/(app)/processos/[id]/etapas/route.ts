import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exigirUsuario } from "@/lib/usuario-atual";
import { avisar } from "@/lib/aviso";
import { concluirEtapa, reabrirEtapa, alterarDataPrevista, salvarNumeroRegistro, salvarValorEtapa } from "../actions";

const acoes = {
  concluir: concluirEtapa,
  reabrir: reabrirEtapa,
  prazo: alterarDataPrevista,
  registro: salvarNumeroRegistro,
  valor: salvarValorEtapa,
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  const protocolo = request.headers.get("x-forwarded-proto") ?? url.protocol.slice(0, -1);
  const origem = `${protocolo}://${host}`;
  // O POST nativo precisa da mesma proteção contra envio de outra origem
  // que o Next aplica automaticamente às Server Actions.
  if (request.headers.get("origin") !== origem) {
    return new Response("Origem não permitida.", { status: 403 });
  }
  const { id } = await params;
  const destino = new URL(`/processos/${encodeURIComponent(id)}#etapas-processo`, origem);
  if (!(await exigirUsuario())) {
    return NextResponse.redirect(new URL("/login", origem), 303);
  }

  const dados = await request.formData();
  const acao = dados.get("acao");
  if (typeof acao !== "string" || !Object.hasOwn(acoes, acao)) {
    return new Response("Ação inválida.", { status: 400 });
  }
  const etapaId = dados.get("etapa_id");
  if (typeof etapaId !== "string" || !etapaId) {
    return new Response("Etapa inválida.", { status: 400 });
  }
  const supabase = await createClient();
  // Usa a sessão e RLS atuais; impede misturar etapa e processo no formulário.
  const { data: etapa, error } = await supabase.from("etapas")
    .select("id").eq("id", etapaId).eq("processo_id", id).maybeSingle();
  if (error || !etapa) {
    await avisar("erro", "Não foi possível acessar esta etapa. Atualize a página e tente novamente.");
    return NextResponse.redirect(destino, 303);
  }
  dados.set("processo_id", id);
  try {
    await acoes[acao as keyof typeof acoes](dados);
  } catch (erro) {
    console.error("Falha no envio de etapa:", erro);
    await avisar("erro", "Não foi possível finalizar a ação. Confira o estado atualizado da etapa antes de tentar novamente.");
  }
  return NextResponse.redirect(destino, 303);
}
