import { NextResponse } from "next/server";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { getURLFromRedirectError } from "next/dist/client/components/redirect";
import { exigirUsuario } from "@/lib/usuario-atual";
import { avisar } from "@/lib/aviso";
import { cancelarTermo, criarNovaVersao, criarTermo, duplicarTermo, enviarLinkPorEmail, enviarParaAssinatura, gerarDocumento, salvarResponsavel, salvarTermo, voltarParaEdicao, registrarAnexo, removerAnexo } from "../actions";

const BASE = "/vendas/termos-entrega";
const acoes = { cancelarTermo, criarNovaVersao, criarTermo, duplicarTermo, enviarLinkPorEmail, enviarParaAssinatura, gerarDocumento, salvarResponsavel, voltarParaEdicao };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Responde sem payload RSC: uma falha na reconciliação da tela não oculta a confirmação. */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  const protocolo = request.headers.get("x-forwarded-proto") ?? url.protocol.slice(0, -1);
  const origem = `${protocolo}://${host}`;
  if (request.headers.get("origin") !== origem) return new Response("Origem não permitida.", { status: 403 });
  const json = request.headers.get("accept") === "application/json";
  if (!(await exigirUsuario())) return json
    ? NextResponse.json({ ok: false, erro: "Sua sessão expirou. Abra o Vitral em outra aba para entrar novamente, sem perder este preenchimento." }, { status: 401 })
    : NextResponse.redirect(new URL("/login", origem), 303);
  if (Number(request.headers.get("content-length")) > 4 * 1024 * 1024) return new Response("Envio muito grande.", { status: 413 });
  let dados: FormData;
  try { dados = await request.formData(); }
  catch { return new Response("Formulário inválido.", { status: 400 }); }
  const acao = dados.get("acao");
  const id = String(dados.get("id") ?? "");
  if (typeof acao !== "string" || (!["salvar", "registrarAnexo", "removerAnexo"].includes(acao) && !Object.hasOwn(acoes, acao))) return new Response("Ação inválida.", { status: 400 });
  if (acao !== "criarTermo" && !uuid.test(id)) return new Response("Termo inválido.", { status: 400 });
  const destino = uuid.test(id) ? `${BASE}/${id}` : `${BASE}/novo`;
  const concluir = (href: string) => json
    ? NextResponse.json({ ok: true, destino: href })
    : NextResponse.redirect(new URL(href, origem), 303);
  try {
    if (acao === "registrarAnexo") {
      const encargo = String(dados.get("encargo_id") ?? "");
      if (encargo && !uuid.test(encargo)) return new Response("Encargo inválido.", { status: 400 });
      const r = await registrarAnexo(id, encargo || null, String(dados.get("caminho") ?? ""), String(dados.get("nome") ?? ""), Number(dados.get("tamanho")));
      return NextResponse.json(r, { status: r.ok ? 200 : 409 });
    }
    if (acao === "removerAnexo") {
      const anexo = String(dados.get("anexo_id") ?? "");
      if (!uuid.test(anexo)) return new Response("Anexo inválido.", { status: 400 });
      const r = await removerAnexo(anexo);
      return NextResponse.json(r, { status: r.ok ? 200 : 409 });
    }
    if (acao === "salvar") {
      let documento: unknown;
      try { documento = JSON.parse(String(dados.get("documento") ?? "")); }
      catch { return NextResponse.json({ ok: false, erro: "Preenchimento inválido." }, { status: 400 }); }
      const resultado = await salvarTermo(id, documento, String(dados.get("revisao") ?? ""));
      if (!resultado.ok) return NextResponse.json(resultado, { status: 409 });
      if (dados.get("depois") === "gerar") {
        await gerarDocumento(dados);
        return concluir(destino);
      }
      return NextResponse.json(resultado);
    }
    await acoes[acao as keyof typeof acoes](dados);
    return concluir(destino);
  } catch (erro) {
    if (isRedirectError(erro)) {
      const href = getURLFromRedirectError(erro);
      // Os destinos são exclusivamente produzidos pelas ações autenticadas.
      if (href && (href === BASE || href.startsWith(`${BASE}/`))) return concluir(href);
      throw erro;
    }
    console.error("Falha na ação do termo:", erro);
    const mensagem = "Não foi possível confirmar a ação. Confira o estado do termo antes de repetir; seu preenchimento continua nesta tela.";
    if (json) return NextResponse.json({ ok: false, erro: mensagem }, { status: 500 });
    await avisar("erro", mensagem);
    return concluir(destino);
  }
}
