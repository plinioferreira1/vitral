import { createClient } from "@/lib/supabase/server";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { SupabaseClient } from "@supabase/supabase-js";

const LABELS: Record<string, string> = {
  imovel_interesse: "Imóvel de interesse", finalidade: "Finalidade", garantia: "Modalidade de garantia", moradores: "Moradores", possui_pet: "Possui animais", data_pretendida: "Data pretendida",
  nome_completo: "Nome completo", cpf: "CPF", rg: "RG / órgão expedidor", nascimento: "Nascimento", estado_civil: "Estado civil", telefone: "Telefone", email: "E-mail", endereco: "Endereço", cidade: "Cidade / UF", cep: "CEP",
  conjuge_nome: "Nome do cônjuge", conjuge_cpf: "CPF do cônjuge", profissao: "Profissão", tipo_renda: "Tipo de renda", empresa: "Empresa / empregador", renda_mensal: "Renda mensal", tempo_empresa: "Tempo na atividade", imovel_proprio: "Imóvel próprio", veiculo: "Veículo", banco: "Banco", agencia: "Agência", conta: "Conta", referencia_nome: "Referência pessoal", referencia_telefone: "Telefone da referência",
  fiador_nome: "Nome do fiador", fiador_cpf: "CPF do fiador", fiador_rg: "RG do fiador", fiador_telefone: "Telefone do fiador", fiador_email: "E-mail do fiador", fiador_endereco: "Endereço do fiador", fiador_profissao: "Profissão do fiador", fiador_renda: "Renda do fiador", fiador_imovel_quitado: "Imóvel quitado do fiador", fiador_imovel: "Identificação do imóvel do fiador", observacoes: "Observações",
};

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient() as unknown as SupabaseClient;
  const [{ data: ficha }, { data: documentos }] = await Promise.all([
    supabase.from("fichas_cadastrais_locacao").select("*").eq("id", id).single(),
    supabase.from("ficha_locacao_documentos").select("nome_arquivo, tipo").eq("ficha_id", id).order("criado_em"),
  ]);
  if (!ficha) return new Response("Ficha não encontrada", { status: 404 });
  if (ficha.status !== "concluida") return new Response("A ficha ainda não foi concluída", { status: 400 });

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 595.28, H = 841.89, M = 48, usable = W - M * 2;
  let page: PDFPage = pdf.addPage([W, H]), y = H - M;
  const borda = rgb(0.88, 0.86, 0.83), vinho = rgb(0.45, 0.08, 0.08), dourado = rgb(0.72, 0.49, 0.16), texto = rgb(0.12, 0.11, 0.1), cinza = rgb(0.43, 0.4, 0.38);
  function nova(altura = 30) { if (y - altura < M) { page = pdf.addPage([W, H]); y = H - M; } }
  function linhas(valor: string, font: PDFFont, size: number, largura = usable) { const palavras = valor.replace(/\s+/g, " ").trim().split(" "); const out: string[] = []; let atual = ""; for (const p of palavras) { const teste = atual ? `${atual} ${p}` : p; if (font.widthOfTextAtSize(teste, size) > largura && atual) { out.push(atual); atual = p; } else atual = teste; } if (atual) out.push(atual); return out; }
  function textoPdf(valor: string, opts: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; gap?: number; largura?: number } = {}) { const size = opts.size ?? 9.5, font = opts.font ?? regular; const ls = linhas(valor, font, size, opts.largura); for (const l of ls) { nova(size + 5); page.drawText(l, { x: M, y, size, font, color: opts.color ?? texto }); y -= size + 4; } y -= opts.gap ?? 3; }
  function titulo(valor: string) { nova(38); y -= 6; page.drawText(valor.toUpperCase(), { x: M, y, size: 9, font: bold, color: vinho }); y -= 12; page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.7, color: borda }); y -= 14; }
  function campo(label: string, valor: unknown) { if (valor === "" || valor === null || valor === undefined || valor === false) return; nova(34); page.drawText(label, { x: M, y, size: 7.5, font: bold, color: cinza }); y -= 11; textoPdf(typeof valor === "boolean" ? "Sim" : String(valor), { size: 9.5, gap: 7 }); }

  page.drawRectangle({ x: 0, y: H - 9, width: W, height: 9, color: vinho });
  page.drawText("SACRA", { x: M, y, size: 21, font: bold, color: vinho });
  page.drawText("NETIMÓVEIS", { x: M, y: y - 13, size: 7.5, font: bold, color: dourado });
  page.drawText("FICHA CADASTRAL DE LOCAÇÃO", { x: W - M - 205, y: y - 2, size: 11, font: bold, color: vinho });
  y -= 48;
  campo("Proponente", ficha.proponente_nome); campo("Imóvel", ficha.imovel_referencia);
  const dados = (ficha.dados ?? {}) as Record<string, string | number | boolean | null>;
  const secoes: Array<[string, string[]]> = [
    ["Proposta e garantia", ["imovel_interesse","finalidade","garantia","moradores","possui_pet","data_pretendida"]],
    ["Dados pessoais", ["nome_completo","cpf","rg","nascimento","estado_civil","telefone","email","endereco","cidade","cep","conjuge_nome","conjuge_cpf"]],
    ["Renda, patrimônio e referências", ["profissao","tipo_renda","empresa","renda_mensal","tempo_empresa","imovel_proprio","veiculo","banco","agencia","conta","referencia_nome","referencia_telefone"]],
    ["Fiador", Object.keys(LABELS).filter((k) => k.startsWith("fiador_"))],
  ];
  for (const [nome, campos] of secoes) { if (!campos.some((c) => dados[c])) continue; titulo(nome); for (const c of campos) campo(LABELS[c] ?? c, dados[c]); }
  if (dados.observacoes) { titulo("Observações"); textoPdf(String(dados.observacoes)); }
  titulo("Documentos apresentados"); if (!documentos?.length) textoPdf("Nenhum documento anexado.", { color: cinza }); else for (const d of documentos) textoPdf(`• ${d.nome_arquivo} — ${d.tipo}`, { size: 8.5 });
  titulo("Declaração, LGPD e assinatura");
  textoPdf("Declaro que as informações prestadas e os documentos enviados são verdadeiros e estou ciente de que o envio não representa aprovação automática da locação.", { size: 9 });
  textoPdf("Autorizo o tratamento dos dados para análise cadastral, avaliação da garantia, elaboração e execução do contrato de locação, bem como o compartilhamento, no limite necessário, com proprietários, seguradoras, plataformas de garantia, prestadores de análise e parceiros envolvidos na operação.", { size: 9 });
  textoPdf("Os dados e documentos serão mantidos em ambiente de acesso restrito pelo período necessário ao processo e ao cumprimento de obrigações legais. Estou ciente dos direitos previstos na Lei nº 13.709/2018, incluindo confirmação, acesso e correção, observadas as hipóteses legais de conservação.", { size: 9, gap: 14 });
  if (ficha.assinatura_imagem) { try { nova(125); const bytes = Uint8Array.from(Buffer.from(String(ficha.assinatura_imagem).split(",")[1] ?? "", "base64")); const img = await pdf.embedPng(bytes); const w = 180, h = Math.min(90, img.height / img.width * w); page.drawImage(img, { x: M, y: y - h, width: w, height: h }); y -= h + 4; } catch {} }
  nova(45); page.drawLine({ start: { x: M, y }, end: { x: M + 230, y }, thickness: 0.7, color: cinza }); y -= 14; textoPdf(String(dados.nome_completo ?? ficha.proponente_nome ?? "Proponente"), { font: bold, size: 9, gap: 1 });
  textoPdf(`Assinado eletronicamente em ${new Date(ficha.concluido_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}${ficha.ip_conclusao ? ` · IP ${ficha.ip_conclusao}` : ""}`, { size: 7.5, color: cinza });
  const bytes = await pdf.save();
  return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="ficha-locacao-${id}.pdf"`, "Cache-Control": "private, no-store" } });
}
